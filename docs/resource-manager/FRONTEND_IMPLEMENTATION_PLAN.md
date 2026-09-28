
# Frontend Implementation Plan: Resource Manager UI Redesign

## 1. Overview & Architectural Goals

Upgrade the **Warehouse Orchestrator UI (`client/warehouse-ui`)** to fully expose and visualize the three new core capabilities of the Resource Manager:

1. **Resource Shapes (Mixins)**: Multi-shape composition tab for reusable property & method bundles.
2. **Rule Subscriptions (Edge Trigger Engine)**: Reactive rules matrix with Regex barcode matching, numeric thresholds, and automated actions.
3. **High-Speed Telemetry Historian & Policies**: Live oscilloscope/ring-buffer chart, 6 collection strategies (`ON_CHANGE`, `PERIODIC_POLL`, `DEADBAND_ABSOLUTE`, `DEADBAND_PERCENT`, `SAMPLE_WINDOW`, `HYBRID_HEARTBEAT`), and downsampled metric views.

Strict adherence to **IEC 62443 Industrial HMI Standards**:

* Zero CDN / air-gapped SVGs (`lucide-react`).
* 48px x 48px touch targets for touchscreens.
* Industrial contrast color palette (Emerald running, Amber warning/in-motion, Crimson fault/abort, Slate offline).
* Hard file length limit: **< 1,000 lines per file**.

---

## 2. Updated Workspace Navigation Modes

The unified top navigation bar in `ResourceConfigView.tsx` will be expanded into 5 dedicated industrial workspace modes:

* `RESOURCES`: Active equipment twin table & direct controls.
* `TEMPLATES`: Archetype blueprints with applied shape composition chips.
* `SHAPES`: **(NEW)** Composable mixin library (`ResourceShape`) management.
* `RULES`: **(NEW)** Event-driven reactive subscription matrix & Regex trap testing.
* `TELEMETRY`: **(NEW)** Time-series telemetry dashboard, ring-buffer sliding chart, and collection policy config.
* `RELATIONSHIPS`: ISA-95 & topological flow routing.

---

## 3. UI Component Architecture

```
client/warehouse-ui/src/features/resources/
├── ResourceConfigView.tsx                    # Main host view with 6-mode switcher (<450 lines)
├── components/
│   ├── ResourceShapesTab.tsx                 # NEW: Composable mixin cards & create modal (<400 lines)
│   ├── ResourceRulesTab.tsx                  # NEW: Rule matrix, Regex tester & subscription builder (<500 lines)
│   ├── ResourceTelemetryTab.tsx              # NEW: Live ring buffer visualizer & policy configurator (<500 lines)
│   ├── ResourceTemplatesTab.tsx              # UPDATED: Template cards with shape badges (<450 lines)
│   └── ResourceTable.tsx                     # UPDATED: Enhanced with live telemetry & rule count chips
└── types/
    └── resourceManagerTypes.ts               # NEW: TypeScript definitions for Shapes, Rules, and Telemetry
```

---

## 4. Visual Layout Mockups (Sample Views)

### 4.1 Resource Shapes Workspace (`SHAPES`)

```
+-------------------------------------------------------------------------------------------------------+
|  Resource Shapes Library (Mixins)                         [+ New Shape] [Refresh]                     |
|  Reusable packages of properties and method schemas composed across unrelated equipment templates   |
+-------------------------------------------------------------------------------------------------------+
| [⚡ BatteryPoweredShape]           | [📶 NetworkTelemetryShape]      | [📦 ZebraScanEngineShape]       |
| Properties:                      | Properties:                     | Properties:                     |
|  - stateOfChargePct (DOUBLE, %)  |  - rssiSignalDbm (INTEGER, dBm) |  - lastScannedBarcode (STRING)  |
|  - batteryVoltageV (DOUBLE, V)   |  - ipAddress (STRING)           |  - scanTriggerState (BOOLEAN)   |
|  - isCharging (BOOLEAN)          |  - macAddress (STRING)          | Methods:                        |
| Methods:                         | Methods:                        |  - triggerLaserBeep (CONTROL)   |
|  - requestDocking (CONTROL)      |  - pingDiagnostics (READ_ONLY)  | Applied to:                     |
| Applied to: 4 Templates (AMR, AGV| Applied to: 6 Templates         |  - Conveyor Sorter, Handheld    |
+-------------------------------------------------------------------------------------------------------+
```

### 4.2 Reactive Rules Matrix (`RULES`)

```
+-------------------------------------------------------------------------------------------------------+
|  Reactive Rule Subscriptions                              [+ Add Subscription] [Test Regex Trap]      |
|  Sub-microsecond predicate evaluations triggering PackML transitions or remote methods               |
+-------------------------------------------------------------------------------------------------------+
| ID / Rule Name    | Target Resource   | Property            | Predicate Type  | Threshold / Regex     | Action Dispatched        | Status  |
|-------------------|-------------------|---------------------|-----------------|-----------------------|--------------------------|---------|
| SUB_UPS_BARCODE   | CONVEYOR_DIVERTER | lastScannedBarcode  | REGEX_MATCH     | ^1Z[0-9A-Z]{16}$      | divertLane(laneId=3)     | ACTIVE  |
| SUB_LOW_BATTERY   | AMR_FLEET_01      | batteryLevel        | NUMERIC (<)     | < 20.0 %              | requestDocking()         | ACTIVE  |
| SUB_CRITICAL_TEMP | ASRS_CRANE_MAIN   | bearingTemperatureC | NUMERIC (>=)    | >= 75.0 °C            | fsm.fire(ABORT)          | ACTIVE  |
| SUB_FAULT_TRAP    | PALLET_CONVEYOR_4 | activeFaultCode     | REGEX_MATCH     | ^E-(FATAL|ESTOP)-.*$  | sounderBeaconAlert()     | ACTIVE  |
+-------------------------------------------------------------------------------------------------------+
```

### 4.3 Live Telemetry & Ring Buffer Oscilloscope (`TELEMETRY`)

```
+-------------------------------------------------------------------------------------------------------+
|  Live Telemetry Historian & Oscilloscope                  [Select Resource: ASRS_CRANE_01 ▾]          |
+-------------------------------------------------------------------------------------------------------+
| Metric: bearingTemperatureC | Policy: DEADBAND_ABSOLUTE (Δ >= 0.5°C) | Buffer: 1,000 pts (0.0 ms GC)  |
|                                                                                                       |
|  50°C |                                            .-.                                                |
|  45°C |  ------------------.                      /   \                                               |
|  40°C |                     \____________________/     \___________________                           |
|       +--------------------------------------------------------------------> Time (Last 60s)          |
|  Current Value: 46.2 °C | Drop Rate: 82% (Analog Jitter Filtered) | Mode: DEADBAND_ABSOLUTE           |
+-------------------------------------------------------------------------------------------------------+
| Configured Logging Policies:                                                                          |
|  • axisVibrationRms   -> [SAMPLE_WINDOW (1000ms)]       [Edit Policy]                                 |
|  • bearingTempC       -> [DEADBAND_ABSOLUTE (Δ >= 0.5)] [Edit Policy]                                 |
|  • operationalStatus  -> [ON_CHANGE]                    [Edit Policy]                                 |
|  • ambientHumidityPct -> [PERIODIC_POLL (5000ms)]       [Edit Policy]                                 |
+-------------------------------------------------------------------------------------------------------+
```
