import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Menu, UserStore, ChannelStore, SelectedChannelStore } from "@webpack/common";

// ---- Settings ----
const settings = definePluginSettings({
    whitelistedUserIds: {
        type: OptionType.STRING,
        description: "Comma-separated User IDs to always notify (even in DND).",
        default: "",
    },
    whitelistedGroupChatIds: {
        type: OptionType.STRING,
        description: "Comma-separated Group Chat IDs to always notify from (even in DND).",
        default: "",
    },
});

// ---- Helpers ----
function getWhitelist(setting: string): string[] {
    return setting.split(",").map(id => id.trim()).filter(id => id.length > 0);
}
function getUserWhitelist(): string[] { return getWhitelist(settings.store.whitelistedUserIds); }
function getGroupChatWhitelist(): string[] { return getWhitelist(settings.store.whitelistedGroupChatIds); }
function toggleIdInSetting(settingKey: "whitelistedUserIds" | "whitelistedGroupChatIds", id: string) {
    const list = getWhitelist(settings.store[settingKey]);
    const index = list.indexOf(id);
    if (index > -1) list.splice(index, 1);
    else list.push(id);
    settings.store[settingKey] = list.join(",");
}

// ---- Context Menu: User right‑click ----
const userContextMenuPatch: NavContextMenuPatchCallback = (children, { user }) => {
    if (!user || user.id === UserStore.getCurrentUser().id) return;
    const isWhitelisted = getUserWhitelist().includes(user.id);
    const label = isWhitelisted ? "Remove from DND Whitelist" : "Add to DND Whitelist";
    children.splice(-1, 0, (
        <Menu.MenuItem
            id="dnd-whitelist-user"
            label={label}
            action={() => toggleIdInSetting("whitelistedUserIds", user.id)}
        />
    ));
};

// ---- Context Menu: Group DM right‑click ----
const gdmContextMenuPatch: NavContextMenuPatchCallback = (children, props) => {
    try {
        const channel = props?.channel;
        if (!channel || typeof channel.isGroupDM !== "function" || !channel.isGroupDM()) return;
        const isWhitelisted = getGroupChatWhitelist().includes(channel.id);
        const label = isWhitelisted
            ? "Remove Group Chat from DND Whitelist"
            : "Add Group Chat to DND Whitelist";
        children.splice(-1, 0, (
            <Menu.MenuItem
                id="dnd-whitelist-groupchat"
                label={label}
                action={() => toggleIdInSetting("whitelistedGroupChatIds", channel.id)}
            />
        ));
    } catch (err) { console.error("[DNDWhitelist] gdm context menu error:", err); }
};

// ---- Modules (found at startup) ----
let NotificationModule: any;
let PresenceStore: any;
let Dispatcher: any;
let SoundMod: any;
let SoundMethod: string;

// ---- Listener ----
function onMessageCreate(event: any) {
    try {
        const message = event.message;
        if (!message || !message.author) return;

        const myId = UserStore.getCurrentUser()?.id;
        if (!myId || message.author.id === myId) return;

        const myStatus = PresenceStore.getStatus(myId);
        if (myStatus !== "dnd") return;

        // ---- NEW: Skip if the user is currently viewing this conversation ----
        const selectedChannelId = SelectedChannelStore.getChannelId(); // current channel being viewed
        const isFocused = document.hasFocus();                           // Discord window focused?

        // If the message is from the channel we're looking at, and Discord is focused → skip
        if (message.channel_id === selectedChannelId && isFocused) {
            return; // Don't notify, you're already watching the chat
        }

        // Check whitelist
        const isUserWhitelisted = getUserWhitelist().includes(message.author.id);
        let isGroupChatWhitelisted = false;
        if (message.channel_id) {
            const channel = ChannelStore.getChannel(message.channel_id);
            if (channel?.isGroupDM?.()) {
                isGroupChatWhitelisted = getGroupChatWhitelist().includes(channel.id);
            }
        }

        if (isUserWhitelisted || isGroupChatWhitelisted) {
            console.log("[DNDWhitelist] Firing notification for", message.author.username);

            // Popup
            try { NotificationModule?.showNotification?.(message); } catch (e) {}
            // Sound
            try { if (SoundMod && SoundMethod) SoundMod[SoundMethod]("message1"); } catch (e) {}
        }
    } catch (e) {
        console.error("[DNDWhitelist] Listener error:", e);
    }
}

// ---- Plugin ----
export default definePlugin({
    name: "DNDWhitelist",
    description: "Receive notifications from selected users/group chats even in Do Not Disturb.",
    authors: [{ name: "darksoul5141", id: 1286128061833678861n }],
    settings,
    contextMenus: {
        "user-context": userContextMenuPatch,
        "gdm-context": gdmContextMenuPatch,
    },

    start() {
        const wp = (window as any).Vencord?.Webpack;
        if (!wp) return console.error("[DNDWhitelist] Webpack missing");

        Dispatcher = wp.findByProps("subscribe", "dispatch");
        PresenceStore = wp.findByProps("getStatus", "getActivities");
        NotificationModule = wp.findByProps("showNotification");

        // Silent sound search
        const soundChecks = [
            ["playSound"],
            ["play", "stopAll"],
            ["playAudio"],
            ["playSound", "pause"],
            ["play", "stop", "isPlaying"],
            ["playNotificationSound"],
        ];
        for (const props of soundChecks) {
            try {
                const mod = wp.findByProps(...props);
                if (mod) { SoundMod = mod; SoundMethod = props[0]; console.log("[DNDWhitelist] Sound module:", SoundMethod); break; }
            } catch (_) {}
        }

        if (!Dispatcher) console.error("[DNDWhitelist] Dispatcher not found.");
        if (!PresenceStore) console.error("[DNDWhitelist] PresenceStore not found.");
        if (!NotificationModule) console.warn("[DNDWhitelist] NotificationModule not found.");
        if (!SoundMod) console.warn("[DNDWhitelist] Sound module not found.");

        Dispatcher.subscribe("MESSAGE_CREATE", onMessageCreate);
        console.log("[DNDWhitelist] Started successfully!");
    },

    stop() {
        Dispatcher?.unsubscribe("MESSAGE_CREATE", onMessageCreate);
    },
});