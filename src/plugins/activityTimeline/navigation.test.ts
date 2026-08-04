/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    createTimelineMessageNavigator,
    type TimelineNavigationChannel,
    type TimelineNavigationDependencies
} from "./navigation";

function makeHarness(selectedChannelId: string | null = "current", autoSelect = true) {
    let selected = selectedChannelId;
    let listener: ((event: { channelId?: string | null; }) => void) | undefined;
    let timerCallback: (() => void) | undefined;
    const channels = new Map<string, TimelineNavigationChannel>();
    const jumps: unknown[] = [];
    const transitions: string[] = [];
    const threadTransitions: string[] = [];
    const notices: string[] = [];
    let closed = 0;
    let unsubscribed = 0;

    const deps: TimelineNavigationDependencies = {
        getChannel: channelId => channels.get(channelId),
        canViewChannel: () => true,
        getSelectedChannelId: () => selected,
        subscribe: callback => {
            listener = callback;
        },
        unsubscribe: callback => {
            if (listener === callback) listener = undefined;
            unsubscribed++;
        },
        wait: callback => callback(),
        transitionToChannel: channelId => {
            transitions.push(channelId);
            if (autoSelect) {
                selected = channelId;
                listener?.({ channelId });
            }
        },
        transitionToThread: channel => {
            threadTransitions.push(channel.id);
            if (autoSelect) {
                selected = channel.id;
                listener?.({ channelId: channel.id });
            }
        },
        jumpToMessage: jump => jumps.push(jump),
        notify: message => notices.push(message),
        setTimeout: callback => {
            timerCallback = callback;
            return callback;
        },
        clearTimeout: timeout => {
            if (timerCallback === timeout) timerCallback = undefined;
        }
    };

    const channel = (id: string, guildId = "guild", options: { thread?: boolean; forumPost?: boolean; } = {}) => {
        const value: TimelineNavigationChannel = {
            id,
            guild_id: guildId,
            isThread: () => options.thread === true,
            isForumPost: () => options.forumPost === true
        };
        channels.set(id, value);
        return value;
    };

    return {
        deps,
        channel,
        jumps,
        transitions,
        threadTransitions,
        notices,
        get closed() {
            return closed;
        },
        close() {
            closed++;
        },
        emit(channelId: string) {
            selected = channelId;
            listener?.({ channelId });
        },
        fireTimeout() {
            timerCallback?.();
        },
        get unsubscribed() {
            return unsubscribed;
        }
    };
}

function request(harness: ReturnType<typeof makeHarness>, channelId = "target") {
    return {
        guildId: "guild",
        channelId,
        messageId: "message",
        onClose: harness.close
    };
}

test("jumps in the current channel without routing", () => {
    const harness = makeHarness("target");
    harness.channel("target");
    const navigator = createTimelineMessageNavigator(harness.deps);

    assert.equal(navigator.navigate(request(harness)), true);
    assert.equal(harness.closed, 1);
    assert.deepEqual(harness.transitions, []);
    assert.equal(harness.jumps.length, 1);
    assert.equal((harness.jumps[0] as { jumpType: string; }).jumpType, "INSTANT");
});

test("routes to another server before jumping", () => {
    const harness = makeHarness("current");
    harness.channel("target", "other-guild");
    const navigator = createTimelineMessageNavigator(harness.deps);

    assert.equal(navigator.navigate({ ...request(harness), guildId: "other-guild" }), true);
    assert.deepEqual(harness.transitions, ["target"]);
    assert.equal(harness.jumps.length, 1);
    assert.equal(harness.closed, 1);
});

test("ignores another channel selection until the requested channel is selected", () => {
    const harness = makeHarness("current", false);
    harness.channel("target");
    const navigator = createTimelineMessageNavigator(harness.deps);

    navigator.navigate(request(harness));
    harness.emit("unrelated");
    assert.equal(harness.jumps.length, 0);
    harness.emit("target");
    assert.equal(harness.jumps.length, 1);
});

test("uses thread navigation for threads and forum posts", () => {
    const threadHarness = makeHarness("current");
    threadHarness.channel("thread", "guild", { thread: true });
    createTimelineMessageNavigator(threadHarness.deps).navigate({ ...request(threadHarness, "thread") });
    assert.deepEqual(threadHarness.threadTransitions, ["thread"]);

    const forumHarness = makeHarness("current");
    forumHarness.channel("post", "guild", { forumPost: true });
    createTimelineMessageNavigator(forumHarness.deps).navigate({ ...request(forumHarness, "post") });
    assert.deepEqual(forumHarness.threadTransitions, ["post"]);
});

test("rejects deleted, inaccessible, missing, or mismatched channels before closing", () => {
    const harness = makeHarness("current");
    harness.channel("target");
    const navigator = createTimelineMessageNavigator({ ...harness.deps, canViewChannel: () => false });
    assert.equal(navigator.navigate(request(harness)), false);
    assert.equal(harness.closed, 0);
    assert.equal(harness.jumps.length, 0);

    const deleted = createTimelineMessageNavigator(harness.deps);
    assert.equal(deleted.navigate({ ...request(harness), deletedAt: 1 }), false);
    assert.equal(deleted.navigate({ ...request(harness), guildId: "wrong" }), false);
    assert.equal(deleted.navigate({ ...request(harness, "missing") }), false);
    assert.equal(harness.closed, 0);
});

test("timeout cleans the listener and reports a failed route", () => {
    const harness = makeHarness("current", false);
    harness.channel("target");
    const navigator = createTimelineMessageNavigator(harness.deps);

    assert.equal(navigator.navigate(request(harness)), true);
    harness.fireTimeout();
    assert.equal(harness.jumps.length, 0);
    assert.equal(harness.unsubscribed, 1);
    assert.match(harness.notices[0], /did not open/i);
});

test("a new request and explicit cancellation clean up a pending route", () => {
    const harness = makeHarness("current", false);
    harness.channel("first");
    harness.channel("second");
    const navigator = createTimelineMessageNavigator(harness.deps);

    navigator.navigate(request(harness, "first"));
    navigator.navigate(request(harness, "second"));
    navigator.cancel();
    harness.emit("second");
    assert.equal(harness.jumps.length, 0);
    assert.equal(harness.unsubscribed, 2);
});
