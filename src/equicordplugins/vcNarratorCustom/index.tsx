/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { wordsToTitle } from "@utils/text";
import definePlugin, {
    OptionType,
} from "@utils/types";
import { findByPropsLazy } from "@webpack";
import {
    Button,
    ChannelStore,
    Forms,
    GuildMemberStore,
    React,
    SelectedChannelStore,
    SelectedGuildStore,
    useMemo,
    UserStore,
} from "@webpack/common";

// Create an in-memory cache (temporary, lost on restart)
const ttsCache = new Map<string, string>();

// Helper function to open (or create) an IndexedDB database.
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("VcNarratorDB", 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            // Create an object store called "voices" if it doesn't already exist.
            if (!db.objectStoreNames.contains("voices")) {
                db.createObjectStore("voices");
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Function to get a cached voice line from IndexedDB.
async function getCachedVoiceFromDB(cacheKey: string): Promise<Blob | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("voices", "readonly");
        const store = tx.objectStore("voices");
        const request = store.get(cacheKey);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

// Function to store a voice line in IndexedDB.
async function setCachedVoiceInDB(cacheKey: string, blob: Blob): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("voices", "readwrite");
        const store = tx.objectStore("voices");
        const request = store.put(blob, cacheKey);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

interface VoiceState {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
}

const VoiceStateStore = findByPropsLazy(
    "getVoiceStatesForChannel",
    "getCurrentClientVoiceChannelId"
);

// Mute/Deaf for other people than you is commented out, because otherwise someone can spam it and it will be annoying
// Filtering out events is not as simple as just dropping duplicates, as otherwise mute, unmute, mute would
// not say the second mute, which would lead you to believe they're unmuted

async function speak(text: string, { volume, rate, customVoice } = settings.store) {
    if (text.trim().length === 0) return;

    // Create a unique cache key using the voice setting and the text.
    const cacheKey = `${customVoice}_${text}`;

    // 1. Check the in-memory cache (fast check)
    if (ttsCache.has(cacheKey)) {
        const cachedUrl = ttsCache.get(cacheKey)!;
        const audio = new Audio(cachedUrl);
        audio.volume = volume;
        audio.playbackRate = rate;
        audio.play();
        return;
    }

    // 2. Check the persistent IndexedDB cache.
    try {
        const cachedBlob = await getCachedVoiceFromDB(cacheKey);
        if (cachedBlob) {
            // Create a URL from the stored Blob.
            const url = URL.createObjectURL(cachedBlob);
            // Save it in the in-memory cache for next time.
            ttsCache.set(cacheKey, url);
            const audio = new Audio(url);
            audio.volume = volume;
            audio.playbackRate = rate;
            audio.play();
            return;
        }
    } catch (err) {
        console.error("Error accessing IndexedDB:", err);
    }

    // 3. If not found in either cache, fetch from the TTS API.
    const response = await fetch(
        "https://tiktok-tts.weilnet.workers.dev/api/generation",
        {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            referrerPolicy: "no-referrer",
            body: JSON.stringify({
                text: text,
                voice: customVoice,
            }),
        }
    );

    const data = await response.json();
    const audioData = atob(data.data);

    const binaryData: number[] = [];
    for (let i = 0; i < audioData.length; i++) {
        binaryData.push(audioData.charCodeAt(i));
    }

    const blob = new Blob([new Uint8Array(binaryData)], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);

    // Save the URL in the in-memory cache.
    ttsCache.set(cacheKey, url);

    // Store the Blob in IndexedDB for persistence.
    try {
        await setCachedVoiceInDB(cacheKey, blob);
    } catch (err) {
        console.error("Error storing in IndexedDB:", err);
    }

    const audio = new Audio(url);
    audio.volume = volume;
    audio.playbackRate = rate;
    audio.play();
}

function clean(str: string) {
    const replacer = settings.store.latinOnly
        ? /[^\p{Script=Latin}\p{Number}\p{Punctuation}\s]/gu
        : /[^\p{Letter}\p{Number}\p{Punctuation}\s]/gu;

    return str
        .normalize("NFKC")
        .replace(replacer, "")
        .replace(/_{2,}/g, "_")
        .trim();
}

function formatText(
    str: string,
    user: string,
    channel: string,
    displayName: string,
    nickname: string
) {
    return str
        .replaceAll("{{USER}}", clean(user) || (user ? "Someone" : ""))
        .replaceAll("{{CHANNEL}}", clean(channel) || "channel")
        .replaceAll(
            "{{DISPLAY_NAME}}",
            clean(displayName) || (displayName ? "Someone" : "")
        )
        .replaceAll(
            "{{NICKNAME}}",
            clean(nickname) || (nickname ? "Someone" : "")
        );
}

// For every user, channelId and oldChannelId will differ when moving channel.
// Only for the local user, channelId and oldChannelId will be the same when moving channel,
// for some ungodly reason
let myLastChannelId: string | undefined;

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
    const s = Object.assign({}, settings.plain, tempSettings);
    const currentUser = UserStore.getCurrentUser();
    const myGuildId = SelectedGuildStore.getGuildId();

    speak(
        formatText(
            s[type + "Message"],
            currentUser.username,
            "general",
            (currentUser as any).globalName ?? currentUser.username,
            GuildMemberStore.getNick(myGuildId, currentUser.id) ??
            currentUser.username
        ),
        s
    );
}

const settings = definePluginSettings({
    customVoice: {
        type: OptionType.STRING,
        description: "Custom voice id, currently just tiktok",
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
        description: "Join Message",
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
    muteMessage: {
        type: OptionType.STRING,
        description: "Mute Message (only self for now)",
        default: "{{DISPLAY_NAME}} muted",
    },
    unmuteMessage: {
        type: OptionType.STRING,
        description: "Unmute Message (only self for now)",
        default: "{{DISPLAY_NAME}} unmuted",
    },
    deafenMessage: {
        type: OptionType.STRING,
        description: "Deafen Message (only self for now)",
        default: "{{DISPLAY_NAME}} deafened",
    },
    undeafenMessage: {
        type: OptionType.STRING,
        description: "Undeafen Message (only self for now)",
        default: "{{DISPLAY_NAME}} undeafened",
    },
});

export default definePlugin({
    name: "VcNarratorCustom",
    description: "Announces when users join, leave, or move voice channels via narrator. TikTok TTS version; speechSynthesis is pretty boring. Ported from https://github.com/Loukious/Vencord",
    authors: [Devs.Ven, Devs.Nyako, EquicordDevs.Loukios, EquicordDevs.examplegit],
    settings,
    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const myGuildId = SelectedGuildStore.getGuildId();
            const myChanId = SelectedChannelStore.getVoiceChannelId();
            const myId = UserStore.getCurrentUser().id;

            if (
                ChannelStore.getChannel(myChanId!)?.type ===
                13 /* Stage Channel */
            )
                return;

            for (const state of voiceStates) {
                const { userId, channelId, oldChannelId } = state;
                const isMe = userId === myId;
                if (!isMe) {
                    if (!myChanId) continue;
                    if (channelId !== myChanId && oldChannelId !== myChanId)
                        continue;
                }

                const [type, id] = getTypeAndChannelId(state, isMe);
                if (!type) continue;

                const template = settings.store[type + "Message"];
                const user =
                    isMe && !settings.store.sayOwnName
                        ? ""
                        : UserStore.getUser(userId).username;
                const displayName =
                    user &&
                    ((UserStore.getUser(userId) as any).globalName ?? user);
                const nickname =
                    user &&
                    (GuildMemberStore.getNick(myGuildId, userId) ??
                        displayName);
                const channel = ChannelStore.getChannel(id).name;

                speak(
                    formatText(template, user, channel, displayName, nickname)
                );
            }
        },

        AUDIO_TOGGLE_SELF_MUTE() {
            const chanId = SelectedChannelStore.getVoiceChannelId()!;
            const s = VoiceStateStore.getVoiceStateForChannel(
                chanId
            ) as VoiceState;
            if (!s) return;
        },

        AUDIO_TOGGLE_SELF_DEAF() {
            const chanId = SelectedChannelStore.getVoiceChannelId()!;
            const s = VoiceStateStore.getVoiceStateForChannel(
                chanId
            ) as VoiceState;
            if (!s) return;
        },
    },

    settingsAboutComponent({ tempSettings: s }) {
        const types = useMemo(
            () =>
                Object.keys(settings.def)
                    .filter(k => k.endsWith("Message"))
                    .map(k => k.slice(0, -7)),
            []
        );

        const errorComponent: React.ReactElement | null = null;

        return (
            <Forms.FormSection>
                <Forms.FormText>
                    You can customise the spoken messages below. You can disable
                    specific messages by setting them to nothing
                </Forms.FormText>
                <Forms.FormText>
                    The special placeholders <code>{"{{USER}}"}</code>,{" "}
                    <code>{"{{DISPLAY_NAME}}"}</code>,{" "}
                    <code>{"{{NICKNAME}}"}</code> and{" "}
                    <code>{"{{CHANNEL}}"}</code> will be replaced with the
                    user's name (nothing if it's yourself), the user's display
                    name, the user's nickname on current server and the
                    channel's name respectively
                </Forms.FormText>
                <Forms.FormText>
                    You can find a list of custom voices (tiktok only for now){" "}
                    <a
                        href="https://github.com/oscie57/tiktok-voice/wiki/Voice-Codes"
                        target="_blank"
                        rel="noreferrer"
                    >
                        here
                    </a>
                </Forms.FormText>
                <Forms.FormTitle className={Margins.top20} tag="h3">
                    Play Example Sounds
                </Forms.FormTitle>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "1rem",
                    }}
                    className={"vc-narrator-buttons"}
                >
                    {types.map(t => (
                        <Button key={t} onClick={() => playSample(s, t)}>
                            {wordsToTitle([t])}
                        </Button>
                    ))}
                </div>
                {errorComponent}
            </Forms.FormSection>
        );
    },
});
