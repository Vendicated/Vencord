/*
 * Vencord, a Discord client mod
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { sendMessage } from "@utils/discord";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import {
    Button,
    FluxDispatcher,
    PresenceStore,
    SelectedChannelStore,
    useEffect,
    useRef,
    UserStore,
    useState,
} from "@webpack/common";

const Native = VencordNative.pluginHelpers.SpotBuddy as PluginNative<typeof import("./native")>;

const cl = classNameFactory("vc-spotBuddy-");
const SpotifyApi = findByPropsLazy("getPlayerState", "getTrack");

const settings = definePluginSettings({
    showLyrics: {
        type: OptionType.BOOLEAN,
        description: "Show lyrics",
        default: true,
    },
    showShareButton: {
        type: OptionType.BOOLEAN,
        description: "Show share button",
        default: true,
    },
    syncOffsetMs: {
        type: OptionType.NUMBER,
        description: "Lyric offset in ms (negative = earlier, positive = later)",
        default: 0,
    },
    fancyLyrics: {
        type: OptionType.BOOLEAN,
        description: "Fancy lyric animation",
        default: true,
    },
    customCss: {
        type: OptionType.STRING,
        description: "Custom CSS (edit .vc-spotBuddy-* classes)",
        default: "",
        placeholder: ".vc-spotBuddy-karaoke-lit-inner { color: #fff; }",
        onChange: () => applyCustomCss(),
    },
});

let customStyleEl: HTMLStyleElement | null = null;

function applyCustomCss() {
    const css = settings.store.customCss?.trim() || "";
    if (!css) {
        customStyleEl?.remove();
        customStyleEl = null;
        return;
    }
    if (!customStyleEl) {
        customStyleEl = document.createElement("style");
        customStyleEl.id = "vc-spotBuddy-custom";
        document.documentElement.appendChild(customStyleEl);
    }
    customStyleEl.textContent = css;
}

type TrackInfo = {
    id: string | null;
    title: string;
    artists: string;
    album: string;
    art: string | null;
    duration: number;
    position: number;
    playing: boolean;
    url: string | null;
};

type Line = { t: number; text: string; words?: { t: number; text: string; }[]; };
type CardBits = { trackId: string | null; title: string | null; artist: string | null; };

let fluxTrack: any = null;
let posBase = 0;
let posAt = 0;
let playing = false;
let lastApiPos = -1;
const subs = new Set<() => void>();

function applyClock(apiPos: number, force = false) {
    const local = posNow();
    const drift = Math.abs(apiPos - local);

    if (!force && apiPos === lastApiPos) {
        if (!playing || drift > 2500) {
            posBase = apiPos;
            posAt = Date.now();
        }
        return;
    }

    lastApiPos = apiPos;

    if (!force && playing && drift < 1250) return;

    posBase = apiPos;
    posAt = Date.now();
}

function onSpotify(e: any) {
    let notify = false;
    if (e?.track) {
        if (e.track?.id !== fluxTrack?.id) notify = true;
        fluxTrack = e.track;
    }
    if (typeof e?.isPlaying === "boolean" && e.isPlaying !== playing) {
        playing = e.isPlaying;
        notify = true;
    } else if (typeof e?.isPlaying === "boolean") {
        playing = e.isPlaying;
    }
    if (typeof e?.position === "number") {
        applyClock(e.position, !playing || Math.abs(e.position - lastApiPos) > 3000);
    }
    if (notify) ping();
}

let pingTimer: any;
function ping() {
    clearTimeout(pingTimer);
    pingTimer = setTimeout(() => {
        for (const fn of subs) fn();
    }, 120);
}

function posNow() {
    let p = posBase;
    if (playing) p += Date.now() - posAt;
    return Math.max(0, p);
}

function pullApiClock(state: any) {
    if (typeof state?.isPlaying === "boolean") playing = state.isPlaying;
    if (typeof state?.position !== "number") return;
    applyClock(state.position, false);
}

function fmt(ms: number) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function artUrl(raw?: string) {
    if (!raw) return null;
    if (raw.includes("https://")) return raw;
    const id = raw.split(":").pop();
    return id ? `https://i.scdn.co/image/${id}` : null;
}

function fromTrack(t: any, position: number, isPlaying: boolean): TrackInfo | null {
    if (!t?.name) return null;
    const id = t.id ?? null;
    const artists = Array.isArray(t.artists)
        ? t.artists.map((a: any) => a.name).filter(Boolean).join(", ")
        : "";
    return {
        id,
        title: t.name,
        artists,
        album: t.album?.name ?? "",
        art: t.album?.image?.url ?? null,
        duration: t.duration ?? 0,
        position,
        playing: isPlaying,
        url: id ? `https://open.spotify.com/track/${id}` : null,
    };
}

function readSpotifyApi(): TrackInfo | null {
    try {
        const state = SpotifyApi.getPlayerState?.();
        const t = SpotifyApi.getTrack?.() ?? state?.track ?? fluxTrack;
        if (!t) return null;
        pullApiClock(state);
        return fromTrack(t, posNow(), playing);
    } catch {
        return fromTrack(fluxTrack, posNow(), playing);
    }
}

function spotifyActivity(userId: string) {
    const list = PresenceStore.getActivities(userId) ?? [];
    return list.find((x: any) =>
        x?.name === "Spotify"
        || x?.sync_id
        || (typeof x?.party?.id === "string" && x.party.id.includes("spotify"))
    ) ?? null;
}

function presenceTrack(userId: string): TrackInfo | null {
    try {
        const a = spotifyActivity(userId);
        if (!a?.details) return null;

        const start = a.timestamps?.start ? Number(a.timestamps.start) : 0;
        const end = a.timestamps?.end ? Number(a.timestamps.end) : 0;
        const duration = start && end ? end - start : 0;
        let position = start ? Date.now() - start : 0;
        if (duration > 0) position = Math.min(Math.max(0, position), duration);
        const id = a.sync_id ?? null;

        return {
            id,
            title: a.details,
            artists: a.state ?? "",
            album: a.assets?.large_text ?? "",
            art: artUrl(a.assets?.large_image),
            duration,
            position,
            playing: true,
            url: id ? `https://open.spotify.com/track/${id}` : null,
        };
    } catch {
        return null;
    }
}

function trackFor(userId: string) {
    const me = UserStore.getCurrentUser()?.id;
    if (userId === me) return readSpotifyApi() ?? presenceTrack(userId);
    return presenceTrack(userId);
}

function livePosMs(userId: string) {
    const me = UserStore.getCurrentUser()?.id;
    if (userId === me) return posNow();

    try {
        const a = spotifyActivity(userId);
        const start = a?.timestamps?.start ? Number(a.timestamps.start) : 0;
        if (!start) return 0;
        let pos = Date.now() - start;
        const end = a?.timestamps?.end ? Number(a.timestamps.end) : 0;
        if (end > start) pos = Math.min(pos, end - start);
        return Math.max(0, pos);
    } catch {
        return 0;
    }
}

function syncOwnClock() {
    try {
        const state = SpotifyApi.getPlayerState?.();
        const t = SpotifyApi.getTrack?.() ?? state?.track;
        if (t?.id && t.id !== fluxTrack?.id) {
            fluxTrack = t;
            ping();
        }
        pullApiClock(state);
    } catch { }
}

const lyricCache = new Map<string, { lines: Line[]; instrumental: boolean; } | null>();

function cleanTitle(t: string) {
    return t
        .replace(/\u2026/g, "...")
        .replace(/\.\.\.$/, "")
        .replace(/\s*\((?:feat\.?|ft\.?|with|featuring).*$/i, "")
        .replace(/\s*\[(?:feat\.?|ft\.?|with|featuring).*$/i, "")
        .replace(/\s+feat\.?\s+.*$/i, "")
        .trim();
}

function cleanArtist(a: string) {
    return a.split(/,|&|\sx\s|;/i)[0]?.trim() || a.trim();
}

function usableLyric(text: string) {
    const t = text.replace(/\s+/g, " ").trim();
    if (!t) return "";
    if (/^[♪♫\-\u2013\u2014.\s]+$/.test(t)) return "";
    return t;
}

function parseLrc(raw: string): Line[] {
    const out: Line[] = [];
    for (const row of raw.split("\n")) {
        const m = row.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)$/);
        if (!m) continue;
        const t = Number(m[1]) * 60 + Number(m[2]);
        const rest = m[3];
        if (!rest?.trim()) continue;

        const words: { t: number; text: string; }[] = [];
        const re = /<(\d+):(\d+(?:\.\d+)?)>([^<]*)/g;
        let wm: RegExpExecArray | null;
        while ((wm = re.exec(rest)) !== null) {
            const text = wm[3];
            if (!text.length) continue;
            words.push({ t: Number(wm[1]) * 60 + Number(wm[2]), text });
        }

        if (words.length) {
            const text = usableLyric(words.map(w => w.text).join(""));
            if (!text) continue;
            out.push({ t, text, words });
        } else {
            const text = usableLyric(rest);
            if (!text) continue;
            out.push({ t, text });
        }
    }
    return out;
}

function fromLrcData(data: any) {
    if (!data) return null;
    if (data.instrumental) return { lines: [] as Line[], instrumental: true };
    if (data.syncedLyrics) return { lines: parseLrc(data.syncedLyrics), instrumental: false };
    if (data.plainLyrics) {
        const lines = String(data.plainLyrics).split("\n").map(x => x.trim()).filter(Boolean)
            .map((text, i) => ({ t: i * 4, text }));
        return { lines, instrumental: false };
    }
    return null;
}

async function getJson(url: string) {
    if (Native?.fetchText) {
        const r = await Native.fetchText(url);
        if (!r.ok || !r.text) return null;
        try {
            return JSON.parse(r.text);
        } catch {
            return null;
        }
    }

    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
}

function pickHit(hits: any[], durationMs: number) {
    const usable = hits.filter((h: any) => h?.syncedLyrics || h?.plainLyrics);
    if (!usable.length) return hits[0];
    const target = durationMs > 0 ? durationMs / 1000 : 0;
    usable.sort((a: any, b: any) => {
        const as = a.syncedLyrics ? 0 : 1;
        const bs = b.syncedLyrics ? 0 : 1;
        if (as !== bs) return as - bs;
        if (!target) return 0;
        return Math.abs((a.duration || 0) - target) - Math.abs((b.duration || 0) - target);
    });
    return usable[0];
}

async function getLyrics(artist: string, title: string, _album: string, duration: number) {
    const a = cleanArtist(artist);
    const t = cleanTitle(title);
    if (!t) return null;

    const key = `${a}|${t}|${Math.round(duration / 1000)}`.toLowerCase();
    if (lyricCache.has(key)) return lyricCache.get(key)!;

    try {
        const dur = duration > 0 ? String(Math.round(duration / 1000)) : "";
        const tries = [
            "https://lrclib.net/api/search?" + new URLSearchParams({
                track_name: t,
                artist_name: a,
                ...(dur ? { duration: dur } : {}),
            }),
            "https://lrclib.net/api/search?" + new URLSearchParams({ q: `${a} ${t}` }),
            "https://lrclib.net/api/get?" + new URLSearchParams({
                track_name: t,
                artist_name: a,
                ...(dur ? { duration: dur } : {}),
            }),
        ];

        for (const url of tries) {
            const json = await getJson(url);
            if (!json) continue;

            if (Array.isArray(json)) {
                const hit = pickHit(json, duration);
                const parsed = fromLrcData(hit);
                if (parsed) {
                    lyricCache.set(key, parsed);
                    return parsed;
                }
            } else {
                const parsed = fromLrcData(json);
                if (parsed) {
                    lyricCache.set(key, parsed);
                    return parsed;
                }
            }
        }
    } catch (e) {
        console.error("[SpotBuddy] lyrics fetch failed", e);
        return null;
    }

    lyricCache.set(key, null);
    return null;
}

function currentLine(lines: Line[], sec: number) {
    let lo = 0;
    let hi = lines.length - 1;
    let idx = 0;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (lines[mid].t <= sec) {
            idx = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return idx;
}

function lineProgress(lines: Line[], i: number, sec: number) {
    const line = lines[i];
    if (!line) return 0;

    const words = line.words;
    if (words?.length) {
        let lit = 0;
        let total = 0;
        for (let w = 0; w < words.length; w++) {
            const word = words[w];
            total += word.text.length;
            const nextT = words[w + 1]?.t ?? lines[i + 1]?.t ?? word.t + 0.35;
            if (sec >= nextT) {
                lit += word.text.length;
            } else if (sec >= word.t) {
                const p = (sec - word.t) / Math.max(0.04, nextT - word.t);
                lit += word.text.length * p;
            }
        }
        return Math.min(1, Math.max(0, lit / Math.max(1, total)));
    }

    const start = line.t;
    const end = lines[i + 1]?.t ?? start + 4;
    return Math.min(1, Math.max(0, (sec - start) / Math.max(0.05, end - start)));
}

const LINE_H = 34;
const TARGET_FPS = 60;
const FRAME_MS = Math.round(1000 / TARGET_FPS);

function runFpsLoop(paint: () => void) {
    let dead = false;
    let worker: Worker | null = null;
    let fallback: ReturnType<typeof setInterval> | null = null;
    let raf = 0;
    let pending = false;

    const doPaint = () => {
        if (dead || pending) return;
        pending = true;
        raf = requestAnimationFrame(() => {
            pending = false;
            if (dead) return;
            try { paint(); } catch { }
        });
    };

    try {
        const src = `var i=setInterval(function(){postMessage(1)},${FRAME_MS});onmessage=function(e){if(e.data==="x")clearInterval(i)};`;
        worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
        worker.onmessage = () => doPaint();
    } catch {
        fallback = setInterval(doPaint, FRAME_MS);
    }

    doPaint();

    return () => {
        dead = true;
        try { worker?.postMessage("x"); } catch { }
        worker?.terminate();
        worker = null;
        if (fallback != null) clearInterval(fallback);
        cancelAnimationFrame(raf);
    };
}

function neighborText(lines: Line[], i: number, dir: -1 | 1, cur: string) {
    for (let j = i + dir; j >= 0 && j < lines.length; j += dir) {
        const t = lines[j]?.text?.trim();
        if (t && t !== cur) return t;
    }
    return "\u00a0";
}

function FancyLyrics({ lines, getSec }: { lines: Line[]; getSec: () => number; }) {
    const [i, setI] = useState(() => currentLine(lines, getSec()));
    const iRef = useRef(i);
    const litRef = useRef<HTMLSpanElement>(null);
    const starRef = useRef<HTMLSpanElement>(null);
    const onRef = useRef(false);

    useEffect(() => {
        iRef.current = -1;
        onRef.current = false;

        return runFpsLoop(() => {
            const sec = getSec();
            const idx = currentLine(lines, sec);
            if (idx !== iRef.current) {
                iRef.current = idx;
                setI(idx);
            }

            const p = Math.min(1, Math.max(0, lineProgress(lines, idx, sec)));
            const lit = litRef.current;
            const star = starRef.current;
            if (lit) lit.style.width = (p * 100).toFixed(3) + "%";
            if (star) {
                star.style.left = (p * 100).toFixed(3) + "%";
                const on = !!lines[idx]?.text?.trim() && p > 0.015 && p < 0.985;
                if (on !== onRef.current) {
                    onRef.current = on;
                    star.classList.toggle(cl("on"), on);
                }
            }
        });
    }, [lines, getSec]);

    const cur = lines[i]?.text?.trim() || "\u00a0";
    const prev = neighborText(lines, i, -1, cur);
    const next = neighborText(lines, i, 1, cur);
    const hasCur = cur !== "\u00a0";

    return (
        <div className={cl("lyrics", "fancy")}>
            <div className={cl("line", "prev")} style={{ height: LINE_H }}>{prev}</div>
            <div className={cl("line", "cur")} style={{ height: LINE_H }}>
                <span className={cl("karaoke")}>
                    <span className={cl("karaoke-dim")}>{cur}</span>
                    {hasCur && (
                        <>
                            <span className={cl("karaoke-lit")} ref={litRef} aria-hidden="true" style={{ width: "0%" }}>
                                <span className={cl("karaoke-lit-inner")}>{cur}</span>
                            </span>
                            <span className={cl("star")} ref={starRef} aria-hidden="true" style={{ left: "0%" }}>
                                <span className={cl("star-trail")} />
                                <span className={cl("star-core")} />
                            </span>
                        </>
                    )}
                </span>
            </div>
            <div className={cl("line", "next")} style={{ height: LINE_H }}>{next}</div>
        </div>
    );
}

function PlainLyrics({ lines, getSec }: { lines: Line[]; getSec: () => number; }) {
    const [i, setI] = useState(() => currentLine(lines, getSec()));

    useEffect(() => {
        const iv = setInterval(() => {
            const idx = currentLine(lines, getSec());
            setI(prev => (prev === idx ? prev : idx));
        }, 200);
        return () => clearInterval(iv);
    }, [lines, getSec]);

    return (
        <div className={cl("lyrics")}>
            <div className={cl("line", "prev")}>{i > 0 ? lines[i - 1].text : "\u00a0"}</div>
            <div className={cl("line", "cur")}>{lines[i]?.text || "\u00a0"}</div>
            <div className={cl("line", "next")}>{lines[i + 1]?.text || "\u00a0"}</div>
        </div>
    );
}

function Panel({ userId }: { userId: string; }) {
    const [, setN] = useState(0);
    const [lyrics, setLyrics] = useState<{ lines: Line[]; instrumental: boolean; } | null | undefined>();
    const offsetRef = useRef(settings.store.syncOffsetMs || 0);
    const userRef = useRef(userId);
    const timeRef = useRef<HTMLDivElement>(null);
    const fillRef = useRef<HTMLDivElement>(null);
    offsetRef.current = settings.store.syncOffsetMs || 0;
    userRef.current = userId;

    const readSec = useRef(() =>
        Math.max(0, livePosMs(userRef.current) + offsetRef.current) / 1000
    ).current;

    useEffect(() => {
        const onPing = () => setN(n => n + 1);
        subs.add(onPing);
        syncOwnClock();
        return () => {
            subs.delete(onPing);
        };
    }, []);

    const info = trackFor(userId);

    useEffect(() => {
        let dead = false;
        setLyrics(undefined);
        if (!info || !settings.store.showLyrics) {
            setLyrics(null);
            return;
        }
        const artist = info.artists.split(/,|;/)[0]?.trim() || info.artists;
        getLyrics(artist, info.title, info.album, info.duration).then(r => {
            if (!dead) setLyrics(r);
        });
        return () => { dead = true; };
    }, [userId, info?.id, info?.title, info?.artists, info?.album, info?.duration]);

    useEffect(() => {
        if (!info) return;
        return runFpsLoop(() => {
            const pos = Math.max(0, livePosMs(userRef.current) + offsetRef.current);
            const timeEl = timeRef.current;
            if (timeEl && info.duration > 0) {
                const label = `${fmt(pos)} / ${fmt(info.duration)}${info.playing ? "" : " (paused)"}`;
                if (timeEl.textContent !== label) timeEl.textContent = label;
            }
            const fill = fillRef.current;
            if (fill && info.duration > 0)
                fill.style.width = `${Math.min(100, (pos / info.duration) * 100).toFixed(3)}%`;
        });
    }, [info?.id, info?.duration, info?.playing]);

    if (!info) return null;

    let lyricEl: any = null;
    if (settings.store.showLyrics) {
        if (lyrics === undefined) lyricEl = <div className={cl("muted")}>loading lyrics...</div>;
        else if (!lyrics) lyricEl = <div className={cl("muted")}>no lyrics found</div>;
        else if (lyrics.instrumental) lyricEl = <div className={cl("muted")}>instrumental</div>;
        else if (!lyrics.lines.length) lyricEl = <div className={cl("muted")}>no lyrics found</div>;
        else if (settings.store.fancyLyrics) {
            lyricEl = <FancyLyrics key={userId + ":" + (info.id || info.title)} lines={lyrics.lines} getSec={readSec} />;
        } else {
            lyricEl = <PlainLyrics key={userId + ":" + (info.id || info.title)} lines={lyrics.lines} getSec={readSec} />;
        }
    }

    return (
        <div className={cl("card")}>
            <div className={cl("row")}>
                {info.art && <img className={cl("art")} src={info.art} alt="" draggable={false} />}
                <div className={cl("meta")}>
                    <div className={cl("title")}>{info.title}</div>
                    {info.artists && <div className={cl("sub")}>{info.artists}</div>}
                    {info.album && <div className={cl("sub")}>{info.album}</div>}
                    {info.duration > 0 && (
                        <div className={cl("sub")} ref={timeRef}>
                            {fmt(0)} / {fmt(info.duration)}
                        </div>
                    )}
                </div>
            </div>

            {info.duration > 0 && (
                <div className={cl("bar")}>
                    <div className={cl("fill")} ref={fillRef} style={{ width: "0%" }} />
                </div>
            )}

            {lyricEl}

            {settings.store.showShareButton && info.url && (
                <div className={cl("actions")}>
                    <Button
                        size="small"
                        look={Button.Looks.OUTLINED}
                        onClick={() => {
                            const ch = SelectedChannelStore.getChannelId();
                            if (!ch) return;
                            sendMessage(ch, {
                                content: `**${info.title}**` + (info.artists ? ` by ${info.artists}` : "") + ` ${info.url}`,
                            });
                        }}
                    >
                        Share
                    </Button>
                    <Button
                        size="small"
                        look={Button.Looks.LINK}
                        onClick={() => VencordNative.native.openExternal(info.url!)}
                    >
                        Open
                    </Button>
                </div>
            )}
        </div>
    );
}

const SafePanel = ErrorBoundary.wrap(Panel, { noop: true });

function isSpotifyActivity(activity: any) {
    if (!activity) return false;
    if (activity.name === "Spotify" || activity.sync_id) return true;
    return typeof activity.party?.id === "string" && activity.party.id.includes("spotify");
}

let clockIv: any;

export default definePlugin({
    name: "SpotBuddy",
    description: "Spotify lyrics under the listening card on profiles",
    authors: [Devs.Kyn],
    settings,

    patches: [
        {
            find: ".SIDEBAR,disableToolbar:",
            replacement: {
                match: /user:(\i),widgets:.{0,100}?\}\),(?=.{0,100}unownedWishlistItems:\i,wishlistId:\i)/,
                replace: "$&,$self.renderProfile({user:$1}),",
            },
        },
        {
            find: '"UserProfilePopout");',
            replacement: {
                match: /user:(\i),widgets:.{0,100}?\}\),/,
                replace: "$&,$self.renderProfile({user:$1}),",
            },
        },
        {
            find: "#{intl::USER_ACTIVITY_PLAYING}",
            replacement: {
                match: /activity:(\i),className:\i\.badges\}/,
                replace: "$&,$self.renderAfterActivity(typeof arguments!=\"undefined\"?arguments[0]:{activity:$1})",
                all: true,
            },
        },
        {
            find: ".USER_PROFILE_ACTIVITY_BUTTONS),",
            replacement: {
                match: /(?<=\i\.jsxs?\)\()(\i),\{(?=[^}]*?activity:\i)/,
                replace: "$self.ActivityWrapper,{VencordOriginal:$1,",
            },
        },
    ],

    renderProfile: ErrorBoundary.wrap(({ user }: { user: { id: string; }; }) => {
        if (!user?.id) return null;
        return <SafePanel userId={user.id} />;
    }, { noop: true }),

    renderAfterActivity(props: { activity?: any; user?: { id: string; }; }) {
        if (!props?.user?.id || !isSpotifyActivity(props.activity)) return null;
        return <SafePanel userId={props.user.id} />;
    },

    ActivityWrapper: ErrorBoundary.wrap(({ VencordOriginal, ...props }: any) => {
        if (!VencordOriginal) return null;
        const show = isSpotifyActivity(props?.activity) && props?.user?.id;
        return (
            <>
                <VencordOriginal {...props} />
                {show && <SafePanel userId={props.user.id} />}
            </>
        );
    }, { noop: true }),

    start() {
        FluxDispatcher.subscribe("SPOTIFY_PLAYER_STATE", onSpotify);
        FluxDispatcher.subscribe("PRESENCE_UPDATES", ping);
        applyCustomCss();
        clockIv = setInterval(syncOwnClock, 400);
        syncOwnClock();
    },

    stop() {
        FluxDispatcher.unsubscribe("SPOTIFY_PLAYER_STATE", onSpotify);
        FluxDispatcher.unsubscribe("PRESENCE_UPDATES", ping);
        customStyleEl?.remove();
        customStyleEl = null;
        clearInterval(clockIv);
        clockIv = null;
    },
});
