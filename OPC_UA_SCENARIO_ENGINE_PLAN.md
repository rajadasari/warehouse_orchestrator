# IMPLEMENTATION PLAN: REACTIVE OPC UA SCENARIO & TAG RULE ENGINE
## Functional Node Flow: Tag Discovery, Conditional Predicates & Multi-Node Read/Write

This plan defines the architecture for building a **Reactive Industrial Tag Flow & Scenario Engine** on top of our new `ot-connect` library. It enables dynamic tag discovery from OPC UA servers and evaluates conditional rules (`==`, `!=`, `>`, `>=`, `<`, `<=`) to trigger single or multi-tag writes.

---

## 1. Architectural Concept: Functional Node Pipeline

Similar to PLC Function Block Diagrams (FBD) and Node-RED, the scenario engine decomposes tag operations into a directed execution pipeline:

```
[ INPUT NODE(S) ]               [ LOGIC / PREDICATE NODE ]              [ OUTPUT SINK NODE(S) ]
┌─────────────────────┐        ┌─────────────────────────────┐        ┌──────────────────────┐
│ Source Tag(s) Read  │───────>│ Condition Evaluator         │───────>│ Target Tag(s) Write  │
│ • Subscription Push │        │ (==, !=, >, >=, <, <=)      │        │ • Write Single Tag   │
│ • Polled Interval   │        │ Aggregation: ALL / ANY      │        │ • Write Multi Tags   │
└─────────────────────┘        └─────────────────────────────┘        └──────────────────────┘
```

---

## 2. Supported Read-Write Topologies

The engine natively supports all 4 input-to-output topologies:

| Topology | Pattern | Industrial Scenario Example |
| :--- | :--- | :--- |
| **1-to-1** | Single Read $\rightarrow$ Single Write | If `Conveyor.Speed` $> 2.5$, then write `Conveyor.WarningLight = true`. |
| **1-to-Many** | Single Read $\rightarrow$ Multi Write | If `EStop.Pressed == true`, then write `Motor1.Run = false`, `Motor2.Run = false`, and `Alarm.Siren = true`. |
| **Many-to-1** | Multi Read $\rightarrow$ Single Write | If `Aisle.GateClosed == true` **AND** `Crane.InPosition == true`, then write `SafetyInterlock.Permit = true`. |
| **Many-to-Many** | Multi Read $\rightarrow$ Multi Write | If `Zone1.Full == true` **AND** `Zone2.Empty == true`, then divert pallet flow by writing `Divert1.State = ACTIVE` and `Divert2.State = BYPASS`. |

---

## 3. Core Class & Interface Design

All classes reside in `org.platform.gateway.scenario` within the `ot-connect` library, adhering to the $\le 250$ LOC rule.

### 3.1 Comparison Operators (`ComparisonOperator.java`)
```java
public enum ComparisonOperator {
    EQUALS,
    NOT_EQUALS,
    GREATER_THAN,
    GREATER_THAN_OR_EQUAL,
    LESS_THAN,
    LESS_THAN_OR_EQUAL;

    public boolean evaluate(Object left, Object right);
}
```
- Supports type-coercion across `Number` (Integer, Long, Double, Float), `Boolean`, and `String`.

---

### 3.2 Tag Discovery Service (`TagDiscoveryService.java`)
Connects to the OPC UA server, browses the address space recursively, and returns structured tag metadata:
```java
public record DiscoveredTagNode(
    String nodeId,
    String browseName,
    String displayName,
    String dataType,
    boolean isWritable
) {}

public interface TagDiscoveryService {
    CompletableFuture<List<DiscoveredTagNode>> browseTree(String rootNodeId, int maxDepth);
    CompletableFuture<List<DiscoveredTagNode>> searchTags(String query);
}
```

---

### 3.3 Rule Condition Definition (`TagCondition.java`)
Supports single-tag threshold checks and multi-tag cross comparisons:
```java
public record TagCondition(
    TagAddress sourceTag,
    ComparisonOperator operator,
    Object targetThreshold,       // Literal value (e.g. 50.0 or true)
    TagAddress compareWithTag      // Optional: Compare with another live tag
) {
    public boolean test(DataPoint currentPoint, Map<TagAddress, DataPoint> context);
}
```

---

### 3.4 Multi-Condition Evaluator (`ConditionGroup.java`)
Combines multiple conditions using boolean logic:
```java
public record ConditionGroup(
    LogicalOperator operator,     // ALL (AND) or ANY (OR)
    List<TagCondition> conditions
) {
    public boolean evaluate(Map<TagAddress, DataPoint> tagSnapshots);
}
```

---

### 3.5 Action Targets (`TagAction.java`)
Defines what gets written when conditions pass:
```java
public record TagAction(
    TagAddress targetTag,
    ActionValueSource valueSource // STATIC_VALUE, PASSTHROUGH_SOURCE_VALUE, or EXPRESSION
) {
    public static TagAction writeStatic(TagAddress target, Object value);
    public static TagAction writePassThrough(TagAddress target, TagAddress fromSource);
}
```

---

### 3.6 The Scenario Pipeline Engine (`ScenarioPipeline.java`)
Orchestrates the lifecycle, wires subscriptions from `DeviceGateway`, and executes writes:
```java
public class ScenarioPipeline implements AutoCloseable {

    private final String scenarioId;
    private final DeviceGateway gateway;
    private final ConditionGroup conditionGroup;
    private final List<TagAction> actionsOnTrue;
    private final List<TagAction> actionsOnFalse; // Optional fallback actions

    public void start();
    public void stop();
    public CompletableFuture<ScenarioExecutionReport> triggerManual();
}
```

---

## 4. Concrete Code Example: Building a Scenario

Here is how a developer or script will build and run a scenario using the fluent builder:

```java
// 1. Obtain Gateway from factory
DeviceGateway opc = gatewayFactory.getGateway("opc.tcp://127.0.0.1:4840");

// 2. Discover available tags from PLC
List<DiscoveredTagNode> tags = discoveryService.browseTree("ns=2;s=Line1", 3).join();

// 3. Assemble a Scenario: Temperature Trip & Fan Starter
ScenarioPipeline tripScenario = ScenarioPipeline.builder("TEMP_PROTECTION_RULE")
    .usingGateway(opc)
    // MULTI-READ CONDITION: Temp > 75.0 AND SensorHealthy == true
    .whenAll(
        TagCondition.of("ns=2;s=Line1.Motor.Temperature", ComparisonOperator.GREATER_THAN, 75.0),
        TagCondition.of("ns=2;s=Line1.Motor.SensorHealth", ComparisonOperator.EQUALS, true)
    )
    // MULTI-WRITE ACTIONS ON TRUE:
    .thenWrite(TagAddress.of("ns=2;s=Line1.CoolingFan.Run"), true)
    .thenWrite(TagAddress.of("ns=2;s=Line1.WarningLight"), true)
    .thenWrite(TagAddress.of("ns=2;s=Line1.Conveyor.SpeedLimit"), 1.2) // Slow down
    // ACTIONS ON FALSE (Normalized state):
    .otherwiseWrite(TagAddress.of("ns=2;s=Line1.CoolingFan.Run"), false)
    .otherwiseWrite(TagAddress.of("ns=2;s=Line1.WarningLight"), false)
    .build();

// 4. Start active listening (MonitoredItems trigger automatically on change)
tripScenario.start();
```

---

## 5. Phased Implementation Roadmap

| Step | Milestone | Files to Implement | Outcome |
| :---: | :--- | :--- | :--- |
| **1** | **Predicates & Operators** | `ComparisonOperator.java`<br>`TagCondition.java`<br>`ConditionGroup.java` | Clean, type-safe comparison engine with comprehensive unit tests for all operators. |
| **2** | **Tag Discovery SPI** | `OpcUaTagBrowser.java`<br>`DiscoveredTagNode.java` | Native address-space tree traversal returning browse names, data types, and writable flags. |
| **3** | **Action & Multi-Writer** | `TagAction.java`<br>`ActionValueSource.java` | Handles static value writes, pass-through writes, and atomic batch writing. |
| **4** | **Pipeline & Subscriptions** | `ScenarioPipeline.java`<br>`ScenarioBuilder.java` | Event-driven MonitoredItem listeners triggering conditional evaluation and execution reports. |
| **5** | **Offline Testing Simulator** | `ScenarioIntegrationTest.java` | End-to-end tests against embedded virtual S7-1500 PLC validating 1-1, 1-N, N-1, and N-N scenarios. |

---

## 6. Target Directory Location

All components will be added directly into our compiled and verified **`ot-connect`** library:
```
reseach/ot_connect/src/main/java/org/platform/gateway/
└── scenario/
    ├── api/                    # ComparisonOperator, TagCondition, ConditionGroup
    ├── action/                 # TagAction, ActionValueSource
    ├── browse/                 # TagDiscoveryService, DiscoveredTagNode
    ├── engine/                 # ScenarioPipeline, ScenarioBuilder, ExecutionReport
    └── test/                   # Comprehensive JUnit 5 scenario test cases
```
