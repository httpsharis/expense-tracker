
# Google Antigravity Project Configuration

## Installed Project Skills

The following active skills are installed locally inside the `.agent/skills/` directory:

- **react-native-architecture**: Guides structural patterns, state organization, and component lifecycle choices specifically for React Native and Expo spaces.
- **ui-ux-designer**: Enforces visual Polish, layout harmony, and interactive consistency across user flows.
- **tailwind-design-system**: Standardizes styling patterns, responsive design rules, and utility-first styling token execution.
- **api-design-principles**: Governs optimal structure, data-fetching semantics, and clean contract layers for backend integrations.
- **code-refactoring-refactor-clean**: Prioritizes code health, modular design separation, and eliminating repetitive logic.
- **api-testing-observability-api-mock**: Handles reliable mock generation, endpoint testing isolation, and service diagnostics.
- **architect-review**: Executes high-level structural integrity audits, directory mapping reviews, and compliance checks.

## Active Rules & Workspace Guidance

### 1. Architecture & State Management

- Maintain a highly clean, production-ready directory structure. Avoid messy, deeply-nested, or overly complex directory layouts.
- Store global state management configurations exclusively inside a dedicated top-level `store/` directory rather than coupling state definitions inside individual feature folders.
- Restrict feature folders to house localized visual components and custom hooks only.
- Utilize official Expo file-based routing frameworks (`src/app`) for handling application layouts, layout wrappers, navigation stacks, and route paths.

### 2. UI & Styling Implementation

- Leverage utility-first design principles matching standard design tokens.
- Apply a uniform look and feel across all tracking screens, transaction logs, and dashboard metrics.
- Prioritize clean integration methods when embedding asset types like SVG logo graphics into layout frameworks.

### 3. API & Data Flow

- Rely on automated mock endpoints during early development stages or network isolation testing.
- Review all core API calls, environmental configurations, or token-handling setups for runtime reliability and security protocols.
