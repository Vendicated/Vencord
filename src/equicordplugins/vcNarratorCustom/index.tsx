/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import ErrorBoundary from "@components/ErrorBoundary";
import { HeadingPrimary, HeadingSecondary } from "@components/Heading";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import {
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    ModalSize,
    openModal,
} from "@utils/modal";
import { wordsToTitle } from "@utils/text";
import definePlugin, { OptionType } from "@utils/types";
import type { User } from "@vencord/discord-types";
import {
    Button as DiscordButton,
    ChannelStore,
    Forms,
    GuildMemberStore,
    IconUtils,
    Menu,
    React,
    SearchableSelect,
    SelectedChannelStore,
    SelectedGuildStore,
    useMemo,
    UserStore,
    VoiceStateStore,
} from "@webpack/common";

import {
    addUserToStateChangeFilterList,
    clean,
    clearTtsCache,
    formatText,
    getCachedVoiceFromDB,
    getPersistentTtsCacheStats,
    getVoiceForUser,
    parseStateChangeFilterList,
    parseUserVoiceMap,
    removeUserFromStateChangeFilterList,
    removeUserVoiceFromMap,
    setCachedVoiceInDB,
    ttsCache,
    upsertUserVoiceMap,
    VOICE_OPTIONS,
} from "./util";

const cl = classNameFactory("vc-narrator-");

/*
 * TTS API maintained by example-git
 * The original TikTok TTS API went offline, so I set up a new working cloudflare worker.
 * I made sure it's intentionally rate-limited to keep it feasible. Please don't abuse it
 * so it can stay available for plugins like this one. Thanks! - example-git
 */
const API_BASE = "https://tiktok-tts-aio.exampleuser.workers.dev";

type LastApiCallStatus = {
    at: number;
    message: string;
    status?: number;
};

const apiStatusListeners = new Set<(status: LastApiCallStatus) => void>();
let lastApiCallStatus: LastApiCallStatus = { at: 0, message: "No API calls yet" };

function setLastApiCallStatus(next: LastApiCallStatus) {
    lastApiCallStatus = next;
    for (const listener of apiStatusListeners) listener(next);
}

function recordApiResponse(response: Response) {
    setLastApiCallStatus({
        at: Date.now(),
        status: response.status,
        message: response.ok ? `Success (${response.status})` : `HTTP ${response.status}`,
    });
}

function recordApiError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    setLastApiCallStatus({
        at: Date.now(),
        message: message ? `Network error: ${message}` : "Network error",
    });
}

function TroubleshootingSettings() {
    const [cacheStats, setCacheStats] = React.useState<{ bytes: number; entries: number; } | null>(null);
    const [cacheBusy, setCacheBusy] = React.useState(false);
    const [apiStatus, setApiStatus] = React.useState<LastApiCallStatus>(lastApiCallStatus);

    const refreshCacheStats = React.useCallback(async () => {
        try {
            setCacheStats(await getPersistentTtsCacheStats());
        } catch {
            setCacheStats(null);
        }
    }, []);

    React.useEffect(() => {
        refreshCacheStats();
    }, [refreshCacheStats]);

    React.useEffect(() => {
        apiStatusListeners.add(setApiStatus);
        return () => void apiStatusListeners.delete(setApiStatus);
    }, []);

    const onClearCache = React.useCallback(async () => {
        setCacheBusy(true);
        try {
            await clearTtsCache();
        } finally {
            setCacheBusy(false);
        }
        await refreshCacheStats();
    }, [refreshCacheStats]);

    const formatBytes = (bytes: number) => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
    };

    const lastApiAt = apiStatus.at ? new Date(apiStatus.at).toLocaleTimeString() : "—";
    const apiStatusClass = apiStatus.status
        ? apiStatus.status >= 200 && apiStatus.status < 300
            ? cl("api-status-success")
            : cl("api-status-error")
        : cl("api-status-muted");

    return (
        <div className={cl("troubleshooting")}>
            <Divider className={cl("divider")} />

            <Forms.FormTitle tag="h3" className={cl("title")}>Troubleshooting</Forms.FormTitle>

            <div className={cl("row")}>
                <div className={cl("buttons")}>
                    <Button variant="dangerPrimary" size="small" onClick={onClearCache} disabled={cacheBusy}>
                        Clear cache
                    </Button>

                    <Button variant="secondary" size="xs" onClick={refreshCacheStats} disabled={cacheBusy}>
                        Refresh size
                    </Button>
                </div>

                <Forms.FormText className={cl("cache-text")}>
                    Cache: {cacheStats ? `${formatBytes(cacheStats.bytes)} • ${cacheStats.entries} entries` : "Unknown"}
                </Forms.FormText>
            </div>

            <Forms.FormText className={cl("api-text")}>
                <span>Last API call: </span>
                <span className={apiStatusClass}>{apiStatus.message}</span>
                <span className={cl("api-time")}> • {lastApiAt}</span>
            </Forms.FormText>
        </div>
    );
}

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    selfStream?: boolean;
    stream?: boolean;
}

// Two-queue system for TTS playback:
// - mainQueue: Non-interruptable messages (user names, join/leave announcements)
// - stateQueue: Interruptable messages (mute/deafen/stream state changes)
// This allows rapid state changes to interrupt each other while preserving important announcements
interface QueueItem {
    text: string;
    userId?: string;
    interruptKey?: string;
    useDefaultVoice?: boolean;
}
const mainQueue: QueueItem[] = [];
const stateQueue: QueueItem[] = [];
let isSpeaking = false;
let onQueueChange: (() => void) | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentInterruptKey: string | undefined;
let currentStop: (() => void) | null = null;

// Pre-cache common state action phrases on plugin start for faster playback
// Uses phonetic spellings for muted/deafened to ensure clear pronunciation across all voices
const COMMON_ACTIONS = ["myooted", "un-myooted", "deafind", "un-deafind", "started streaming", "stopped streaming"];
const DEFAULT_VOICE = "en_us_001";
let preCacheInitialized = false;

async function preCacheCommonActions() {
    if (preCacheInitialized) return;
    preCacheInitialized = true;

    // Initial delay before starting pre-cache to not impact startup
    await new Promise(r => setTimeout(r, 3000));

    // Pre-fetch common action words in DEFAULT voice (universal for all users)
    for (const action of COMMON_ACTIONS) {
        const cacheKey = `${DEFAULT_VOICE}_${action}`;

        // 1. Check in-memory cache first
        if (ttsCache.has(cacheKey)) continue;

        // 2. Check persistent IndexedDB cache - load into memory if found
        try {
            const cachedBlob = await getCachedVoiceFromDB(cacheKey);
            if (cachedBlob) {
                ttsCache.set(cacheKey, URL.createObjectURL(cachedBlob));
                continue;
            }
        } catch { /* ignore */ }

        // 3. Fetch from API and store in both memory and persistent DB
        try {
            const response = await fetch(`${API_BASE}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: action, voice: DEFAULT_VOICE, base64: true }),
            });
            recordApiResponse(response);
            if (response.ok) {
                const audioData = atob((await response.text()).trim());
                const binaryData = new Uint8Array(audioData.length);
                for (let i = 0; i < audioData.length; i++) {
                    binaryData[i] = audioData.charCodeAt(i);
                }
                const blob = new Blob([binaryData], { type: "audio/mpeg" });

                // Store in memory cache
                ttsCache.set(cacheKey, URL.createObjectURL(blob));

                // Persist to IndexedDB for future sessions
                await setCachedVoiceInDB(cacheKey, blob);
            }
        } catch (e) {
            recordApiError(e);
            /* ignore pre-cache failures */
        }

        // Space out API requests to avoid rate limiting (2 seconds between each)
        await new Promise(r => setTimeout(r, 2000));
    }
}

function isQueueBusy() {
    return isSpeaking || mainQueue.length > 0 || stateQueue.length > 0;
}

function interruptPlayback(key: string) {
    if (currentInterruptKey !== key || !currentStop) return;
    currentAudio?.pause();
    currentStop();
}

async function processQueue() {
    if (isSpeaking) return;

    // Optimization: if main queue has intro and state queue has action with no other items,
    // and they're for the same user, combine them into single API call
    if (mainQueue.length === 1 && stateQueue.length === 1 &&
        mainQueue[0].userId === stateQueue[0].userId &&
        !mainQueue[0].interruptKey) {
        const intro = mainQueue.shift()!;
        const action = stateQueue.shift()!;
        const combined: QueueItem = {
            text: `${intro.text} ${action.text}`,
            userId: intro.userId,
            interruptKey: action.interruptKey, // Keep action's interrupt key so rapid switches can interrupt
            useDefaultVoice: false, // Combined uses user voice for the intro part
        };
        mainQueue.push(combined);
    }

    const item = mainQueue.shift() ?? stateQueue.shift();
    if (!item) return;
    isSpeaking = true;
    onQueueChange?.();

    try {
        await speak(item.text, item.userId, item.interruptKey, item.useDefaultVoice);
    } catch (e) {
        console.error("TTS Error:", e);
    }

    // Delay between messages - longer for state changes to allow interruption
    const delay = item.interruptKey ? 800 : 500;
    setTimeout(() => {
        isSpeaking = false;
        onQueueChange?.();
        processQueue();
    }, delay);
}

function queueSpeak(text: string, userId?: string, interruptKey?: string, queue: "main" | "state" = "main", useDefaultVoice?: boolean) {
    if (text.trim().length === 0) return;

    // Anti-spam: cap queue size
    const targetQueue = queue === "state" ? stateQueue : mainQueue;
    if (targetQueue.length >= 5) {
        // If queue is full, drop new to stop the spam wave
        return;
    }

    if (interruptKey) {
        for (let i = targetQueue.length - 1; i >= 0; i--) {
            if (targetQueue[i].interruptKey === interruptKey) {
                targetQueue.splice(i, 1);
            }
        }
        interruptPlayback(interruptKey);
    }

    targetQueue.push({ text, userId, interruptKey, useDefaultVoice });
    onQueueChange?.();
    processQueue();
}

async function speak(text: string, userId?: string, interruptKey?: string, useDefaultVoice?: boolean): Promise<void> {
    return new Promise(resolve => {
        const onEnd = () => {
            if (currentStop === onEnd) {
                currentAudio = null;
                currentInterruptKey = undefined;
                currentStop = null;
            }
            resolve();
        };

        // Helper to play audio and resolve promise when done
        const playAudio = (url: string) => {
            const audio = new Audio(url);
            audio.volume = settings.store.volume;
            audio.playbackRate = settings.store.rate;
            audio.onended = onEnd;
            audio.onerror = onEnd; // Resolve even on error to unblock queue
            currentAudio = audio;
            currentInterruptKey = interruptKey;
            currentStop = onEnd;
            audio.play().catch(onEnd);
        };

        void (async () => {
            // Use default voice for universal actions, otherwise user-specific voice
            const voice = useDefaultVoice
                ? DEFAULT_VOICE
                : getVoiceForUser(userId, {
                    userVoiceMap: settings.store.userVoiceMap,
                    customVoice: settings.store.customVoice,
                    defaultVoice: DEFAULT_VOICE,
                });

            // Create a unique cache key using the voice and text.
            const cacheKey = `${voice}_${text}`;

            // 1. Check the in-memory cache (fast check)
            if (ttsCache.has(cacheKey)) {
                playAudio(ttsCache.get(cacheKey)!);
                return;
            }

            // 2. Check the persistent IndexedDB cache.
            try {
                const cachedBlob = await getCachedVoiceFromDB(cacheKey);
                if (cachedBlob) {
                    const url = URL.createObjectURL(cachedBlob);
                    ttsCache.set(cacheKey, url);
                    playAudio(url);
                    return;
                }
            } catch (err) {
                console.error("Error accessing IndexedDB:", err);
            }

            // 3. Fetch from API
            try {
                const response = await fetch(`${API_BASE}/api/generate`, {
                    method: "POST",
                    mode: "cors",
                    cache: "no-cache",
                    headers: { "Content-Type": "application/json" },
                    referrerPolicy: "no-referrer",
                    body: JSON.stringify({
                        text: text,
                        voice: voice,
                        base64: true,
                    }),
                });
                recordApiResponse(response);

                if (!response.ok) {
                    console.error(`TTS failed: ${response.status}`);
                    resolve(); // Skip this message
                    return;
                }

                const audioData = atob((await response.text()).trim());
                const binaryData = new Uint8Array(audioData.length);
                for (let i = 0; i < audioData.length; i++) {
                    binaryData[i] = audioData.charCodeAt(i);
                }

                const blob = new Blob([binaryData], { type: "audio/mpeg" });
                const url = URL.createObjectURL(blob);

                ttsCache.set(cacheKey, url);
                setCachedVoiceInDB(cacheKey, blob).catch(console.error);

                playAudio(url);
            } catch (e) {
                recordApiError(e);
                console.error("TTS Network Error:", e);
                resolve();
            }
        })().catch(onEnd);
    });
}

// For every user, channelId and oldChannelId will differ when moving channel.
// Only for the local user, channelId and oldChannelId will be the same when moving channel,
// for some ungodly reason
let myLastChannelId: string | undefined;

type NormalizedVoiceState = {
    muted: boolean;
    deaf: boolean;
    streaming: boolean;
};

let trackedChannelId: string | null = null;
let baselineReady = false;
let baselineUpdateInProgress = false;
const voiceStateSnapshot = new Map<string, NormalizedVoiceState>();
const lastAnnounced = new Map<string, number>();
const lastIntroSpokenAt = new Map<string, number>();
const INTRO_REUSE_MS = 2000;

function normalizeState(state: VoiceState): NormalizedVoiceState {
    return {
        muted: !!(state.mute || state.selfMute),
        deaf: !!(state.deaf || state.selfDeaf),
        streaming: !!((state as any).selfStream || (state as any).stream),
    };
}

function shouldAnnounce(key: string): boolean {
    const cd = settings.store.stateChangeCooldownMs ?? 0;
    if (cd <= 0) return true;
    const now = Date.now();
    const last = lastAnnounced.get(key) ?? 0;
    if (now - last < cd) return false;
    lastAnnounced.set(key, now);
    return true;
}

type StateActionType = "stream" | "mute" | "deaf";

/**
 * Builds the intro and action segments for state change announcements.
 *
 * Format: "{USERNAME}" + "{ACTION}"
 * Examples:
 * - "JohnDoe" + "myooted" / "un-myooted" / "deafind" / "un-deafind"
 * - "JohnDoe" + "started streaming" / "stopped streaming"
 *
 * Uses phonetic spellings for muted/deafened to ensure clear pronunciation.
 */
function buildStateSegments(
    type: StateActionType,
    isOn: boolean,
    preferredName: string,
    isSelf: boolean
): { intro: string; action: string; } {
    const name = clean(preferredName, settings.store.latinOnly) || (isSelf ? "You" : "Someone");

    if (type === "stream") {
        return {
            intro: name,
            action: isOn ? "started streaming" : "stopped streaming",
        };
    }

    // Mute and deaf - no verb, just name + phonetic action
    const action = type === "mute"
        ? (isOn ? "myooted" : "un-myooted")
        : (isOn ? "deafind" : "un-deafind");

    return {
        intro: name,
        action,
    };
}

/**
 * Queues a state change announcement as two parts:
 * - Intro (username) goes to mainQueue - won't be interrupted
 * - Action (state) goes to stateQueue - can be interrupted by rapid state changes
 *
 * Uses a shared interrupt key per user so rapid toggles (mute->unmute->mute)
 * only announce the final state.
 */
function queueStateSplitAnnouncement(
    userId: string,
    intro: string,
    actionText: string
) {
    const safeIntro = intro.trim();
    const shouldQueueIntro = safeIntro && (Date.now() - (lastIntroSpokenAt.get(userId) ?? 0) > INTRO_REUSE_MS);

    if (shouldQueueIntro) {
        lastIntroSpokenAt.set(userId, Date.now());
    }

    // Handle interrupt key for action - remove any pending actions for this user
    const interruptKey = `${userId}:state:action`;
    for (let i = stateQueue.length - 1; i >= 0; i--) {
        if (stateQueue[i].interruptKey === interruptKey) {
            stateQueue.splice(i, 1);
        }
    }
    interruptPlayback(interruptKey);

    // Add both items to queues BEFORE processing
    if (shouldQueueIntro) {
        mainQueue.push({ text: safeIntro, userId, interruptKey: undefined, useDefaultVoice: false });
    }
    stateQueue.push({ text: actionText, userId, interruptKey, useDefaultVoice: false });

    onQueueChange?.();
    processQueue();
}

async function refreshBaseline(channelId: string) {
    if (baselineUpdateInProgress) return;

    baselineUpdateInProgress = true;
    trackedChannelId = channelId;
    baselineReady = false;

    for (let i = 0; i < 15; i++) {
        const states = VoiceStateStore.getVoiceStatesForChannel?.(channelId);
        if (states) {
            voiceStateSnapshot.clear();
            for (const s of Object.values(states) as any[]) {
                if (!s?.userId) continue;
                voiceStateSnapshot.set(s.userId, normalizeState(s as VoiceState));
            }
            baselineReady = true;
            break;
        }
        await new Promise(r => setTimeout(r, 200));
    }

    baselineUpdateInProgress = false;
}

function getTypeAndChannelId(
    { channelId, oldChannelId }: VoiceState,
    isMe: boolean
) {
    if (isMe && channelId !== myLastChannelId) {
        oldChannelId = myLastChannelId;
        myLastChannelId = channelId;
    }

    if (channelId !== oldChannelId) {
        if (channelId) return [oldChannelId ? "move" : "join", channelId];
        if (oldChannelId) return ["leave", oldChannelId];
    }
    return ["", ""];
}

function playSample(tempSettings: any, type: string) {
    const settingsobj = Object.assign(
        {},
        settings.store,
        tempSettings
    );
    const currentUser = UserStore.getCurrentUser();
    const myGuildId = SelectedGuildStore.getGuildId();

    queueSpeak(
        formatText(
            settingsobj[type + "Message"],
            currentUser.username,
            "general",
            (currentUser as any).globalName ?? currentUser.username,
            (myGuildId ? GuildMemberStore.getNick(myGuildId, currentUser.id) : null) ?? currentUser.username,
            settingsobj.latinOnly
        )
    );
}

const settings = definePluginSettings({
    customVoice: {
        type: OptionType.SELECT,
        description: "Narrator voice",
        options: VOICE_OPTIONS,
        default: "en_us_001",
    },
    volume: {
        type: OptionType.SLIDER,
        description: "Narrator Volume",
        default: 1,
        markers: [0, 0.25, 0.5, 0.75, 1],
        stickToMarkers: false,
    },
    rate: {
        type: OptionType.SLIDER,
        description: "Narrator Speed",
        default: 1,
        markers: [0.1, 0.5, 1, 2, 5, 10],
        stickToMarkers: false,
    },
    sayOwnName: {
        description: "Say own name",
        type: OptionType.BOOLEAN,
        default: false,
    },
    ignoreSelf: {
        description: "Ignore yourself for all events.",
        type: OptionType.BOOLEAN,
        default: false,
    },
    latinOnly: {
        description:
            "Strip non latin characters from names before saying them",
        type: OptionType.BOOLEAN,
        default: false,
    },
    joinMessage: {
        type: OptionType.STRING,
        description: "Placeholders: {{USER}}, {{DISPLAY_NAME}}, {{NICKNAME}}, {{CHANNEL}}",
        default: "{{DISPLAY_NAME}} joined",
    },
    leaveMessage: {
        type: OptionType.STRING,
        description: "Leave Message",
        default: "{{DISPLAY_NAME}} left",
    },
    moveMessage: {
        type: OptionType.STRING,
        description: "Move Message",
        default: "{{DISPLAY_NAME}} moved to {{CHANNEL}}",
    },
    announceOthersMute: {
        description: "Announce when other users mute/unmute in your current VC",
        type: OptionType.BOOLEAN,
        default: false,
    },
    announceOthersDeafen: {
        description: "Announce when other users deafen/undeafen in your current VC",
        type: OptionType.BOOLEAN,
        default: false,
    },
    announceOthersStream: {
        description: "Announce when other users start/stop streaming in your current VC",
        type: OptionType.BOOLEAN,
        default: false,
    },
    announceSelfStream: {
        description: "Announce when you start/stop streaming",
        type: OptionType.BOOLEAN,
        default: false,
    },
    stateChangeCooldownMs: {
        description: "State-change announce cooldown (ms)",
        type: OptionType.SLIDER,
        default: 1500,
        markers: [0, 250, 500, 1000, 1500, 2500, 5000, 10000],
        stickToMarkers: true,
    },
    userVoiceMap: {
        type: OptionType.STRING,
        description: "Per-user voice overrides (format: userId:voiceId,userId2:voiceId2). Right-click users to set.",
        default: "",
    },
    stateChangeFilterMode: {
        type: OptionType.SELECT,
        description: "Filter which users trigger state-change announcements",
        options: [
            { label: "Off", value: "off" },
            { label: "Whitelist (only announce listed users)", value: "whitelist" },
            { label: "Blacklist (announce everyone except listed)", value: "blacklist" },
        ],
        default: "off",
    },
    stateChangeFilterList: {
        type: OptionType.STRING,
        description: "Comma-separated user IDs for whitelist/blacklist. Right-click users to add/remove.",
        default: "",
    },
    troubleshooting: {
        type: OptionType.COMPONENT,
        component: () => <TroubleshootingSettings />,
    },
});

interface UserContextProps {
    user: User;
}

// Voice selection modal component
function VoiceSelectModal({ modalProps, user }: { modalProps: ModalProps; user: User; }) {
    const DEFAULT_VALUE = "__default__";

    const options = useMemo(() => {
        return [
            { label: `Default (${settings.store.customVoice})`, value: DEFAULT_VALUE },
            ...VOICE_OPTIONS.map(v => ({ label: v.label, value: v.value })),
        ];
    }, [settings.store.customVoice]);

    const [currentValue, setCurrentValue] = React.useState<string>(DEFAULT_VALUE);
    const [busy, setBusy] = React.useState(false);

    React.useEffect(() => {
        const map = parseUserVoiceMap(settings.store.userVoiceMap ?? "");
        setCurrentValue(map.get(user.id) ?? DEFAULT_VALUE);
    }, [user.id, settings.store.userVoiceMap]);

    // Get the display name for preview
    const displayName = (user as any).globalName ?? user.username;

    // Preview function that speaks the user's name in the selected voice
    const previewVoice = async (text: string) => {
        setBusy(true);
        const voice = currentValue === DEFAULT_VALUE
            ? (settings.store.customVoice ?? "en_us_001")
            : currentValue;
        try {
            const response = await fetch(`${API_BASE}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, voice, base64: true }),
            });
            recordApiResponse(response);
            if (response.ok) {
                const audioData = atob((await response.text()).trim());
                const binaryData = new Uint8Array(audioData.length);
                for (let i = 0; i < audioData.length; i++) {
                    binaryData[i] = audioData.charCodeAt(i);
                }
                const blob = new Blob([binaryData], { type: "audio/mpeg" });
                const audio = new Audio(URL.createObjectURL(blob));
                audio.volume = settings.store.volume ?? 1;
                audio.playbackRate = settings.store.rate ?? 1;
                audio.onended = () => setBusy(false);
                audio.onerror = () => setBusy(false);
                await audio.play();
                return;
            }
        } catch (e) {
            recordApiError(e);
            console.error("Preview error:", e);
        }
        setBusy(false);
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <HeadingPrimary className={cl("modal-title")}>VC Narrator Voice</HeadingPrimary>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>

            <ModalContent>
                <section className={Margins.bottom16}>
                    <HeadingSecondary>Select voice for {user.username}</HeadingSecondary>
                    <SearchableSelect
                        options={options}
                        value={options.find(o => o.value === currentValue)?.value}
                        placeholder="Select a voice"
                        maxVisibleItems={6}
                        closeOnSelect={true}
                        onChange={v => setCurrentValue(v as any)}
                    />

                    {/* Preview buttons */}
                    <Forms.FormText className={cl("preview-hint")}>
                        Preview how this voice sounds with their name:
                    </Forms.FormText>
                    <div className={cl("preview-buttons")}>
                        <Button
                            variant="secondary"
                            size="small"
                            disabled={busy}
                            onClick={() => previewVoice(clean(displayName, settings.store.latinOnly) || "Someone")}
                        >
                            {busy ? "Playing..." : `"${clean(displayName, settings.store.latinOnly) || "Someone"}"`}
                        </Button>
                        <Button
                            variant="secondary"
                            size="small"
                            disabled={busy}
                            onClick={() => previewVoice(`${clean(displayName, settings.store.latinOnly) || "Someone"} joined`)}
                        >
                            Joined
                        </Button>
                        <Button
                            variant="secondary"
                            size="small"
                            disabled={busy}
                            onClick={() => previewVoice(`${clean(displayName, settings.store.latinOnly) || "Someone"} left`)}
                        >
                            Left
                        </Button>
                    </div>
                </section>
            </ModalContent>

            <ModalFooter>
                <div className={cl("modal-footer")}>
                    <DiscordButton
                        color={DiscordButton.Colors.PRIMARY}
                        onClick={modalProps.onClose}
                    >
                        Cancel
                    </DiscordButton>
                    <DiscordButton
                        color={DiscordButton.Colors.BRAND}
                        onClick={() => {
                            if (currentValue === DEFAULT_VALUE) {
                                settings.store.userVoiceMap = removeUserVoiceFromMap(settings.store.userVoiceMap, user.id);
                            } else {
                                settings.store.userVoiceMap = upsertUserVoiceMap(settings.store.userVoiceMap, user.id, currentValue);
                            }
                            modalProps.onClose();
                        }}
                    >
                        Save
                    </DiscordButton>
                </div>
            </ModalFooter>
        </ModalRoot>
    );
}

function openVoiceSelectModal(user: User) {
    openModal(modalProps => (
        <ErrorBoundary>
            <VoiceSelectModal modalProps={modalProps} user={user} />
        </ErrorBoundary>
    ));
}

// Context menu to assign voice to user
const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user) return;

    const map = parseUserVoiceMap(settings.store.userVoiceMap);
    const currentVoice = map.get(user.id);
    const voiceLabel = currentVoice
        ? VOICE_OPTIONS.find(v => v.value === currentVoice)?.label ?? currentVoice
        : "Default";

    const filterMode = settings.store.stateChangeFilterMode ?? "off";
    const filterSet = parseStateChangeFilterList(settings.store.stateChangeFilterList);
    const inFilter = filterSet.has(user.id);
    const filterEnabled = filterMode === "whitelist" || filterMode === "blacklist";
    const filterLabel =
        filterMode === "whitelist"
            ? inFilter ? "Remove from whitelist" : "Add to whitelist"
            : filterMode === "blacklist"
                ? inFilter ? "Remove from blacklist" : "Add to blacklist"
                : "State-change filter (enable in settings)";
    const filterAction = !filterEnabled
        ? undefined
        : () => {
            if (inFilter) {
                settings.store.stateChangeFilterList = removeUserFromStateChangeFilterList(settings.store.stateChangeFilterList, user.id);
            } else {
                settings.store.stateChangeFilterList = addUserToStateChangeFilterList(settings.store.stateChangeFilterList, user.id);
            }
        };

    children.push(
        <Menu.MenuItem
            id="vc-narrator-submenu"
            label="VC Narrator"
        >
            <Menu.MenuItem
                key="voice"
                id="vc-narrator-voice"
                label={`Voice: ${voiceLabel}`}
                action={() => openVoiceSelectModal(user)}
            />
            <Menu.MenuItem
                key="filter"
                id="vc-narrator-state-filter"
                label={filterLabel}
                disabled={!filterEnabled}
                action={filterAction}
            />
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "VcNarratorCustom",
    description: "Announces when users join, leave, or move voice channels via narrator using TikTok TTS. Revamped and back from the dead.",
    authors: [Devs.Ven, Devs.Nyako, EquicordDevs.Loukios, EquicordDevs.examplegit],
    settings,
    contextMenus: {
        "user-context": UserContextMenuPatch,
        "user-profile-actions": UserContextMenuPatch
    },

    start() {
        // Pre-cache common action words in background for faster state change announcements
        preCacheCommonActions();
    },

    flux: {
        async VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const myId = UserStore.getCurrentUser().id;
            const myGuildId = SelectedGuildStore.getGuildId();
            const myVoiceState = VoiceStateStore.getVoiceStateForUser(myId) as VoiceState | undefined;
            let myChanId = myVoiceState?.channelId;
            if (!myChanId) {
                const selectedChanId = SelectedChannelStore.getVoiceChannelId();
                if (selectedChanId) {
                    const states = VoiceStateStore.getVoiceStatesForChannel?.(selectedChanId) as Record<string, VoiceState> | undefined;
                    if (states?.[myId]?.channelId === selectedChanId) {
                        myChanId = selectedChanId;
                    }
                }
            }
            const filterMode = settings.store.stateChangeFilterMode ?? "off";
            const filterList = parseStateChangeFilterList(settings.store.stateChangeFilterList);
            const allowStateChange = (targetId: string, isSelf: boolean) => {
                if (isSelf) return true;
                if (filterMode === "off") return true;
                const inList = filterList.has(targetId);
                return filterMode === "whitelist" ? inList : !inList;
            };

            if (myChanId && ChannelStore.getChannel(myChanId)?.type === 13 /* Stage Channel */) return;

            if (!myChanId) {
                trackedChannelId = null;
                baselineReady = false;
                voiceStateSnapshot.clear();
            } else if (trackedChannelId !== myChanId) {
                await refreshBaseline(myChanId);
            }

            const isBatchUpdate = voiceStates.length > 1 && voiceStates.some(s => !("oldChannelId" in (s as any)));
            if (isBatchUpdate && myChanId) {
                // Guild-open / bulk refresh: update baseline silently to avoid spam.
                await refreshBaseline(myChanId);
                return;
            }

            for (const state of voiceStates) {
                const { userId, channelId } = state;
                let { oldChannelId } = state;

                const isMe = userId === myId;
                if (!isMe && !myChanId) continue;
                if (isMe && channelId !== myLastChannelId) {
                    oldChannelId = myLastChannelId;
                    myLastChannelId = channelId ?? undefined;
                }

                const affectsMyChannel = channelId === myChanId || oldChannelId === myChanId;
                if (!isMe && !affectsMyChannel) continue;

                // Keep snapshots in sync for join/leave/move without announcing state changes.
                if (myChanId) {
                    if (oldChannelId !== myChanId && channelId === myChanId) {
                        voiceStateSnapshot.set(userId, normalizeState(state));
                    } else if (oldChannelId === myChanId && channelId !== myChanId) {
                        voiceStateSnapshot.delete(userId);
                    }
                }

                // Join/leave/move announcements (existing behavior)
                const [type, id] = getTypeAndChannelId({ ...state, oldChannelId }, isMe);
                if (type) {
                    const template = settings.store[type + "Message"];
                    const u = isMe && !settings.store.sayOwnName ? "" : UserStore.getUser(userId).username;
                    const displayName = u && ((UserStore.getUser(userId) as any).globalName ?? u);
                    const nickname = u && ((myGuildId ? GuildMemberStore.getNick(myGuildId, userId) : null) ?? displayName);
                    const channel = ChannelStore.getChannel(id)?.name ?? "channel";

                    queueSpeak(formatText(template, u, channel, displayName, nickname, settings.store.latinOnly), userId);

                    if (isMe && (type === "join" || type === "move") && id) {
                        await refreshBaseline(id);
                    }

                    continue;
                }

                // State-change announcements (mute/deafen/stream), only when user is in our current VC.
                if (channelId !== myChanId) continue;
                if (!baselineReady) continue;

                const prev = voiceStateSnapshot.get(userId);
                const next = normalizeState(state);
                voiceStateSnapshot.set(userId, next);
                if (!prev) continue;

                if (!allowStateChange(userId, isMe)) continue;

                const userObj = isMe && !settings.store.sayOwnName ? "" : UserStore.getUser(userId).username;
                const displayName = userObj && ((UserStore.getUser(userId) as any).globalName ?? userObj);
                const nickname = userObj && ((myGuildId ? GuildMemberStore.getNick(myGuildId, userId) : null) ?? displayName);
                const preferredName = nickname || displayName || userObj || (isMe ? "You" : "Someone");

                if (prev.streaming !== next.streaming && (isMe ? settings.store.announceSelfStream : settings.store.announceOthersStream)) {
                    const key = `${userId}:stream`;
                    if (shouldAnnounce(key)) {
                        const seg = buildStateSegments("stream", next.streaming, preferredName, isMe);
                        queueStateSplitAnnouncement(userId, seg.intro, seg.action);
                    }
                }

                // Deafen takes priority over mute (you're always muted when deafened)
                // Only announce mute if deaf state didn't change
                if (!isMe && settings.store.announceOthersDeafen && prev.deaf !== next.deaf) {
                    const key = `${userId}:deaf`;
                    if (shouldAnnounce(key)) {
                        const seg = buildStateSegments("deaf", next.deaf, preferredName, isMe);
                        queueStateSplitAnnouncement(userId, seg.intro, seg.action);
                    }
                } else if (!isMe && settings.store.announceOthersMute && prev.muted !== next.muted) {
                    const key = `${userId}:mute`;
                    if (shouldAnnounce(key)) {
                        const seg = buildStateSegments("mute", next.muted, preferredName, isMe);
                        queueStateSplitAnnouncement(userId, seg.intro, seg.action);
                    }
                }
            }
        },

    },

    settingsAboutComponent({ tempSettings: s }: { tempSettings?: any; }) {
        const allTypes = ["mute", "unmute", "deafen", "undeafen", "streamStart", "streamStop", "join", "leave", "move"];

        const [busy, setBusy] = React.useState(isQueueBusy());

        React.useEffect(() => {
            onQueueChange = () => setBusy(isQueueBusy());
            return () => { onQueueChange = null; };
        }, []);

        const authorUser = UserStore.getUser(String(EquicordDevs.examplegit.id));
        const authorAvatar = authorUser ? IconUtils.getUserAvatarURL(authorUser, false, 64) : null;

        return (
            <>
                {/* Author note - pinned at top */}
                <div className={cl("author-note")}>
                    {authorAvatar && (
                        <img
                            src={authorAvatar}
                            alt="Author avatar"
                            className={cl("author-avatar")}
                        />
                    )}
                    <div className={cl("author-content")}>
                        <Forms.FormText className={cl("author-title")}>
                            Note from example-git
                        </Forms.FormText>
                        <Forms.FormText className={cl("author-text")}>
                            Old TikTok-TTS API died, so I set up a new cloudflare worker. It's rate-limited and stricter than the old one by design — please don't abuse it so it can stay available for plugins like this.
                        </Forms.FormText>
                    </div>
                </div>

                {/* Preview sounds section */}
                <div className={cl("preview-section")}>
                    <Forms.FormTitle tag="h3" className={cl("preview-title")}>
                        Preview Sounds {busy && "(playing...)"}
                    </Forms.FormTitle>
                    <Forms.FormText className={cl("preview-subtitle")}>
                        Uses your selected narrator voice
                    </Forms.FormText>
                    <div className={cl("preview-grid")}>
                        {allTypes.map(t => (
                            <Button
                                key={t}
                                variant="secondary"
                                size="small"
                                disabled={busy}
                                onClick={() => playSample(s, t)}
                            >
                                {wordsToTitle([t])}
                            </Button>
                        ))}
                    </div>
                </div>
            </>
        );
    },
});
