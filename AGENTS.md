# Agent Development Guide

Vencord is a modification for the Discord web app. It is available for the Electron app and as browser extension.

Follow these deeper instructions when applicable:
- [Live Discord Sessions](.skills/discord-session.md) - Run chrome for live testing & reverse engineering
- [Authoring Plugins](.skills/authoring-plugins.md) - Write and manage plugins

## Tooling

- Always use pnpm, not npm
- Verify changes by running `pnpm build --dev` and `pnpm test`, or more specific package.json scripts. Always build with `--dev`

## Style

- Write clean, simple code:
  - Only add abstractions when they provide clear value. Don't future-proof prematurely
  - Only handle cases that are relevant. Don't over-engineer for hypothetical edge-cases
- Before adding common logic, search the codebase (especially the utils folder) for existing implementations that can be reused. If one exists but isn't exported, extract it into a util.
- Don't add comments unless they provide valuable context or explanation that isn't immediately clear. Use single line style comments.
- Only add jsdoc to common API, never to private functions. Always add in api & utils, never in plugins
- Always prefer functions or plain objects over classes

## Issue and PR Guidelines

AI contributions require human oversight and review.

- Never create an issue.
- Never create a PR.
