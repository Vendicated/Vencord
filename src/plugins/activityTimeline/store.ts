/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const MAX_TIMELINE_EVENTS = 20_000;
export const TIMELINE_RETENTION_MS = 72 * 60 * 60 * 1000;

export type TimelineMode = "self" | "selected";
export type TimelineEventType = "message" | "presence" | "voice";
export type PresenceStatus = "online" | "idle" | "dnd" | "invisible" | "offline";
export type HydrationState = "loading" | "ready" | "error";

export interface TimelineTarget {
    userId: string;
    mode: TimelineMode;
    startedAt: number;
}

export interface TimelineSessionRecord {
    id: number;
    targetUserId: string;
    mode: TimelineMode;
    startedAt: number;
    endedAt: number | null;
}

export type TimelineEventInput =
    | {
        type: "message";
        timestamp: number;
        guildId: string;
        channelId: string;
        messageId: string;
      }
    | {
        type: "presence";
        timestamp: number;
        previousStatus: PresenceStatus;
        currentStatus: PresenceStatus;
      }
    | {
        type: "voice";
        timestamp: number;
        guildId: string;
        action: "join" | "leave" | "move";
        fromChannelId?: string;
        toChannelId?: string;
      };

export type TimelineEvent = TimelineEventInput & {
    id: number;
    sessionId: number;
    deletedAt?: number;
};

export type PersistedTimelineEvent = TimelineEvent;

export interface PersistedTimelineStateV1 {
    version: 1;
    sessions: TimelineSessionRecord[];
    events: PersistedTimelineEvent[];
}

export interface TimelineSnapshot {
    target: TimelineTarget | null;
    events: readonly TimelineEvent[];
    sessions: readonly TimelineSessionRecord[];
    activeSessionId: number | null;
    hydrationState: HydrationState;
    storageError: string | null;
    capacityReached: boolean;
}

type Listener = () => void;

function messageKey(channelId: string, messageId: string) {
    return `${channelId}:${messageId}`;
}

function isPresenceStatus(value: unknown): value is PresenceStatus {
    return value === "online" || value === "idle" || value === "dnd" || value === "invisible" || value === "offline";
}

function isFiniteTimestamp(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isString(value: unknown): value is string {
    return typeof value === "string" && value.length > 0;
}

function isMode(value: unknown): value is TimelineMode {
    return value === "self" || value === "selected";
}

function isSession(value: unknown): value is TimelineSessionRecord {
    if (!value || typeof value !== "object") return false;
    const session = value as Partial<TimelineSessionRecord>;
    return typeof session.id === "number" && Number.isSafeInteger(session.id) && session.id > 0
        && isString(session.targetUserId)
        && isMode(session.mode)
        && isFiniteTimestamp(session.startedAt)
        && (session.endedAt === null || isFiniteTimestamp(session.endedAt));
}

function isEvent(value: unknown): value is PersistedTimelineEvent {
    if (!value || typeof value !== "object") return false;
    const event = value as Partial<TimelineEvent>;
    if (typeof event.id !== "number" || !Number.isSafeInteger(event.id) || event.id <= 0 || typeof event.sessionId !== "number" || !Number.isSafeInteger(event.sessionId) || event.sessionId <= 0 || !isFiniteTimestamp(event.timestamp)) return false;

    if (event.type === "message") {
        return isString(event.guildId) && isString(event.channelId) && isString(event.messageId)
            && (event.deletedAt === undefined || isFiniteTimestamp(event.deletedAt));
    }
    if (event.type === "presence")
        return isPresenceStatus(event.previousStatus) && isPresenceStatus(event.currentStatus);
    if (event.type === "voice") {
        return isString(event.guildId)
            && (event.action === "join" || event.action === "leave" || event.action === "move")
            && (event.fromChannelId === undefined || isString(event.fromChannelId))
            && (event.toChannelId === undefined || isString(event.toChannelId));
    }
    return false;
}

export function validatePersistedState(value: unknown): { state: PersistedTimelineStateV1; recovered: boolean; unsupported: boolean; } {
    if (value === undefined || value === null)
        return { state: { version: 1, sessions: [], events: [] }, recovered: false, unsupported: false };

    if (typeof value !== "object")
        return { state: { version: 1, sessions: [], events: [] }, recovered: true, unsupported: false };

    const { version } = value as { version?: unknown; };
    if (version !== undefined && version !== 1)
        return { state: { version: 1, sessions: [], events: [] }, recovered: false, unsupported: true };

    const raw = value as Partial<PersistedTimelineStateV1>;
    const sessions = Array.isArray(raw.sessions) ? raw.sessions.filter(isSession) : [];
    const sessionIds = new Set(sessions.map(session => session.id));
    const events = Array.isArray(raw.events)
        ? raw.events.filter((event): event is PersistedTimelineEvent => isEvent(event) && sessionIds.has(event.sessionId))
        : [];
    const recovered = version === undefined || !Array.isArray(raw.sessions) || !Array.isArray(raw.events) || sessions.length !== raw.sessions.length || events.length !== raw.events.length;
    return { state: { version: 1, sessions, events }, recovered, unsupported: false };
}

function latestEventTimestamp(events: readonly TimelineEvent[], sessionId: number, fallback: number) {
    return events.reduce((latest, event) => event.sessionId === sessionId ? Math.max(latest, event.timestamp) : latest, fallback);
}

export interface TimelineStore {
    getSnapshot(): TimelineSnapshot;
    subscribe(listener: Listener): () => void;
    hydrate(state: PersistedTimelineStateV1 | null, now?: number): void;
    setStorageError(message: string | null): void;
    start(target: TimelineTarget): number | null;
    stop(now?: number): boolean;
    clearForUser(userId: string, now?: number): void;
    clear(now?: number): void;
    addEvent(event: TimelineEventInput): boolean;
    markMessageDeleted(channelId: string, messageId: string, deletedAt?: number): void;
    removeMessage(channelId: string, messageId: string): void;
    removeChannel(channelId: string): void;
    removeGuild(guildId: string): void;
    prune(now?: number): boolean;
    getPersistedState(now?: number): PersistedTimelineStateV1;
}

export function createTimelineStore(): TimelineStore {
    let snapshot: TimelineSnapshot = {
        target: null,
        events: [],
        sessions: [],
        activeSessionId: null,
        hydrationState: "loading",
        storageError: null,
        capacityReached: false
    };
    let nextEventId = 1;
    let nextSessionId = 1;
    let seenMessages = new Set<string>();
    const listeners = new Set<Listener>();

    const notify = () => listeners.forEach(listener => listener());

    const rebuildIndexes = () => {
        nextEventId = Math.max(0, ...snapshot.events.map(event => event.id)) + 1;
        nextSessionId = Math.max(0, ...snapshot.sessions.map(session => session.id)) + 1;
        seenMessages = new Set(snapshot.events.filter((event): event is TimelineEvent & { type: "message"; } => event.type === "message").map(event => messageKey(event.channelId, event.messageId)));
    };

    const update = (changes: Partial<TimelineSnapshot>) => {
        snapshot = { ...snapshot, ...changes };
        notify();
    };

    const activeSession = () => snapshot.activeSessionId === null ? undefined : snapshot.sessions.find(session => session.id === snapshot.activeSessionId);

    const prune = (now = Date.now()) => {
        const cutoff = now - TIMELINE_RETENTION_MS;
        const events = snapshot.events.filter(event => event.timestamp >= cutoff);
        const eventSessionIds = new Set(events.map(event => event.sessionId));
        const sessions = snapshot.sessions.filter(session => eventSessionIds.has(session.id) || session.id === snapshot.activeSessionId || session.startedAt >= cutoff);
        const capacityReset = snapshot.capacityReached && events.length < MAX_TIMELINE_EVENTS;
        const changed = events.length !== snapshot.events.length || sessions.length !== snapshot.sessions.length || capacityReset;
        if (!changed) return false;
        snapshot = { ...snapshot, events, sessions, capacityReached: capacityReset ? false : snapshot.capacityReached };
        rebuildIndexes();
        notify();
        return true;
    };

    return {
        getSnapshot() {
            return snapshot;
        },

        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },

        hydrate(state, now = Date.now()) {
            const validated = validatePersistedState(state);
            const sessions = validated.state.sessions.map(session => ({ ...session }));
            const events = validated.state.events.map(event => ({ ...event }));
            for (const session of sessions) {
                if (session.endedAt === null)
                    session.endedAt = latestEventTimestamp(events, session.id, session.startedAt);
            }
            snapshot = {
                target: null,
                events,
                sessions,
                activeSessionId: null,
                hydrationState: validated.unsupported ? "error" : "ready",
                storageError: validated.unsupported ? "This Activity Timeline history was created by a newer version and was not changed." : null,
                capacityReached: false
            };
            rebuildIndexes();
            prune(now);
            notify();
        },

        setStorageError(message) {
            update({ hydrationState: message ? "error" : "ready", storageError: message });
        },

        start(target) {
            if (snapshot.hydrationState !== "ready" || snapshot.storageError) return null;
            const now = target.startedAt;
            prune(now);
            const previous = activeSession();
            if (previous) previous.endedAt = now;
            const session: TimelineSessionRecord = {
                id: nextSessionId++,
                targetUserId: target.userId,
                mode: target.mode,
                startedAt: target.startedAt,
                endedAt: null
            };
            snapshot = {
                ...snapshot,
                target: { ...target },
                sessions: [...snapshot.sessions, session],
                activeSessionId: session.id,
                capacityReached: false
            };
            notify();
            return session.id;
        },

        stop(now = Date.now()) {
            const session = activeSession();
            if (!session) return false;
            session.endedAt = now;
            update({ target: null, activeSessionId: null, capacityReached: false });
            return true;
        },

        clearForUser(userId, now = Date.now()) {
            const active = activeSession();
            const keepActive = active?.targetUserId === userId;
            const sessionIds = new Set(snapshot.sessions.filter(session => session.targetUserId === userId).map(session => session.id));
            const sessions = snapshot.sessions.filter(session => !sessionIds.has(session.id) || (keepActive && session.id === active?.id));
            const events = snapshot.events.filter(event => !sessionIds.has(event.sessionId));
            if (keepActive && active) {
                active.startedAt = now;
                active.endedAt = null;
            }
            snapshot = { ...snapshot, sessions, events, capacityReached: false };
            rebuildIndexes();
            notify();
        },

        clear(now = Date.now()) {
            const userId = activeSession()?.targetUserId;
            if (userId) this.clearForUser(userId, now);
        },

        addEvent(event) {
            const session = activeSession();
            if (!session || snapshot.hydrationState !== "ready" || snapshot.storageError) return false;
            const now = event.timestamp;
            prune(now);
            if (snapshot.events.length >= MAX_TIMELINE_EVENTS) {
                session.endedAt = now;
                update({ target: null, activeSessionId: null, capacityReached: true });
                return false;
            }
            if (event.type === "message") {
                const key = messageKey(event.channelId, event.messageId);
                if (seenMessages.has(key)) return false;
                seenMessages.add(key);
            }
            const nextEvent = { ...event, id: nextEventId++, sessionId: session.id } as TimelineEvent;
            update({ events: [...snapshot.events, nextEvent] });
            return true;
        },

        markMessageDeleted(channelId, messageId, deletedAt = Date.now()) {
            const events = snapshot.events.map(event => event.type === "message" && event.channelId === channelId && event.messageId === messageId
                ? { ...event, deletedAt }
                : event);
            if (events.some((event, index) => event !== snapshot.events[index])) update({ events });
        },

        removeMessage(channelId, messageId) {
            this.markMessageDeleted(channelId, messageId);
        },

        removeChannel() {
            // Channel deletion is reflected by ChannelStore at render time. Keep the
            // event until its retention deadline so the history remains auditable.
        },

        removeGuild() {
            // Guild deletion is reflected by GuildStore at render time.
        },

        prune,

        getPersistedState(now = Date.now()) {
            prune(now);
            return {
                version: 1,
                sessions: snapshot.sessions.map(session => ({ ...session })),
                events: snapshot.events.map(event => ({ ...event }))
            };
        }
    };
}

export const timelineStore = createTimelineStore();
