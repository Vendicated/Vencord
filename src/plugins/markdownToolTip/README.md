# MarkdownToolTip

Streamline your coding conversations in Discord with one-click code block insertion! This plugin adds a convenient right-click context menu that lets you quickly insert properly formatted code blocks with syntax highlighting for 18+ programming languages.

![MarkdownToolTip Context Menu](https://cdn.discordapp.com/attachments/1308798585902727303/1378550958098874468/image.png?ex=683d0320&is=683bb1a0&hm=a69aa5aafddc9dabffe159ebbfe56aa5a3d4a48e27836a060212c68d29a657e1&)

*Right-click in Discord chat → "Insert Code Block" → Choose from 18+ programming languages*

## ✨ Features

- 🖱️ **One-Click Insertion**: Right-click in chat → "Insert Code Block" → Choose language
- 🎨 **18+ Languages**: Support for all popular programming languages and formats
- 🎯 **Smart Positioning**: Cursor automatically positioned inside code block for immediate typing
- 🔧 **Zero Configuration**: Works out of the box with Discord's native context menu
- ⚡ **Lightning Fast**: No more manually typing \`\`\`language syntax

## 📋 Supported Languages

### Programming Languages
| Language | Code | Language | Code |
|----------|------|----------|------|
| TypeScript/JavaScript | `ts` | Python | `py` |
| Java | `java` | C++ | `cpp` |
| C# | `cs` | PHP | `php` |
| Ruby | `ruby` | Go | `go` |
| Rust | `rs` | SQL | `sql` |

### Markup & Data Formats
| Format | Code | Format | Code |
|--------|------|--------|------|
| HTML | `html` | CSS | `css` |
| JSON | `json` | YAML | `yaml` |
| XML | `xml` | Markdown | `md` |
| Shell/Bash | `sh` | Plain Text | _(none)_ |

## 🚀 How to Use

### Step-by-Step Guide

1. **Right-click** in any Discord chat input box
2. Look for **"Insert Code Block"** in the context menu
3. **Hover** to see the language submenu
4. **Click** your desired programming language
5. **Start typing** your code immediately!

### Visual Example

```
Before: [Empty chat input]
   ↓ Right-click → Insert Code Block → Python
After: ```python
       █ [cursor here, ready to type]
       ```
```

## 📸 Screenshots

### Context Menu in Action

![MarkdownToolTip in Discord](https://github.com/user-attachments/assets/markdowntooltip-context-menu.png)

The plugin seamlessly integrates with Discord's native context menu, showing all supported languages in an organized submenu. As you can see in the screenshot above:

- **Easy Access**: Right-click in any chat input to see "Insert Code Block"
- **Comprehensive Languages**: All popular programming languages and formats
- **Clean Integration**: Fits naturally with Discord's existing menu items
- **Instant Selection**: One click to insert properly formatted code blocks

### Language Support Showcase
The screenshot shows our complete language support including:
- **Web Development**: TypeScript/JavaScript, HTML, CSS, JSON
- **Backend Languages**: Python, Java, C++, C#, PHP, Ruby, Go, Rust
- **Data Formats**: YAML, XML, SQL
- **Scripting**: Shell/Bash
- **Documentation**: Markdown
- **Plain Text**: For general code snippets

### Before vs After
**Before** (manual typing):
```
User types: ```python
User types: print("Hello World")
User types: ```
```

**With MarkdownToolTip** (one click):
```python
print("Hello World")  ← Ready to type immediately!
```

## 💡 Why Use MarkdownToolTip?

| Problem | Solution |
|---------|----------|
| 😤 **Typing \`\`\`language manually** | 🎯 **One-click insertion** |
| 😵 **Forgetting language codes** | 📝 **Easy-to-read language names** |
| 🐛 **Typos in syntax** | ✅ **Perfect formatting every time** |
| ⏰ **Slow workflow** | ⚡ **Instant code block creation** |
| 🤔 **Hard to remember which languages Discord supports** | 🎨 **Curated list of popular languages** |

## ⚙️ Installation & Setup

### Enable the Plugin
1. Open **Discord Settings**
2. Navigate to **Vencord** → **Plugins**
3. Find **"MarkdownToolTip"** in the list
4. **Toggle it ON** ✅
5. **Done!** Start right-clicking in chat boxes

### No Configuration Needed
This plugin works out of the box! No settings to configure, no commands to remember.

## 🛠️ For Developers

### Technical Implementation
- **Context Menu Hook**: `textarea-context`
- **Insertion Method**: `insertTextIntoChatInputBox()` API
- **Menu Position**: After submit button for natural UX
- **Cursor Handling**: Smart positioning inside code blocks

### Adding New Languages
Want to add support for a new language? It's easy!

```typescript
// In the languages array, add:
{ label: "Your Language Name", value: "syntax-code" }

// Example:
{ label: "Kotlin", value: "kotlin" }
{ label: "Swift", value: "swift" }
```

### Plugin Architecture
```
MarkdownToolTip/
├── Context Menu Patch → Adds "Insert Code Block" option
├── Language Array → Defines supported languages  
├── Insert Function → Handles text insertion + cursor
└── Menu Item Factory → Creates submenu for each language
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 🐛 Found a Bug?
1. Check if it's already reported in [Issues](https://github.com/Vendicated/Vencord/issues)
2. Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior

### 💡 Feature Ideas?
- More programming languages
- Custom language shortcuts
- Code template insertion
- Language-specific snippets

### 🔧 Want to Code?
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This plugin is part of [Vencord](https://github.com/Vendicated/Vencord) and is licensed under the **GPL-3.0-or-later** license.

---

**Made with ❤️ for the Discord coding community**

*Having issues? Join the [Vencord Discord](https://discord.gg/D9uwnFQcqe) for support!*
