/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { defaultDocument, defaultOptions, getAccountOptions, isSnowflake, readDocument, setAccountOptions } from "@plugins/mentionControl/preferences";

const firstAccount = "100000000000000001";
const secondAccount = "100000000000000002";

test("new documents and new accounts preserve all native notification choices", () => {
    assert.deepEqual(defaultDocument(), { version: 3, language: "en", accounts: {} });
    assert.deepEqual(defaultOptions(), { paused: false, suppressEveryone: false, suppressPersonal: false, suppressDirectMessages: false, suppressReplies: false, suppressRoles: false });
    assert.deepEqual(getAccountOptions(defaultDocument(), firstAccount), defaultOptions());
    const options = defaultOptions();
    options.suppressEveryone = true;
    assert.equal(defaultOptions().suppressEveryone, false);
});

test("account changes and each suppression preference remain independent without mutating saved state", () => {
    const original = defaultDocument();
    const saved = setAccountOptions(original, firstAccount, { ...defaultOptions(), suppressEveryone: true });
    assert.deepEqual(original, defaultDocument());
    assert.deepEqual(getAccountOptions(saved, firstAccount), { ...defaultOptions(), suppressEveryone: true });
    assert.deepEqual(getAccountOptions(saved, secondAccount), defaultOptions());
    const changed = setAccountOptions(saved, secondAccount, { ...defaultOptions(), suppressPersonal: true, suppressRoles: true });
    assert.equal(getAccountOptions(changed, firstAccount).suppressEveryone, true);
    assert.equal(getAccountOptions(changed, secondAccount).suppressEveryone, false);
    const retrieved = getAccountOptions(changed, firstAccount);
    retrieved.suppressRoles = true;
    assert.equal(changed.accounts[firstAccount].suppressRoles, false);
});

test("pause preserves selected preferences and one account cannot overwrite the other", () => {
    const saved = setAccountOptions(defaultDocument(), firstAccount, { ...defaultOptions(), suppressEveryone: true, paused: true });
    const changed = setAccountOptions(saved, firstAccount, { ...getAccountOptions(saved, firstAccount), paused: false });
    assert.equal(changed.accounts[firstAccount].suppressEveryone, true);
    assert.equal(changed.accounts[firstAccount].paused, false);
    assert.deepEqual(getAccountOptions(changed, secondAccount), defaultOptions());
});

test("validated saved documents round-trip and are normalized without sharing input objects", () => {
    const options = { ...defaultOptions(), suppressPersonal: true };
    const input = { version: 3, language: "en", accounts: { [firstAccount]: options } };
    const result = readDocument(input);
    if (!result.ok) throw new Error(result.error);
    assert.equal(result.ok, true);
    assert.deepEqual(result.document, input);
    assert.notEqual(result.document, input);
    assert.notEqual(result.document.accounts[firstAccount], options);
    assert.deepEqual(readDocument(JSON.parse(JSON.stringify(result.document))), result);
});

test("unknown schema, missing fields and non-boolean preferences are rejected without resetting the original", () => {
    const valid = defaultDocument();
    const bad: unknown[] = [
        null, [], "{}", {}, { ...valid, version: 0 }, { ...valid, version: 4 }, { ...valid, version: "3" },
        { ...valid, language: "fr" }, { ...valid, language: undefined }, { ...valid, accounts: null },
        { ...valid, accounts: [] }, { ...valid, extra: true },
        { ...valid, accounts: { invalid: defaultOptions() } },
        { ...valid, accounts: { [firstAccount]: {} } },
        { ...valid, accounts: { [firstAccount]: { ...defaultOptions(), paused: "false" } } },
        { ...valid, accounts: { [firstAccount]: { ...defaultOptions(), suppressPersonal: 1 } } },
        { ...valid, accounts: { [firstAccount]: { ...defaultOptions(), futureSetting: true } } },
        JSON.parse('{"version":1,"language":"ar","accounts":{"__proto__":{}}}')
    ];
    for (const input of bad) {
        const before = JSON.stringify(input);
        const result = readDocument(input);
        assert.equal(result.ok, false);
        if (result.ok) throw new Error("Invalid data unexpectedly accepted.");
        assert.ok(result.error.length > 0);
        assert.equal(JSON.stringify(input), before);
    }
});

test("account writes reject malformed IDs or options and preserve all original settings", () => {
    const original = defaultDocument();
    assert.throws(() => setAccountOptions(original, "invalid", defaultOptions()), /account/i);
    const malformed = { ...defaultOptions(), suppressEveryone: "true" };
    // Exercise the runtime boundary without weakening production types.
    assert.throws(() => Reflect.apply(setAccountOptions, undefined, [original, firstAccount, malformed]), /options/i);
    assert.deepEqual(original, defaultDocument());
});

test("snowflakes use canonical nonzero unsigned 64-bit decimal strings", () => {
    for (const value of ["1", firstAccount, "18446744073709551615"]) assert.equal(isSnowflake(value), true);
    for (const value of ["0", "01", "-1", "1.0", " 1", "1 ", "18446744073709551616", "999999999999999999999999999", 1, null, undefined])
        assert.equal(isSnowflake(value), false);
});

test("a throwing saved-data accessor returns a validation error rather than wiping settings", () => {
    const input = { get version() { throw new Error("Synthetic stored-data failure"); } };
    const result = readDocument(input);
    assert.equal(result.ok, false);
});

test("version 1 preserves old selected types and combined reply consent without enabling private messages", () => {
    const original = Object.freeze({
        version: 1, language: "ar",
        accounts: Object.freeze({
            [firstAccount]: Object.freeze({ paused: true, suppressEveryone: true, suppressPersonal: true, suppressRoles: false }),
            [secondAccount]: Object.freeze({ paused: false, suppressEveryone: false, suppressPersonal: false, suppressRoles: true })
        })
    });
    const before = JSON.stringify(original);
    const result = readDocument(original);
    if (!result.ok) throw new Error(result.error);
    assert.equal(result.document.version, 3);
    assert.equal(result.document.language, "ar");
    assert.deepEqual(getAccountOptions(result.document, firstAccount), {
        paused: true, suppressEveryone: true, suppressPersonal: true, suppressDirectMessages: false, suppressReplies: true, suppressRoles: false
    });
    assert.deepEqual(getAccountOptions(result.document, secondAccount), {
        paused: false, suppressEveryone: false, suppressPersonal: false, suppressDirectMessages: false, suppressReplies: false, suppressRoles: true
    });
    assert.equal(JSON.stringify(original), before);
    assert.notEqual(result.document.accounts, original.accounts);
});

test("version 3 saves private messages independently from server categories for each account", () => {
    const first = setAccountOptions(defaultDocument(), firstAccount, { ...defaultOptions(), suppressReplies: true });
    const changed = setAccountOptions(first, firstAccount, { ...getAccountOptions(first, firstAccount), suppressDirectMessages: true });
    assert.equal(changed.version, 3);
    assert.equal(changed.accounts[firstAccount].suppressPersonal, false);
    assert.equal(changed.accounts[firstAccount].suppressReplies, true);
    assert.equal(changed.accounts[firstAccount].suppressDirectMessages, true);
    assert.equal(first.accounts[firstAccount].suppressDirectMessages, false);
    assert.deepEqual(getAccountOptions(changed, secondAccount), defaultOptions());
});

test("each schema requires exactly its known boolean fields instead of coercing partial or hybrid options", () => {
    const legacy = { paused: false, suppressEveryone: false, suppressPersonal: true, suppressRoles: false };
    const malformed = [
        { version: 1, language: "en", accounts: { [firstAccount]: { ...legacy, suppressReplies: false } } },
        { version: 1, language: "en", accounts: { [firstAccount]: { ...legacy, suppressPersonal: "true" } } },
        { version: 2, language: "en", accounts: { [firstAccount]: legacy } },
        ...Object.keys(defaultOptions()).map(missing => ({
            version: 3, language: "en", accounts: { [firstAccount]: Object.fromEntries(Object.entries(defaultOptions()).filter(([key]) => key !== missing)) }
        }))
    ];
    for (const document of malformed) assert.equal(readDocument(document).ok, false);
    const empty = readDocument({ version: 1, language: "en", accounts: {} });
    if (!empty.ok) throw new Error(empty.error);
    assert.deepEqual(empty.document, defaultDocument());
});

test("prototype-carried settings and account keys cannot bypass saved-data validation", () => {
    const inherited = Object.create({ version: 3, language: "en", accounts: {} });
    const inheritedOptions = Object.create(defaultOptions());
    assert.equal(readDocument(inherited).ok, false);
    assert.equal(readDocument({ version: 3, language: "en", accounts: { [firstAccount]: inheritedOptions } }).ok, false);
    assert.equal(readDocument(JSON.parse('{"version":3,"language":"en","accounts":{"constructor":{}}}')).ok, false);
});

test("version 2 removes retired output switches, preserves server choices and leaves private messages off", () => {
    const options = Object.freeze({ paused: true, suppressEveryone: true, suppressPersonal: false, suppressReplies: true, suppressRoles: false, hideBadges: true, autoRead: false });
    const original = Object.freeze({ version: 2, language: "ar", accounts: Object.freeze({ [firstAccount]: options }) });
    const before = JSON.stringify(original);
    const result = readDocument(original);
    if (!result.ok) throw new Error(result.error);
    assert.deepEqual(result.document, { version: 3, language: "ar", accounts: { [firstAccount]: {
        paused: true, suppressEveryone: true, suppressPersonal: false, suppressDirectMessages: false, suppressReplies: true, suppressRoles: false
    } } });
    assert.equal(JSON.stringify(original), before);
    assert.deepEqual(getAccountOptions(result.document, secondAccount), defaultOptions());
});

test("retired output keys and hybrid legacy schemas never become valid version 3 preferences", () => {
    const legacy2 = { paused: false, suppressEveryone: false, suppressPersonal: true, suppressReplies: false, suppressRoles: true, hideBadges: false, autoRead: true };
    for (const [version, options] of [
        [2, { ...legacy2, suppressDirectMessages: true }],
        [2, { ...legacy2, autoRead: "true" }],
        [3, { ...defaultOptions(), hideBadges: false }],
        [3, { ...defaultOptions(), autoRead: false }],
        [3, legacy2]
    ]) assert.equal(readDocument({ version, language: "en", accounts: { [firstAccount]: options } }).ok, false);
});
