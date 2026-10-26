/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { ContextReaders, readContext } from "@plugins/mentionControl/context";

const accountId = "100000000000000001";
const channelId = "200000000000000001";
const guildId = "300000000000000001";
const roleId = "400000000000000001";
const otherId = "100000000000000002";

function privateChannel(type = 1) {
    return {
        id: channelId, type, recipients: [otherId], isMessageRequest: false, isSpam: false, safetyWarnings: [],
        isSystemDM() { return false; },
        isThread() { return false; }
    };
}

const privateMessage = () => ({ channel_id: channelId, type: 0, author: { id: otherId } });

function readers(): ContextReaders {
    return {
        accountId: () => accountId,
        channel: () => ({ id: channelId, type: 0, guild_id: guildId, isThread() { return false; } }),
        roles: () => [roleId],
        suppressEveryone: () => true,
        suppressRoles: () => false
    };
}

test("context captures the current account and exact server channel without mutating metadata", () => {
    const message = Object.freeze({ channel_id: channelId });
    const native = readers();
    const calls: string[][] = [];
    native.roles = (guild, account) => { calls.push([guild, account]); return [roleId]; };
    assert.deepEqual(readContext(message, native), {
        scope: "guild", accountId, channelId, guildId, ownRoleIds: [roleId], suppressEveryone: true, suppressRoles: false
    });
    assert.deepEqual(calls, [[guildId, accountId]]);
    assert.deepEqual(message, { channel_id: channelId });
});

test("untyped private channels, absent channels and mismatched channel or guild contexts remain outside scope", () => {
    const variants: ContextReaders[] = [
        { ...readers(), channel: () => undefined },
        { ...readers(), channel: () => ({ id: channelId, type: 0, isThread() { return false; } }) },
        { ...readers(), channel: () => ({ id: "200000000000000002", type: 0, guild_id: guildId, isThread() { return false; } }) },
        { ...readers(), accountId: () => undefined }
    ];
    for (const native of variants) assert.equal(readContext({ channel_id: channelId }, native), undefined);
    assert.equal(readContext({ channel_id: channelId, guild_id: "300000000000000002" }, readers()), undefined);
    for (const invalid of [null, [], {}, { channel_id: 12 }, { channel_id: "invalid" }])
        assert.equal(readContext(invalid, readers()), undefined);
});

test("threads follow their audited suppression branch and retain the channel receiver", () => {
    const channel = { id: channelId, type: 11, guild_id: guildId, marker: true, isThread() { assert.equal(this.marker, true); return true; } };
    const native = readers();
    native.channel = () => channel;
    native.suppressEveryone = () => { throw new Error("Thread branch must not read server suppression"); };
    native.suppressRoles = native.suppressEveryone;
    const context = readContext({ channel_id: channelId }, native);
    assert.ok(context);
    assert.equal(context.suppressEveryone, false);
    assert.equal(context.suppressRoles, false);
});

test("only exact DM and group-DM channel types produce private context without guild-store access", () => {
    for (const type of [1, 3]) {
        const native = readers();
        native.channel = () => ({ ...privateChannel(type), isThread() { throw new Error("Private scope needs no thread lookup"); } });
        native.roles = () => { throw new Error("Private scope needs no guild membership"); };
        native.suppressEveryone = () => { throw new Error("Private scope needs no guild suppression"); };
        native.suppressRoles = native.suppressEveryone;
        assert.deepEqual(readContext(privateMessage(), native), {
            scope: "dm", accountId, channelId, guildId: undefined, ownRoleIds: [], suppressEveryone: false, suppressRoles: false
        });
    }
});

test("private scope rejects foreign guild metadata and unknown channel types", () => {
    for (const type of [0, 2, 5, 11, 99]) {
        const native = { ...readers(), channel: () => ({ id: channelId, type, isThread() { return false; } }) };
        assert.equal(readContext({ channel_id: channelId }, native), undefined);
    }
    const privateReaders = { ...readers(), channel: () => privateChannel() };
    assert.equal(readContext({ ...privateMessage(), guild_id: guildId }, privateReaders), undefined);
    assert.equal(readContext(privateMessage(), { ...privateReaders, channel: () => ({ ...privateChannel(), guild_id: guildId }) }), undefined);
    assert.equal(readContext({ ...privateMessage(), guild_id: null }, privateReaders)?.scope, "dm");
});

test("private scope rechecks account identity before returning its context", () => {
    let account = accountId;
    const native = { ...readers(), accountId: () => account, channel: () => {
        account = "100000000000000002";
        return privateChannel(3);
    } };
    assert.equal(readContext(privateMessage(), native), undefined);
});

test("private context requires an exact non-self author in valid cached recipient IDs", () => {
    for (const type of [1, 3]) {
        for (const recipients of [undefined, [], ["invalid"], [123], [{ id: otherId }], [accountId], ["100000000000000003"]]) {
            const native = { ...readers(), channel: () => ({ ...privateChannel(type), recipients }) };
            assert.equal(Reflect.apply(readContext, undefined, [privateMessage(), native]), undefined);
        }
        const native = { ...readers(), channel: () => privateChannel(type) };
        for (const author of [undefined, null, {}, { id: accountId }, { id: "invalid" }, { id: 123 }])
            assert.equal(readContext({ ...privateMessage(), author }, native), undefined);
    }
});

test("private request, spam, system and safety warning paths keep native context", () => {
    for (const type of [1, 3]) {
        for (const changed of [
            { isMessageRequest: true }, { isMessageRequest: "false" }, { isMessageRequest: null },
            { isSpam: true }, { isSpam: undefined }, { isSpam: "false" },
            { isSystemDM: undefined }, { isSystemDM: () => true }, { isSystemDM: () => undefined },
            { safetyWarnings: [{ type: 1 }] }, { safetyWarnings: "none" }, { safetyWarnings: undefined }, { safetyWarnings: null }
        ]) {
            const native = { ...readers(), channel: () => ({ ...privateChannel(type), ...changed }) };
            assert.equal(Reflect.apply(readContext, undefined, [privateMessage(), native]), undefined);
        }
    }
});

test("native undefined message-request state is ordinary and the system-DM method keeps its receiver", () => {
    const channel = { ...privateChannel(), marker: true, isMessageRequest: undefined, isSystemDM() { assert.equal(this.marker, true); return false; } };
    assert.equal(readContext(privateMessage(), { ...readers(), channel: () => channel })?.scope, "dm");
});

test("server context never reads private recipient, request, system or safety boundaries", () => {
    const native = readers();
    native.channel = () => ({ id: channelId, type: 0, guild_id: guildId, isThread() { return false; },
        get recipients(): readonly string[] { throw new Error("Server scope must not inspect private recipients"); },
        get isMessageRequest(): boolean { throw new Error("Server scope must not inspect private requests"); },
        get isSpam(): boolean { throw new Error("Server scope must not inspect private spam"); },
        get safetyWarnings(): readonly unknown[] { throw new Error("Server scope must not inspect private warnings"); },
        isSystemDM() { throw new Error("Server scope must not inspect system-DM state"); }
    });
    assert.equal(readContext({ channel_id: channelId }, native)?.scope, "guild");
});

test("unknown suppression and malformed role cache preserve the original decision", () => {
    assert.equal(readContext({ channel_id: channelId }, { ...readers(), suppressRoles: () => undefined }), undefined);
    const context = readContext({ channel_id: channelId }, { ...readers(), roles: () => [roleId, 5] });
    assert.ok(context);
    assert.equal(context.ownRoleIds, undefined);
});

test("account changes while reading native context cancel the plugin decision", () => {
    let account = accountId;
    const native = readers();
    native.accountId = () => account;
    native.roles = () => { account = "100000000000000002"; return [roleId]; };
    assert.equal(readContext({ channel_id: channelId }, native), undefined);
});

test("native store errors remain visible to the guarded plugin boundary", () => {
    const error = new Error("native store unavailable");
    assert.throws(() => readContext({ channel_id: channelId }, { ...readers(), roles: () => { throw error; } }), caught => caught === error);
});

test("thread starter system messages keep native parent-channel routing", () => {
    const metadata = { id: "500000000000000001", type: 21, channel_id: channelId, mention_everyone: true, mentions: [], mention_roles: [] };
    assert.equal(readContext(metadata, readers()), undefined);
});

test("cached reply authors are used only for the exact local parent and current account", () => {
    const parentId = "500000000000000002";
    const metadata = { channel_id: channelId, type: 19, message_reference: { channel_id: channelId, message_id: parentId, guild_id: guildId } };
    const native = readers();
    native.referencedMessage = (channel, id) => {
        assert.equal(channel, channelId);
        assert.equal(id, parentId);
        return { id: parentId, channel_id: channelId, author: { id: accountId } };
    };
    assert.equal(readContext(metadata, native)?.cachedReplyAuthorId, accountId);
    native.referencedMessage = () => ({ id: "500000000000000003", channel_id: channelId, author: { id: accountId } });
    assert.equal(readContext(metadata, native)?.cachedReplyAuthorId, undefined);
    native.referencedMessage = () => ({ id: parentId, channel_id: channelId, guild_id: "300000000000000002", author: { id: accountId } });
    assert.equal(readContext(metadata, native)?.cachedReplyAuthorId, undefined);
    native.referencedMessage = () => null;
    assert.equal(readContext(metadata, native)?.cachedReplyAuthorId, undefined);
    let currentAccount = accountId;
    native.accountId = () => currentAccount;
    native.referencedMessage = () => {
        currentAccount = "100000000000000002";
        return { id: parentId, channel_id: channelId, author: { id: accountId } };
    };
    assert.equal(readContext(metadata, native), undefined);
});
