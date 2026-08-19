import { addMessageDecoration, removeMessageDecoration } from "@api/MessageDecorations";
import * as DataStore from "@api/DataStore";
import { definePluginSettings, SettingsStore } from "@api/Settings";
import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { OpenExternalIcon } from "@components/Icons";
import { Span } from "@components/Span";
import { debounce } from "@shared/debounce";
import { copyWithToast } from "@utils/discord";
import { classes, sleep } from "@utils/misc";
import { Logger } from "@utils/Logger";
import { Queue } from "@utils/Queue";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { findCssClassesLazy } from "@webpack";
import { showToast, Toasts, Tooltip, UserStore, useEffect, useState } from "@webpack/common";
import { User } from "@vencord/discord-types";
import type { ReactNode } from "react";

const API_URL = "https://haunt.gg/api/lookup/user";
const STORE_KEY = "haunt-profile-cache";
const DECORATION_ID = "Haunt";
const SETTINGS_PREFIX = "plugins.Haunt";
const Native = VencordNative.pluginHelpers.Haunt as PluginNative<typeof import("./native")>;
const logger = new Logger("Haunt");
const ProfileCardClasses = findCssClassesLazy("cardsList", "card", "container");

interface HauntBadge { id: string; badgeId: string | null; enabled: boolean; selectedTier: number | null; order: number; color: string | null; name: string | null; imageUrl: string | null; image?: { url: string; } | null; tiers: { tier: number; title: string; description: string; color: string | null; }[]; }
interface HauntUser { id: string; uid: number; username: string; name: string | null; avatarUrl: string | null; createdAt: string; }
interface HauntProfile { user: HauntUser; badges: HauntBadge[]; views: number | null; feedback: { likes: number; dislikes: number; } | null; }
interface LookupResponse { error: string | null; user?: HauntUser; badges?: HauntBadge[]; views?: number; feedback?: HauntProfile["feedback"]; }

interface BadgeInfo { title: string; description: string; color: string; }
const BADGES: Record<string, BadgeInfo> = {
    owner: { title: "Owner", description: "Be a part of the haunt.gg owner team.", color: "#9e6bff" },
    manager: { title: "Manager", description: "Be a part of the haunt.gg manager team.", color: "#ff4242" },
    staff: { title: "Staff", description: "Be a part of the haunt.gg staff team.", color: "#6783ff" },
    helper: { title: "Helper", description: "Be a part of the haunt.gg helper team.", color: "#d4843d" },
    og: { title: "OG", description: "Be an early supporter of haunt.gg.", color: "#ffd700" },
    verified: { title: "Verified", description: "Purchase or be a known content creator.", color: "#008ada" },
    "bug-hunter": { title: "Bug Hunter", description: "Report a bug to the haunt.gg team.", color: "#3d9e5c" },
    donator: { title: "Donator", description: "Awarded for donating to haunt.gg.", color: "#13a15a" },
    premium: { title: "Premium", description: "Purchase the premium package.", color: "#a749dd" },
    champion: { title: "Champion", description: "Reach the top 10 on the profile views leaderboard.", color: "#ffdb58" },
    booster: { title: "Booster", description: "Boost the haunt.gg discord server.", color: "#be510d" },
    event: { title: "Event", description: "Earned from taking part in haunt.gg events.", color: "#4f8fe8" },
    views: { title: "Views", description: "Earned by reaching profile-view milestones.", color: "#9b8cff" },
    likes: { title: "Likes", description: "Earned by reaching profile-like milestones.", color: "#ff6f61" },
    comments: { title: "Comments", description: "Earned by reaching profile-comment milestones.", color: "#4aa8ff" },
    gifter: { title: "Gifter", description: "Awarded for gifting haunt.gg products to other users.", color: "#d10000" },
    imagehost: { title: "Image Host", description: "Purchase the Image Host storage extension.", color: "#d43570" },
    guildtag: { title: "Guild Tag", description: "Obtain our guild tag on the haunt.gg discord server.", color: "#895129" },
    level: { title: "Level", description: "Reach activity levels on the haunt.gg discord server.", color: "#3ba55d" },
    halloween: { title: "Halloween", description: "Exclusive badge from the halloween sale.", color: "#ea6023" },
    christmas: { title: "Christmas", description: "Exclusive badge from the christmas sale.", color: "#e71c1c" },
    easter: { title: "Easter", description: "Exclusive badge from the easter sale.", color: "#ffb3c1" },
    summer: { title: "Summer", description: "Exclusive badge from the summer sale.", color: "#fde46f" }
};
const TIERS: Record<string, Record<number, BadgeInfo>> = {
    donator: {
        1: { title: "Donator", description: "Donate at least 10€ to haunt.gg.", color: "#13a15a" },
        2: { title: "Fortune", description: "Donate at least 50€ to haunt.gg.", color: "#aa3b3b" },
        3: { title: "Solar", description: "Donate at least 100€ to haunt.gg.", color: "#4cadd0" },
        4: { title: "Void", description: "Donate at least 250€ to haunt.gg.", color: "#ff5dd6" },
        5: { title: "Apollo", description: "Donate at least 500€ to haunt.gg.", color: "#8799ae" }
    },
    views: {
        1: { title: "Noticed", description: "Achieve 100 or more total views.", color: "#9b8cff" },
        2: { title: "Rising", description: "Achieve 500 or more total views.", color: "#9b8cff" },
        3: { title: "Viral", description: "Achieve 1.000 or more total views.", color: "#9b8cff" },
        4: { title: "All Eyes on Me", description: "Achieve 2.500 or more total views.", color: "#9b8cff" },
        5: { title: "Main Character", description: "Achieve 5.000 or more total views.", color: "#9b8cff" }
    },
    likes: {
        1: { title: "Liked", description: "Receive your first profile like.", color: "#ff6f61" },
        2: { title: "Charming", description: "Receive 10 or more profile likes.", color: "#ff6f61" },
        3: { title: "Beloved", description: "Receive 25 or more profile likes.", color: "#ff6f61" },
        4: { title: "Heartthrob", description: "Receive 50 or more profile likes.", color: "#ff6f61" }
    },
    comments: {
        1: { title: "Recognized", description: "Receive your first profile comment.", color: "#4aa8ff" },
        2: { title: "Connected", description: "Receive 10 or more profile comments.", color: "#4aa8ff" },
        3: { title: "Trending", description: "Receive 25 or more profile comments.", color: "#4aa8ff" }
    }
};

interface ResolvedBadge { key: string; name: string; description: string | null; imageUrl: string; color: string | null; }
function listBadges(badges: HauntBadge[], onlyEnabled: boolean): ResolvedBadge[] {
    return badges
        .filter(badge => !onlyEnabled || badge.enabled)
        .sort((a, b) => a.order - b.order)
        .map(badge => {
            const catalog = badge.badgeId ? BADGES[badge.badgeId] : undefined;
            const tier = badge.badgeId && badge.selectedTier != null ? TIERS[badge.badgeId]?.[badge.selectedTier] : undefined;
            const apiTier = badge.selectedTier != null ? badge.tiers?.find(item => item.tier === badge.selectedTier) : undefined;
            const imageUrl = badge.imageUrl ?? badge.image?.url;
            if (!imageUrl) return null;
            return {
                key: badge.id,
                name: (tier ?? catalog)?.title ?? badge.name?.trim() ?? apiTier?.title ?? badge.badgeId?.replaceAll("-", " ") ?? "Badge",
                description: (tier ?? catalog)?.description ?? apiTier?.description ?? null,
                imageUrl,
                color: (tier ?? catalog)?.color ?? apiTier?.color ?? badge.color ?? null
            };
        })
        .filter((badge): badge is ResolvedBadge => badge != null);
}

type LookupResult =
    | { kind: "ok"; profile: HauntProfile; }
    | { kind: "none"; reason: "missing" | "private"; }
    | { kind: "unauthorized"; message: string; }
    | { kind: "ratelimited"; retryAfterMs: number; }
    | { kind: "error"; message: string; };

async function lookupByDiscordId(apiKey: string, discordId: string): Promise<LookupResult> {
    const url = `${API_URL}?type=discord&value=${encodeURIComponent(discordId)}&badges=true&views=true&feedback=true`;
    let status = -1;
    let retryAfter: string | null = null;
    let data = "";
    try {
        if (!IS_WEB) {
            ({ status, retryAfter, data } = await Native.lookupUser(apiKey, discordId));
        } else {
            const response = await fetch(url, { headers: { "X-API-Key": apiKey, Accept: "application/json" } });
            status = response.status;
            retryAfter = response.headers.get("retry-after");
            data = await response.text();
        }
    } catch (error) {
        data = String(error);
    }

    let body: LookupResponse | null = null;
    try { body = JSON.parse(data) as LookupResponse; } catch { body = null; }
    switch (status) {
        case 200:
            return body?.user
                ? { kind: "ok", profile: { user: body.user, badges: body.badges ?? [], views: body.views ?? null, feedback: body.feedback ?? null } }
                : { kind: "error", message: "Response contained no user" };
        case 404: return { kind: "none", reason: body?.error?.includes("private") ? "private" : "missing" };
        case 401:
        case 403: return { kind: "unauthorized", message: body?.error ?? "API key was rejected" };
        case 429: {
            const seconds = Number(retryAfter);
            return { kind: "ratelimited", retryAfterMs: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60_000 };
        }
        default: return { kind: "error", message: body?.error ?? `Request failed with status ${status}` };
    }
}

interface CacheEntry { profile: HauntProfile | null; expiresAt: number; }
const cache = new Map<string, CacheEntry>();
const inFlight = new Set<string>();
const listeners = new Map<string, Set<() => void>>();
const queue = new Queue();
let lastRequestAt = 0;
let pausedUntil = 0;
let keyRejected = false;
let cacheLoading: Promise<void> | undefined;
let keyRejectedHandler: ((message: string) => void) | undefined;

function notify(id?: string) {
    if (id) listeners.get(id)?.forEach(listener => listener());
    else listeners.forEach(set => set.forEach(listener => listener()));
}
function subscribe(id: string, listener: () => void) {
    let set = listeners.get(id);
    if (!set) listeners.set(id, set = new Set());
    set.add(listener);
    return () => { set!.delete(listener); if (!set!.size) listeners.delete(id); };
}
async function loadPersistedCache() {
    if (!settings.store.persistCache) return;
    try {
        const stored = await DataStore.get<Record<string, CacheEntry>>(STORE_KEY);
        for (const [id, entry] of Object.entries(stored ?? {})) if (entry.expiresAt > Date.now()) cache.set(id, entry);
        notify();
    } catch (error) { logger.error("Failed to read the stored cache", error); }
}
const persistCache = debounce(async () => {
    if (!settings.store.persistCache) return;
    try { await DataStore.set(STORE_KEY, Object.fromEntries([...cache].filter(([, entry]) => entry.expiresAt > Date.now()))); }
    catch (error) { logger.error("Failed to write the cache", error); }
}, 2000);
async function dropPersistedCache() { try { await DataStore.del(STORE_KEY); } catch (error) { logger.error("Failed to delete the stored cache", error); } }
function storeProfile(id: string, profile: HauntProfile | null, ttl: number) { cache.set(id, { profile, expiresAt: Date.now() + ttl }); persistCache(); notify(id); }
async function runLookup(id: string) {
    if ((cache.get(id)?.expiresAt ?? 0) > Date.now()) return notify(id);
    const apiKey = settings.store.apiKey.trim();
    if (!apiKey || keyRejected) return;
    const wait = Math.max(pausedUntil - Date.now(), lastRequestAt + settings.store.requestDelayMs - Date.now());
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    const result = await lookupByDiscordId(apiKey, id);
    if (result.kind === "ok") storeProfile(id, result.profile, settings.store.cacheTtlMinutes * 60_000);
    else if (result.kind === "none") storeProfile(id, null, settings.store.negativeCacheHours * 3_600_000);
    else if (result.kind === "unauthorized") { keyRejected = true; logger.error(result.message); keyRejectedHandler?.(result.message); }
    else if (result.kind === "ratelimited") { pausedUntil = Date.now() + result.retryAfterMs; logger.warn("Haunt API rate limit reached"); }
    else storeProfile(id, null, 60_000);
}
function scheduleLookup(id: string) {
    if (inFlight.has(id) || keyRejected || !settings.store.apiKey.trim()) return;
    inFlight.add(id);
    queue.push(() => runLookup(id).finally(() => inFlight.delete(id)));
}
function useHauntProfile(id: string | undefined, force = false) {
    const [, update] = useState(0);
    useEffect(() => id ? subscribe(id, () => update(value => value + 1)) : undefined, [id]);
    if (!id) return null;
    const entry = cache.get(id);
    if (!entry || entry.expiresAt <= Date.now()) { if (force || settings.store.autoLookup) scheduleLookup(id); }
    return entry?.profile ?? null;
}
function clearCache() { cache.clear(); keyRejected = false; pausedUntil = 0; void DataStore.del(STORE_KEY).catch(error => logger.error("Failed to clear the cache", error)); notify(); }

function profileUrl(username: string) { return `https://haunt.gg/${encodeURIComponent(username)}`; }
function ProfileLink({ username, children, enabled = true }: { username: string; children: ReactNode; enabled?: boolean; }) {
    if (!enabled) return <span>{children}</span>;
    return <Tooltip text={`Open ${profileUrl(username)}`}>{props => <span {...props} role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={event => { event.stopPropagation(); VencordNative.native.openExternal(profileUrl(username)); }} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); VencordNative.native.openExternal(profileUrl(username)); } }}>{children}</span>}</Tooltip>;
}
function HauntBadgeRow({ badges, size, max }: { badges: ResolvedBadge[]; size: number; max?: number; }) {
    const shown = max != null && badges.length > max ? badges.slice(0, max) : badges;
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 2, marginLeft: 4 }}>{shown.map(badge => <Tooltip key={badge.key} text={<span><span style={badge.color ? { color: badge.color } : undefined}>{badge.name}</span>{badge.description && <span style={{ display: "block", color: "var(--text-muted)" }}>{badge.description}</span>}</span>}>{props => <img {...props} src={badge.imageUrl} alt={badge.name} style={{ width: size, height: size, objectFit: "contain" }} />}</Tooltip>)}{badges.length > shown.length && <Tooltip text={badges.slice(shown.length).map(badge => badge.name).join(", ")}>{props => <span {...props}>+{badges.length - shown.length}</span>}</Tooltip>}</span>;
}
function ChatDecoration({ userId }: { userId: string; }) {
    const { chatShowUsername, chatShowUid, chatShowBadges, chatSeparator, chatMaxBadges, chatBadgeSize, chatClickOpensProfile, badgesOnlyEnabled } = settings.store;
    const profile = useHauntProfile(userId);
    if (!profile) return null;
    const badges = chatShowBadges ? listBadges(profile.badges, badgesOnlyEnabled) : [];
    const labels = [chatShowUsername && <span key="name">{profile.user.username}</span>, chatShowUid && <span key="uid">#{profile.user.uid}</span>].filter(Boolean);
    if (!labels.length && !badges.length) return null;
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 4 }}>{chatSeparator && <span style={{ color: "var(--text-muted)" }}>{chatSeparator}</span>}{labels.length > 0 && <ProfileLink username={profile.user.username} enabled={chatClickOpensProfile}><span style={{ display: "inline-flex", gap: 3 }}>{labels}</span></ProfileLink>}{badges.length > 0 && <HauntBadgeRow badges={badges} size={chatBadgeSize} max={chatMaxBadges} />}</span>;
}
function Field({ label, value, onClick }: { label: string; value: string; onClick?: () => void; }) { return <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}><Span size="xs" weight="medium" style={{ color: "var(--text-muted)", textTransform: "uppercase" }}>{label}</Span>{onClick ? <button onClick={onClick} style={{ padding: 0, border: 0, background: "none", color: "var(--text-normal)", textAlign: "left", cursor: "pointer" }}>{value}</button> : <Span size="sm">{value}</Span>}</div>; }
function ProfileSection({ userId }: { userId: string; }) {
    const { showInProfile, badgesOnlyEnabled, profileShowUsername, profileShowUid, profileShowId, profileShowBadges, profileShowViews, profileShowFeedback, profileShowCreatedAt, profileBadgeSize } = settings.store;
    const profile = useHauntProfile(userId, showInProfile);
    if (!showInProfile || !profile) return null;
    const { user, feedback, views } = profile;
    const badges = profileShowBadges ? listBadges(profile.badges, badgesOnlyEnabled) : [];
    return <section className={ProfileCardClasses.container}><div className={classes(ProfileCardClasses.card)} style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}><ProfileLink username={user.username}><span style={{ display: "flex", alignItems: "center", gap: 8 }}>{user.avatarUrl && <img src={user.avatarUrl} alt="" style={{ width: 24, height: 24, borderRadius: "50%" }} />}<span style={{ flex: 1 }}>{profileShowUsername && <Span size="sm" weight="semibold">{user.username}</Span>}{user.name && user.name !== user.username && <Span size="xs" style={{ display: "block", color: "var(--text-muted)" }}>{user.name}</Span>}</span><OpenExternalIcon width={14} height={14} /></span></ProfileLink>{badges.length > 0 && <HauntBadgeRow badges={badges} size={profileBadgeSize} />}<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>{profileShowUid && <Field label="UID" value={`#${user.uid}`} />}{profileShowId && <Field label="ID" value={user.id} onClick={() => copyWithToast(user.id, "Copied the Haunt ID")} />}{profileShowViews && views != null && <Field label="Views" value={views.toLocaleString()} />}{profileShowFeedback && feedback && <Field label="Feedback" value={`${feedback.likes.toLocaleString()} 👍 · ${feedback.dislikes.toLocaleString()} 👎`} />}{profileShowCreatedAt && <Field label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />}</div></div></section>;
}
function HauntSettings() {
    const { apiKey } = settings.use(["apiKey"]);
    const [testing, setTesting] = useState(false);
    async function testKey() {
        const id = UserStore.getCurrentUser()?.id;
        if (!id) return;
        setTesting(true);
        try {
            const result = await lookupByDiscordId(apiKey.trim(), id);
            if (result.kind === "ok") showToast(`Key works — you are ${result.profile.user.username} (#${result.profile.user.uid})`, Toasts.Type.SUCCESS);
            else if (result.kind === "none") showToast(result.reason === "private" ? "Key works, but your profile is private" : "Key works, but no haunt.gg account is linked", Toasts.Type.MESSAGE);
            else if (result.kind === "unauthorized") showToast(`Key rejected: ${result.message}`, Toasts.Type.FAILURE);
            else if (result.kind === "ratelimited") showToast("Rate limited — try again in a minute", Toasts.Type.FAILURE);
            else showToast(`Lookup failed: ${result.message}`, Toasts.Type.FAILURE);
        } catch (error) {
            logger.error("Key test failed", error);
            showToast("Lookup failed — see the console", Toasts.Type.FAILURE);
        } finally {
            setTesting(false);
        }
    }
    return <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}><Span size="sm">Get a key with the <code>lookup:user</code> permission from your haunt.gg dashboard. Badge artwork loads from haunt.gg.</Span><Flex style={{ gap: "0.5em" }}><Button size="small" disabled={!apiKey.trim() || testing} onClick={testKey}>{testing ? "Testing…" : "Test key"}</Button><Button size="small" variant="secondary" onClick={() => { clearCache(); showToast("Cleared the Haunt cache", Toasts.Type.SUCCESS); }}>Clear cache</Button></Flex></div>;
}

function syncChatDecoration() {
    if (settings.store.showInChat) addMessageDecoration(DECORATION_ID, ({ message }) => message?.author ? <ChatDecoration userId={message.author.id} /> : null);
    else removeMessageDecoration(DECORATION_ID);
}

function refreshAll() {
    notify();
}

export const settings = definePluginSettings({
    apiKey: { type: OptionType.STRING, displayName: "API key", description: "Your haunt.gg API key. Needs the lookup:user permission.", default: "", placeholder: "haunt_…", componentProps: { type: "password" }, onChange: clearCache },
    manage: { type: OptionType.COMPONENT, component: HauntSettings },
    showInChat: { type: OptionType.BOOLEAN, displayName: "Show in chat", description: "Show Haunt info next to usernames in messages", default: true, onChange: syncChatDecoration },
    chatShowUsername: { type: OptionType.BOOLEAN, displayName: "Chat: username", description: "Show the Haunt username", default: true },
    chatShowUid: { type: OptionType.BOOLEAN, displayName: "Chat: UID", description: "Show the numeric UID", default: true },
    chatShowBadges: { type: OptionType.BOOLEAN, displayName: "Chat: badges", description: "Show badges", default: true },
    chatSeparator: { type: OptionType.STRING, displayName: "Chat: separator", description: "Separator before Haunt info", default: " | " },
    chatMaxBadges: { type: OptionType.SLIDER, displayName: "Chat: badge limit", description: "Badges before collapsing into +n", markers: [1, 2, 3, 4, 5, 6, 8, 10], default: 5 },
    chatBadgeSize: { type: OptionType.SLIDER, displayName: "Chat: badge size", description: "Badge size in pixels", markers: [12, 14, 16, 18, 20, 24], default: 16 },
    chatClickOpensProfile: { type: OptionType.BOOLEAN, displayName: "Chat: click opens the profile", description: "Open haunt.gg when clicking the decoration", default: true },
    showInProfile: { type: OptionType.BOOLEAN, displayName: "Show in profiles", description: "Add Haunt to user popouts", default: true },
    profileShowUsername: { type: OptionType.BOOLEAN, displayName: "Profile: username", description: "Show the Haunt username", default: true },
    profileShowUid: { type: OptionType.BOOLEAN, displayName: "Profile: UID", description: "Show the numeric UID", default: true },
    profileShowId: { type: OptionType.BOOLEAN, displayName: "Profile: internal ID", description: "Show the internal account ID", default: true },
    profileShowBadges: { type: OptionType.BOOLEAN, displayName: "Profile: badges", description: "Show badges", default: true },
    profileShowViews: { type: OptionType.BOOLEAN, displayName: "Profile: views", description: "Show profile views", default: true },
    profileShowFeedback: { type: OptionType.BOOLEAN, displayName: "Profile: likes and dislikes", description: "Show feedback", default: true },
    profileShowCreatedAt: { type: OptionType.BOOLEAN, displayName: "Profile: join date", description: "Show account creation date", default: true },
    profileBadgeSize: { type: OptionType.SLIDER, displayName: "Profile: badge size", description: "Badge size in pixels", markers: [16, 20, 24, 28, 32], default: 20 },
    badgesOnlyEnabled: { type: OptionType.BOOLEAN, displayName: "Only badges shown on the profile", description: "Only show enabled badges", default: false },
    autoLookup: { type: OptionType.BOOLEAN, displayName: "Look users up automatically", description: "Resolve users seen in chat", default: true },
    cacheTtlMinutes: { type: OptionType.SLIDER, displayName: "Cache duration (minutes)", description: "How long profiles are cached", markers: [5, 15, 30, 60, 180, 720], default: 30 },
    negativeCacheHours: { type: OptionType.SLIDER, displayName: "Remember misses for (hours)", description: "How long missing profiles are cached", markers: [1, 6, 12, 24, 72], default: 12 },
    requestDelayMs: { type: OptionType.SLIDER, displayName: "Delay between lookups (ms)", description: "Minimum gap between requests", markers: [0, 100, 250, 500, 1000, 2000], default: 300 },
    persistCache: { type: OptionType.BOOLEAN, displayName: "Keep the cache across restarts", description: "Persist looked-up profiles", default: true, onChange: (value: boolean) => { if (!value) void dropPersistedCache(); } }
}, {
    chatShowUsername: { hidden() { return !this.store.showInChat; } }, chatShowUid: { hidden() { return !this.store.showInChat; } }, chatShowBadges: { hidden() { return !this.store.showInChat; } }, chatSeparator: { hidden() { return !this.store.showInChat; } }, chatMaxBadges: { hidden() { return !this.store.showInChat || !this.store.chatShowBadges; } }, chatBadgeSize: { hidden() { return !this.store.showInChat || !this.store.chatShowBadges; } }, chatClickOpensProfile: { hidden() { return !this.store.showInChat; } },
    profileShowUsername: { hidden() { return !this.store.showInProfile; } }, profileShowUid: { hidden() { return !this.store.showInProfile; } }, profileShowId: { hidden() { return !this.store.showInProfile; } }, profileShowBadges: { hidden() { return !this.store.showInProfile; } }, profileShowViews: { hidden() { return !this.store.showInProfile; } }, profileShowFeedback: { hidden() { return !this.store.showInProfile; } }, profileShowCreatedAt: { hidden() { return !this.store.showInProfile; } }, profileBadgeSize: { hidden() { return !this.store.showInProfile || !this.store.profileShowBadges; } }, badgesOnlyEnabled: { hidden() { return !this.store.chatShowBadges && !this.store.profileShowBadges; } }
});

const profilePopoutComponent = ErrorBoundary.wrap(({ user }: { user: User; }) => user?.id ? <ProfileSection userId={user.id} /> : null, { noop: true });

export default definePlugin({
    name: "Haunt",
    description: "Shows haunt.gg profiles, usernames, UIDs, badges and stats in chat and user popouts",
    authors: [{ name: "curet-dev", id: 0n }],
    dependencies: ["MessageDecorationsAPI"],
    settings,
    patches: [
        { find: '"UserProfilePopout");', replacement: { match: /userId:\i\.id,guild:\i\}\)(?=])/ , replace: "$&,$self.profilePopoutComponent(arguments[0])" } },
        { find: ".SIDEBAR,disableToolbar:", replacement: { match: /user:(\i),widgets:.{0,100}?\}\),/, replace: "$&$self.profilePopoutComponent({user:$1})," } }
    ],
    profilePopoutComponent,
    start() { keyRejectedHandler = message => showToast(`Haunt: ${message} — check your API key in the plugin settings`, Toasts.Type.FAILURE); SettingsStore.addPrefixChangeListener(SETTINGS_PREFIX, refreshAll); cacheLoading ??= loadPersistedCache(); syncChatDecoration(); },
    stop() { keyRejectedHandler = undefined; SettingsStore.removePrefixChangeListener(SETTINGS_PREFIX, refreshAll); removeMessageDecoration(DECORATION_ID); }
});
