
# Google Antigravity Project Configuration

## Installed Project Skills

The following active skills are installed locally inside the `.agent/skills/` directory:

- **react-native-architecture**: Guides structural patterns, state organization, and component lifecycle choices specifically for React Native and Expo spaces.
- **ui-ux-designer**: Enforces visual Polish, layout harmony, and interactive consistency across user flows.
- **tailwind-design-system**: Standardizes styling patterns, responsive design rules, and utility-first styling token execution.
- **api-design-principles**: Governs optimal structure, data-fetching semantics, and clean contract layers for backend integrations.
- **code-refactoring-refactor-clean**: Prioritizes code health, modular design separation, and eliminating repetitive logic.
- **concise-code-density**: Enforces minimal line count and maximal density without sacrificing clarity; eliminates unnecessary boilerplate, premature abstractions, and redundant state.
- **creative-3d-motion-designer**: Drives Awwwards-tier 3D, WebGL, and kinetic motion experiences (Three.js, R3F, GSAP ScrollTrigger) while strictly prohibiting generic "AI slop" layouts.
- **api-testing-observability-api-mock**: Handles reliable mock generation, endpoint testing isolation, and service diagnostics.
- **architect-review**: Executes high-level structural integrity audits, directory mapping reviews, and compliance checks.
- **ui-ux-pro-max**: UI/UX design intelligence for mobile & web enforcing accessibility (WCAG 4.5:1), touch targets (44x44px), interaction polish, and stealth luxury aesthetics.

## Active Rules & Workspace Guidance

### 1. Architecture & State Management

- Maintain a highly clean, production-ready directory structure. Avoid messy, deeply-nested, or overly complex directory layouts.
- Store global state management configurations exclusively inside a dedicated top-level `store/` directory rather than coupling state definitions inside individual feature folders.
- Restrict feature folders to house localized visual components and custom hooks only.
- Utilize official Expo file-based routing frameworks (`src/app`) for handling application layouts, layout wrappers, navigation stacks, and route paths.

### 2. UI & Styling Implementation (Universal Global CSS Tokens — Never Hardcode)

- **Single Source of Truth (`app/global.css` + `tailwind.config.js`)**: All colors are defined as CSS variables in `app/global.css` (`:root` and `.dark`) and mapped in `tailwind.config.js`.
- **Never Hardcode Colors**: Strictly forbid hardcoded hex classes (`bg-[#...]`, `text-[#...]`, `border-[#...]`) or raw palette utilities (`zinc-*`, `slate-*`, `gray-*`) for backgrounds, cards, borders, or typography in screen and feature components.
- **Always Use Universal Semantic Tokens**:
  - Screen backgrounds: `bg-canvas` (`--color-canvas`: `#F7F7F5` light / `#0A0A0B` dark)
  - Card & modal surfaces: `bg-surface` (`--color-surface-flat`: `#FFFFFF` light / `#141416` dark)
  - Recessed pills, inputs & chips: `bg-surface-muted` (`--color-surface-tint`: `#F4F4F5` light / `#1F1F23` dark)
  - Borders & dividers: `border-surface-border` and `border-surface-divider` (`#E4E4E7` / `#F4F4F5` light, `#27272A` dark)
  - Typography: `text-ink`, `text-ink-muted`, `text-ink-whisper`
  - Primary Buttons & Positive Accents Only: `bg-primary` / `text-primary` (`#22C55E`). Never tint screen backgrounds, cards, or modals green.
- Apply a uniform look and feel across all tracking screens, transaction logs, profile settings, and dashboard metrics.
- Prioritize clean integration methods when embedding asset types like SVG logo graphics into layout frameworks.

### 3. API & Data Flow

- Rely on automated mock endpoints during early development stages or network isolation testing.
- Review all core API calls, environmental configurations, or token-handling setups for runtime reliability and security protocols.

### 4. Code Density & Minimal Line Count
- Maximize signal-to-noise ratio: If logic can be expressed clearly in 3-5 lines using modern idiomatic patterns (ternaries, nullish coalescing, early guard exits, declarative array methods), never write 15 lines of imperative boilerplate.
- Never duplicate or synchronize derived state with redundant `useState` + `useEffect` when it can be computed on the fly.
- Eliminate premature architecture, single-use wrappers, and excessive defensive nesting.

### 5. Creative Direction & Anti-"AI Slop" Visuals
- Forbid generic AI layouts: Reject standard 3-card grids, repetitive purple-indigo gradient heroes, stock rounded icons, and cookie-cutter templates.
- Emphasize bespoke visual identity: Editorial typography scale, tactile interactive micro-interactions, atmospheric depth, and purposeful kinetic motion (Three.js, R3F, GSAP ScrollTrigger).
