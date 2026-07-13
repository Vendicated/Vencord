import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { RestAPI } from "@webpack/common";
import { FluxDispatcher } from "@webpack/common";
import { Devs } from "@utils/constants";

export const settings = definePluginSettings({
    lyricsPrefix: {
        type: OptionType.STRING,
        description: "Text prepended to the lyrics status (e.g. '🎶 ')",
        default: "🎶 ",
    },
    clearOnPause: {
        type: OptionType.BOOLEAN,
        description: "Clear the custom status when Spotify playback is paused",
        default: true,
    },
    syncInterval: {
        type: OptionType.NUMBER,
        description: "How often to check and sync lyrics position (in ms)",
        default: 150,
    }
});

interface Track {
    id: string;
    name: string;
    duration: number;
    album: {
        name: string;
    };
    artists: {
        name: string;
    }[];
}

interface PlayerState {
    isPlaying: boolean;
    position: number;
    track: Track | null;
}

interface LyricLine {
    time: number;
    text: string;
}

let lastTrackId: string | null = null;
let currentLyrics: LyricLine[] = [];
let lastPlayerState: PlayerState | null = null;
let stateReceivedAt = 0;
let syncTimeoutId: any = null;
let lastStatusText: string | null = null;
let isLoopRunning = false;

let lastUpdateSentAt = 0;
let rateLimitResetTime = 0; // Timestamp when rate limit expires
const MIN_UPDATE_INTERVAL_MS = 4000; // Safe interval: Discord limits status updates to about once every 4 seconds

function getPrefixSetting(): string {
    try {
        return settings.store.lyricsPrefix ?? "🎶 ";
    } catch {
        return "🎶 ";
    }
}

function getClearOnPauseSetting(): boolean {
    try {
        return settings.store.clearOnPause ?? true;
    } catch {
        return true;
    }
}

function getSyncIntervalSetting(): number {
    try {
        return settings.store.syncInterval ?? 150;
    } catch {
        return 150;
    }
}

function updateDiscordStatus(text: string) {
    const cleanText = text.substring(0, 128);
    if (lastStatusText === cleanText) return;

    const now = Date.now();
    
    // Check if we are currently rate-limited
    if (now < rateLimitResetTime) {
        return;
    }

    // Rate-limiting check to prevent 429
    if (now - lastUpdateSentAt < MIN_UPDATE_INTERVAL_MS) {
        return;
    }

    lastStatusText = cleanText;
    lastUpdateSentAt = now;

    console.log("[SpotifyLyricsStatus] Sending PATCH status request:", cleanText);

    try {
        RestAPI.patch({
            url: "/users/@me/settings",
            body: {
                custom_status: {
                    text: cleanText,
                    emoji_id: null,
                    emoji_name: null,
                    expires_at: null
                }
            }
        }).then((res: any) => {
            // Handle successful response or check if rate limited in the payload
            if (res && res.status === 429) {
                const retryAfter = res.body?.retry_after || 5;
                rateLimitResetTime = Date.now() + (retryAfter * 1000) + 1500;
                console.warn(`[SpotifyLyricsStatus] Rate limited by Discord. Pausing updates for ${retryAfter}s.`);
            }
        }).catch((err: any) => {
            console.error("[SpotifyLyricsStatus] Error patching status:", err);
            // Handle 429 error responses
            if (err && (err.status === 429 || err.body?.retry_after)) {
                const retryAfter = err.body?.retry_after || 30;
                rateLimitResetTime = Date.now() + (retryAfter * 1000) + 2000; // Add 2s safety buffer
                console.warn(`[SpotifyLyricsStatus] Rate limited by Discord. Pausing updates for ${retryAfter}s.`);
            }
        });
    } catch (e) {
        console.error("[SpotifyLyricsStatus] Exception in RestAPI.patch:", e);
    }
}

function clearDiscordStatus() {
    if (lastStatusText === null) return;
    lastStatusText = null;
    console.log("[SpotifyLyricsStatus] Clearing status request");
    
    // Do not check rate limit when clearing status, we always want to attempt clearing it on pause
    try {
        RestAPI.patch({
            url: "/users/@me/settings",
            body: {
                custom_status: null
            }
        }).catch((err: any) => {
            console.error("[SpotifyLyricsStatus] Error clearing status:", err);
            if (err && err.status === 429) {
                const retryAfter = err.body?.retry_after || 30;
                rateLimitResetTime = Date.now() + (retryAfter * 1000) + 2000;
            }
        });
    } catch (e) {
        console.error("[SpotifyLyricsStatus] Exception in clearing status:", e);
    }
}

async function fetchLyrics(track: Track) {
    const artistName = track.artists.map(a => a.name).join(", ");
    const trackName = track.name;
    const albumName = track.album?.name || "";
    const durationSec = Math.round(track.duration / 1000);

    const exactUrl = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(trackName)}&album_name=${encodeURIComponent(albumName)}&duration=${durationSec}`;
    console.log("[SpotifyLyricsStatus] Fetching exact match:", artistName, "-", trackName);

    try {
        const response = await fetch(exactUrl, {
            headers: {
                "User-Agent": "VencordSpotifyLyricsStatus (https://github.com/Vendicated/Vencord)"
            }
        });
        if (response.ok) {
            const data = await response.json();
            if (data && data.syncedLyrics) {
                console.log("[SpotifyLyricsStatus] Fetched synced lyrics (exact match).");
                return data.syncedLyrics;
            }
        }
    } catch (error) {
        console.warn("[SpotifyLyricsStatus] Exact match failed, falling back to search...", error);
    }

    const cleanTrackName = trackName.replace(/\s*\([^)]*\)/g, "").replace(/\s*\[[^\]]*\]/g, "").trim();
    const firstArtist = track.artists[0]?.name || "";
    const query = `${firstArtist} ${cleanTrackName}`;
    const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
    console.log(`[SpotifyLyricsStatus] Searching lyrics for: "${query}"`);

    try {
        const response = await fetch(searchUrl, {
            headers: {
                "User-Agent": "VencordSpotifyLyricsStatus (https://github.com/Vendicated/Vencord)"
            }
        });
        if (response.ok) {
            const results = await response.json();
            if (Array.isArray(results) && results.length > 0) {
                const match = results.find(r => r.syncedLyrics && Math.abs(r.duration - durationSec) < 15) || results.find(r => r.syncedLyrics);
                if (match) {
                    console.log(`[SpotifyLyricsStatus] Found lyrics in search! Match: ${match.artistName} - ${match.trackName}`);
                    return match.syncedLyrics;
                }
            }
        }
    } catch (error) {
        console.error("[SpotifyLyricsStatus] Error searching lyrics:", error);
    }

    return null;
}

function parseLRC(lrcText: string): LyricLine[] {
    const lines: LyricLine[] = [];
    const rawLines = lrcText.split("\n");

    for (const line of rawLines) {
        const match = line.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
        if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseFloat(match[2]);
            const timeMs = (minutes * 60 + seconds) * 1000;
            const text = match[3].trim();
            lines.push({ time: timeMs, text });
        }
    }

    console.log("[SpotifyLyricsStatus] Parsed", lines.length, "lines of lyrics.");
    return lines.sort((a, b) => a.time - b.time);
}

function getCurrentPosition(): number {
    if (!lastPlayerState) return 0;
    if (!lastPlayerState.isPlaying) return lastPlayerState.position;
    return lastPlayerState.position + (Date.now() - stateReceivedAt);
}

function updateLyricsTick() {
    if (!isLoopRunning) return;

    try {
        if (lastPlayerState && lastPlayerState.isPlaying && currentLyrics.length > 0) {
            const currentPos = getCurrentPosition();
            let activeLine = "";

            for (let i = 0; i < currentLyrics.length; i++) {
                if (currentPos >= currentLyrics[i].time) {
                    if (i === currentLyrics.length - 1 || currentPos < currentLyrics[i + 1].time) {
                        activeLine = currentLyrics[i].text;
                        break;
                    }
                }
            }

            if (activeLine) {
                const prefix = getPrefixSetting();
                updateDiscordStatus(`${prefix}${activeLine}`);
            } else {
                clearDiscordStatus();
            }
        }
    } catch (e) {
        console.error("[SpotifyLyricsStatus] Error in updateLyricsTick:", e);
    }

    if (isLoopRunning) {
        syncTimeoutId = setTimeout(syncLoopTick, getSyncIntervalSetting());
    }
}

function syncLoopTick() {
    updateLyricsTick();
}

async function handleSpotifyPlayerState(state: PlayerState) {
    try {
        console.log("[SpotifyLyricsStatus] Received player state:", state.track?.name, "isPlaying:", state.isPlaying, "position:", state.position);
        lastPlayerState = state;
        stateReceivedAt = Date.now();

        if (!state.track) {
            stopSyncLoop();
            clearDiscordStatus();
            lastTrackId = null;
            currentLyrics = [];
            return;
        }

        if (state.track.id !== lastTrackId) {
            lastTrackId = state.track.id;
            currentLyrics = [];
            
            const syncedLyrics = await fetchLyrics(state.track);
            if (syncedLyrics) {
                currentLyrics = parseLRC(syncedLyrics);
            } else {
                console.log("[SpotifyLyricsStatus] No synced lyrics available for this track.");
            }
        }

        if (state.isPlaying) {
            startSyncLoop();
            updateLyricsTick();
        } else {
            stopSyncLoop();
            if (getClearOnPauseSetting()) {
                clearDiscordStatus();
            }
        }
    } catch (e) {
        console.error("[SpotifyLyricsStatus] Error in handleSpotifyPlayerState:", e);
    }
}

function startSyncLoop() {
    if (isLoopRunning) return;
    console.log("[SpotifyLyricsStatus] Starting sync loop.");
    isLoopRunning = true;
    updateLyricsTick();
}

function stopSyncLoop() {
    console.log("[SpotifyLyricsStatus] Stopping sync loop.");
    isLoopRunning = false;
    if (syncTimeoutId) {
        clearTimeout(syncTimeoutId);
        syncTimeoutId = null;
    }
}

export default definePlugin({
    name: "SpotifyLyricsStatus",
    description: "Automatically sets your Discord status to the current line of the song playing on Spotify.",
    authors: [Devs.papa],

    settings,

    start() {
        console.log("[SpotifyLyricsStatus] Plugin started. Subscribing to FluxDispatcher...");
        setTimeout(() => {
            try {
                FluxDispatcher.subscribe("SPOTIFY_PLAYER_STATE", handleSpotifyPlayerState);
            } catch (e) {
                console.error("[SpotifyLyricsStatus] Subscribing failed:", e);
            }
        }, 1000);
    },

    stop() {
        console.log("[SpotifyLyricsStatus] Plugin stopped.");
        try {
            FluxDispatcher.unsubscribe("SPOTIFY_PLAYER_STATE", handleSpotifyPlayerState);
        } catch (e) {
            console.warn("[SpotifyLyricsStatus] Unsubscribing failed:", e);
        }
        stopSyncLoop();
        clearDiscordStatus();
        lastTrackId = null;
        currentLyrics = [];
        lastPlayerState = null;
    }
});
