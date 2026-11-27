import { addGlobalContextMenuPatch, removeGlobalContextMenuPatch } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import {
    ChannelStore,
    FluxDispatcher,
    Menu,
    PermissionsBits,
    PermissionStore,
    SelectedChannelStore,
    showToast
} from "@webpack/common";

const VoiceStateStore = findStoreLazy("VoiceStateStore");
const VoiceActions = findByPropsLazy("selectVoiceChannel");

const GUILD_VOICE = 2;

const settings = definePluginSettings({
    switchFromOtherVc: {
        type: OptionType.BOOLEAN,
        description: "If you're already in another voice channel when a spot opens, leave it and join the watched one",
        default: false
    }
});

let watchedChannelId: string | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let checkTimer: ReturnType<typeof setTimeout> | null = null;
let joining = false;

const toast = (msg: string, type: string = "message") => showToast(msg, type as any);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const getOccupancy = (channelId: string) =>
    Object.keys(VoiceStateStore.getVoiceStatesForChannel(channelId) ?? {}).length;

const getLimit = (channel: any) => channel.userLimit ?? channel.user_limit ?? 0;

const isFull = (channel: any) => {
    const limit = getLimit(channel);
    return limit > 0 && getOccupancy(channel.id) >= limit;
};

function stopWatching(message?: string, type?: string) {
    watchedChannelId = null;
    joining = false;
    if (pollTimer) clearInterval(pollTimer);
    if (checkTimer) clearTimeout(checkTimer);
    pollTimer = checkTimer = null;
    if (message) toast(message, type);
}

function startWatching(channel: any) {
    stopWatching();
    watchedChannelId = channel.id;
    pollTimer = setInterval(tryJoin, 2000); // safety net in case an event is missed
    toast(`Waiting for a spot in ${channel.name}...`, "success");
}

async function tryJoin() {
    if (!watchedChannelId || joining) return;

    const channelId = watchedChannelId;
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return stopWatching("Auto-join cancelled: channel not available", "failure");

    const current = SelectedChannelStore.getVoiceChannelId();
    if (current === channel.id) return stopWatching();

    if (isFull(channel)) return;

    // A spot is open
    if (current && !settings.store.switchFromOtherVc) {
        return stopWatching(
            `A spot opened in ${channel.name}, but you're in another voice channel. Auto-join cancelled.`,
            "failure"
        );
    }

    if (!PermissionStore.can(PermissionsBits.CONNECT, channel)) {
        return stopWatching(`Auto-join cancelled: you can't connect to ${channel.name}`, "failure");
    }

    joining = true;
    try {
        VoiceActions.selectVoiceChannel(channel.id);

        // Confirm quickly (up to ~3s). If someone took the spot first, keep waiting.
        for (let i = 0; i < 12; i++) {
            await sleep(250);
            if (watchedChannelId !== channelId) return; // cancelled meanwhile
            if (SelectedChannelStore.getVoiceChannelId() === channel.id) {
                stopWatching(`Joined ${channel.name}`, "success");
                return;
            }
        }
    } catch (err) {
        console.error("[AutoJoinVc] Failed to join", err);
    } finally {
        joining = false;
    }
}

function onVoiceStateUpdates() {
    if (!watchedChannelId) return;

    // Check immediately, then once more shortly after in case the voice store lagged behind
    tryJoin();
    if (checkTimer) clearTimeout(checkTimer);
    checkTimer = setTimeout(tryJoin, 100);
}

const contextMenuPatch = (navId: string, children: any[], ...args: any[]) => {
    if (!navId.includes("channel-context")) return;

    const props = args[0];
    const channel = props?.channel;
    if (!channel || props?.user || channel.type !== GUILD_VOICE) return;
    if (!Array.isArray(children)) return;
    if (children.some((c: any) => c?.props?.id === "vc-autojoin-group")) return;

    const watching = watchedChannelId === channel.id;

    // Only useful on a full channel, or to cancel an active watch
    if (!watching && !isFull(channel)) return;

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuGroup id="vc-autojoin-group">
            <Menu.MenuItem
                id="vc-autojoin-toggle"
                label={watching ? "Stop auto-joining" : "Auto-join when a spot opens"}
                action={() => {
                    if (watching) {
                        stopWatching("Auto-join cancelled");
                    } else {
                        startWatching(channel);
                    }
                }}
            />
        </Menu.MenuGroup>
    );
};

export default definePlugin({
    name: "AutoJoinVc",
    description: "Right-click a full voice channel to auto-join it as soon as a spot opens",
    authors: [{ name: "thcProphet", id: 828010614349365288n }],
    settings,

    start() {
        addGlobalContextMenuPatch(contextMenuPatch);
        FluxDispatcher.subscribe("VOICE_STATE_UPDATES", onVoiceStateUpdates);
    },

    stop() {
        stopWatching();
        removeGlobalContextMenuPatch(contextMenuPatch);
        FluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", onVoiceStateUpdates);
    }
});