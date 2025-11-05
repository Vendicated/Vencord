
# **Bulk Channel Delete (Vencord Plugin)**

A powerful Vencord plugin that lets you **multi-select and bulk delete Discord channels** with a simple **Shift + Right Click** gesture.
Designed for server administrators who need to quickly clean up test channels, temporary categories, or event setups.

---

## 🚀 Features

* 🖱️ **Shift + Right Click** on any channel to select it
* ✅ Visual checkboxes show selected channels
* 🗑️ **Bulk Delete Selected** button appears at the top of your channel list
* 📥 Optional **JSON export** of channel data before deletion
* ⚙️ Configurable **delay between deletions** (default: 1000 ms)
* 🔔 **Warning dialogs** to prevent accidents
* 💾 Local plugin settings — fully integrated with Vencord’s Settings menu
* 🧩 Uses Vencord’s internal APIs (`RestAPI`, `FluxDispatcher`, etc.)

---

## ⚠️ Warnings

* **Deleted channels cannot be recovered.**
* **This plugin is for educational or personal use only.**
* Using user tokens or automating actions from a regular account may **violate Discord’s Terms of Service.**
* Always prefer a **bot token** with the `Manage Channels` permission on your own server.

---

## 🛠️ Usage

1. **Hold Shift + Right Click** on channels to select them.
2. A floating **🗑️ Delete Selected** bar will appear.
3. Review the selected channels and confirm deletion.
4. (Optional) Use the **📥 Export** button to save a backup `.json` file.
5. Adjust settings like delay, export toggle, and warnings in **Vencord Settings → Plugin Settings → Bulk Channel Delete**.

---

## 🧪 Developer Notes

* Built with Vencord’s TypeScript plugin API.
* Uses `RestAPI.del()` and token fallback for deletion.
* Automatically dispatches `CHANNEL_DELETE` to update the UI after removal.
* Includes full cleanup in `stop()` for memory safety.

---

## 🧱 Planned Features

* 🆕 **Bulk Channel Creation** (text, voice, forum)
* 📂 **Bulk Category Creation**
* 💬 **Bulk Rename / Move / Clone** actions
* ⏸️ Rate-limit-aware deletion
* 🌈 Theme-aware UI styling
* 💡 “Dry Run” preview mode

---

### 💬 Feedback
Feel free to open an issue or PR on GitHub to suggest features or report bugs.

Made with ❤️ by **Miercoles**
