# Architecture & Implementation Plan: Generic Multi-Tier Resource Studio

## 1. Executive Summary & Problem Analysis
Currently, the Resource Studio UI (`Step1Identity`, `Step2Properties`, `Step3MethodMapping`) has historical biases:
1. **Hardcoded WMS/Software assumptions**:
   * Token acquisition path `/api/authentication` is emphasized as a primary panel even for a crane, conveyor, or AMR where tokens make no sense.
   * `Step1Identity` forces a narrow category list (`SOFTWARE`, `HARDWARE`, `DEVICE`, `PLC`) without explicit support for MES, WCS, Fleet Manager, or Logical Warehouse locations.
2. **Missing Standalone vs. Template Mode**:
   * Currently, `ResourceStudioView` hardcodes `selectedTemplate: null` and does not provide an explicit creation mode switcher:
     * **Mode A: From Template Blueprint** (Pick template from backend $\to$ inherits properties, methods, and shapes $\to$ provide instance overrides).
     * **Mode B: Standalone Resource** (Direct creation without any template $\to$ user defines properties & methods freely).
3. **Restricted Property Types**:
   * Property row in Step 2 only offers `STRING`, `NUMBER`, `BOOLEAN`, `SECRET`, whereas the backend now supports `INTEGER`, `LONG`, `DOUBLE`, `DATETIME`, `ARRAY`, `MAP`, `LOCATION`, `BYTE_ARRAY`.
4. **Code Cleanliness & No Dead Code**:
   * We will clean and generalize the existing studio steps, preserving all valid bindings while removing software-only assumptions.

---

## 2. Key Changes by Component

### 2.1 `Step1Identity.tsx` (Generic Resource Identity & Template Selector)
* Add a prominent **Creation Archetype Switcher**:
  * `[⚡ Template-Based Blueprint]` vs `[🔧 Pure Standalone Resource]`.
* If **Template-Based**:
  * Dropdown/combobox fetching all available templates (`fetchResourceTemplatesApi()`).
  * Selecting a template auto-populates `name`, `category`, `type`, default communication protocol, default port, and loads all template properties & methods into subsequent steps.
* Expanded **Category & Type Taxonomy**:
  * Categories: `PHYSICAL` (AMR, AGV, Stacker Crane, Sorter, Conveyor), `LOGICAL` (Bin, Staging Bay, Aisle, Dock Door, Work Center), `SOFTWARE` (WMS, MES, ERP, WCS, Fleet Manager Gateway), `CONTROLLER` (PLC, SCADA, Edge IPC).
* Generic protocol selector (`REST`, `OPC_UA`, `MQTT`, `MODBUS_TCP`, `GRPC`, `PROFINET`, `TCP_SOCKET`).

### 2.2 `Step2Properties.tsx` (Generic Property Matrix)
* **Generalize Auth Panel**: Collapse token acquisition into a collapsible *"Security & Authentication Credentials"* drawer (only active if an auth method or secret is actually configured, rather than dominating the page).
* **Full PropertyType Dropdown**:
  * Add all supported types: `STRING`, `INTEGER`, `LONG`, `DOUBLE`, `BOOLEAN`, `DATETIME`, `SECRET`, `ENUM`, `ARRAY`, `MAP`, `LOCATION`.
* **Industrial Tag & Binding Fields**:
  * Optional field-bus binding columns for PLC/WCS resources: `plcTagAddress` / `opcUaNodeId`.

### 2.3 `Step3MethodMapping.tsx` & `Step4ValidationSandbox.tsx`
* Ensure methods can be mapped for both template-inherited methods AND custom user-defined methods created on standalone resources.
* Ensure validation test simulation works cleanly for REST, OPC-UA tag read, and PackML commands.

### 2.4 `ResourceStudioView.tsx` (State Orchestration)
* Manage `creationMode: 'TEMPLATE' | 'STANDALONE'`.
* Fetch and bind `selectedTemplate: ResourceTemplateItem | null`.
* Populate `inheritedValues` and default methods from the selected template, while allowing full custom additions.

---

## 3. Execution Phases
1. **Phase 1**: Update `Step1Identity.tsx` with Template vs. Standalone toggle, template loader, and generic industrial category taxonomy.
2. **Phase 2**: Update `Step2Properties.tsx` to support the full Java/domain `PropertyType` enum and de-emphasize software-only auth panels into an optional security accordion.
3. **Phase 3**: Update `ResourceStudioView.tsx` to load templates dynamically and bind them seamlessly across all 4 steps.
4. **Phase 4**: Verification via Vite build (`npm run build`) ensuring zero TypeScript errors and zero unused/dead code.
