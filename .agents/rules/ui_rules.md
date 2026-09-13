# Frontend & UI Development Standards (IEC 62443 Industrial HMI)

**SCOPE**: All UI views, components, and hooks in `client/warehouse-ui`.  
**COMPLIANCE**: IEC 62443-3-3 (FR 1, FR 2, FR 3, FR 6), ISA-95 Level 3 HMI, OWASP Top 10 for Client-Side Applications.

---

## 1. File Size & Modularity Enforcement
- **Hard 1000-Line Limit**: No source file may exceed 1000 lines. If a file approaches or exceeds this limit, immediately split it into multiple focused, modular files.
- **Component Granularity**: Aim to keep individual React components under 200 lines.
- **Splitting Strategy**:
  - Extract view sub-sections, tabs, and form steps into separate child components under `components/` or `features/<feature>/components/`.
  - Extract complex state, calculation, and API orchestration logic into custom hooks under `hooks/` or `features/<feature>/hooks/`.
  - Extract modals, confirmation dialogs, and drawer panels into dedicated files.
  - Extract table column configurations, filters, and action menus into dedicated configuration or sub-component files.

---

## 2. Air-Gapped & 100% Offline-First Architecture
Industrial warehouses operate in air-gapped environments with strict isolation from the public internet.
- **Zero External Font CDNs**: Banned: Google Fonts (`fonts.googleapis.com`), external web font stylesheets. All typography must use local `@fontsource/inter` or system-ui fallback stacks.
- **Zero External Icon Fonts / CDNs**: Banned: External FontAwesome or CDN stylesheets. All icons must be pure React SVG components imported from `lucide-react` or inline SVGs.
- **Zero External Asset / Image Hotlinking**: Banned: Unsplash, CDN images. All assets must reside locally in `public/` or as inline Data URIs.
- **Self-Contained Favicons**: Favicons must be defined as SVG Data URIs inside `index.html`.
- **Shop-Floor Network Resilience**: Handheld terminals moving across bays experience Wi-Fi drops. API clients must implement exponential backoff retry and non-blocking offline toast notices.

---

## 3. Industrial Touch & Control Room HMI Standards
- **Touch Target Sizing (ISA-95 Operator Usability)**: Minimum bounding box of **48px x 48px** (with 8px padding) for shop-floor touch screens and RF handhelds to support operators wearing industrial gloves.
- **High-Contrast Dark Mode**: Control room mimics and real-time equipment monitors must use high-contrast dark theme to reduce operator eye fatigue during 24/7 shifts.
- **Equipment Color Coding**:
  - **Running / Normal**: Emerald (`#10B981`)
  - **In-Motion / Diverting / Warning**: Amber (`#F59E0B`)
  - **Emergency Stop / Fault / Alarm**: Crimson (`#EF4444`)
  - **Manual Mode / Maintenance**: Cyan (`#06B6D4`)
  - **Disconnected / Offline**: Slate (`#64748B`)

---

## 4. IEC 62443 Cybersecurity UI Architecture
- **Route Protection**: Wrap all routes in `<IecPageGuard>` verifying granular permission tokens (`PAGE:ASRS:VIEW`, `PAGE:USERS:MANAGE`).
- **Control-Level RBAC**: Interactive buttons must use `<IecButton>` or `<Can>` to evaluate permissions dynamically. Missing permissions render disabled with a policy tooltip or omit from DOM.
- **Safety-Critical Controls (Four-Eyes Principle)**: Actions modifying physical hardware or safety setpoints (`SAFETY_CRITICAL`) must trigger `<DualApprovalModal>` requiring supervisor credentials before dispatching.
- **Inactivity Watchdog**: Terminals must track inactivity (`useInactivityLock`) and display a lock screen requiring PIN/RFID re-entry after 5 minutes of idle time.
- **Strict Token Hygiene**: Banned: Storing tokens, passwords, or PINs in `localStorage` or `sessionStorage`. Access tokens in memory; refresh tokens in httpOnly secure cookies.

---

## 5. TypeScript & React Best Practices
- **Strict Typing**: The `any` type is strictly banned. Use `unknown` with type guards if shapes are dynamic.
- **Functional Exclusivity**: Use functional components and hooks exclusively. Class components are banned.
- **Immutability**: Never mutate state or props directly. Always return new object and array references.
- **Null Safety**: Always use optional chaining (`?.`) and nullish coalescing (`??`) to avoid runtime crashes.
- **Memoization**: Wrap heavy computations in `useMemo` and callbacks passed to SVGs/mimics in `useCallback`.
