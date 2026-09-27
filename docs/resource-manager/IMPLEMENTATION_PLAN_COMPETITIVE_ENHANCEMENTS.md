# Implementation Plan: Core Enhancements for Resource Manager

This document defines the architectural design, specifications, and execution phases for introducing **ResourceShape**, **RuleSubscriptionEngine**, and **High-Frequency Telemetry Historian (`TelemetryHistorianPort` + `RingBufferTelemetryStore`)** into the `common-resource` domain.

---

## 1. Component 1: `ResourceShape` (Composable Mixins)

### Goal
Provide multiple-inheritance composition where reusable packages of property definitions and method signatures (e.g. `BatteryPoweredShape`, `OpcUaTargetShape`, `BarcodeScannerShape`) can be composed into any `ResourceTemplate`.

### Industry Example: Autonomous Mobile Robot (AMR) & Handheld Scanner Mixins
* **Scenario**: Both an **Autonomous Mobile Robot (AMR Fleet)** and a **Shop-floor Rugged Barcode Scanner** share identical battery behaviors, but completely different mobility mechanics.
* **Shape Application**:
  * Shape 1: `BatteryPoweredShape` defines properties (`stateOfChargePct`, `batteryVoltageV`, `isCharging`) and methods (`requestDocking()`).
  * Shape 2: `NetworkTelemetryShape` defines properties (`rssiSignalDbm`, `ipAddress`, `macAddress`).
* **Composition**: The `AmrTemplate` composes `[BatteryPoweredShape, NetworkTelemetryShape, DifferentialDriveShape]`, while the `HandheldScannerTemplate` composes `[BatteryPoweredShape, NetworkTelemetryShape, ZebraScanEngineShape]`. Reusability is achieved without brittle deep inheritance chains.

### Domain Model Design
* **Package**: `org.platform.resourcemanager.domain.shape`
* **`ResourceShape` (Record Aggregate)**:
  ```java
  public record ResourceShape(
      String shapeCode,
      String shapeName,
      String description,
      List<PropertyDefinition> properties,
      List<MethodDefinition> methods,
      Instant createdAt
  ) implements Serializable
  ```
* **Integration into `ResourceTemplate`**:
  * Add `List<String> appliedShapeCodes` or `List<ResourceShape> shapes` to `ResourceTemplate`.
  * During `ResourceTemplate.instantiate(...)`, compose properties and methods across applied shapes, with template-level definitions overriding shape-level defaults in case of collisions.

---

## 2. Component 2: `RuleSubscriptionEngine` (Reactive Predicate Triggers)

### Goal
Enable event-driven, microsecond-latency reactive rule execution when resource properties change (e.g., *if `batteryLevel` < 20.0, trigger state transition to `CHARGING_REQUIRED` or publish alert event*).

### Industry Example: Conveyor Divert Barcode Validation & PLC Alarm Regex
* **Scenario A (Conveyor Divert Lane)**: Fixed industrial 2D barcode scanner reads scanned carton IDs on a high-speed sorter line.
  * Property: `lastScannedBarcode` (String).
  * Regex Predicate: Matches outbound courier express tracking numbers `^1Z[0-9A-Z]{16}$` (UPS format) or `^9400\d{18}$` (USPS format).
  * Reactive Action: If matched, trigger `divertLane(LaneID=3)`, else trigger `divertToRejectChute()`.
* **Scenario B (PLC Fault / Error Code Parsing)**: Industrial drive controller sets string property `activeFaultCode`.
  * Regex Predicate: Matches safety-critical motor faults `^E-(FATAL|OVERTEMP|ESTOP)-.*$`.
  * Reactive Action: Immediately fires PackML `ABORT` transition and dispatches an emergency sounder alarm.

### Regex Predicate Design
```java
public record RegexRulePredicate(
    Pattern compiledPattern,
    boolean matchExpected
) implements RulePredicate {

    public RegexRulePredicate(String regex, boolean matchExpected) {
        this(Pattern.compile(Objects.requireNonNull(regex, "regex must not be null")), matchExpected);
    }

    @Override
    public boolean test(Object propertyValue) {
        if (propertyValue == null) {
            return false;
        }
        String stringVal = String.valueOf(propertyValue);
        boolean matches = compiledPattern.matcher(stringVal).matches();
        return matches == matchExpected;
    }
}
```

### Domain Model Design
* **Package**: `org.platform.resourcemanager.domain.rule`
* **Core Abstractions**:
  * `RulePredicate`: Functional condition evaluating property values:
    * `NumericComparisonPredicate` (operators `<`, `<=`, `>`, `>=`, `==`, `!=`).
    * `RegexRulePredicate` (pre-compiled `java.util.regex.Pattern` for string barcodes, SKUs, and PLC fault codes).
    * `ExactMatchPredicate` (string/enum equality).
  * `RuleAction`: Action dispatched upon trigger (e.g., `StateTriggerAction`, `MethodInvocationAction`, `EventNotificationAction`).
  * `RuleSubscription`:
    ```java
    public record RuleSubscription(
        String subscriptionId,
        ResourceId targetResource,
        String propertyName,
        RulePredicate predicate,
        RuleAction action,
        boolean active
    )
    ```
  * `RuleSubscriptionEngine`: Thread-safe registry mapping `(ResourceId, propertyName)` -> `List<RuleSubscription>`. Evaluates predicates on property mutation hooks and fires actions asynchronously or inline without blocking CAS operations.

---

## 3. Component 3: `TelemetryHistorianPort` & `RingBufferTelemetryStore`

### Goal
Provide high-frequency time-series telemetry persistence (equivalent to ThingWorx `ValueStream`) capable of handling 50k+ samples/sec per node for sensor readings, motor temperatures, and battery analytics with zero garbage collection spikes.

### Data Collection & Logging Strategies (`DataCollectionType`)
Users can configure logging for **any default or custom property** via declarative collection policies. The engine supports the following 6 collection strategies, designed to maximize data integrity while eliminating redundant database write volume:

#### 1. `ON_CHANGE` (Value Change / Edge Triggered)
* **Mechanics**: Logs a new telemetry record only when the property's instantaneous value differs from its immediately preceding logged value (`!Objects.equals(newValue, lastLoggedValue)`).
* **Evaluation Formula**:
  $$\Delta_{\text{state}} = \begin{cases} \text{Log Point}, & \text{if } V_t \neq V_{t-1} \\ \text{Drop Tick}, & \text{if } V_t = V_{t-1} \end{cases}$$
* **Primary Use Case**: Discrete variables, state machine states (`OperationalStatus`), safety E-Stop interlocks, digital photocell beams, RFID carton read events, and discrete alarm bits.
* **Benefit**: Zero redundant database records when equipment remains in a steady state for hours.

#### 2. `PERIODIC_POLL` (Time-Based Cadence Sampling)
* **Mechanics**: Captures and logs the instantaneous property value at a strict, regular wall-clock time interval (e.g., every 1,000ms, 5s, 60s), irrespective of whether the value has changed.
* **Evaluation Formula**:
  $$\text{Trigger} = \begin{cases} \text{Log Point}, & \text{if } (T_{\text{now}} - T_{\text{last\_logged}}) \ge \text{intervalMs} \\ \text{Drop Tick}, & \text{otherwise} \end{cases}$$
* **Primary Use Case**: Regulated cold-chain pharmaceutical/food warehouse ambient temperature and humidity tracking (where compliance audits mandate guaranteed periodic samples), fluid tank levels, and battery charging curves.
* **Benefit**: Predictable, evenly spaced time-series vectors ideal for graphing and compliance reporting.

#### 3. `DEADBAND_ABSOLUTE` (Delta Threshold / Absolute Deadband)
* **Mechanics**: Designed for continuous analog/floating-point values. Drops minor sensor fluctuations and noise by requiring the absolute numeric change between the incoming value and the last recorded value to meet or exceed a configured static delta ($\Delta$).
* **Evaluation Formula**:
  $$\text{Trigger} = \begin{cases} \text{Log Point}, & \text{if } |V_t - V_{\text{last\_logged}}| \ge \text{deadbandDelta} \\ \text{Drop Tick}, & \text{otherwise} \end{cases}$$
* **Primary Use Case**: AC motor casing temperature ($\Delta \ge 0.5^\circ\text{C}$), conveyor hydraulic line pressure ($\Delta \ge 1.5\text{ bar}$), and pneumatic cylinder pressure.
* **Benefit**: Reduces database write traffic by 80%–90% by discarding standard analog instrumentation jitter.

#### 4. `DEADBAND_PERCENT` (Relative Ratio Shift / Percent Deadband)
* **Mechanics**: Logs an analog metric only when it fluctuates relative to its baseline by a specified percentage threshold ($P\%$). Useful when acceptable drift scales dynamically with magnitude.
* **Evaluation Formula**:
  $$\text{Trigger} = \begin{cases} \text{Log Point}, & \text{if } \frac{|V_t - V_{\text{last\_logged}}|}{|V_{\text{last\_logged}}|} \ge \frac{\text{percentThreshold}}{100} \\ \text{Drop Tick}, & \text{otherwise} \end{cases}$$
* **Primary Use Case**: Autonomous Mobile Robot (AMR) State of Charge percentage (e.g., record on every $\pm 2\%$ battery delta), variable frequency drive (VFD) power draw kW fluctuations, and variable speed conveyor load percentage.
* **Benefit**: Scale-independent compression that maintains resolution during significant shifts while ignoring tiny base oscillations.

#### 5. `SAMPLE_WINDOW` (High-Speed Sliding Window Aggregation / Downsampling)
* **Mechanics**: Incoming high-speed ticks (e.g., 50 Hz to 200 Hz sensor feeds) are ingested continuously into the in-memory `RingBufferTelemetryStore`. Every configured interval (`windowDurationMs`, e.g., 1,000ms), a sliding mathematical reducer generates and persists a single compressed summary value (`AVG`, `MIN`, `MAX`, `RMS`, or `PEAK_TO_PEAK`).
* **Evaluation Formula**:
  $$V_{\text{summary}} = \text{Reduce}\Big(\{ V_i \mid i \in [T_{\text{start}}, T_{\text{end}}] \}\Big)$$
* **Primary Use Case**: High-bay AS/RS crane piezoelectric vibration sensors (RMS velocity), spindle motor tachometer RPM, and 3-axis accelerometer shock monitoring on rough warehouse floors.
* **Benefit**: Prevents JVM garbage collection spikes and DB lock contention while still capturing sub-second mechanical vibration anomalies.

#### 6. `HYBRID_HEARTBEAT` (On-Change / Deadband with Guaranteed Liveness Heartbeat)
* **Mechanics**: Operates primarily as an event-driven logger (`ON_CHANGE` or `DEADBAND`). However, if an asset remains completely stationary or constant beyond a maximum silence threshold (`heartbeatSeconds`, e.g., 60s), the engine forces a telemetry write.
* **Evaluation Formula**:
  $$\text{Trigger} = \begin{cases} \text{Log Point (Event)}, & \text{if } \text{OnChange} \lor \text{DeadbandExceeded} \\ \text{Log Point (Heartbeat)}, & \text{if } (T_{\text{now}} - T_{\text{last\_logged}}) \ge \text{heartbeatSeconds} \\ \text{Drop Tick}, & \text{otherwise} \end{cases}$$
* **Primary Use Case**: Wireless IoT sensors (LoRaWAN, Zigbee, Wi-Fi edge gateways) and field transmitters. Distinguishes between a healthy sensor reading an unchanged value vs. a dead sensor, disconnected cable, or dead battery.
* **Benefit**: Combines maximum storage efficiency with cryptographic liveness verification for industrial safety monitoring.

### Industry Example: High-Bay AS/RS Crane Vibration & Thermal Health Monitoring
* **Scenario**: Automated Storage & Retrieval System (AS/RS) stacker cranes operate 24/7 along 100-meter rails at 4 m/s.
* **Telemetry Streaming & Policy Configuration**:
  * `axisVibrationRms`: Configured as `SAMPLE_WINDOW` (100 Hz raw sensor buffered in RAM, aggregated RMS emitted every 1 sec).
  * `bearingTemperatureC`: Configured as `DEADBAND_ABSOLUTE` ($\Delta \ge 0.5^\circ\text{C}$) with `HYBRID_HEARTBEAT` (every 60s).
  * `batteryStateOfCharge`: Configured as `DEADBAND_PERCENT` (threshold $\ge 2\%$).
  * `operationalStatus`: Configured as `ON_CHANGE`.
* **Storage & Analytics**:
  * `RingBufferTelemetryStore` keeps an in-memory lock-free circular sliding window of the last 10,000 samples per crane without allocating JVM heap objects per tick.
  * Real-time FFT vibration peak detection detects impending bearing spalling or rail misalignment weeks before catastrophic mechanical failure.
  * Historical trends are asynchronously drained via `TelemetryHistorianPort` to cold time-series storage (TimescaleDB / InfluxDB).

### Architectural Design
* **Package**: 
  * Port SPI: `org.platform.resourcemanager.application.port.TelemetryHistorianPort`
  * In-Memory Buffer: `org.platform.resourcemanager.infrastructure.telemetry.RingBufferTelemetryStore`
* **Data Collection Strategy Enum**:
  ```java
  public enum DataCollectionType {
      ON_CHANGE,
      PERIODIC_POLL,
      DEADBAND_ABSOLUTE,
      DEADBAND_PERCENT,
      SAMPLE_WINDOW,
      HYBRID_HEARTBEAT
  }
  ```
* **Property Telemetry Policy Config**:
  ```java
  public record PropertyTelemetryPolicy(
      String propertyName,
      boolean enabled,
      DataCollectionType collectionType,
      int intervalMs,           // For PERIODIC_POLL and SAMPLE_WINDOW
      double deadbandThreshold,  // For DEADBAND_ABSOLUTE and DEADBAND_PERCENT
      int heartbeatSeconds       // For HYBRID_HEARTBEAT
  ) {}
  ```
* **Data Point Record**:
  ```java
  public record TelemetryDataPoint(
      ResourceId resourceId,
      String metricName,
      double value,
      DataCollectionType collectionType,
      Instant timestamp,
      Map<String, String> tags
  ) {}
  ```
* **SPI Port**:
  ```java
  public interface TelemetryHistorianPort {
      void record(TelemetryDataPoint dataPoint);
      void recordBatch(List<TelemetryDataPoint> dataPoints);
      List<TelemetryDataPoint> queryRange(ResourceId resourceId, String metricName, Instant from, Instant to, int limit);
  }
  ```
* **Database Table Schema (Single Partitioned Table / TimescaleDB Hypertable)**:
  ```sql
  CREATE TABLE IF NOT EXISTS resource_telemetry (
      recorded_at      TIMESTAMPTZ      NOT NULL,
      tenant_id        VARCHAR(64)      NOT NULL,
      resource_id      VARCHAR(128)     NOT NULL,
      metric_name      VARCHAR(64)      NOT NULL,
      metric_value     DOUBLE PRECISION NOT NULL,
      collection_type  VARCHAR(32)      NOT NULL, -- 'ON_CHANGE', 'PERIODIC_POLL', 'DEADBAND_ABSOLUTE', etc.
      tags             JSONB            DEFAULT '{}'::jsonb
  );

  -- TimescaleDB Hypertable partitioning (1-day chunks)
  -- SELECT create_hypertable('resource_telemetry', 'recorded_at', chunk_time_interval => INTERVAL '1 day', if_not_exists => TRUE);

  -- High-performance composite lookup index
  CREATE INDEX IF NOT EXISTS idx_telemetry_lookup 
  ON resource_telemetry (tenant_id, resource_id, metric_name, recorded_at DESC);
  ```
* **`RingBufferTelemetryStore` (Infrastructure Implementation)**:
  * Fixed-size circular array or LMAX Disruptor ring buffer per resource/metric.
  * Overwrites oldest values on overflow (bounded memory footprint, deterministic O(1) inserts, zero lock contention).
  * Lock-free atomic head/tail pointer progression.

---

## 4. Phase Breakdown & Execution Steps

| Phase | Milestone | Deliverables |
| :--- | :--- | :--- |
| **Phase 1: Shape Composition** | `ResourceShape` Model & Instantiation | 1. Create `ResourceShape` record.<br>2. Add `ResourceShapeRepositoryPort` & in-memory implementation.<br>3. Update `ResourceTemplate` to support shape composition and property merge rules.<br>4. Unit tests verifying shape composition and override hierarchy. |
| **Phase 2: Reactive Rule Engine** | `RuleSubscriptionEngine` | 1. Implement `RulePredicate` (including `RegexRulePredicate`), `RuleAction`, and `RuleSubscription`.<br>2. Create `RuleSubscriptionEngine` with thread-safe predicate evaluation.<br>3. Connect property mutation callbacks in `Resource` to trigger evaluation.<br>4. Benchmark sub-microsecond evaluation performance. |
| **Phase 3: High-Speed Historian & Logging Policies** | `TelemetryHistorianPort` & RingBuffer | 1. Define `DataCollectionType`, `PropertyTelemetryPolicy`, and `TelemetryDataPoint`.<br>2. Implement collection filter engine (`ON_CHANGE`, `PERIODIC_POLL`, `DEADBAND_ABSOLUTE`, `DEADBAND_PERCENT`, `SAMPLE_WINDOW`, `HYBRID_HEARTBEAT`).<br>3. Implement lock-free `RingBufferTelemetryStore` with configurable buffer capacity.<br>4. Define database schema with `collection_type` audit column.<br>5. Unit and load tests for concurrent ingestion and downsampled persistence. |
