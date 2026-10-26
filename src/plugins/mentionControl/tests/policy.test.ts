/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { MentionContext, shouldSuppress } from "@plugins/mentionControl/policy";
import { defaultOptions, Options } from "@plugins/mentionControl/preferences";

const accountId = "100000000000000001";
const otherId = "100000000000000002";
const channelId = "200000000000000001";
const guildId = "400000000000000001";
const roleId = "500000000000000001";
const otherRoleId = "500000000000000002";
const parentId = "300000000000000002";
const context: MentionContext = { scope: "guild", accountId, channelId, guildId, ownRoleIds: [roleId], suppressEveryone: false, suppressRoles: false };
const choices = (everyone = false, personal = false, roles = false): Options => ({
    paused: false, suppressEveryone: everyone, suppressPersonal: personal, suppressDirectMessages: false, suppressReplies: false, suppressRoles: roles
});
const raw = (everyone = false, personal = false, role = false) => ({
    id: "300000000000000001", channel_id: channelId, guild_id: guildId,
    mention_everyone: everyone,
    mentions: personal ? [{ id: accountId, username: "Synthetic" }] : [],
    mention_roles: role ? [roleId] : []
});
const specimens = [raw(true), raw(false, true), raw(false, false, true), raw(true, true), raw(true, false, true), raw(false, true, true), raw(true, true, true)];

// Hand-derived expectations: broad, personal, role, broad+personal, broad+role, personal+role, all.
const matrix: { name: string; options: Options; expected: readonly boolean[]; }[] = [
    { name: "native", options: choices(), expected: [false, false, false, false, false, false, false] },
    { name: "broad", options: choices(true), expected: [true, false, false, false, false, false, false] },
    { name: "personal", options: choices(false, true), expected: [false, true, false, false, false, false, false] },
    { name: "roles", options: choices(false, false, true), expected: [false, false, true, false, false, false, false] },
    { name: "broad+personal", options: choices(true, true), expected: [true, true, false, true, false, false, false] },
    { name: "broad+roles", options: choices(true, false, true), expected: [true, false, true, false, true, false, false] },
    { name: "personal+roles", options: choices(false, true, true), expected: [false, true, true, false, false, true, false] },
    { name: "all", options: choices(true, true, true), expected: [true, true, true, true, true, true, true] }
];

for (const row of matrix) {
    test(`${row.name} switches preserve an independently permitted applicable mention`, () => {
        for (let index = 0; index < specimens.length; index++)
            assert.equal(shouldSuppress(specimens[index], context, row.options), row.expected[index], `scenario ${index}`);
        assert.equal(shouldSuppress(raw(), context, row.options), false);
    });
}

test("an enabled category cannot rescue a blocked mention when Discord suppresses that category", () => {
    const personalBlocked = { ...defaultOptions(), suppressPersonal: true };
    assert.equal(shouldSuppress(raw(true, true), { ...context, suppressEveryone: true }, personalBlocked), true);
    assert.equal(shouldSuppress(raw(false, true, true), { ...context, suppressRoles: true }, personalBlocked), true);
    assert.equal(shouldSuppress(raw(true, true), context, personalBlocked), false);
    assert.equal(shouldSuppress(raw(false, true, true), context, personalBlocked), false);
    assert.equal(shouldSuppress(raw(true), { ...context, suppressEveryone: true }, defaultOptions()), false);
});

test("paused filtering never suppresses even when every mention category is selected", () => {
    const options = { ...choices(true, true, true), paused: true, suppressReplies: true };
    for (const message of specimens) assert.equal(shouldSuppress(message, context, options), false);
});

test("MessageRecord ID arrays and raw user objects classify the same personal target", () => {
    const options = { ...defaultOptions(), suppressPersonal: true };
    assert.equal(shouldSuppress({ ...raw(), mentions: [accountId] }, context, options), true);
    assert.equal(shouldSuppress(raw(false, true), context, options), true);
    assert.equal(shouldSuppress({ ...raw(), mentions: [otherId] }, context, options), false);
    assert.equal(shouldSuppress({ ...raw(), mentions: [{ id: otherId, username: accountId }] }, context, options), false);
});

test("another user's tag or unrelated role never rescues a blocked broad mention", () => {
    const message = { ...raw(true), mentions: [{ id: otherId }], mention_roles: [otherRoleId] };
    assert.equal(shouldSuppress(message, context, { ...defaultOptions(), suppressEveryone: true }), true);
    assert.equal(shouldSuppress({ ...raw(), mention_roles: [otherRoleId] }, context, { ...defaultOptions(), suppressRoles: true }), false);
});

test("unknown role membership keeps native behavior only when role data needs membership", () => {
    const unknownMembership = { ...context, ownRoleIds: undefined };
    const options = { ...defaultOptions(), suppressEveryone: true, suppressRoles: true };
    assert.equal(shouldSuppress(raw(true, false, true), unknownMembership, options), false);
    assert.equal(shouldSuppress(raw(true), unknownMembership, options), true);
    assert.equal(shouldSuppress(raw(false, false, true), { ...context, ownRoleIds: [] }, options), false);
});

test("display text and username substrings cannot create an applicable mention", () => {
    const options = { ...choices(true, true, true), suppressReplies: true };
    for (const content of ["@everyone", "@here", `<@${accountId}>`, `\\<@${accountId}>`, "`@everyone`", "@Synthetic"])
        assert.equal(shouldSuppress({ ...raw(), content }, context, options), false);
});

test("the All Messages policy vetoes a blocked targeted mention while retaining ordinary messages", () => {
    const options = { ...defaultOptions(), suppressEveryone: true };
    assert.equal(shouldSuppress({ ...raw(true), allMessages: true }, context, options), true);
    assert.equal(shouldSuppress({ ...raw(), allMessages: true }, context, options), false);
});

test("malformed or mismatched message metadata stays native", () => {
    const options = { ...choices(true, true, true), suppressReplies: true };
    const malformed: unknown[] = [
        null, [], "message", { ...raw(true), id: "invalid" }, { ...raw(true), channel_id: "200000000000000002" },
        { ...raw(true), guild_id: "400000000000000002" }, { ...raw(true), guild_id: null },
        { ...raw(true), mention_everyone: "true" }, { ...raw(true), mentions: undefined },
        { ...raw(true), mentions: [accountId, { id: accountId }] }, { ...raw(true), mentions: [{ id: 123 }] },
        { ...raw(true), mentions: [null] }, { ...raw(true), mention_roles: undefined },
        { ...raw(true), mention_roles: [123] }, { ...raw(true), mention_roles: ["invalid"] }
    ];
    for (const message of malformed) assert.equal(shouldSuppress(message, context, options), false);
    assert.equal(shouldSuppress({ ...raw(true), guild_id: undefined }, context, options), true);
});

test("missing account, channel or guild context stays native", () => {
    const options = { ...defaultOptions(), suppressEveryone: true };
    for (const changed of [{ accountId: "" }, { channelId: "" }, { guildId: "" }])
        assert.equal(shouldSuppress(raw(true), { ...context, ...changed }, options), false);
});

test("frozen input objects remain identical after repeated classification", () => {
    const mentions = Object.freeze([Object.freeze({ id: accountId })]);
    const roles = Object.freeze([roleId]);
    const message = Object.freeze({ ...raw(true), mentions, mention_roles: roles });
    const ownRoleIds = Object.freeze([roleId]);
    const frozenContext = Object.freeze({ ...context, ownRoleIds });
    const options = Object.freeze({ ...choices(true, true, true), suppressReplies: true });
    const before = JSON.stringify({ message, frozenContext, options });
    for (let index = 0; index < 100; index++) assert.equal(shouldSuppress(message, frozenContext, options), true);
    assert.equal(JSON.stringify({ message, frozenContext, options }), before);
    assert.equal(message.mentions, mentions);
    assert.equal(message.mention_roles, roles);
});

test("unexpected property access errors fail closed to the native path", () => {
    const message = { get id() { throw new Error("Synthetic metadata failure"); } };
    assert.equal(shouldSuppress(message, context, { ...defaultOptions(), suppressEveryone: true }), false);
});

const reply = (authorId = accountId) => ({
    ...raw(false, true), type: 19,
    message_reference: { type: 0, channel_id: channelId, message_id: parentId, guild_id: guildId },
    referenced_message: { id: parentId, channel_id: channelId, guild_id: guildId, author: { id: authorId } }
});

for (const row of [
    { personal: false, replies: false, expected: [false, false, false] },
    { personal: true, replies: false, expected: [true, false, true] },
    { personal: false, replies: true, expected: [false, true, false] },
    { personal: true, replies: true, expected: [true, true, true] }
]) {
    test(`personal ${row.personal}, replies ${row.replies}: reply-to-me is independent from other personal targets`, () => {
        const options = { ...defaultOptions(), suppressPersonal: row.personal, suppressReplies: row.replies };
        assert.equal(shouldSuppress(raw(false, true), context, options), row.expected[0]);
        assert.equal(shouldSuppress(reply(), context, options), row.expected[1]);
        assert.equal(shouldSuppress(reply(otherId), context, options), row.expected[2]);
    });
}

test("an explicit tag inside a known reply to me remains in the contextual reply category", () => {
    const message = { ...reply(), content: `<@${accountId}> explicit tag` };
    assert.equal(shouldSuppress(message, context, { ...defaultOptions(), suppressReplies: true }), true);
    assert.equal(shouldSuppress(message, context, { ...defaultOptions(), suppressPersonal: true }), false);
});

test("a validated local cached reply author supports raw and MessageRecord reference aliases", () => {
    const message = { ...raw(false, true), type: 19, message_reference: { channel_id: channelId, message_id: parentId } };
    const options = { ...defaultOptions(), suppressReplies: true };
    assert.equal(shouldSuppress(message, { ...context, cachedReplyAuthorId: accountId }, options), true);
    const record = { ...raw(), mentions: [accountId], type: 19, messageReference: message.message_reference };
    assert.equal(shouldSuppress(record, { ...context, cachedReplyAuthorId: accountId }, options), true);
    assert.equal(shouldSuppress(message, { ...context, cachedReplyAuthorId: otherId }, options), false);
});

test("unknown or deleted reply parents stay native when personal and reply settings differ", () => {
    const unknown = { ...raw(false, true), type: 19, message_reference: { channel_id: channelId, message_id: parentId } };
    const deleted = { ...unknown, referenced_message: null };
    const unknownReference = { ...raw(false, true), type: 19 };
    for (const message of [unknown, deleted, unknownReference]) {
        assert.equal(shouldSuppress(message, context, { ...defaultOptions(), suppressPersonal: true }), false);
        assert.equal(shouldSuppress(message, context, { ...defaultOptions(), suppressReplies: true }), false);
        assert.equal(shouldSuppress(message, context, { ...defaultOptions(), suppressPersonal: true, suppressReplies: true }), true);
        assert.equal(shouldSuppress(message, context, defaultOptions()), false);
    }
    assert.equal(shouldSuppress(deleted, { ...context, cachedReplyAuthorId: accountId }, { ...defaultOptions(), suppressReplies: true }), false);
});

test("reference and embedded reply target mismatches keep native behavior even when both settings are selected", () => {
    const options = { ...defaultOptions(), suppressPersonal: true, suppressReplies: true };
    const original = reply();
    const malformed = [
        { ...original, message_reference: { ...original.message_reference, channel_id: "200000000000000002" } },
        { ...original, message_reference: { ...original.message_reference, guild_id: otherId } },
        { ...original, message_reference: { ...original.message_reference, message_id: "invalid" } },
        { ...original, referenced_message: { ...original.referenced_message, id: "300000000000000003" } },
        { ...original, referenced_message: { ...original.referenced_message, channel_id: "200000000000000002" } },
        { ...original, referenced_message: { ...original.referenced_message, guild_id: otherId } },
        { ...original, referenced_message: { ...original.referenced_message, author: { id: "invalid" } } },
        { ...original, messageReference: { ...original.message_reference, message_id: "300000000000000003" } },
        { ...original, referenced_message: "invalid" }
    ];
    for (const message of malformed) assert.equal(shouldSuppress(message, context, options), false);
    assert.equal(shouldSuppress(original, { ...context, cachedReplyAuthorId: otherId }, options), false);
});

test("unpinged replies do not create personal or reply alerts", () => {
    const message = { ...reply(), mentions: [] };
    assert.equal(shouldSuppress(message, context, { ...defaultOptions(), suppressReplies: true }), false);
    assert.equal(shouldSuppress({ ...message, mention_everyone: true }, context, { ...defaultOptions(), suppressEveryone: true, suppressReplies: true }), true);
});

test("forwards remain direct personal targets and thread-starter messages stay native", () => {
    const forwarded = { ...raw(false, true), type: 0, message_reference: { type: 1, channel_id: channelId, message_id: parentId } };
    assert.equal(shouldSuppress(forwarded, { ...context, cachedReplyAuthorId: accountId }, { ...defaultOptions(), suppressReplies: true }), false);
    assert.equal(shouldSuppress(forwarded, context, { ...defaultOptions(), suppressPersonal: true }), true);
    assert.equal(shouldSuppress({ ...raw(true, true, true), type: 21 }, context, { ...choices(true, true, true), suppressReplies: true }), false);
});

test("reply categories preserve broad and native role ceiling rules for mixed messages", () => {
    const message = { ...reply(), mention_everyone: true, mention_roles: [roleId] };
    const options = { ...defaultOptions(), suppressReplies: true };
    assert.equal(shouldSuppress(message, context, options), false);
    assert.equal(shouldSuppress(message, { ...context, suppressEveryone: true, suppressRoles: true }, options), true);
    assert.equal(shouldSuppress(message, context, { ...options, suppressEveryone: true, suppressRoles: true }), true);
});

test("private message selection never changes server category classification", () => {
    for (const message of [...specimens, reply()]) {
        assert.equal(shouldSuppress(message, context, { ...defaultOptions(), suppressDirectMessages: true }), false);
        const normal = shouldSuppress(message, context, { ...defaultOptions(), suppressEveryone: true, suppressReplies: true });
        assert.equal(shouldSuppress(message, context, { ...defaultOptions(), suppressEveryone: true, suppressReplies: true, suppressDirectMessages: true }), normal);
    }
});

const privateContext: MentionContext = { scope: "dm", accountId, channelId, guildId: undefined, ownRoleIds: [], suppressEveryone: false, suppressRoles: false };
const privateMessage = () => ({ id: "300000000000000001", channel_id: channelId, type: 0, author: { id: otherId }, mention_everyone: false, mentions: [], mention_roles: [] });

test("the private-message switch owns ordinary, attachment and pinged DM messages independently", () => {
    const selected = { ...defaultOptions(), suppressDirectMessages: true };
    for (const data of [privateMessage(), { ...privateMessage(), attachments: [{}] }, { ...privateMessage(), mentions: [{ id: accountId }] },
        { ...privateMessage(), type: 19, message_reference: { message_id: parentId, channel_id: channelId } }]) {
        assert.equal(shouldSuppress(data, privateContext, selected), true);
        assert.equal(shouldSuppress(data, privateContext, { ...choices(true, true, true), suppressReplies: true }), false);
    }
    assert.equal(shouldSuppress(privateMessage(), privateContext, { ...selected, paused: true }), false);
    assert.equal(shouldSuppress(privateMessage(), privateContext, defaultOptions()), false);
});

test("private-message classification needs no mention or reply-parent metadata", () => {
    const selected = { ...defaultOptions(), suppressDirectMessages: true };
    const message = Object.freeze({ id: "300000000000000001", channel_id: channelId, type: 19, author: Object.freeze({ id: otherId }), referenced_message: null });
    const before = JSON.stringify(message);
    assert.equal(shouldSuppress(message, privateContext, selected), true);
    assert.equal(shouldSuppress({ ...message, guild_id: null }, privateContext, selected), true);
    assert.equal(JSON.stringify(message), before);
});

test("self-authored, missing-author or foreign-guild private messages keep native behavior", () => {
    const selected = { ...defaultOptions(), suppressDirectMessages: true };
    for (const data of [
        { ...privateMessage(), author: { id: accountId } }, { ...privateMessage(), author: undefined },
        { ...privateMessage(), author: { id: "invalid" } }, { ...privateMessage(), guild_id: guildId },
        { ...privateMessage(), channel_id: "200000000000000002" }, { ...privateMessage(), id: "invalid" },
        { ...privateMessage(), type: 21 }
    ]) assert.equal(shouldSuppress(data, privateContext, selected), false);
});

test("a forged private context cannot cross a server or use server suppression state", () => {
    const selected = { ...defaultOptions(), suppressDirectMessages: true };
    for (const changed of [
        { guildId }, { accountId: "invalid" }, { channelId: "invalid" }, { suppressEveryone: true }, { suppressRoles: true }, { ownRoleIds: [roleId] }
    ]) assert.equal(shouldSuppress(privateMessage(), { ...privateContext, ...changed }, selected), false);
    assert.equal(Reflect.apply(shouldSuppress, undefined, [privateMessage(), { ...privateContext, scope: "unknown" }, selected]), false);
    assert.equal(Reflect.apply(shouldSuppress, undefined, [raw(true), { ...context, scope: undefined }, choices(true)]), false);
});
