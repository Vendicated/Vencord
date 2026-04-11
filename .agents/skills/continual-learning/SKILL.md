---
name: continual-learning
description: Guide for implementing continual learning in AI coding agents — hooks, memory scoping, reflection patterns. Use when setting up learning infrastructure for agents.
---

# Continual Learning for AI Coding Agents

Your agent forgets everything between sessions. Continual learning fixes that.

## The Loop

```
Experience → Capture → Reflect → Persist → Apply
     ↑                                       │
     └───────────────────────────────────────┘
```

## Quick Start

Install the hook (one step):
```bash
cp -r hooks/continual-learning .github/hooks/
```

Auto-initializes on first session. No config needed.

## Two-Tier Memory

**Global** (`~/.copilot/learnings.db`) — follows you across all projects:
- Tool patterns (which tools fail, which work)
- Cross-project conventions
- General coding preferences

**Local** (`.copilot-memory/learnings.db`) — stays with this repo:
- Project-specific conventions
- Common mistakes for this codebase
- Team preferences

## How Learnings Get Stored

### Automatic (via hooks)
The hook observes tool outcomes and detects failure patterns:
```
Session 1: bash tool fails 4 times → learning stored: "bash frequently fails"
Session 2: hook surfaces that learning at start → agent adjusts approach
```

### Agent-native (via store_memory / SQL)
The agent can write learnings directly:
```sql
INSERT INTO learnings (scope, category, content, source)
VALUES ('local', 'convention', 'This project uses Result<T> not exceptions', 'user_correction');
```

Categories: `pattern`, `mistake`, `preference`, `tool_insight`

### Manual (memory files)
For human-readable, version-controlled knowledge:
```markdown
# .copilot-memory/conventions.md
- Use DefaultAzureCredential for all Azure auth
- Parameter is semantic_configuration_name=, not semantic_configuration=
```

## Compaction

Learnings decay over time:
- Entries older than 60 days with low hit count are pruned
- High-value learnings (frequently referenced) persist indefinitely
- Tool logs are pruned after 7 days

This prevents unbounded growth while preserving what matters.

## Best Practices

1. **One step to install** — if it takes more than `cp -r`, it won't get adopted
2. **Scope correctly** — global for tool patterns, local for project conventions
3. **Be specific** — `"Use semantic_configuration_name="` beats `"use the right parameter"`
4. **Let it compound** — small improvements per session create exponential gains over weeks
