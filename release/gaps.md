
### Gap 1: Handshake Protocol End ≠ Physical Station Cycle End

| Event                                                           | What It Represents                                                                 | Current Behavior                                                   | Physical Reality                                                                                                            |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **`Request_For_Destination = 0`**                       | **Protocol Reset Only.** Both sides cleared handshake registers.             | Current logic marks the cycle**FINISHED & SUCCESSFUL** here. | **The pallet has NOT moved yet!** The motor just started (`State = 8`). The pallet is still sitting on the rollers. |
| **`Pallet_Transferred = 1`** or **`State = 1`** | **Physical Hand-off Complete.** Pallet crossed photo-eyes into next station. | Not used as the cycle boundary.                                    | **This is the true end of the cycle.** The station is now empty and ready for the next pallet.                        |

---

### Gap 2: In-Between Stops & Faults (The "False Success" Problem)

In the actual log (`dcs 18.log`, station `B3C2`), we see this exact sequence:

1. **`11:35:29`** : `Request_For_Destination = 1` (Pallet `TP00000001`)
2. **`11:35:30`** : `Destination = 131`, `Ack = 2`, `Request = 99`
3. **`11:35:31`** : `Request_For_Destination = 0`, `State = 8` *(Transfer Starts)*
4. **`11:35:44`** : **`State = 16` (DRIVE FAULT / LINE STOPPED MID-TRANSFER!)**
5. **`11:36:27`** : Fault clears, but the pallet never left; it rolls back to **`State = 5`**
6. **`11:36:34`** : PLC sends `Request_For_Destination = 1` **AGAIN** for the exact same pallet `TP00000001`!

**The Gap:**
The current analyzer evaluated Step 3 (`Request = 0`) and logged it as a **"SUCCESSFUL"** transaction.
In reality,  **that cycle failed in-between progress at Step 4 (`State = 16`)** . The second handshake at `11:36:34` was not a new pallet—it was a  **re-attempt of the stranded pallet** .

---

### Gap 3: "Handshake Attempt" vs. "Pallet Station Cycle"

Currently, the system treats every single `Request_For_Destination = 1` as an independent cycle. In reality:

$$
\text{Pallet Station Cycle} = [\text{Attempt 1 (Failed/Aborted)}] \longrightarrow [\text{Attempt 2 (Failed/Aborted)}] \longrightarrow [\text{Attempt 3 (Success)}]
$$

* **A Cycle starts** when a **new** Pallet ID arrives (`State = 4` or `5`, or Pallet ID transitions from `0000000000`).
* **A Handshake Attempt occurs** whenever `Request_For_Destination = 1`.
* If the pallet never transitions to `State = 8` and then `Pallet_Transferred = 1` (or `State = 1`), and another `Request = 1` occurs for that same Pallet ID:
  * **Attempt 1 is FAILED (Aborted in-between).**
  * **Attempt 2 is a RETRY.**
* The **Pallet Station Cycle** is only **PASSED** when the pallet physically leaves the station (`Pallet_Transferred = 1` / station reverts to `State = 1` / Pallet ID clears to zeroes).

---

### Gap 4: Cycle Start Definition (Docking vs. Request)

* **Docking Time (`State = 4` or `5`):** When the pallet physically arrives and triggers the limit sensor.
* **Request Time (`Request_For_Destination = 1`):** When the PLC requests routing.
* **The Gap:** In some logs, a pallet sits at `State = 5` for **10–30 seconds** before `Request_For_Destination = 1` is raised (waiting on scanner or upstream interlocks).
  * If we only measure from `Request = 1`, we miss the station pre-handshake delay.
  * If we measure from `State = 5`, we capture the true station residency time.
