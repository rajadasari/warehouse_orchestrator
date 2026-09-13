# General Code Standards & File Size Limits

**SCOPE**: Entire Warehouse Orchestration Monorepo (Backend Services, Common Libraries, Frontend UI).

---

## 1. Universal Maximum File Size Constraint (< 1000 Lines)
- **Hard 1000-Line Upper Bound**: Code lines in any single file must **NEVER exceed 1000 lines**.
- **Proactive Decomposition**: When any file approaches 800-900 lines, immediately refactor and split it before adding additional logic.
- **Decomposition Guidelines**:
  - **React / Frontend**:
    - Split complex views into parent orchestrator and dedicated sub-views / child components.
    - Extract form state, validations, and submission logic into custom hooks (`useForm`, `use*State`).
    - Extract modals, action dialogs, drawer panels, and complex filters into dedicated files.
    - Move data table column definitions, cell formatters, and row action handlers into separate helper files.
  - **Java / Spring Boot**:
    - Classes must not exceed 300 lines (methods $\le$ 20 lines).
    - Decompose bloated controllers into domain-specific sub-controllers or delegate service processors.
    - Separate query specifications, DTO records, and event handlers into their own files.
    - Extract complex business validation or calculation rules into dedicated stateless validator/calculator components.

---

## 2. Architectural Integrity
- Keep files focused on a single responsibility (SRP).
- Ensure strict type safety: no `any` in TypeScript, no raw types or unchecked casts in Java.
- Maintain test coverage and verify compilation after refactoring or splitting files.
