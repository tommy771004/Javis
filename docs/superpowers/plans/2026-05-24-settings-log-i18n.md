# Settings Log I18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route Settings modal operation log copy through the existing i18n layer so locale-specific feedback no longer lives as hardcoded strings in the component.

**Architecture:** Extend the shared `Translations` contract with a small group of settings-log helpers and strings, then refactor `SettingsModal` to call those translations when emitting system log events. Keep the change scoped to settings interactions instead of introducing a new logging subsystem.

**Tech Stack:** React 19, TypeScript, existing local `useI18n` provider

---

### Task 1: Extend Translation Contract

**Files:**
- Modify: `src/services/i18n.tsx`

- [ ] Add settings-log translation entries to the `Translations` interface.
- [ ] Implement the new entries in both `zhTWTranslations` and `enTranslations`.
- [ ] Export a small helper for retrieving a translation set by locale so locale-switch logs can use the target locale immediately.

### Task 2: Refactor SettingsModal Log Emitters

**Files:**
- Modify: `src/components/SettingsModal.tsx`

- [ ] Update settings handlers to build log text through `t` instead of inline hardcoded strings.
- [ ] Cover the settings-toggle interactions that currently emit direct log copy: shell mode, write mode, task mode, skin, desktop toggles, voice profile, STT/TTS provider changes, and locale switches.
- [ ] Keep existing runtime behavior and payload shapes intact by continuing to call `triggerLog(message, speak?)`.

### Task 3: Verify Type Safety

**Files:**
- Modify: `src/services/i18n.tsx`
- Modify: `src/components/SettingsModal.tsx`

- [ ] Run `npm run lint`.
- [ ] Fix any TypeScript issues introduced by the new translation fields.
- [ ] Summarize remaining hardcoded log areas that were intentionally left out of this scoped change.
