/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import definePlugin from "@utils/types";
import {
    AuthenticationStore,
    Button,
    ChannelStore,
    Forms,
    GuildStore,
    Menu,
    openModal,
    SelectedChannelStore,
    UserStore,
    useState
} from "@webpack/common";

// --- shape of each entry inside a VOICE_STATE_UPDATES dispatch ---
interface VoiceState {
    userId: string;
    channelId?: string; // undefined => disconnected
    oldChannelId?: string;
    sessionId: string;
}

const STORE_KEY = "VoiceTimeTracker_totals";

// If a single tick spans longer than this, assume the machine slept / froze
// and skip it rather than banking bogus hours. Tune to taste.
const SLEEP_GAP_MS = 5 * 60 * 1000;

// channelId -> total milliseconds spent
let totals: Record<string, number> = {};
let activeChannelId: string | null = null;
let lastTick = Date.now();
let interval: ReturnType<typeof setInterval> | undefined;
let dirty = false;

// Bank the time elapsed since the last tick against the channel we're in.
function tick() {
    const now = Date.now();
    if (activeChannelId) {
        const delta = now - lastTick;
        if (delta > 0 && delta < SLEEP_GAP_MS) {
            totals[activeChannelId] = (totals[activeChannelId] ?? 0) + delta;
            dirty = true;
        }
    }
    lastTick = now;
}

async function flush() {
    if (!dirty) return;
    await DataStore.set(STORE_KEY, totals);
    dirty = false;
}

function fmt(ms: number) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${sec}s`;
    return `${sec}s`;
}

function channelLabel(id: string) {
    const channel = ChannelStore.getChannel(id);
    if (!channel) return `Unknown channel (${id})`;
    const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id) : null;
    return guild ? `${guild.name} — ${channel.name}` : (channel.name ?? `Channel ${id}`);
}

// Small self-contained clock icon so we don't depend on a specific icon export.
function ClockIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// The actual list + reset button. Shared by both the settings panel and the modal
// so there's only ever one copy of this UI to maintain.
function StatsList() {
    const [, setNonce] = useState(0); // bump to force a re-render after reset
    const rows = Object.entries(totals).sort(([, a], [, b]) => b - a);

    return (
        <>
            {rows.length === 0
                ? <Forms.FormText>No voice time tracked yet. Join a voice channel to start.</Forms.FormText>
                : rows.map(([id, ms]) => (
                    <Forms.FormText key={id} className={Margins.bottom8}>
                        <strong>{fmt(ms)}</strong> — {channelLabel(id)}
                    </Forms.FormText>
                ))
            }

            <Button
                className={Margins.top16}
                color={Button.Colors.RED}
                size={Button.Sizes.SMALL}
                onClick={() => {
                    totals = {};
                    dirty = true;
                    flush();
                    setNonce(n => n + 1);
                }}
            >
                Reset all
            </Button>
        </>
    );
}

// Shown in the plugin's settings card.
function StatsPanel() {
    return (
        <Forms.FormSection>
            <Forms.FormTitle tag="h3">Voice time per channel</Forms.FormTitle>
            <StatsList />
        </Forms.FormSection>
    );
}

// Opened from the right-click menu on your own profile.
function openStatsModal() {
    openModal((props: ModalProps) => (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Forms.FormTitle tag="h2" style={{ margin: 0 }}>Voice Time Tracker</Forms.FormTitle>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <ModalContent>
                <div style={{ padding: "16px 0" }}>
                    <StatsList />
                </div>
            </ModalContent>
        </ModalRoot>
    ));
}

// Adds the entry to the user context menu — but ONLY when you right-click yourself.
const UserContextPatch: NavContextMenuPatchCallback = (children, { user }: { user?: { id: string; }; }) => {
    if (!user || user.id !== UserStore.getCurrentUser()?.id) return;

    children.push(
        <Menu.MenuItem
            id="vc-voice-time-tracker"
            label="Voice Time Tracker"
            icon={ClockIcon}
            action={openStatsModal}
        />
    );
};

export default definePlugin({
    name: "VoiceTimeTracker",
    description: "Tracks how long you spend in each voice channel and shows a per-channel breakdown.",
    authors: [ Devs.tojuszn ],

    settingsAboutComponent: StatsPanel,

    contextMenus: {
        "user-context": UserContextPatch
    },

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const myId = UserStore.getCurrentUser()?.id;
            if (!myId) return;

            const mySessionId = AuthenticationStore.getSessionId();

            for (const state of voiceStates) {
                if (state.userId !== myId) continue;

                // Only count the session running on THIS client; ignore phone / other logins.
                if (state.sessionId !== mySessionId) continue;

                // For the local user, channelId is always the channel we're now in
                // (the oldChannelId === channelId move-quirk doesn't matter here since
                // we never read oldChannelId). channelId === undefined => we disconnected.
                tick(); // bank time to the channel we're leaving
                activeChannelId = state.channelId ?? null;
                lastTick = Date.now();
            }
        }
    },

    async start() {
        totals = (await DataStore.get(STORE_KEY)) ?? {};
        // If we're already sitting in a VC when the plugin loads, start counting.
        activeChannelId = SelectedChannelStore.getVoiceChannelId() ?? null;
        lastTick = Date.now();

        interval = setInterval(() => {
            tick();
            flush(); // no-ops unless something changed; caps crash loss to ~1s
        }, 1000);
    },

    stop() {
        if (interval) clearInterval(interval);
        tick();
        flush();
    }
});
