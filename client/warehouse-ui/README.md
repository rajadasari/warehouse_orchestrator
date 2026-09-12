# Warehouse Orchestrator — Frontend UI (`warehouse-ui`)

Enterprise digital twin, ASRS/fleet telemetry visualization, and user identity management frontend built with **React 18**, **TypeScript**, and **Vite**.

---

## 1. Quick Start

### Prerequisites
- **Node.js**: v20+ LTS
- **npm**: v10+
- **Backend Services**: `auth-service` running on `http://localhost:8085` (or mapped through API Gateway).

### Development Server
```bash
# Install dependencies (if not already installed)
npm install

# Start development server on port 5173
npm run dev
```

### Production Build
```bash
npm run build
```

---

## 2. Mandatory High-Density UX & 100% Zoom Standards

> [!IMPORTANT]
> To prevent oversized elements, visual bloat, and disruptive scrollbars at **100% browser zoom** on standard laptop/desktop displays (1280x720 / 1366x768 / 1920x1080), **all new pages and components must adhere to the following density metrics**:

### Global Rules (`src/styles/index.css`)
- **Root Font Size**: `13px` (`html { font-size: 13px; }`).
- **Body Typography**: `font-size: 13px; line-height: 1.35;`.
- **Scrollbars**: Slim 6px custom scrollbars (`::-webkit-scrollbar { width: 6px; height: 6px; }`).

### Layout & Page Shell Guidelines
| Component Area | Standard Value | Rationale |
| :--- | :--- | :--- |
| **Side Navigation Bar** | `width: 210px`, padding: `16px 12px` | Leaves maximum horizontal space for data grids & canvas |
| **Page Wrapper Container** | `padding: 16px 20px`, max-width: `1440px` | Fits within 720p/1080p viewports without vertical overflow |
| **Page Header Title** | `fontSize: 18px`, `fontWeight: 700` | Avoids oversized 28px+ display headers |
| **Page Header Subtitle** | `fontSize: 11.5px`, color: `var(--text-secondary)` | High-contrast secondary guidance |
| **Header Action Buttons** | `padding: 6px 12px` or `6px 14px`, `fontSize: 12px` | Compact clickable targets |

### Data Tables & Grids
- **Header Cells (`th`)**: `padding: 8px 12px`, `fontSize: 10px`, `textTransform: uppercase`, `letterSpacing: 0.05em`.
- **Data Rows (`td`)**: `padding: 7px 12px`, `fontSize: 12px`.
- **User / Node Avatars**: `26px x 26px`, `fontSize: 11px`.
- **Badges & Status Tags**: `padding: 2px 7px`, `fontSize: 10.5px`, `borderRadius: 9999px`.

### Metric & KPI Cards
- **Grid Layout**: `gridTemplateColumns: repeat(auto-fit, minmax(180px, 1fr))`, `gap: 10px`.
- **Card Padding**: `10px 14px`, `borderRadius: 10px`.
- **Metric Value**: `fontSize: 18px`, `fontWeight: 700`.
- **Metric Label**: `fontSize: 11px`, `fontWeight: 500`.
- **Icon Container**: `32px x 32px`, `borderRadius: 8px`, icon size: `16px`.

### Dialogs & Modals
- **Modal Container Width**: `400px` – `440px` (avoid 600px+ cards unless multi-tab complex wizards).
- **Header Padding**: `12px 16px`.
- **Form Padding**: `14px 18px`, `gap: 10px`.
- **Input Fields & Selects**: `padding: 6px 10px`, `fontSize: 12px`.
- **Form Labels**: `fontSize: 11px`, `fontWeight: 600`.

---

## 3. Directory Structure

```
client/warehouse-ui/
├── src/
│   ├── components/
│   │   └── layout/
│   │       └── SideNavBar.tsx          # Compact 210px navigation drawer
│   ├── features/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx           # Dual-mode credentials + RFID badge login
│   │   └── users/
│   │       └── UserManagementView.tsx  # Dynamic DB user management & RBAC view
│   ├── services/
│   │   └── authService.ts              # API client fetching from backend REST
│   ├── styles/
│   │   ├── design-tokens.css           # Palette, spacing tokens, elevations
│   │   ├── index.css                   # Root html font-size 13px & scrollbars
│   │   └── typography.css              # Inter font system
│   ├── App.tsx                         # Main app root & auth state router
│   └── main.tsx                        # Entrypoint
├── vite.config.ts                      # Dev server & reverse proxy config
└── package.json
```

---

## 4. Reverse Proxy & Backend Wiring

In development, Vite proxies requests from the frontend to avoid CORS issues:
- `/api/v1/auth/*` → `http://localhost:8085` (`auth-service`)
- `/api/v1/wes/*` → `http://localhost:8086` (`wes-service`)
- All database operations interact directly with PostgreSQL 17 on `[::1]:5432/warehouse_db`.
