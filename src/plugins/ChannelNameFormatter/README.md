# Channel Name Formatter (Vencord Plugin)

Formats Discord channel names into readable text.

### ✨ What It Does

- Replaces `-` and `_` with spaces  
- Capitalizes each word  
- Converts "and" → `&`

#### Example
```
ingame-chat  →  Ingame Chat
clips_and_media  →  Clips & Media
```

---

## 📦 Installation

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Gh0sTyNZ/ChannelNameFormatter.git
```

### 2️⃣ Move the Plugin File

Copy:

```
channelNameFormatter.ts
```

Into your Vencord user plugins folder:

```
Vencord/src/userplugins/
```

### 3️⃣ Rebuild Vencord

From your Vencord root directory:

```bash
pnpm build
```

or

```bash
npm run build
```

### 4️⃣ Restart Discord

Open Discord and enable the plugin in Vencord settings.

---

## 🛠 Requirements

- A working installation of Vencord
- Node.js
- `pnpm` (recommended)

---

## 📜 License

MIT License

---

## 👤 Author

[Gh0sTyNZ](https://github.com/Gh0sTyNZ)

---

If you'd like this plugin officially included in Vencord, feel free to submit a pull request to the main Vencord repository.
