import { addGlobalContextMenuPatch, removeGlobalContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import {
    ChannelStore,
    FluxDispatcher,
    Menu,
    PermissionsBits,
    PermissionStore,
    RestAPI,
    UserStore,
    showToast
} from "@webpack/common";

const VoiceStateStore = findStoreLazy("VoiceStateStore");

export const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Auto-disconnect listed users (turn off to pause without disabling the plugin)",
        default: true
    },
    blockedUsers: {
        type: OptionType.STRING,
        description: "User IDs to auto-disconnect from voice (comma or space separated)",
        default: ""
    },
    guildIds: {
        type: OptionType.STRING,
        description: "Only act in these server IDs (leave empty for all servers)",
        default: ""
    }
});

interface VoiceState {
    userId: string;
    guildId?: string | null;
    channelId?: string | null;
}

const parseList = (s: string) => new Set(s.split(/[\s,]+/).filter(Boolean));
const saveList = (set: Set<string>) => settings.store.blockedUsers = [...set].join(", ");

async function disconnectUser(guildId: string, userId: string, channelId: string) {
    const channel = ChannelStore.getChannel(channelId);
    if (!channel || !PermissionStore.can(PermissionsBits.MOVE_MEMBERS, channel)) return false;

    try {
        await RestAPI.patch({
            url: `/guilds/${guildId}/members/${userId}`,
            body: { channel_id: null }
        });
        return true;
    } catch (err) {
        console.error("[AutoVcKick] Failed to disconnect", userId, err);
        return false;
    }
}

async function onVoiceStateUpdates({ voiceStates }: { voiceStates: VoiceState[]; }) {
    if (!settings.store.enabled) return;
    const blocked = parseList(settings.store.blockedUsers);
    if (!blocked.size) return;
    const guilds = parseList(settings.store.guildIds);
    const myId = UserStore.getCurrentUser().id;

    for (const { userId, guildId, channelId } of voiceStates) {
        if (!channelId || !guildId) continue;
        if (!blocked.has(userId) || userId === myId) continue;
        if (guilds.size && !guilds.has(guildId)) continue;
        await disconnectUser(guildId, userId, channelId);
    }
}

const contextMenuPatch = (navId: string, children: any[], ...args: any[]) => {
    const user = args[0]?.user;
    if (!user?.id || user.id === UserStore.getCurrentUser().id || !Array.isArray(children)) return;
    if (children.some((c: any) => c?.props?.id === "vc-autokick-group")) return;

    const isBlocked = parseList(settings.store.blockedUsers).has(user.id);
    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuGroup id="vc-autokick-group">
            <Menu.MenuCheckboxItem
                id="vc-autokick-enabled"
                label="Auto-kick active"
                checked={settings.store.enabled}
                action={() => {
                    settings.store.enabled = !settings.store.enabled;
                    showToast(settings.store.enabled ? "Auto-kick enabled" : "Auto-kick paused", "success" as any);
                }}
            />
            <Menu.MenuItem
                id="vc-autokick-toggle"
                label={isBlocked ? "Remove from auto-kick list" : "Auto-kick from VC"}
                color={isBlocked ? undefined : "danger"}
                action={async () => {
                    const list = parseList(settings.store.blockedUsers);
                    if (isBlocked) {
                        list.delete(user.id);
                        saveList(list);
                        showToast(`${user.username} removed from auto-kick list`, "success" as any);
                        return;
                    }

                    list.add(user.id);
                    saveList(list);
                    showToast(`${user.username} added to auto-kick list`, "success" as any);
                    if (!settings.store.enabled) return;

                    const vs = VoiceStateStore.getVoiceStateForUser(user.id);
                    if (vs?.channelId) {
                        const channel = ChannelStore.getChannel(vs.channelId);
                        if (channel?.guild_id) await disconnectUser(channel.guild_id, user.id, vs.channelId);
                    }
                }}
            />
        </Menu.MenuGroup>
    );
};

export default definePlugin({
    name: "AutoVcKick",
    description: "Automatically disconnects specified users from voice channels",
    authors: [{ name: "thcProphet", id: 828010614349365288n }],
    settings,
    start() {
        addGlobalContextMenuPatch(contextMenuPatch);
        FluxDispatcher.subscribe("VOICE_STATE_UPDATES", onVoiceStateUpdates);
    },
    stop() {
        removeGlobalContextMenuPatch(contextMenuPatch);
        FluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", onVoiceStateUpdates);
    }
});
