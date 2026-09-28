---
name: senior-architect
description: Architectural blueprints and modular system decomposition for enterprise frontend applications with high scalability and testability.
license: MIT
---

# Senior Architect Guidelines

## Architectural Standards
1. **Separation of Concerns**:
   - Monolithic single-file apps must be modularized into discrete domain modules (`pages/`, `components/`, `types.ts`, `hooks/`, `utils/`).
   - Business logic and persistent state reside in dedicated hooks (`useData.ts`).
   - Presentation components remain purely functional and decoupled from raw storage primitives.

2. **Component Granularity**:
   - Page containers coordinate data and route state.
   - Interactive components (Modals, Drawers, Tables, Charts) receive typed props and emit standard callbacks.
   - Design tokens are centralized in CSS variables for easy theming and zero style fragmentation.

3. **Performance & Resilience**:
   - Zero unnecessary re-renders via memoized callbacks (`useCallback`) and derived state calculation.
   - Robust null-checks, defensive parsing, fallback empty states, and local storage sync.
