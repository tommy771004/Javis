# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-05-24
- Primary product surfaces: main assistant console, center visualizer, command input, activity log, Hermes dashboard, settings modal.
- Evidence reviewed: `README.md`, `docs/hermes-spec.md`, `src/App.tsx`, `src/components/Header.tsx`, `src/components/CenterVisualizer.tsx`, `src/components/ActivityLog.tsx`, `src/components/CommandInput.tsx`, `src/components/HermesDashboard.tsx`, `src/index.css`.

## Brand
- Personality: warm personal assistant with cinematic Javis presence; calm, capable, attentive, and technically precise.
- Trust signals: real telemetry, honest unavailable states, explicit task status, concrete next actions, clear control-plane health.
- Avoid: fake sci-fi filler, military posturing, opaque acronyms as primary labels, dashboards that imply activity when data is unavailable.

## Product goals
- Goals: help the operator understand workspace state, decide the next useful action, and feel accompanied by a capable assistant.
- Non-goals: a decorative movie HUD, a generic admin dashboard, or a chat-only assistant with hidden system state.
- Success signals: the first screen feels personal, the assistant state is understandable at a glance, and technical panels remain available without dominating the experience.

## Personas and jobs
- Primary personas: local developer/operator using Javis as a desktop workspace assistant.
- User jobs: ask for work, monitor tasks, run routines, inspect system health, review memory/task context, recover from problems.
- Key contexts of use: long coding sessions, local automation, voice or typed command dispatch, periodic system checks.

## Information architecture
- Primary navigation: console shell with left telemetry, center assistant presence, right log/context, expandable Hermes dashboard.
- Core routes/screens: main console, dashboard tabs, settings modal, reboot overlay.
- Content hierarchy: personal status and next action first; real telemetry second; dense diagnostic detail only when requested or in side panels.

## Design principles
- Principle 1: The assistant should sound like it understands the operator's work, not like a machine filling silence.
- Principle 2: Cinematic details should support confidence and attention, not obscure truth.
- Tradeoffs: keep the high-tech identity, but soften labels and reduce constant all-caps where readability or warmth is harmed.

## Visual language
- Color: preserve the current theme system, but use cyan as an accent rather than the only emotional tone; pair it with calmer slate, warm amber, and success green.
- Typography: keep monospace for telemetry and commands; use clearer sentence-case labels for assistant-facing copy.
- Spacing/layout rhythm: dense but breathable; compact status panels should have predictable fixed dimensions.
- Shape/radius/elevation: restrained panels, 8px radius or less, light glow only for live or focused states.
- Motion: slow, purposeful presence motion; avoid animations that imply fake processing.
- Imagery/iconography: use lucide icons for actions and status; the central assistant presence remains abstract and data-driven.

## Components
- Existing components to reuse: `Header`, `CenterVisualizer`, `CommandInput`, `ActivityLog`, `HermesDashboard`, `SettingsModal`.
- New/changed components: personal assistant presentation helpers for greeting, presence text, and briefing copy.
- Variants and states: idle, thinking, searching, speaking, voice active, offline/unavailable, error, empty.
- Token/component ownership: keep theme variables in `src/index.css`; keep personal copy rules in a service helper rather than scattering strings through components.

## Accessibility
- Target standard: keyboard-operable controls, visible focus states, readable contrast in dark mode.
- Keyboard/focus behavior: command input remains the primary focus target; shortcuts must not trap browser behavior unexpectedly.
- Contrast/readability: sentence-case assistant copy should be easier to scan than dense all-caps labels.
- Screen-reader semantics: buttons need meaningful titles or visible text; dynamic states should remain text-backed.
- Reduced motion and sensory considerations: animations should be cosmetic; state must remain readable without motion.

## Responsive behavior
- Supported breakpoints/devices: desktop-first local console, with no text overflow on narrower layouts.
- Layout adaptations: keep center presence stable; side panels may compress or scroll.
- Touch/hover differences: hover affordances are enhancements; core controls must remain tappable.

## Interaction states
- Loading: say what is being checked or connected.
- Empty: say there is nothing needing attention, not that everything is magically optimal.
- Error: state the failed subsystem and the next useful action.
- Success: confirm the concrete operation performed.
- Disabled: explain the missing prerequisite through concise copy.
- Offline/slow network: show degraded or unavailable rather than fabricated metrics.

## Content voice
- Tone: attentive, concise, warm, competent.
- Terminology: prefer "workspace", "briefing", "next step", "listening", "checking", "ready" over "matrix", "protocol", "armor", "neural" for user-facing text.
- Microcopy rules: use first-person sparingly for assistant presence; use technical labels only where they identify real data.

## Implementation constraints
- Framework/styling system: React, Vite, Tailwind classes, lucide-react, motion.
- Design-token constraints: preserve existing cyan theme variables and skin switching.
- Performance constraints: avoid expensive render loops; keep telemetry polling as currently bounded.
- Compatibility constraints: local Windows desktop target, browser APIs may be unavailable.
- Test/screenshot expectations: helper behavior should have node tests; build should pass; lint may retain known pre-existing type debt until separately fixed.

## Open questions
- [ ] Should Javis use the operator's preferred name in more places than the header? Owner: product/user. Impact: tone consistency.
- [ ] Should the central assistant presence eventually show calendar or schedule context? Owner: product/user. Impact: future data integration.
