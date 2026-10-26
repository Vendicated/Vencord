/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { AutoReadContext, AutoReadController, AutoReadDependencies } from "@plugins/mentionControl/autoRead";

const epoch = 1420070400000;
const start = Date.UTC(2026, 9, 26);
const accountId = "100000000000000001";
const channelId = "200000000000000001";
const guildId = "300000000000000001";
const authorId = "400000000000000001";
const otherAccount = "100000000000000002";
const snowflake = (time: number, sequence = 0) => (((BigInt(time) - BigInt(epoch)) << 22n) + BigInt(sequence)).toString();

function event(time = start + 1, sequence = 0) {
    return {
        type: "MESSAGE_CREATE", channelId, optimistic: false, isPushNotification: false,
        message: { id: snowflake(time, sequence), channel_id: channelId, guild_id: guildId, type: 0, author: { id: authorId } }
    };
}

function harness() {
    let clock = start;
    let current: AutoReadContext | undefined = { accountId, channelId, scope: "guild", guildId, lastMessageId: event().message.id, ackMessageId: snowflake(start - 1) };
    const queue: (() => void)[] = [];
    const calls: { channelId: string; messageId: string; receiver: unknown; }[] = [];
    let errors = 0;
    const dependencies: AutoReadDependencies = {
        now: () => clock,
        context: () => current,
        defer: callback => { queue.push(callback); },
        ack(channel, message) {
            calls.push({ channelId: channel, messageId: message, receiver: this });
            return Promise.resolve();
        },
        onError: () => { errors++; }
    };
    const controller = new AutoReadController(dependencies);
    clock = start + 1000;
    return {
        controller, dependencies, queue, calls,
        get errors() { return errors; },
        get current() { return current; },
        set current(value: AutoReadContext | undefined) { current = value; },
        set clock(value: number) { clock = value; },
        flush() { while (queue.length) queue.shift()!(); }
    };
}

test("constructing and resetting auto-read never schedules or acknowledges an action", () => {
    const h = harness();
    h.controller.reset();
    assert.equal(h.queue.length, 0);
    assert.equal(h.calls.length, 0);
});

test("one eligible live event is deferred once and keeps its exact target and native receiver", () => {
    const h = harness();
    const input = Object.freeze({ ...event(), message: Object.freeze({ ...event().message, author: Object.freeze({ id: authorId }) }) });
    h.controller.handle(input);
    assert.equal(h.calls.length, 0);
    assert.equal(h.queue.length, 1);
    h.flush();
    assert.deepEqual(h.calls, [{ channelId, messageId: input.message.id, receiver: h.dependencies }]);
    assert.equal(input.message.author.id, authorId);
    assert.equal(h.errors, 0);
});

test("a fresh muted private message is acknowledged without inventing a guild", () => {
    const h = harness();
    const input = event();
    const { guild_id: _guild, ...privateMessage } = input.message;
    h.current = { ...h.current!, scope: "dm", guildId: undefined };
    h.controller.handle({ ...input, message: privateMessage });
    assert.equal(h.calls.length, 0);
    assert.equal(h.queue.length, 1);
    h.flush();
    assert.deepEqual(h.calls, [{ channelId, messageId: privateMessage.id, receiver: h.dependencies }]);
});

test("private and server context cannot be swapped before native read handoff", () => {
    const h = harness();
    h.controller.handle(event());
    h.current = { ...h.current!, scope: "dm", guildId: undefined };
    h.flush();
    assert.equal(h.calls.length, 0);
});

test("an invalid scope or a private context carrying a guild stays native", () => {
    for (const context of [{ scope: "dm", guildId }, { scope: "unknown", guildId }, { scope: "guild", guildId: undefined }]) {
        const h = harness();
        h.current = { ...h.current!, ...context } as AutoReadContext;
        h.controller.handle(event());
        h.flush();
        assert.equal(h.calls.length, 0);
    }
});

test("duplicates before and after native handoff cannot launch another local attempt", () => {
    const h = harness();
    const input = event();
    h.controller.handle(input);
    h.controller.handle(input);
    assert.equal(h.queue.length, 1);
    h.flush();
    h.controller.handle(input);
    h.flush();
    assert.equal(h.calls.length, 1);
});

test("an unavailable root decision performs no scheduling or native action", () => {
    const h = harness();
    h.current = undefined;
    h.controller.handle(event());
    assert.equal(h.queue.length, 0);
    assert.equal(h.calls.length, 0);
});

test("account, server and channel changes before handoff cancel the queued decision", () => {
    for (const replacement of [
        { accountId: otherAccount }, { channelId: "200000000000000002" }, { guildId: "300000000000000002" }
    ]) {
        const h = harness();
        h.controller.handle(event());
        h.current = { ...h.current!, ...replacement };
        h.flush();
        assert.equal(h.calls.length, 0);
    }
});

test("mutating a shared native context cannot rebind an earlier account decision", () => {
    const h = harness();
    h.controller.handle(event());
    h.current!.accountId = otherAccount;
    h.flush();
    assert.equal(h.calls.length, 0);
});

test("disabled, paused, unmuted, incompatible or denied root decisions cancel before dispatch", () => {
    const h = harness();
    h.controller.handle(event());
    h.current = undefined;
    h.flush();
    assert.equal(h.calls.length, 0);
});

test("a changed event target or author is never applied to its replacement", () => {
    for (const change of [
        (input: ReturnType<typeof event>) => { input.message.id = snowflake(start + 2); },
        (input: ReturnType<typeof event>) => { input.channelId = "200000000000000002"; input.message.channel_id = input.channelId; },
        (input: ReturnType<typeof event>) => { input.message.author.id = "400000000000000002"; }
    ]) {
        const h = harness();
        const input = event();
        h.controller.handle(input);
        change(input);
        h.flush();
        assert.equal(h.calls.length, 0);
    }
});

test("a newer channel message or ACK watermark keeps the older candidate untouched", () => {
    for (const replacement of [
        { lastMessageId: snowflake(start + 2) }, { ackMessageId: event().message.id }, { ackMessageId: snowflake(start + 2) }
    ]) {
        const h = harness();
        h.controller.handle(event());
        h.current = { ...h.current!, ...replacement };
        h.flush();
        assert.equal(h.calls.length, 0);
    }
});

test("initially read, stale, mismatched or malformed native context is not scheduled", () => {
    for (const replacement of [
        { lastMessageId: undefined }, { lastMessageId: snowflake(start + 2) }, { ackMessageId: event().message.id },
        { ackMessageId: "bad" }, { accountId: "bad" }, { guildId: "bad" }, { channelId: "200000000000000002" }
    ]) {
        const h = harness();
        h.current = { ...h.current!, ...replacement };
        h.controller.handle(event());
        assert.equal(h.queue.length, 0);
    }
});

test("a null native ACK watermark allows only the exact fresh latest message", () => {
    const h = harness();
    h.current = { ...h.current!, ackMessageId: null };
    h.controller.handle(event());
    h.flush();
    assert.equal(h.calls.length, 1);
});

test("optimistic, push, explicit replay, edited and unsent events remain untouched", () => {
    const variants: unknown[] = [
        { ...event(), type: "MESSAGE_UPDATE" }, { ...event(), optimistic: true }, { ...event(), isPushNotification: true },
        { ...event(), isReplay: true }, { ...event(), replayed: true },
        { ...event(), message: { ...event().message, edited_timestamp: "2026-10-26T00:00:00.001Z" } },
        { ...event(), message: { ...event().message, state: "SENDING" } },
        { ...event(), message: { ...event().message, state: "SEND_FAILED" } },
        { ...event(), message: { ...event().message, type: 21 } },
        { ...event(), message: { ...event().message, author: { id: accountId } } },
        null, [], {}, { ...event(), channelId: "bad" }, { ...event(), message: { ...event().message, id: 123 } }
    ];
    for (const input of variants) {
        const h = harness();
        h.controller.handle(input);
        h.flush();
        assert.equal(h.calls.length, 0);
    }
});

test("historical, activation-time and future messages cannot turn a replay into an ACK", () => {
    for (const time of [start - 1000, start, start + 1001]) {
        const h = harness();
        const input = event(time);
        h.current = { ...h.current!, lastMessageId: input.message.id };
        h.controller.handle(input);
        h.flush();
        assert.equal(h.calls.length, 0);
    }
});

test("reset cancels queued callbacks and rejects messages from before the new activation", () => {
    const h = harness();
    h.controller.handle(event());
    h.controller.reset();
    h.flush();
    assert.equal(h.calls.length, 0);
    h.controller.handle(event());
    h.flush();
    assert.equal(h.calls.length, 0);
    const fresh = event(start + 1001);
    h.clock = start + 2000;
    h.current = { ...h.current!, lastMessageId: fresh.message.id };
    h.controller.handle(fresh);
    h.flush();
    assert.equal(h.calls.length, 1);
});

test("native dispatch rejection is reported once with no local replay or retry", async () => {
    const h = harness();
    let attempts = 0;
    h.dependencies.ack = () => { attempts++; return Promise.reject(new Error("Synthetic dispatch rejection")); };
    h.controller.handle(event());
    h.flush();
    await Promise.resolve();
    h.controller.handle(event());
    h.flush();
    assert.equal(attempts, 1);
    assert.equal(h.errors, 1);
});

test("synchronous native or scheduling errors are contained without retry", () => {
    for (const stage of ["context", "defer", "ack"] as const) {
        const h = harness();
        h.dependencies[stage] = () => { throw new Error("Synthetic boundary failure"); };
        assert.doesNotThrow(() => h.controller.handle(event()));
        assert.doesNotThrow(() => h.flush());
        assert.equal(h.errors, 1);
        if (stage !== "context") {
            h.controller.handle(event());
            h.flush();
            assert.equal(h.errors, 1);
        }
    }
});

test("throwing external getters and error reporters cannot escape into the native event", () => {
    const h = harness();
    h.dependencies.onError = () => { throw new Error("Broken observer"); };
    const input = Object.defineProperty({}, "type", { get() { throw new Error("Unknown getter"); } });
    assert.doesNotThrow(() => h.controller.handle(input));
    assert.equal(h.calls.length, 0);
});

test("attempt memory stays bounded while the native ACK watermark still prevents old actions", () => {
    const h = harness();
    for (let index = 0; index < 513; index++) {
        const input = event(start + 1, index);
        h.current = { ...h.current!, lastMessageId: input.message.id };
        h.controller.handle(input);
    }
    const first = event();
    h.current = { ...h.current!, lastMessageId: first.message.id };
    h.controller.handle(first);
    assert.equal(h.queue.length, 514);
    h.dependencies.ack = (channel, message) => {
        h.calls.push({ channelId: channel, messageId: message, receiver: h.dependencies });
        h.current = { ...h.current!, ackMessageId: message };
        return Promise.resolve();
    };
    h.flush();
    assert.equal(h.calls.length, 1);
});
