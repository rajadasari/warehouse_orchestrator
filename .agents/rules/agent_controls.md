# Agent Interaction & Workflow Controls

- **No Unsolicited Root Cause Explanations**: Do NOT share the root cause or background explanations unless explicitly requested by the user. Keep answers focused directly on the solution/action taken.
- **Provide Information on Ask**: Only provide technical deep dives, explanations, or architectural context when specifically asked.
- **No Browser-Level Testing**: Never perform browser-level or UI subagent testing.
- **No Post-Implementation Walkthroughs**: Do NOT create `walkthrough.md` artifacts or elaborate walkthrough sections after implementation.
- **Targeted & Direct Execution**: Complete the implementation directly and cleanly. Run tests or build checks only if critical to verify changes.
- **Strict File Line Limit (< 1000 Lines)**: Make sure code lines NEVER cross 1000 lines in any file. If a file approaches or crosses this limit, proactively split it into multiple smaller, modular files (extract custom hooks, sub-components, helper classes, DTOs, or service delegates).
- **Strict UI Rules Compliance**: Strictly follow all UI rules and frontend standards (IEC 62443 compliance, ISA-95 HMI touch targets, air-gapped zero external CDN/font/asset policy, high-contrast dark theme, and modular architecture) whenever creating, modifying, or refactoring UI code.
