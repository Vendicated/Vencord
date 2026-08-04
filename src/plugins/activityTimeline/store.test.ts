/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    createTimelineStore,
    MAX_TIMELINE_EVENTS,
    TIMELINE_RETENTION_MS,
    validatePersistedState
} from "./store";

const now = 1_000_000_000;

function message(channelId: string, messageId: string, timestamp = now) {
    return {
        type: "message" as const,
        timestamp,
        guildId: "guild",
        channelId,
        messageId
    };
}

function readyStore() {
    const store = createTimelineStore();
    store.hydrate({ version: 1, sessions: [], events: [] }, now);
    return store;
}

function startStore(userId = "user") {
    const store = readyStore();
    assert.ok(store.start({ userId, mode: "self", startedAt: now }));
    return store;
}

test("hydration closes interrupted sessions and never resumes tracking", () => {
    const store = createTimelineStore();
    store.hydrate({
        version: 1,
        sessions: [{ id: 3, targetUserId: "user", mode: "self", startedAt: now - 100, endedAt: null }],
        events: [{ ...message("channel", "message", now - 20), id: 7, sessionId: 3 }]
    }, now);

    const snapshot = store.getSnapshot();
    assert.equal(snapshot.activeSessionId, null);
    assert.equal(snapshot.target, null);
    assert.equal(snapshot.sessions[0].endedAt, now - 20);
});

test("starting a target creates a session without deleting previous history", () => {
    const store = startStore("first");
    store.addEvent(message("channel", "first"));
    store.stop(now + 1);
    assert.ok(store.start({ userId: "second", mode: "selected", startedAt: now + 2 }));
    store.addEvent(message("channel", "second", now + 2));

    assert.deepEqual(store.getSnapshot().events.filter(event => event.type === "message").map(event => event.messageId), ["first", "second"]);
    assert.equal(store.getSnapshot().sessions.length, 2);
    assert.equal(store.getSnapshot().target?.userId, "second");
});

test("stop preserves the selected user's history", () => {
    const store = startStore();
    store.addEvent(message("channel", "message"));
    assert.equal(store.stop(now + 1), true);
    assert.equal(store.getSnapshot().target, null);
    assert.equal(store.getSnapshot().events.length, 1);
    assert.equal(store.addEvent(message("channel", "later", now + 2)), false);
});

test("messages are deduplicated, and deleted messages remain marked", () => {
    const store = startStore();
    assert.equal(store.addEvent(message("channel", "message")), true);
    assert.equal(store.addEvent(message("channel", "message")), false);
    store.markMessageDeleted("channel", "message", now + 1);
    const event = store.getSnapshot().events[0];
    assert.equal(event.type, "message");
    assert.equal(event.deletedAt, now + 1);
});

test("history expires only after 72 hours and orphan sessions are removed", () => {
    const store = createTimelineStore();
    store.hydrate({
        version: 1,
        sessions: [
            { id: 1, targetUserId: "old", mode: "selected", startedAt: now - TIMELINE_RETENTION_MS - 2, endedAt: now - TIMELINE_RETENTION_MS - 1 },
            { id: 2, targetUserId: "fresh", mode: "selected", startedAt: now - TIMELINE_RETENTION_MS, endedAt: null }
        ],
        events: [
            { ...message("channel", "old", now - TIMELINE_RETENTION_MS - 1), id: 1, sessionId: 1 },
            { ...message("channel", "fresh", now - TIMELINE_RETENTION_MS), id: 2, sessionId: 2 }
        ]
    }, now);

    assert.deepEqual(store.getSnapshot().events.filter(event => event.type === "message").map(event => event.messageId), ["fresh"]);
    assert.deepEqual(store.getSnapshot().sessions.map(session => session.targetUserId), ["fresh"]);
});

test("clear removes only the selected user and keeps an active target running", () => {
    const store = startStore("first");
    store.addEvent(message("channel", "first"));
    store.stop(now + 1);
    store.start({ userId: "second", mode: "selected", startedAt: now + 2 });
    store.addEvent(message("channel", "second", now + 2));

    store.clearForUser("first", now + 3);
    assert.deepEqual(store.getSnapshot().events.filter(event => event.type === "message").map(event => event.messageId), ["second"]);
    store.clearForUser("second", now + 4);
    assert.equal(store.getSnapshot().target?.userId, "second");
    assert.equal(store.getSnapshot().events.length, 0);
    assert.equal(store.addEvent(message("channel", "after-clear", now + 5)), true);
});

test("the 20,001st event stops tracking without evicting valid history", () => {
    const store = startStore();
    for (let index = 0; index < MAX_TIMELINE_EVENTS; index++)
        assert.equal(store.addEvent(message("channel", String(index), now + index)), true);

    assert.equal(store.getSnapshot().events.length, MAX_TIMELINE_EVENTS);
    assert.equal(store.addEvent(message("channel", "overflow", now + MAX_TIMELINE_EVENTS)), false);
    assert.equal(store.getSnapshot().capacityReached, true);
    assert.equal(store.getSnapshot().target, null);
    assert.equal(store.getSnapshot().events.length, MAX_TIMELINE_EVENTS);
});

test("invalid records are salvaged and unknown versions are never treated as v1", () => {
    const recovered = validatePersistedState({
        version: 1,
        sessions: [{ id: 1, targetUserId: "user", mode: "self", startedAt: now, endedAt: null }, { bad: true }],
        events: [{ id: 2, sessionId: 1, type: "presence", timestamp: now, previousStatus: "offline", currentStatus: "online" }, { bad: true }]
    });
    assert.equal(recovered.recovered, true);
    assert.equal(recovered.unsupported, false);
    assert.equal(recovered.state.sessions.length, 1);
    assert.equal(recovered.state.events.length, 1);

    const unknown = validatePersistedState({ version: 99, sessions: [], events: [] });
    assert.equal(unknown.unsupported, true);
});
