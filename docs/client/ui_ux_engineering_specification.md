# RFC-0084: Enterprise UI/UX Engineering Specification & Design System
**Target Platform:** React (TypeScript) + Java Spring Boot (Microservices)  
**Standard Version:** 3.1.0-PROD (Soft UI Aesthetics, Floating Sheet & Analytical Typographic System Addendum)  
**Classification:** Enterprise Engineering Standard (Mandatory)  
**Governing Frameworks:** W3C WCAG 2.2 (Level AA), RFC 7807 (Problem Details), ISO 9241-110, 8-Point Spatial Grid, Core Web Vitals  

---

## 1. Document Control & Governance

### 1.1. Specification Metadata
| Attribute | Specification Value |
| :--- | :--- |
| **RFC Identifier** | RFC-0084 (UI/UX Engineering Architecture) |
| **Author** | Enterprise UI Architecture Committee |
| **Status** | **APPROVED / MANDATORY** |
| **Applicability** | All Web Frontends, Admin Panels, Manufacturing Cockpits/HMIs, Modern Analytics, and Spring Boot Backends |
| **Enforcement Level** | Automated CI/CD Gating (ESLint, Stylelint, axe-core, ArchUnit, Lighthouse CI) |
| **Changelog v3.2.0** | Updated Side Navigation Bar Light Mode Theme to Deep Sapphire Blue (`#153d77`) with High-Contrast White Active Indicators (`#FFFFFF` Pill with `#153d77` Text & Icon) for enhanced ergonomic brand presence and optimal readability. |
| **Changelog v3.1.0** | Added Enterprise Blue Light Mode Theme (`#F0F5FF` Azure Page Canvas, `#2563EB` Royal Blue Interactive Default), Global Practice Compact Typographic Calibration (Eliminating 100% Zoom Bloat; Root Base 14px / 13.5px; Display 20–22px, Metrics 22–24px, Body 13px, Table 12px, Micro 11px), Soft UI & Floating Sheet Architecture (`--radius-sheet: 24px`), Cloud Elevation Shadows, and Unified Font-Sans Architecture. |
| **Changelog v3.0.0** | Added Global Best Practices: WCAG 2.2 Advanced A11y, `prefers-reduced-motion`, Skip Links, CSS Logical Properties (i18n/RTL), Core Web Vitals, Security Hygiene, and Stale Network Telemetry States |

### 1.2. Architecture Review Board (ARB) Sign-off Criteria
Every pull request introducing UI components or backend API contracts must satisfy:
1. Zero custom hardcoded hex codes or pixel dimensions; 100% adherence to Design Tokens.
2. Selection of an approved **Density & Style Profile** (`Profile A: Standard`, `Profile B: Industrial High-Density`, `Profile C: Soft Analytical Cockpit`) declared on root.
3. WCAG 2.2 AA automated check passing with $0$ critical or serious violations via `axe-core` (enforcing strict 11px text floor, 3:1 focus contrast, and 24px/44px minimum target sizes).
4. Application of the **Softness Standard**: Subdued ambient tinted canvas (`--bg-page`), floating rounded sheet container (`--radius-sheet: 24px`), and diffused cloud elevation shadows.
5. Full support for `prefers-reduced-motion: reduce` and Windows High Contrast Mode (`forced-colors: active`).
6. Layout styling constructed using **CSS Logical Properties** (`*-inline`, `*-block`) for bidirectional RTL/i18n compliance.
6. All interactive states specified: `Default`, `Hover`, `Active`, `Focus-Visible`, `Disabled`, and `Loading`.
7. Zero Cumulative Layout Shift (CLS) violations: all images and media declare explicit `aspect-ratio` or dimension properties.
8. External links with `target="_blank"` must declare `rel="noopener noreferrer"`.
9. Spring Boot REST endpoints consumed by UI must implement RFC 7807 `ProblemDetail` with zero unhandled 500 HTML leaks.

---

## 2. Foundational Design Tokens & Mathematical Scales

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           THE 8-POINT SPATIAL SCALE                         │
├───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┬───────┬─────┤
│ 2px   │ 4px   │ 8px   │ 12px  │ 16px  │ 24px  │ 32px  │ 48px  │ 64px  │ ... │
│ 0.125 │ 0.25  │ 0.50  │ 0.75  │ 1.00  │ 1.50  │ 2.00  │ 3.00  │ 4.00  │ rem │
└───────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┴───────┴─────┘
```

### 2.1. Color System Manifest (Light & Dark Inversion Matrix)

The application mandates the **60-30-10 Rule**:
* **60% (Canvas & Surfaces):** Neutral 50/100 (Light) or Neutral 900/950 (Dark).
* **30% (Structure & Typography):** Neutral 200/300 (Borders) and Neutral 700/900 (Text).
* **10% (Interaction & CTAs):** Primary Brand 600/500 and Semantic Accents.

```css
:root {
  /* ==========================================================================
     PRIMARY BRAND TOKENS (Enterprise Azure & Royal Blue Palette)
     ========================================================================== */
  --color-primary-50:  #EFF6FF; /* Ice Blue Tint */
  --color-primary-100: #DBEAFE; /* Soft Blue Tint */
  --color-primary-200: #BFDBFE; /* Pale Sky Blue Accent */
  --color-primary-300: #93C5FD; /* Sky Blue */
  --color-primary-400: #60A5FA; /* Accent Azure */
  --color-primary-500: #3B82F6; /* Vibrant Corporate Blue */
  --color-primary-600: #2563EB; /* Interactive Default / Royal Blue */
  --color-primary-700: #1D4ED8; /* Interactive Hover / Deep Blue */
  --color-primary-800: #1E40AF; /* Interactive Active / Navy Blue */
  --color-primary-900: #1E3A8A; /* Midnight Blue */
  --color-primary-950: #172554; /* Deep Marine Navy */

  /* ==========================================================================
     NEUTRAL TOKENS (Blue-Tinted Slate & Oceanic Grays - Never Dead #808080)
     ========================================================================== */
  --color-neutral-0:   #FFFFFF;
  --color-neutral-50:  #F0F5FF; /* Page Canvas (Light Mode Blue Theme) */
  --color-neutral-100: #EBF3FE; /* Card Surface Subtle / Row Hover (Light) */
  --color-neutral-200: #DCE6F5; /* Subtle Borders (Light) */
  --color-neutral-300: #BAD0F0; /* Input Borders (Light) */
  --color-neutral-400: #8DA2C0; /* Disabled / Placeholder */
  --color-neutral-500: #577399; /* Secondary Icons */
  --color-neutral-600: #334D6E; /* Muted Body Copy */
  --color-neutral-700: #1C314C; /* Secondary Headings */
  --color-neutral-800: #0F1E36; /* Card Surface (Dark) */
  --color-neutral-900: #0C1A30; /* Primary Text (Light) / Page Canvas (Dark) */
  --color-neutral-950: #060D1A; /* Deep Surface (Dark) */

  /* ==========================================================================
     SEMANTIC STATUS PALETTE (WCAG AA Compliant on Neutral-0 & Neutral-900)
     ========================================================================== */
  --color-success-bg:   #ECFDF5;
  --color-success-base: #10B981;
  --color-success-text: #065F46;

  --color-warning-bg:   #FFFBEB;
  --color-warning-base: #F59E0B;
  --color-warning-text: #92400E;

  --color-danger-bg:    #FEF2F2;
  --color-danger-base:  #EF4444;
  --color-danger-text:  #991B1B;

  --color-info-bg:      #EFF6FF;
  --color-info-base:    #3B82F6;
  --color-info-text:    #1E40AF;

  /* ==========================================================================
     MANDATORY FONT FAMILY ARCHITECTURE
     ========================================================================== */
  --font-sans:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* ==========================================================================
     SEMANTIC THEME TOKENS (LIGHT MODE BLUE THEME DEFAULT)
     ========================================================================== */
  --bg-page:           var(--color-neutral-50);  /* #F0F5FF Atmospheric Cool Azure Canvas */
  --bg-surface:        var(--color-neutral-0);   /* #FFFFFF Crisp White Sheet & Panels */
  --bg-surface-subtle: var(--color-neutral-100); /* #EBF3FE Inset Containers & Table Row Hover */
  --bg-sidebar:        #153d77;                  /* #153d77 Deep Sapphire Blue Navigation Rail (Light Theme) */
  --bg-sidebar-active: #EFF6FF;                  /* High-Contrast Active Pill Container */
  --text-sidebar-active: #153d77;                /* Deep Sapphire Blue Active Item Text / Icon */
  --border-default:    var(--color-neutral-200); /* #DCE6F5 Subtle Blue Hairline Borders */
  --border-strong:     var(--color-neutral-300); /* #BAD0F0 Defined Blue Borders for Focus/Inputs */
  --text-primary:      var(--color-neutral-900); /* #0C1A30 Deep Oceanic Navy */
  --text-secondary:    var(--color-neutral-600); /* #334D6E Muted Slate Blue */
  --text-disabled:     var(--color-neutral-400); /* #8DA2C0 Subdued Blue-Slate */
  --focus-ring:        rgba(37, 99, 235, 0.35);  /* Enterprise Royal Blue Glow */
  --brand-gradient:    linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
}

/* ==========================================================================
   DARK THEME OVERRIDES
   ========================================================================== */
[data-theme="dark"] {
  --bg-page:        var(--color-neutral-950);
  --bg-surface:     var(--color-neutral-900);
  --bg-surface-subtle: var(--color-neutral-800);
  --border-default: var(--color-neutral-800);
  --border-strong:  var(--color-neutral-700);
  --text-primary:   var(--color-neutral-50);
  --text-secondary: var(--color-neutral-400);
  --text-disabled:  var(--color-neutral-600);
  --focus-ring:     rgba(129, 140, 248, 0.45);
}

### 2.2. Typography Specification & Tri-Density Profiles

RFC-0084 aligns strictly with **global enterprise engineering standards** (Linear, Datadog, Palantir Foundry, GitHub, AWS Management Console, Grafana, Bloomberg Terminal).

#### 2.2.1. Global Practice Alignment: The Enterprise Density Mandate (Eliminating 100% Zoom Bloat)
* **The Consumer Web Anti-Pattern (Base 16px):** Consumer websites (Airbnb, Medium) assume mobile screens and casual reading, using large bases (`16px`), giant headers (`36px`–`48px`), and loose spacing. When applied to enterprise operations platforms, this creates severe visual bloat at 100% browser zoom, forcing operators and engineers to manually zoom out (`Ctrl + -` to 80% or 90%) to fit their telemetry on screen.
* **The Global Enterprise Practice (Base 13px – 14px):** Global enterprise platforms establish a compact **Base 13px or 14px Root Scale**. Headers are restrained and sleek (`20px`–`22px`), primary metric numbers are sharp and compact (`22px`–`24px`), body copy is crisp (`13px`), tables sit at `12px`, and micro-tags declare an `11px` floor (strictly adhering to WCAG 2.2 AA). At 100% browser zoom, complex multi-column telemetry fits naturally on standard 1080p desktop and laptop displays without visual crowding.

* **Exact Font Family Tokens (Mandatory Architecture):**
  ```css
  --font-sans:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  ```
* **Unified Font Architecture:**
  * `--font-sans`: Universal font family applied across all UI components, hero brand titles, display headings, body copy, form inputs, metrics, data tables, and numerical telemetry.

#### Typographic Scale Comparison Table (Global Enterprise Calibration)

| Token | Profile A: Consumer Web (Base 16px) | Profile B: Industrial Cockpit / MES (Base 13px - Ultra-Dense) | Profile C: Soft Analytical Cockpit (Base 14px - Global Default) | Line Height | Letter Spacing | Global Enterprise Standard Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `--type-display` | `2.000rem` (32.0px) | `1.538rem` (20.0px) | `1.571rem` (22.0px) | `1.15` | `-0.025em` | Cockpit hero title, brand wordmark (Understated, non-bloated) |
| `--type-metric-hero` | `1.750rem` (28.0px) | `1.692rem` (22.0px) | `1.714rem` (24.0px) | `1.00` | `-0.020em` | Primary KPI counters (e.g. OEE 72%, PA 40%, 19,293) |
| `--type-metric-card` | `1.500rem` (24.0px) | `1.385rem` (18.0px) | `1.428rem` (20.0px) | `1.10` | `-0.015em` | Line card hero metrics, secondary counters |
| `--type-pill-metric` | `1.000rem` (16.0px) | `1.000rem` (13.0px) | `1.000rem` (14.0px) | `1.00` | `-0.010em` | Dual-metric split pills (e.g. 786 \| 286) |
| `--type-h1` | `1.750rem` (28.0px) | `1.385rem` (18.0px) | `1.357rem` (19.0px) | `1.20` | `-0.020em` | Major cockpit views, section titles |
| `--type-h2` | `1.375rem` (22.0px) | `1.154rem` (15.0px) | `1.143rem` (16.0px) | `1.25` | `-0.015em` | Panel headers, modal dialog titles |
| `--type-h3` | `1.125rem` (18.0px) | `1.000rem` (13.0px) | `1.000rem` (14.0px) | `1.30` | `-0.010em` | Sub-panel titles, line card module headings |
| `--type-body` | `1.000rem` (16.0px) | `1.000rem` (13.0px) | `0.928rem` (13.0px) | `1.40` | `0.000em` | General copy, form inputs, button labels |
| `--type-small` | `0.875rem` (14.0px) | `0.923rem` (12.0px) | `0.857rem` (12.0px) | `1.35` | `+0.010em` | Filter chips, calendar dates, table rows, steppers |
| `--type-micro` | `0.750rem` (12.0px) | `0.846rem` (11.0px) | `0.785rem` (11.0px) | `1.25` | `+0.050em` | Uppercase badges, map pins, column headers (WCAG Floor) |
| `--type-nano` | `0.687rem` (11.0px) | `0.769rem` (10.0px) | `0.714rem` (10.0px) | `1.20` | `+0.060em` | Sub-pill descriptions, micro metric tags (Uppercase + Bold) |

#### Mandatory Typographic Governance Rules:
1. **Root Font-Size Calibrated for 100% Zoom (Eliminating Manual Browser Zoom-Out):**
   ```css
   /* Default Enterprise Application Root (Profile C - Soft Analytical Cockpit) */
   html {
     font-size: 14px;
   }

   /* High-Density Industrial Operations & SCADA Terminals (Profile B) */
   [data-density="high"],
   .theme-cockpit {
     font-size: 13.5px;
   }
   ```
   *By locking the root font size to `14px` (or `13.5px` in high-density cockpits), the interface replicates the crisp, compact aesthetic of industry leaders (Linear, Datadog, Palantir, GitHub) natively at 100% browser zoom.*
2. **Subpixel Smoothing Standard (Soft Text Rendering):**
   ```css
   html, body {
     -webkit-font-smoothing: antialiased;
     -moz-osx-font-smoothing: grayscale;
     text-rendering: optimizeLegibility;
   }
   ```
   *All modern enterprise web interfaces must apply hardware antialiasing to eliminate jagged subpixel rendering and maintain crisp legibility across high-DPI and standard monitors.*
3. **The Readability Floor & Micro Text Governance (WCAG 2.2 AA):**
   $$\text{font-size} \ge 11\text{px} \quad \text{for standard interactive text, column headers, and general documentation}$$
   *When decorative or high-density micro descriptions (`10px`) are used in telemetry sub-pills or overlines, they must:*
   - Be styled in full uppercase (`text-transform: uppercase`).
   - Declare bold weight (`font-weight: 700` or `800`).
   - Declare expanded letter spacing (`letter-spacing: 0.05em` to `0.08em`).
   - Declare `user-select: none;` and provide descriptive parent `aria-label` or `title` attributes for assistive technology.
4. **Tabular Numerals Across All Telemetry:** All numerical metrics, KPIs, sparkline indicators, and VINs must declare `font-variant-numeric: tabular-nums;` to guarantee fixed character widths and eliminate column jitter during live streaming updates.
5. **Line-Length Limit (Reading Measure):** Body paragraphs must never exceed `65ch` (`max-width: 65ch;`).

---

### 2.3. Spatial System (Strict 8-Point Grid & High-Density Scale)

#### Standard Spatial Tokens (`:root` Profile A):
```css
:root {
  --space-0-5: 0.125rem; /* 2px  - Micro border offsets, icon badges */
  --space-1:   0.250rem; /* 4px  - Compact gaps, inline chips */
  --space-2:   0.500rem; /* 8px  - Form field internal vertical padding */
  --space-3:   0.750rem; /* 12px - Compact table padding, tag margins */
  --space-4:   1.000rem; /* 16px - Standard button padding, card gutters */
  --space-6:   1.500rem; /* 24px - Section gaps, card internal padding */
  --space-8:   2.000rem; /* 32px - Layout division, modal padding */
  --space-12:  3.000rem; /* 48px - Macro section dividers */
  --space-16:  4.000rem; /* 64px - Hero margins, major page containers */
}
```

#### Industrial High-Density Cockpit Overrides (`[data-density="high"]` Profile B):
```css
[data-density="high"],
.theme-cockpit {
  /* Spatial compression for data-dense dashboards */
  --space-card:    12px 14px;
  --space-grid:    12px;
  --header-height: 46px;
  --btn-height:    32px;
  --row-height:    34px;
  --input-height:  32px;
}
```

#### The Law of Proximity Formulation:
$$\text{Spacing between Related Items (Label + Input)} \le 8\text{px}$$
$$\text{Spacing between Unrelated Items (Form Groups)} \ge 24\text{px (Standard)} \quad \text{or} \quad \ge 14\text{px (High-Density)}$$

---

### 2.4. Elevation, Depth & Multi-Layer Shadow Tokens

Realistic shadows require two distinct layers: an **ambient diffusion layer** (simulating skylight/room bounce) and a **direct directional key-light layer**.

```css
:root {
  /* Level 0: Pure Flat / Canvas */
  --elevation-0: none;

  /* Level 1: Resting Cards & Panels */
  --elevation-1: 0 1px 2px 0 rgba(15, 23, 42, 0.05),
                 0 1px 3px 1px rgba(15, 23, 42, 0.03);

  /* Level 2: Hovered Cards, Action Bars */
  --elevation-2: 0 4px 6px -1px rgba(15, 23, 42, 0.07),
                 0 2px 4px -2px rgba(15, 23, 42, 0.04);

  /* Level 3: Dropdowns, Popovers, Flyout Menus */
  --elevation-3: 0 10px 15px -3px rgba(15, 23, 42, 0.09),
                 0 4px 6px -4px rgba(15, 23, 42, 0.04);

  /* Level 4: Modals, Drawers, Lightboxes */
  --elevation-4: 0 20px 25px -5px rgba(15, 23, 42, 0.12),
                 0 8px 10px -6px rgba(15, 23, 42, 0.06);

  /* ==========================================================================
     SOFT AMBIENT "CLOUD" ELEVATIONS (Silky / Diffused Multi-Layer Shadows)
     ========================================================================== */
  /* Floating Sheet Elevation: Ultra-wide diffusion for primary workspace canvas */
  --elevation-sheet: 0 20px 50px -10px rgba(15, 23, 42, 0.06),
                     0 4px 16px -2px rgba(15, 23, 42, 0.03);

  /* Soft Sub-Card Elevation: Non-intrusive floating depth */
  --elevation-card-soft: 0 8px 24px -4px rgba(15, 23, 42, 0.05),
                         0 2px 6px -1px rgba(15, 23, 42, 0.02);

  /* Dual-Metric Pill Elevation: Glow aura for interactive stat capsules */
  --elevation-pill: 0 4px 14px 0 rgba(192, 38, 211, 0.28);

  /* Centerpiece Rosette Elevation: Organic floating badge aura */
  --elevation-rosette: 0 4px 14px 0 rgba(0, 0, 0, 0.12);
}
```

#### Ambient Tinted Page Canvas Standard:
To achieve optical "softness" and eliminate harsh contrast glare, the page canvas (`--bg-page`) must use an atmospheric tinted neutral rather than sterile white (`#FFFFFF`) or flat dead gray:
* **Enterprise Azure Mist (Blue Light Theme Standard):** `#F0F5FF` (Standard for High-Trust Enterprise Analytics & Manufacturing Cockpits).
* **Lavender Mist:** `#E3E5F3` (Standard for Modern Creative & Product Analytics).
* **Cool Slate Mist:** `#EEF1F8` (Standard for Industrial & Automotive Telemetry).
* **Warm Pearl:** `#F0F2F7` (Standard for Enterprise ERP & Financial Data).
* **Dark Velvet Obsidian:** `#060D1A` / `#0F1E36` (Soft Dark Oceanic Canvas).

---

### 2.5. Border-Radius, Floating Sheet & Pill Geometry

```css
:root {
  --radius-xs: 2px;
  --radius-sm: 4px;      /* Checkboxes, micro tags */
  --radius-md: 6px;      /* Inputs, secondary buttons */
  --radius-lg: 10px;     /* Internal cards, nested modules */
  --radius-xl: 16px;     /* Modals, flyout panels */
  --radius-sheet: 24px;  /* Floating Dashboard Sheet Container (Soft UI Standard) */
  --radius-pill: 9999px; /* Dual-metric split pills, status capsules, month/time chips */
}
```

```
┌────────────────────────────────────────────────────────┐
│ Outer Container (R_outer = 16px, Padding = 12px)       │
│   ┌────────────────────────────────────────────────┐   │
│   │ Inner Card (R_inner = 16px - 12px = 4px)       │   │
│   │ Concentric arc curvature prevents visual gaps. │   │
│   └────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```
**The Mathematical Invariance:**
$$R_{\text{inner}} = \max\left(0, R_{\text{outer}} - \text{Padding}\right)$$

---

### 2.6. Industrial Telemetry & Robotics Semantic Matrix

For automotive assembly lines, robotic spot-welding cells, battery marriage, and AGV fleet cockpits:

| State | Semantic Token | Light Mode Value | Dark Mode Value | Telemetry Indication |
| :--- | :--- | :--- | :--- | :--- |
| **Running / Optimal** | `--status-running` | `#065F46` / `#ECFDF5` | `#10B981` / `rgba(16,185,129,0.15)` | Station actively processing within cycle time (<45s) |
| **Buffering / Starved** | `--status-buffer` | `#92400E` / `#FFFBEB` | `#F59E0B` / `rgba(245,158,11,0.15)` | Upstream starve or downstream full buffer |
| **Interlock Warning** | `--status-warning` | `#B45309` / `#FEF3C7` | `#FBBF24` / `rgba(251,191,36,0.15)` | Tolerance drift, robot temperature threshold alert |
| **E-Stop / Safety Trip** | `--status-critical` | `#991B1B` / `#FEF2F2` | `#EF4444` / `rgba(239,68,68,0.15)` | Physical safety light curtain breach, e-stop engaged |
| **Tooling / Offline** | `--status-offline` | `#475569` / `#F1F5F9` | `#94A3B8` / `rgba(148,163,184,0.15)` | Scheduled preventative maintenance / cell isolated |

---

### 2.7. Multi-Tenant & Customer Brand Theming Architecture (White-Label Engineering)

Enterprise SaaS and multi-tenant applications must support custom customer brand themes (e.g. Coca-Cola Red, Siemens Petrol, Nexus Cobalt) without modifying or duplicating component CSS:

#### 2.7.1. The 3-Tier Token Architecture
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: GLOBAL PALETTES (Raw Primitive Palette Storage)                     │
│ --raw-indigo-600: #4F46E5;  --raw-red-600: #DC2626;  --raw-teal-600: ...    │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER 2: TENANT ALIAS LAYER (Dynamically Swapped per Customer Profile)        │
│ --color-primary-600: var(--tenant-primary);                                 │
│ --color-primary-500: var(--tenant-primary-light);                           │
│ --focus-ring:        var(--tenant-focus-ring);                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIER 3: COMPONENT BINDINGS (Components NEVER touch hardcoded hex values)    │
│ .btn--primary { background: var(--color-primary-600); }                     │
│ .nav-link.active::after { background: var(--color-primary-500); }           │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2.7.2. Database-Driven Runtime Injection (Spring Boot Tenant API)
When a customer logs in, their branding configuration is returned by Spring Boot:

```json
// GET /api/v1/tenant/branding
{
  "tenantId": "coca-cola",
  "displayName": "The Coca-Cola Company",
  "brandPrimary": "#F40009",
  "brandAccent": "#FFFFFF",
  "logoUrl": "https://cdn.company.com/tenants/coke-logo.svg"
}
```

The frontend dynamically derives the subtle shades and focus rings via CSS `color-mix()`:
```javascript
function applyCustomerBranding(tenant) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary-600', tenant.brandPrimary);
  root.style.setProperty('--color-primary-500', tenant.brandPrimary);
  // Algorithmic shade derivations
  root.style.setProperty('--color-primary-50', `color-mix(in srgb, ${tenant.brandPrimary} 8%, white)`);
  root.style.setProperty('--color-primary-100', `color-mix(in srgb, ${tenant.brandPrimary} 15%, white)`);
  root.style.setProperty('--focus-ring', `color-mix(in srgb, ${tenant.brandPrimary} 40%, transparent)`);
}
```

#### 2.7.3. Attribute-Based Theme Switching (`data-brand` + `data-theme`)
For pre-registered enterprise brand packs, the layout swaps branding via HTML attributes:

```html
<!-- Client A: Automotive Cobalt -->
<body data-theme="dark" data-brand="cobalt">

<!-- Client B: Enterprise Crimson (Coca-Cola) -->
<body data-theme="dark" data-brand="crimson">

<!-- Client C: Clean Energy Emerald -->
<body data-theme="light" data-brand="emerald">
```

```css
/* tokens.css - Dynamic Brand Pack Overrides */
[data-brand="cobalt"] {
  --color-primary-600: #4F46E5;
  --color-primary-500: #6366F1;
  --focus-ring: rgba(79, 70, 229, 0.40);
}

[data-brand="crimson"] {
  --color-primary-600: #DC2626;
  --color-primary-500: #EF4444;
  --focus-ring: rgba(220, 38, 38, 0.40);
}

[data-brand="emerald"] {
  --color-primary-600: #059669;
  --color-primary-500: #10B981;
  --focus-ring: rgba(5, 150, 105, 0.40);
}

[data-brand="saffron"] {
  --color-primary-600: #D97706;
  --color-primary-500: #F59E0B;
  --focus-ring: rgba(217, 119, 6, 0.40);
}
```

#### 2.7.4. Algorithmic Contrast Safety (WCAG 2.2 Protection)
When customers configure their brand color in administrative settings, low-contrast selections (e.g. pastel yellow, light cyan) must not render illegible white button text:
* **The Dynamic Foreground Invariance:**
  ```css
  .btn--primary {
    background: var(--color-primary-600);
    /* Automatically switches between #FFFFFF and #0F172A depending on brand luminance */
    color: color-contrast(var(--color-primary-600) vs #FFFFFF, #0F172A);
  }
  ```

#### 2.7.5. React `ThemeProvider` Context Pattern
```tsx
import React, { createContext, useContext, useEffect } from 'react';

export interface TenantBranding {
  tenantId: string;
  brandPrimary: string;
  logoUrl: string;
}

const TenantThemeContext = createContext<TenantBranding | null>(null);

export const TenantThemeProvider: React.FC<{ branding: TenantBranding; children: React.ReactNode }> = ({
  branding,
  children
}) => {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary-600', branding.brandPrimary);
    root.style.setProperty('--color-primary-500', branding.brandPrimary);
    root.style.setProperty('--focus-ring', `color-mix(in srgb, ${branding.brandPrimary} 40%, transparent)`);
  }, [branding]);

  return <TenantThemeContext.Provider value={branding}>{children}</TenantThemeContext.Provider>;
};
```

---

### 2.8. The Soft UI & Floating Sheet Architecture Pattern (The "Soft Web" Standard)

Modern analytical cockpits and premium enterprise applications achieve aesthetic distinction and visual comfort through **optical softness, ambient depth, and organic geometry**. This pattern eliminates the sterile, clinical feel of traditional enterprise tools without sacrificing information density.

#### 2.8.1. The 3-Tier Canvas & Floating Sheet Architecture
Rather than mounting UI controls directly onto a stark white viewport, the interface employs a hierarchical 3-tier layering model:

1. **Tier 1: Ambient Tinted Canvas (`--bg-page`):**
   - The root viewport (`<body>`, `<main>`) is dressed in a soft, silky atmospheric tint (`#E3E5F3` Lavender, `#EEF1F8` Cool Slate, or `#F0F2F7` Warm Pearl).
   - Generous outer padding: `--space-6` to `--space-8` (24px - 32px) on desktop, centering the workspace.
2. **Tier 2: Floating Curved Sheet Container (`.dashboard-sheet`, `--radius-sheet: 24px`):**
   - The primary application viewport is housed within a continuous floating card container.
   - Declares `background-color: var(--bg-surface)` (`#FFFFFF` in light mode, `#151329` in dark mode).
   - Declares `--radius-sheet: 24px` (or `20px`–`28px` based on scale) and `--elevation-sheet` (cloud elevation).
   - Outlined with a sub-perceptual translucent border: `border: 1px solid var(--border-default)`.
3. **Tier 3: Internal Functional Modules (`.middle-col`, `.bottom-col`):**
   - Inner data modules sit directly within the sheet, organized by translucent vertical and horizontal hairline dividers (`1px solid var(--border-default)` or `rgba(0, 0, 0, 0.06)`).

```css
/* Core Floating Sheet Implementation Pattern */
.vocibus-canvas {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6) var(--space-4);
  background-color: var(--bg-page); /* Tinted ambient background */
}

.dashboard-sheet {
  width: 100%;
  max-width: 1240px;
  background-color: var(--bg-sheet);
  border-radius: var(--radius-sheet); /* 24px */
  box-shadow: var(--elevation-sheet); /* Cloud elevation */
  padding: var(--space-8);
  border: 1px solid var(--border-default);
  transition: background-color 200ms ease, box-shadow 200ms ease;
}
```

#### 2.8.2. Dual-Metric Split Pill Capsules
For multi-attribute indicators (e.g. `Actual | Target`, `Throughput | Capacity`, `786 | 286`):
- Uses full pill curvature: `border-radius: var(--radius-pill);` (`9999px`).
- Gradient background fill (`linear-gradient(135deg, #C026D3 0%, #E879F9 100%)`).
- Tabular numeric alignment with translucent 1px vertical separator line (`rgba(255, 255, 255, 0.4)`).
- Subdued uppercase micro description underneath (`8.5px`–`10px`, bold, `letter-spacing: 0.04em`).

```css
.dual-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  background: var(--gradient-pill);
  color: #FFFFFF;
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  box-shadow: var(--elevation-pill);
  font-family: var(--font-sans);
  font-weight: 800;
  font-size: var(--type-pill-metric); /* 15px */
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.dual-pill__divider {
  width: 1px;
  height: 12px;
  background-color: rgba(255, 255, 255, 0.4);
}
```

#### 2.8.3. Visual Softness & Organic Data Representation Rules
1. **Wave Curve Smoothing:** All trendlines and sparklines must use cubic bezier splines with smoothed curvature (`stroke-linecap: round; stroke-linejoin: round;`). Underfill fills must use subtle linear gradients with top opacity $\le 35\%$ fading to $0\%$ at the baseline.
2. **Radial Gauge Curves:** SVG progress rings must feature rounded stroke terminals (`stroke-linecap: round;`) and subtle neutral track rings.
3. **Scalloped & Organic Badging:** For hero scorecards and aggregate indicators, interfaces may employ multi-lobed organic geometries (e.g. 16-petal rosette badge) to establish a human-centered, premium focal point.
4. **Subdued Translucent Dividers:** Never use harsh pure black or dark gray rules (`#000000`, `#64748B`). All visual partitions must use `border-bottom: 1px solid rgba(0, 0, 0, 0.06)` (light mode) or `rgba(255, 255, 255, 0.08)` (dark mode).

---

## 3. Component Specification Matrix

### 3.0. Component Typographic Binding Matrix (Mandatory Architecture)

Every UI component across all enterprise web applications, admin portals, and industrial cockpits must explicitly bind its typography to the foundational font family token:
```css
:root {
  --font-sans:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
```

Arbitrary font definitions, system font leaks, or uncalibrated inheritance are strictly prohibited.

| Component Category | Target Elements & Classes | Bound Font Family Token | Styling & Functional Rationale |
| :--- | :--- | :--- | :--- |
| **Interactive Controls** | `.btn`, `.btn--primary`, `.btn--secondary`, `.btn--destructive`, `.state-switcher-bar button` | `font-family: var(--font-sans);` | High legibility, crisp rendering during micro-interactions, robust touch target readability |
| **Form Inputs & Labels** | `.form-label`, `.form-input`, `.form-select`, `.form-textarea`, `.form-error`, `.form-hint` | `font-family: var(--font-sans);` | Maximum readability during data entry; eliminates visual ambiguity between characters |
| **Display Headings & Titles** | `h1`, `h2`, `h3`, `.type-display`, `.type-h1`, `.type-h2`, `.type-h3`, `.brand-wordmark`, `.modal-title` | `font-family: var(--font-sans);` | Modern geometric grotesque curvature imparting authoritative brand identity |
| **Hero Numbers & Dual Pills** | `.metric-big-num`, `.dual-pill`, `.rosette-number`, `.sparkline-number` | `font-family: var(--font-sans);` | Bold numeric counters (`800`/`900` weight) paired with tabular alignment |
| **Telemetry & Numerical Data** | `.font-mono`, `.tabular-nums`, `td.font-mono`, `.ticker-pulse + span`, `.timestamp`, `.code-snippet` | `font-family: var(--font-sans);` | Strict tabular numeric alignment (`tabular-nums`), prevents UI column jitter during live telemetry |
| **Data Tables** | `.mfg-table` (base: `--font-sans`), `th` (headers: `--font-sans`, uppercase), `td` (cells: `--font-sans`) | `font-family: var(--font-sans);` | Uniform typographic clarity across headers, descriptions, and tabular numeric values |
| **Status Badges & Tags** | `.badge`, `.badge--success`, `.badge--warning`, `.badge--danger`, `.status-pill`, `.chip` | `font-family: var(--font-sans);` | Uppercase compact badges (`8.5px`–`11px`) with expanded letter-spacing (`0.04em`–`0.08em`) |
| **Overlays & Dialogs** | `.modal-dialog`, `.modal-body`, `.modal-footer`, `.toast`, `.dropdown-menu`, `.tooltip` | `font-family: var(--font-sans);` | Clear instructional text, accessible contrast, predictable system feedback |

---

### 3.1. Button Component State Matrix

Every interactive button must implement all $6$ distinct states across both Standard (44px) and High-Density (32px) profiles:

| Variant | State | Background | Text Color | Border | Shadow | Transform / Feedback |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary** | `Default` | `var(--color-primary-600)` | `#FFFFFF` | None | `var(--elevation-1)` | None |
| | `Hover` | `var(--color-primary-700)` | `#FFFFFF` | None | `var(--elevation-2)` | `translateY(-1px)` |
| | `Active` | `var(--color-primary-800)` | `#FFFFFF` | None | `var(--elevation-0)` | `translateY(0px)` |
| | `Focus-Vis`| `var(--color-primary-600)`| `#FFFFFF` | None | `var(--elevation-1)` | `box-shadow: 0 0 0 3px var(--focus-ring)` |
| | `Disabled` | `var(--color-neutral-200)`| `var(--color-neutral-400)`| None | None | `cursor: not-allowed; opacity: 0.6` |
| | `Loading` | `var(--color-primary-600)` | `transparent`| None | None | Spinner centered; width locked |
| **Secondary**| `Default` | `var(--bg-surface)` | `var(--text-primary)` | `1px solid var(--border-strong)` | `var(--elevation-1)` | None |
| | `Hover` | `var(--bg-surface-subtle)` | `var(--text-primary)` | `1px solid var(--color-neutral-400)` | `var(--elevation-2)` | `translateY(-1px)` |
| **Destructive**| `Default`| `var(--color-danger-base)` | `#FFFFFF` | None | `var(--elevation-1)` | None |
| | `Hover` | `var(--color-danger-text)` | `#FFFFFF` | None | `var(--elevation-2)` | `translateY(-1px)` |

* **Button Sizing & Typographic Standard:**
  * **Standard Web (`.btn--md`):** `min-height: 44px; padding: 0 16px; font-size: 14px; font-family: var(--font-sans);` (Fitts's Law touch target).
  * **High-Density Cockpit (`.btn--compact`):** `height: 32px; padding: 0 12px; font-size: 13px; font-family: var(--font-sans);` (Maximizes dashboard data visibility).

```css
/* Button Component Typographic Architecture */
.btn {
  font-family: var(--font-sans);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: 1.2;
}

.btn--primary {
  background-color: var(--color-primary-600);
  color: #FFFFFF;
}

.btn--secondary {
  background-color: var(--bg-surface);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.btn--destructive {
  background-color: var(--color-danger-base);
  color: #FFFFFF;
}
```

---

### 3.2. Form Input Field Anatomy & Validation

```
 [ Field Label ] ───────────────────────── Mandatory: Always top-aligned, font-family: var(--font-sans), font-weight: 600
 ┌──────────────────────────────────────┐
 │ [Icon]  Input Value Content          │ ── Height: 44px (Std) / 32px (Cockpit), font-family: var(--font-sans), Font: >=13px
 └──────────────────────────────────────┘
 ⚠ Error: Specific actionable remedy. ── Red-600, font-family: var(--font-sans), font-size: 12px, with error icon
```

#### Form Behavior & Typographic Rules:
1. **Typographic Token Binding:** All input components (`.form-label`, `.form-input`, `.form-select`, `.form-textarea`, `.form-error`, `.form-hint`) strictly bind to `font-family: var(--font-sans);`.
2. **Focus State Invariance:** Never remove `:focus` without providing `:focus-visible` with a $3\text{px}$ offset ring (`var(--focus-ring)`).
3. **Instant Asynchronous Feedback:** Debounce async validation (e.g., checking if machine serial number exists) by exactly $350\text{ms}$.
4. **No Disappearing Placeholders:** Never use placeholder text to replace field labels.

```css
/* Form Input Typographic Architecture */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.form-input,
.form-select,
.form-textarea {
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--text-primary);
  background-color: var(--bg-surface);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 0 12px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.form-input:focus-visible,
.form-select:focus-visible,
.form-textarea:focus-visible {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.form-error {
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-danger-base);
}
```

---

### 3.3. Enterprise High-Density Data Table Standard

For manufacturing telemetry, work order schedules, and inventory:

| Element | Specification Rule | Bound Token | Justification |
| :--- | :--- | :--- | :--- |
| **Row Height** | `48px` (Standard) or `34px` (High-Density mode) | Layout token | Prevents vertical scroll bloat |
| **Header** | `position: sticky; top: 0; z-index: 10; font-weight: 700; font-size: 11px; text-transform: uppercase;` | `font-family: var(--font-sans);` | Persistent orientation during long scrolls |
| **Text Columns** | Left-aligned (`text-align: left`) | `font-family: var(--font-sans);` | Immediate scanability of part descriptions and assembly status |
| **Numeric Columns**| Right-aligned (`text-align: right; font-variant-numeric: tabular-nums`) | `font-family: var(--font-sans);` | Strict tabular decimal alignment, zero character width jitter |
| **Status Columns** | Centered with compact status pill badge | `font-family: var(--font-sans);` | Instant triage across 100+ items |
| **Row Hover** | Background: `var(--bg-surface-subtle)` | Surface token | Prevents mistaking adjacent row telemetry |
| **Selection** | Sticky left checkbox column with row highlight | Selection state | Multi-chassis bulk batch dispatch |

```css
/* High-Density Data Table Typographic Architecture */
.mfg-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-sans);
  font-size: 12px;
}

.mfg-table th {
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-strong);
  padding: 8px 12px;
}

.mfg-table td {
  font-family: var(--font-sans);
  font-size: 12px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-default);
  padding: 8px 12px;
}

.mfg-table td.num,
.mfg-table td.telemetry,
.mfg-table td.font-mono {
  font-family: var(--font-sans);
  font-variant-numeric: tabular-nums;
  text-align: right;
  font-size: 12px;
}
```

---

### 3.4. Status Badges, Chips & Interactive Pills

Status badges and micro tags communicate system health, triage state, and operational modes:

```css
/* Status Badge Typographic Architecture */
.badge,
.status-pill,
.chip {
  font-family: var(--font-sans);
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  line-height: 1.2;
}

.badge--success {
  background-color: var(--color-success-bg);
  color: var(--color-success-text);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.badge--warning {
  background-color: var(--color-warning-bg);
  color: var(--color-warning-text);
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.badge--danger {
  background-color: var(--color-danger-bg);
  color: var(--color-danger-text);
  border: 1px solid rgba(239, 68, 68, 0.2);
}
```

---

### 3.5. Modal Dialogs, Flyouts & Drawer Overlays

```css
/* Overlays Typographic Architecture */
.modal-dialog {
  background-color: var(--bg-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--elevation-3);
  font-family: var(--font-sans);
}

.modal-header .modal-title {
  font-family: var(--font-sans);
  font-size: var(--type-h2);
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.015em;
}

.modal-body {
  font-family: var(--font-sans);
  font-size: var(--type-body);
  color: var(--text-secondary);
  line-height: 1.5;
}
```

---

### 3.6. Hero Metric Displays, Live Telemetry & Dual-Pill Capsules

```css
/* Metric Displays Typographic Architecture */
.metric-card__value,
.metric-big-num {
  font-family: var(--font-sans);
  font-size: var(--type-metric-hero);
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.0;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.metric-card__label {
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.telemetry-timestamp,
.sensor-raw-code {
  font-family: var(--font-sans);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--text-disabled);
}
```

---

### 3.7. Comprehensive Responsive Architecture, Breakpoint Matrix & Touch Adaptation

Enterprise web applications, React frontends, and industrial cockpits must deliver a seamless ergonomic experience across viewports ranging from 4K wall-mounted displays to mobile handhelds:

#### 3.7.1. The 5-Tier Canonical Breakpoint Matrix

| Token | Range | Device Profile | Max Container | Grid & Layout Transformation |
| :--- | :--- | :--- | :--- | :--- |
| **`--bp-wide`** | $\ge 1200\text{px}$ | Ultrawide Monitors / 4K / Large Desktop | `1240px` | 4-column metric stats; 3–4 column cards; persistent desktop navbar |
| **`--bp-desktop`**| $992\text{px} - 1199\text{px}$ | Standard Laptops / Small Desktops | `960px` | 3-column cards; fluid 2-column hero stage; persistent desktop navbar |
| **`--bp-tablet`** | $768\text{px} - 991\text{px}$ | Tablets / iPad Portrait / SCADA Displays | `720px` | Navigation collapses to Accessible Drawer; 2-column cards; 2x2 stats |
| **`--bp-phablet`**| $576\text{px} - 767\text{px}$ | Large Mobile / Phablets (Landscape) | `100%` | Single-column cards; horizontal touch-swipe tabs (`scroll-snap: x`) |
| **`--bp-mobile`** | $< 480\text{px}$ | Compact Smartphones (Portrait) | `100%` | Full-width button stack; 2x2 form slot chips; full-width modal sheets |

---

#### 3.7.2. Non-Negotiable Responsive Engineering Rules

1. **The Zero-Horizontal-Scroll Invariance (No Body Blowouts):**
   * The page root must never produce horizontal window scrollbars (`overflow-x: hidden`).
   * High-density data tables must declare `min-width: 680px;` and be encased within an isolated scroll container:
   ```css
   .table-scroll-wrapper,
   .mfg-table-scroll {
     width: 100%;
     overflow-x: auto;
     -webkit-overflow-scrolling: touch;
     border-radius: var(--radius-md);
   }
   ```

2. **Fluid Typographic Clamping (`CSS clamp()`):**
   * Top-level display and section headings must scale smoothly between screen sizes without jarring breakpoint jumps:
   ```css
   --type-display: clamp(2.200rem, 5.0vw, 3.052rem); /* 35px - 48.8px */
   --type-h1:      clamp(1.800rem, 3.8vw, 2.441rem); /* 28.8px - 39.0px */
   --type-h2:      clamp(1.400rem, 2.8vw, 1.953rem); /* 22.4px - 31.2px */
   ```

3. **Fitts's Law on Touch Viewports ($\le 768\text{px}$):**
   * Every interactive button, navigation trigger, and input field must declare:
     $$\text{min-height: 44px; min-width: 44px;}$$
   * Adjacent touch targets must maintain at least **`8px`** (`--space-2`) separation to prevent accidental miss-clicks.

4. **Accessible Navigation Drawer Transformation:**
   * At viewports $\le 991\text{px}$, horizontal links must collapse into a mobile drawer (`role="dialog"`, `aria-modal="true"`) implementing:
     - Backdrop overlay click-to-close (`.mobile-drawer-overlay.is-active`).
     - Keyboard `Escape` dismiss.
     - Body scroll locking (`document.body.style.overflow = 'hidden'`).

5. **Multi-Stage Touch Strips (CSS Scroll-Snap):**
   * On touch viewports, multi-stage pipelines and filter bars must preserve linear progression via touch-swipe:
   ```css
   .pipeline-strip,
   .filter-bar-touch {
     display: flex;
     overflow-x: auto;
     scroll-snap-type: x mandatory;
     -webkit-overflow-scrolling: touch;
   }
   .pipeline-strip > * {
     scroll-snap-align: start;
     flex-shrink: 0;
   }
   ```

6. **Adaptive Operational Control Bars:**
   * Diagnostic state toolbars and multi-action bars must fold from a 5-horizontal cluster on desktop into a 2x2 grid (`grid-template-columns: 1fr 1fr;`) on mobile screens to preserve 44px touch targets.

---

## 4. Visual DOs and DON'Ts

```
┌──────────────────────────────────────┬──────────────────────────────────────┐
│                  DO                  │                DON'T                 │
├──────────────────────────────────────┼──────────────────────────────────────┤
│ Align numbers to the right in tables │ Left-align numbers or currency       │
│ Use 3-5 distinct font weights max   │ Use 7 different font weights         │
│ Blend 2-4% brand hue into grays      │ Use harsh pure black #000000 on #FFF │
│ Lock button width during loading     │ Allow button to collapse or expand   │
│ Use skeleton screens during fetches  │ Use jarring full-screen spinners     │
│ Provide explicit retry buttons       │ Display passive dead-end error text  │
│ Separate unrelated blocks by >=24px  │ Cram all elements with uniform 10px  │
└──────────────────────────────────────┴──────────────────────────────────────┘
```

---

## 5. React + Spring Boot Production Code Templates

### 5.1. Spring Boot RFC 7807 Global Exception Handler

Every backend exception must produce a clean, predictable RFC 7807 payload:

```java
package com.company.project.common.exception;

import org.springframework.http.*;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.WebRequest;

import java.net.URI;
import java.time.Instant;
import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Validation Failed");
        problem.setType(URI.create("https://api.company.com/errors/validation-failed"));
        problem.setDetail("One or more request parameters failed validation criteria.");
        problem.setProperty("timestamp", Instant.now());

        Map<String, String> fieldErrors = new HashMap<>();
        for (FieldError err : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(err.getField(), err.getDefaultMessage());
        }
        problem.setProperty("invalidParams", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Resource Not Found");
        problem.setType(URI.create("https://api.company.com/errors/not-found"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }
}
```

---

### 5.2. React Production Button Component (TypeScript)

```tsx
import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  leftIcon,
  rightIcon,
  className = '',
  ...rest
}) => {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${isLoading ? 'btn--loading' : ''} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...rest}
    >
      {isLoading && (
        <span className="btn__spinner" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
          </svg>
        </span>
      )}
      <span className={`btn__content ${isLoading ? 'btn__content--hidden' : ''}`}>
        {leftIcon && <span className="btn__icon btn__icon--left">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="btn__icon btn__icon--right">{rightIcon}</span>}
      </span>
    </button>
  );
};
```

```css
/* Button.css - Pure CSS implementation of RFC-0084 State Matrix */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  font-family: var(--font-sans);
  font-weight: 600;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease, transform 100ms ease;
  user-select: none;
  min-height: 44px; /* Touch target minimum */
}

.btn--md {
  padding: 0 var(--space-4);
  font-size: var(--type-body);
}

.btn--primary {
  background-color: var(--color-primary-600);
  color: #ffffff;
  box-shadow: var(--elevation-1);
}

.btn--primary:hover:not(:disabled) {
  background-color: var(--color-primary-700);
  box-shadow: var(--elevation-2);
  transform: translateY(-1px);
}

.btn--primary:active:not(:disabled) {
  background-color: var(--color-primary-800);
  transform: translateY(0);
}

.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn__content--hidden {
  visibility: hidden;
}

.btn__spinner {
  position: absolute;
  width: 20px;
  height: 20px;
  animation: btn-spin 700ms linear infinite;
}

@keyframes btn-spin {
  to { transform: rotate(360deg); }
}
```

---

### 5.3. React RFC 7807 Error Interceptor Hook

```typescript
import axios, { AxiosError } from 'axios';
import { UseFormSetError, FieldValues, Path } from 'react-hook-form';

export interface RFC7807ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  invalidParams?: Record<string, string>;
}

export function handleApiError<T extends FieldValues>(
  error: unknown,
  setError?: UseFormSetError<T>,
  showToast?: (message: string) => void
) {
  if (axios.isAxiosError(error)) {
    const err = error as AxiosError<RFC7807ProblemDetail>;
    const problem = err.response?.data;

    if (problem) {
      // 1. Map Field-Specific Errors directly to React Hook Form
      if (problem.invalidParams && setError) {
        Object.entries(problem.invalidParams).forEach(([field, reason]) => {
          setError(field as Path<T>, {
            type: 'server',
            message: reason,
          });
        });
      }

      // 2. Display Global Toast for non-field specific detail
      if (showToast && problem.detail) {
        showToast(problem.detail);
      }
      return;
    }
  }

  if (showToast) {
    showToast('A network or server connectivity failure occurred.');
  }
}
```

---

## 6. Automated Governance & CI/CD Tooling

To ensure zero human error, the following automated linters must run in Github Actions or GitLab CI:

### 6.1. Stylelint Rule Configuration (`.stylelintrc.json`)
Enforces that no developer writes hardcoded colors or ad-hoc margins:

```json
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "color-no-hex": true,
    "declaration-property-value-disallowed-list": {
      "/^(margin|padding|gap)$/": ["/^[0-9]+px$/"]
    },
    "custom-property-pattern": "^[a-z0-9-]+$"
  }
}
```

### 6.2. Automated Accessibility Check (Jest / Vitest + `axe-core`)

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from './Button';

expect.extend(toHaveNoViolations);

describe('Button Accessibility Test', () => {
  it('must have zero axe accessibility violations in all states', async () => {
    const { container } = render(<Button variant="primary">Execute Order</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

---

## 7. Global Enterprise Best Practices & Internationalization (v3.0 Addendum)

### 7.1. Advanced Accessibility (WCAG 2.2 Standards)

#### 7.1.1. Vestibular Motion Safety (`prefers-reduced-motion`)
Users suffering from vestibular disorders, epilepsy, or motion sensitivities must receive an immediate suppression of decorative transforms, parallax, and transitions. All global stylesheets must include:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

#### 7.1.2. "Skip to Main Content" Bypass Link (WCAG 2.4.1)
Every application layout must provide a hidden bypass anchor at the very top of `<body>` to allow keyboard and screen-reader users to skip repetitive header navigations:

```html
<!-- At top of document body -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<main id="main-content" tabindex="-1">
  <!-- Page Content -->
</main>
```

```css
.skip-link {
  position: absolute;
  top: -100px;
  left: var(--space-4);
  background: var(--color-primary-600);
  color: #ffffff;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-weight: 700;
  z-index: 9999;
  text-decoration: none;
  transition: top 150ms ease;
}

.skip-link:focus-visible {
  top: var(--space-4);
  outline: 3px solid #ffffff;
}
```

#### 7.1.3. Windows High Contrast Mode (`forced-colors: active`)
In high-contrast operating system themes, CSS background colors and box-shadows are discarded by the rendering engine. Interactive components must declare visible borders and focus indicators using `CanvasText` and `Highlight` system colors:

```css
@media (forced-colors: active) {
  .btn,
  .form-control,
  .dish-card,
  .modal-dialog {
    border: 2px solid ButtonText !important;
  }

  .btn:focus-visible,
  .form-control:focus-visible {
    outline: 3px solid Highlight !important;
    outline-offset: 2px;
  }
}
```

#### 7.1.4. Multi-Modal Color Redundancy (Color-Blindness Invariance)
Color must never be the sole conveyor of status (WCAG 1.4.1). Every status badge and telemetry alert must pair its color with an explicit shape, icon, or visible text:
* **Running / Optimal:** Emerald Circle (`●`) + Text "RUNNING"
* **Warning / Buffer:** Amber Triangle (`▲`) + Text "BUFFER"
* **Critical / E-Stop:** Red Hexagon/Octagon (`🛑` / `■`) + Text "INTERLOCK TRIP"

---

### 7.2. Internationalization (i18n), Bidirectional RTL & CSS Logical Properties

To ensure seamless localization into Arabic, Hebrew, Urdu, or Persian without maintaining separate RTL stylesheets, all layout code must enforce **CSS Logical Properties**:

| Physical Property (Deprecated) | Mandatory CSS Logical Property | Justification |
| :--- | :--- | :--- |
| `margin-left` / `margin-right` | `margin-inline-start` / `margin-inline-end` | Automatically flips for RTL languages |
| `padding-left` / `padding-right`| `padding-inline-start` / `padding-inline-end` | Preserves symmetrical padding |
| `left` / `right` in absolute positioning | `inset-inline-start` / `inset-inline-end` | Anchors modals/drawers to correct side |
| `text-align: left` / `right` | `text-align: start` / `text-align: end` | Aligns reading direction automatically |
| `border-left` / `border-right` | `border-inline-start` / `border-inline-end` | Card highlight borders flip correctly |

#### Text Expansion Tolerances (German / French / Russian)
European languages require **25% to 40%** more horizontal character width than English.
* **Rule:** Never assign fixed `width` to buttons, table headers, or cards. Always use `min-width`, `max-content`, or allow fluid wrapping (`white-space: normal` on headers where needed).

---

### 7.3. Core Web Vitals (CWV) & Performance Standards

Enterprise cockpits and customer-facing web applications must satisfy Google Core Web Vitals thresholds ($LCP \le 2.5s$, $CLS \le 0.1$, $INP \le 200ms$):

#### 7.3.1. Zero Cumulative Layout Shift (CLS Invariance)
* All images and media containers must declare explicit `aspect-ratio` or `width`/`height` attributes to reserve layout geometry before assets download:
  ```css
  .dish-card__media,
  .hero-image-frame {
    aspect-ratio: 16 / 10;
    width: 100%;
    contain-intrinsic-size: 600px 375px;
  }
  ```

#### 7.3.2. Largest Contentful Paint (LCP) Prioritization
* Hero banner photography must declare `fetchpriority="high"` and be loaded eagerly:
  ```html
  <img src="hero.jpg" alt="Plated cuisine" fetchpriority="high" loading="eager">
  ```
* All below-the-fold media must declare `loading="lazy"` with `decoding="async"`.

#### 7.3.3. Font Display & Flash of Invisible Text (FOIT) Prevention
* Web fonts loaded via `@font-face` or Google Fonts must declare `font-display: swap;` to prevent blocking the initial text render.

---

### 7.4. Frontend Enterprise Security Hygiene

#### 7.4.1. Reverse Tab-Nabbing Prevention
Opening untrusted external links with `target="_blank"` allows the target site to execute `window.opener.location = maliciousUrl`.
* **Mandatory Rule:** All external anchor elements must include:
  ```html
  <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">
  ```

#### 7.4.2. Content Security Policy (CSP) Hygiene
* No inline event handlers (e.g., `<button onclick="doAction()">`) are permitted in production code. All event bindings must be attached via JavaScript (`addEventListener`).
* CSS styles must reside in external stylesheets or scoped style sheets; inline `style="..."` attributes must be minimized to support strict CSP hashes.

#### 7.4.3. Client-Side PII Masking
Telemetry streams and client-side error aggregators (Sentry / Datadog) must redact Personally Identifiable Information (PII):
```typescript
function sanitizeErrorPayload(data: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['password', 'creditCard', 'vin', 'ssn', 'token'];
  const sanitized = { ...data };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '***REDACTED***';
    }
  }
  return sanitized;
}
```

---

### 7.5. Network Resilience & Stale Data States

Real-time industrial manufacturing cockpits and live order systems often face transient shop-floor connectivity drops:

#### 7.5.1. The 6th UI State: Stale / Reconnecting
When a WebSocket, SSE, or polling endpoint loses connection, the UI must transition to the **Stale / Reconnecting** state:
1. Retain existing data in the dashboard (never clear the screen to an empty error page).
2. Render a top-level amber warning banner:
   ```html
   <div class="stale-banner" role="status" aria-live="polite">
     <span class="warning-icon">⚠</span>
     <span>Live connection lost. Displaying cached telemetry from <strong>14:32:04</strong>. Reconnecting...</span>
   </div>
   ```
3. Dim interactive execution buttons and display a retry spinner.

---

### 7.6. Industrial High-Density Calibration & 100% Zoom Standard

To guarantee optimal ergonomic readability on standard plant floor terminals, operator workstations, and laptop screens (~1280x720 / ~1366x768 / ~1920x1080 at 100% browser zoom) without visual bloat or intrusive vertical/horizontal scrolling:

#### 7.6.1. Root Typographic Scaling
* **Root Font Size:** `html { font-size: 13px; }`
* **Body Line Height:** `body { font-size: 13px; line-height: 1.35; }`
* **Scrollbars:** Slim 6px custom webkit scrollbar tracks (`width: 6px; height: 6px;`).

#### 7.6.2. Mandatory Component Scale Values
| Element Type | Target Metric | Purpose |
| :--- | :--- | :--- |
| **Global Navigation Drawer** | `width: 210px`, padding `16px 12px`, Light Mode `#153d77` | Compact sidebar footprint (Deep Sapphire Blue) |
| **Page Wrapper** | `padding: 16px 20px`, max-width `1440px` | Eliminates overflow at 100% zoom |
| **Primary Titles** | `fontSize: 18px`, `fontWeight: 700` | Controlled hierarchy |
| **Secondary Guidance** | `fontSize: 11.5px`, `var(--text-secondary)` | Subtitle context |
| **Metric / KPI Cards** | `padding: 10px 14px`, values `18px`, icons `16px` (`32px` badge) | Compact summary rows |
| **Data Table Headers (`th`)** | `padding: 8px 12px`, uppercase `10px` font | Space-efficient headers |
| **Data Table Cells (`td`)** | `padding: 7px 12px`, `fontSize: 12px` | High information density |
| **Action / Control Buttons** | `padding: 6px 12px` or `6px 14px`, `fontSize: 12px` | Ergonomic clickable targets |
| **Dialogs & Modals** | `width: 400px–440px`, padding `14px 18px` | Fits within 720p viewports |

