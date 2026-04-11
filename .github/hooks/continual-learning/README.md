---
name: Continual Learning
description: Persist and replay useful agent learnings across sessions and repos.
tags:
  - learning
  - memory
  - reflection
  - productivity
  - featured
---

# Continual Learning Hook

This hook records tool outcomes, surfaces prior learnings at session start, and keeps a small repo-local memory store in `.copilot-memory/`.

## Install

Copy this folder to `.github/hooks/` in any repo that should keep cross-session learnings.

## Behavior

- `sessionStart` loads the most relevant global and repo-local learnings.
- `postToolUse` logs tool usage and result types.
- `sessionEnd` promotes repeated failures into learnings and trims stale data.

## Storage

- Global: `~/.copilot/learnings.db`
- Local: `.copilot-memory/learnings.db`

Repo-specific notes live in `.copilot-memory/conventions.md`.
