# VimMode

A clean, architectural implementation of Vim motions for Vencord, designed to be robust, easily extensible and maintainable.

---

## Features

- **Modal Editing** — Switch between *Normal (Navigation)* and *Insert (Typing)* modes.
- **Chord System** — Supports multi-key sequences like `gg` (top), `gt` (next tab), and `go` (quick switch).
- **Native Integration** — Uses Discord's internal shortcuts for navigation, ensuring compatibility with servers, channels, and the Quick Switcher.
- **Visual Feedback** — A minimal, non-intrusive overlay shows the current mode and the buffer (pending key chords).

---

## Mappings

### **Navigation**

| Key | Function         | Vim Equivalent |
|-----|------------------|----------------|
| `j` | Scroll Down      | `j`            |
| `k` | Scroll Up        | `k`            |
| `gg`| Scroll to Top    | `gg`           |
| `G` | Scroll to Bottom | `G`            |

---

### **Discord Actions**

| Key | Function             | Vim Equivalent / Notes |
|-----|-----------------------|------------------------|
| `J` | Next Channel          | — |
| `K` | Previous Channel      | — |
| `gt`| Next Server (Tab)     | `gt` |
| `gT`| Previous Server (Tab) | `gT` |
| `go`| Quick Switcher (Jump) | — |
| `/` | Search                | `/` |

---

## Modes

| Key | Function                         |
|-----|----------------------------------|
| `i` | Insert Mode (focus message bar)  |
| `Esc` | Normal Mode (unfocus / close modals) |

---

##  Extending
### **Adding a New Command**

1. Open `src/plugins/vimMode/commands.ts`
2. Add your function to the `Commands` object.
3. Map a key to it in the `Keymap` object.

Example:

```ts
// commands.ts
export const Commands = {
    // ... existing commands
    toggleMute: () => simulateKey("m", { ctrl: true, shift: true })
};

export const Keymap = {
    // ... existing maps
    "M": "toggleMute"
};
