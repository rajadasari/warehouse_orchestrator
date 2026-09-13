# Warehouse Orchestrator - Agent Rules & Guidelines

These instructions govern all AI assistant behavior, code generation, and refactoring within this repository.

---

## 1. Core Workflow & Agent Controls
- **No Unsolicited Root Cause Explanations**: Do NOT share root cause or background explanations unless explicitly requested by the user. Focus directly on the solution/action taken.
- **Provide Information on Ask**: Only provide technical deep dives or architectural context when specifically asked.
- **No Browser-Level Testing**: Never perform browser-level or UI subagent testing.
- **No Post-Implementation Walkthroughs**: Do NOT create `walkthrough.md` artifacts or elaborate walkthrough sections after implementation.
- **Targeted & Direct Execution**: Complete implementations cleanly and directly. Run critical verification checks only when needed.

---

## 2. Hard File Length Limit (< 1000 Lines)
- **Strict Prohibition**: Code files must **NEVER** exceed 1000 lines.
- **Proactive File Splitting**: If any file approaches or exceeds 1000 lines, immediately split it into multiple focused, modular files:
  - **Frontend / React**: Split massive views into tab sub-components, modal dialogs, custom hooks (`use*.ts`), and table column/action configurations.
  - **Backend / Java**: Split into sub-controllers, service delegates, dedicated query specifications, and domain DTO records.

---

## 3. Frontend & UI Standards (IEC 62443 Industrial HMI)
Always follow UI rules correctly:
- **100% Air-Gapped & Offline-First (STRICT ZERO CDN POLICY)**:
  - Google Fonts & external font CDNs are **strictly banned**. Use local `@fontsource/inter` or system-ui fallbacks.
  - FontAwesome & external icon stylesheets are **strictly banned**. Use pure React SVG icons from `lucide-react`.
  - External image hotlinking is banned. All assets must reside locally in `public/` or as inline SVGs.
- **Industrial HMI UX**:
  - Touch targets must have a minimum bounding box of **48px x 48px** for shop-floor touchscreens/gloves.
  - High-contrast dark mode for 24/7 control room fatigue reduction.
  - Standard equipment color palette: Emerald (running), Amber (warning/in-motion), Crimson (fault/e-stop), Cyan (manual mode), Slate (offline).
- **IEC 62443 Security**:
  - `<IecPageGuard>` on all routes.
  - `<IecButton>` and `<Can>` for least-privilege action controls.
  - `<DualApprovalModal>` for safety-critical hardware actions (`SAFETY_CRITICAL`).
  - Automatic session lockout watchdog (`useInactivityLock`).
  - No secrets/tokens in `localStorage` or `sessionStorage`.
- **TypeScript Rigor**:
  - `any` is strictly banned. Use strict interfaces and type guards.
  - Functional components and hooks only (class components banned).
  - Immutability and null safety (`?.`, `??`).

---

## 4. Rule References
- Workspace Rules: [.agents/rules/agent_controls.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/.agents/rules/agent_controls.md)
- UI Standards: [.agents/rules/ui_rules.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/.agents/rules/ui_rules.md)
- Code Standards: [.agents/rules/code_standards.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/.agents/rules/code_standards.md)
- Java Standards: [.agent/CODING_JAVA.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/.agent/CODING_JAVA.md)
- React Standards: [.agent/CODING_REACT.md](file:///c:/Users/Windows10/Documents/GitHub/Warehouse_orchestrator/.agent/CODING_REACT.md)
