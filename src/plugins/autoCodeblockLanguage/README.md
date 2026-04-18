# AutoCodeblockLanguage

Automatically fixes code block language selection when the sender:

- omits the language tag
- uses an unsupported tag like `luau`
- uses a valid but clearly wrong tag

The plugin prefers direct language fingerprints for common languages such as Lua, JavaScript, TypeScript, Python, SQL, and shell snippets, then falls back to Discord/Vencord's bundled `highlight.js` registry for broader tag support.

## Behavior

- Missing tags are auto-detected.
- Invalid tags are normalized when possible, for example `luau` -> `lua`.
- Existing tags are kept unless the detector has materially stronger evidence for a different language.
- The plugin supports the full language registry exposed by the bundled `highlight.js` instance in the running client.

## Notes

- This only affects fenced code blocks, not ordinary plain messages.
- It cooperates with `ShikiCodeblocks` by correcting the language before Shiki renders the block.
