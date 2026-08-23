# AllDmSearch — Global DM Message Search for Discord Desktop

**AllDmSearch** is a private Vencord userplugin that brings Discord Mobile's powerful global DM search interface to Discord Desktop.

Search across all your accessible 1-to-1 Direct Messages and Group DMs simultaneously from a single, unified interface with real-time term highlighting, embeds, and instant 1-click message jumping.

---

## ✨ Features

- 🔍 **Search All DMs at Once**: Discovers and searches messages across all accessible 1-to-1 DMs and Group DMs without searching servers.
- 📱 **Mobile-Style Tabbed UI**:
  - **Messages**: Message previews with sender avatar, display name, relative time, and matched term highlighting.
  - **People**: Instant search across friends, DM partners, and contacts.
  - **Media**: Fast filter for messages containing images, videos, or attachments.
  - **Links**: Fast filter for messages containing URLs.
- ⚡ **Instant Message Navigation**: Clicking any search result opens the corresponding conversation and jumps/flashes the exact matching message instantly.
- 🛡️ **Safe & Authenticated**: Reuses Discord's authenticated REST search endpoint with controlled concurrency (4 workers) and rate-limit backoff—never sends data outside your Discord client.
- ⌨️ **Global Shortcut**: Press `Cmd + Shift + F` (macOS) or `Ctrl + Shift + F` (Windows / Linux) from anywhere in Discord to open the search modal.
- 💾 **Session Caching**: Fast in-memory cache to prevent duplicate queries while typing.

---

## 🚀 Quick Start & Usage

### 1. Open the Search UI
- Press **`Cmd + Shift + F`** (Mac) or **`Ctrl + Shift + F`** (Windows/Linux).

### 2. Search for Messages
Type any keyword, phrase, or user name:
```
staff
staff banoge
payment screenshot
"important doc"
```

### 3. Jump to the Message
Click any message row to jump directly to the exact message in the DM channel.

---

## ⚙️ Plugin Settings

Go to **Discord Settings → Vencord → Plugins → AllDmSearch**:

| Setting | Default | Description |
| :--- | :--- | :--- |
| **Maximum Results** | `100` | Choose between 25, 50, 100, 250, or 500 max results. |
| **Search Group DMs** | `Enabled` | Search across Group DMs in addition to 1-to-1 DMs. |
| **Highlight Search Terms** | `Enabled` | Highlights matched query words with gold badges. |
| **Open Exact Message** | `Enabled` | Jump to and focus the exact message on click. |

---

## 🔒 Privacy & Security

- **100% Client-Side**: No tokens, passwords, or message contents are ever sent to third parties or external servers.
- **Legitimate Discord Session**: All queries use Discord's existing internal authenticated client session.
- **Zero Disk Persistence**: Search results and message caches reside only in temporary memory and are cleared when Discord is closed.

---

## 🛠️ Build & Validation

To compile the plugin into your Vencord desktop bundle:
```bash
cd vencord-src
npm run build
```
Then press **`Cmd + R`** inside Discord to reload!
