import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { Link } from "@components/Link";
import { FluxDispatcher, Forms, Toasts, Button, ApplicationAssetUtils } from "@webpack/common";

let pollTimer: ReturnType<typeof setInterval> | null = null;
let loginPollActive = false;
let currentToken: string | null = null;
let plexAccountUsername: string | null = null;
let lastRatingKey: string | null = null;

const artAssetCache = new Map<string, string | null>();
const ART_CACHE_LIMIT = 200;

const FALLBACK_ART_URL = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png";

function native() {
    return (window as any).VencordNative.pluginHelpers.PlexRichPresence;
}

function toast(message: string, type: keyof typeof Toasts.Type = "MESSAGE") {
    Toasts.show({
        id: Toasts.genId(),
                type: Toasts.Type[type],
                message
    });
}

function formatExternalAsset(url: string): string {
    if (!url) return "";
    if (url.startsWith("mp:external/")) return url;
    const cleaned = url.replace(/^https?:\/\//, "https/");
    return `mp:external/${cleaned}`;
}

async function registerAsset(applicationId: string, publicImageUrl: string): Promise<string | undefined> {
    if (!publicImageUrl) return undefined;

    try {
        if (ApplicationAssetUtils?.fetchAssetIds && applicationId) {
            const [assetId] = await ApplicationAssetUtils.fetchAssetIds(applicationId, [publicImageUrl]);
            if (assetId) return assetId;
        }
    } catch (e) {
        console.error("[PlexRichPresence] Discord fetchAssetIds failed:", e);
    }

    return formatExternalAsset(publicImageUrl);
}

async function pollPin(id: number): Promise<string | null> {
    for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const token = await native().checkPin(id).catch(() => null);
        if (token) return token;
    }
    return null;
}

async function startPlexLogin() {
    if (loginPollActive) {
        toast("Login already in progress, check your browser.", "MESSAGE");
        return;
    }

    const pin = await native().requestPin().catch(() => null);
    if (!pin) {
        toast("Couldn't reach Plex to generate the login code.", "FAILURE");
        return;
    }

    const authUrl =
    `https://app.plex.tv/auth#?clientID=vencord-plex-rich-presence` +
    `&code=${pin.code}` +
    `&context%5Bdevice%5D%5Bproduct%5D=Vencord%20Plex%20Rich%20Presence`;

    window.open(authUrl, "_blank");

    toast(
        `A browser tab opened to link your Plex account. If it didn't open, go to plex.tv/link and enter the code: ${pin.code}`,
        "MESSAGE"
    );

    loginPollActive = true;
    const token = await pollPin(pin.id);
    loginPollActive = false;

    if (!token) {
        toast("Timed out: the code was not confirmed in time.", "FAILURE");
        return;
    }

    settings.store.plexToken = token;
    currentToken = token;
    artAssetCache.clear();
    plexAccountUsername = await native().fetchUsername(token).catch(() => null);
    toast("Plex account linked successfully!", "SUCCESS");
    tick();
}

const settings = definePluginSettings({
    loginButton: {
        type: OptionType.COMPONENT,
        description: "Link your Plex account (opens a browser tab, no password to type here)",
                                      component: () => (
                                          <Button onClick={() => startPlexLogin()}>
                                          Log in with Plex
                                          </Button>
                                      )
    },
    plexToken: {
        type: OptionType.STRING,
        description: "Plex token (filled in automatically after 'Log in with Plex')",
                                      default: ""
    },
    serverUrl: {
        type: OptionType.STRING,
        description: "Your Plex Media Server address (e.g. http://192.168.1.10:32400)",
                                      default: ""
    },
    pollInterval: {
        type: OptionType.NUMBER,
        description: "Polling interval in seconds (minimum 5)",
                                      default: 15
    },
    showAlbumArt: {
        type: OptionType.BOOLEAN,
        description: "Show album cover in Rich Presence using MusicBrainz API",
                                      default: true
    },
    applicationId: {
        type: OptionType.STRING,
        description: "Discord Application ID (Optional)",
                                      default: ""
    }
});

async function resolveAlbumArtAsset(track: any): Promise<string | undefined> {
    if (!settings.store.showAlbumArt) return undefined;

    const appId = settings.store.applicationId?.trim() || "";
    const artist = track.grandparentTitle ?? track.originalTitle ?? "";
    const album = track.parentTitle ?? "";
    const title = track.title ?? "";
    const thumb = track.thumb || track.parentThumb || track.grandparentThumb;

    const cacheKey = `${appId}:${artist}:${album}:${title}:${track.ratingKey || thumb}`;

    if (artAssetCache.has(cacheKey)) {
        const cached = artAssetCache.get(cacheKey);
        if (cached) return cached;
    }

    let localPlexUrl: string | null = null;
    if (thumb && currentToken && settings.store.serverUrl) {
        const baseUrl = settings.store.serverUrl.replace(/\/$/, "");
        localPlexUrl = `${baseUrl}${thumb}?X-Plex-Token=${encodeURIComponent(currentToken)}`;
    }

    const publicUrl = await native().fetchOnlineCover(artist, album, title, localPlexUrl).catch(() => null);
    const assetId = publicUrl ? await registerAsset(appId, publicUrl) : undefined;

    if (artAssetCache.size >= ART_CACHE_LIMIT) {
        artAssetCache.delete(artAssetCache.keys().next().value);
    }

    if (assetId) {
        artAssetCache.set(cacheKey, assetId);
        return assetId;
    }

    const fallbackKey = `fallback:${appId}`;
    if (artAssetCache.has(fallbackKey)) {
        return artAssetCache.get(fallbackKey) ?? undefined;
    }

    const fallbackAssetId = await registerAsset(appId, FALLBACK_ART_URL);
    artAssetCache.set(fallbackKey, fallbackAssetId ?? null);
    return fallbackAssetId ?? undefined;
}

async function buildActivity(track: any) {
    const artist = track.grandparentTitle ?? track.originalTitle ?? "Unknown artist";
    const album = track.parentTitle ?? "";
    const title = track.title ?? "Unknown track";
    const durationMs: number = track.duration ?? 0;
    const offsetMs: number = track.viewOffset ?? 0;
    const now = Date.now();

    const appId = settings.store.applicationId?.trim() || undefined;
    const assetId = await resolveAlbumArtAsset(track);

    const activity: any = {
        name: "Plex",
        type: assetId ? 2 : 0,
        application_id: appId,
        details: title,
        state: artist,
        flags: 1 << 0,
        timestamps: durationMs
        ? { start: now - offsetMs, end: now - offsetMs + durationMs }
        : undefined
    };

    if (assetId) {
        activity.assets = {
            large_image: assetId,
            large_text: album || undefined
        };
    }

    return activity;
}

function setActivity(activity: any) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "PlexRichPresence"
    });
}

function clearActivity() {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: null,
        socketId: "PlexRichPresence"
    });
}

async function tick() {
    if (!currentToken || !settings.store.serverUrl) return;

    const result = await native().fetchSessions(settings.store.serverUrl, currentToken).catch(e => {
        console.error("[PlexRichPresence] fetchSessions failed:", e);
        return null;
    });

    if (!result || result.unauthorized || !result.sessions) return;

    const usernameLower = plexAccountUsername?.toLowerCase();
    const mySession = result.sessions.find((s: any) => {
        if (s.type !== "track") return false;
        const sessionUser = s.User?.title?.toLowerCase();
        return !sessionUser || !usernameLower || sessionUser === usernameLower;
    });

    if (!mySession) {
        if (lastRatingKey !== null) {
            clearActivity();
            lastRatingKey = null;
        }
        return;
    }

    const activity = await buildActivity(mySession);
    setActivity(activity);
    lastRatingKey = mySession.ratingKey;
}

export default definePlugin({
    name: "PlexRichPresence",
    description: "Shows what you're listening to on Plex in Discord, Spotify-style.",
    authors: [{ name: "p4rzl", id: 547438743284482050n }],
    settings,

    settingsAboutComponent: () => (
        <>
        <Forms.FormTitle tag="h3">Setup</Forms.FormTitle>
        <Forms.FormText>
        1. Set 'Plex Media Server address' below (e.g. http://192.168.1.10:32400).{"\n"}
        2. Press 'Log in with Plex' and confirm in the browser tab.{"\n"}
        3. Enable 'Show album art' to fetch covers directly from MusicBrainz.
        </Forms.FormText>
        </>
    ),

    async start() {
        currentToken = settings.store.plexToken || null;
        artAssetCache.clear();
        if (currentToken) {
            plexAccountUsername = await native().fetchUsername(currentToken).catch(() => null);
        }
        await tick();
        const intervalSeconds = Math.max(5, settings.store.pollInterval || 15);
        pollTimer = setInterval(tick, intervalSeconds * 1000);
    },

    stop() {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
        clearActivity();
        currentToken = null;
        plexAccountUsername = null;
        lastRatingKey = null;
        artAssetCache.clear();
    }
});
