/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { BindingState, matchesTarget } from "@plugins/mentionControl/compatibility";
const environment = { RELEASE_CHANNEL: "stable", BUILD_NUMBER: "649389", VERSION_HASH: "a4e81a1fff2ccc1e9c47281017039f16f16b2664" };

test("compatibility accepts only the inspected channel, build representation and version hash", () => {
    assert.equal(matchesTarget(environment), true);
    for (const changed of [
        { ...environment, RELEASE_CHANNEL: "canary" },
        { ...environment, BUILD_NUMBER: "649390" },
        { ...environment, BUILD_NUMBER: 649389 },
        { ...environment, VERSION_HASH: "different" },
        { RELEASE_CHANNEL: "stable", BUILD_NUMBER: "649389" },
        null, undefined, true, "stable", [], 649389
    ]) assert.equal(matchesTarget(changed), false);
    assert.equal(matchesTarget(Object.defineProperty({}, "RELEASE_CHANNEL", { get() { throw new Error("Untrusted getter"); } })), false);
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    assert.equal(matchesTarget(revoked.proxy), false);
});

function module(loaded = false) {
    return { id: 592329, exports: {}, loaded };
}

test("separate audited module bindings cannot approve each other's cached exports", () => {
    const notifications = new BindingState();
    const badges = new BindingState(242816);
    const cached = { id: 242816, exports: {}, loaded: true };
    assert.equal(notifications.markReady(242816, cached), false);
    assert.equal(badges.markReady(242816, cached), true);
    assert.equal(badges.state(true, cached), "ready");
    assert.equal(notifications.state(true, cached), "incompatible");
});

test("a lazy binding requires the marked module and its successful loaded state", () => {
    const binding = new BindingState();
    const cached = module();
    assert.equal(binding.state(true, undefined), "pending");
    assert.equal(binding.state(true, cached), "pending");
    assert.equal(binding.markReady(592329, cached), true);
    assert.equal(binding.state(true, cached), "pending");
    cached.loaded = true;
    assert.equal(binding.state(true, cached), "ready");
    assert.equal(binding.markReady("592329", cached), false);
});

test("markers reject foreign IDs, missing module shape and invalid exports without creating readiness", () => {
    const binding = new BindingState();
    const cached = module(true);
    for (const wrong of [undefined, null, true, {}, 1, "1", " 592329 ", "0592329", Symbol("factory")]) assert.equal(binding.markReady(wrong, cached), false);
    for (const invalid of [undefined, null, true, [], {}, { ...cached, id: 42 }, { ...cached, exports: undefined }, { ...cached, exports: null }, { ...cached, exports: [] }, { ...cached, exports: "value" }, { ...cached, loaded: "true" }]) assert.equal(binding.markReady(592329, invalid), false);
    assert.equal(binding.state(true, cached), "incompatible");
});

test("a loaded unmarked or replaced cached module stays incompatible and exact target checks remain required", () => {
    const binding = new BindingState();
    const cached = module(true);
    assert.equal(binding.state(true, cached), "incompatible");
    assert.equal(binding.state(false, undefined), "incompatible");
    assert.equal(binding.markReady("592329", cached), true);
    assert.equal(binding.state(false, cached), "incompatible");
    assert.equal(binding.state(true, cached), "ready");
    assert.equal(binding.state(true, { ...cached }), "incompatible");
    const replacement = module(true);
    assert.equal(binding.state(true, replacement), "incompatible");
    assert.equal(binding.markReady(592329, replacement), true);
    assert.equal(binding.state(true, replacement), "ready");
    assert.equal(binding.state(true, cached), "incompatible");
});

test("duplicate factory registrations retain a proven loaded cached module and exports", () => {
    const binding = new BindingState();
    const cached = module(true);
    binding.markReady(592329, cached);
    for (const id of [592329, "592329", 42, "42", Symbol("unrelated")]) assert.equal(binding.invalidate(id, cached), false);
    assert.equal(binding.state(true, cached), "ready");
});

test("cache eviction, an unloaded cache or replacement invalidates the old identity conservatively", () => {
    for (const changed of [undefined, null, module(), module(true)]) {
        const binding = new BindingState();
        const cached = module(true);
        binding.markReady(592329, cached);
        assert.equal(binding.invalidate(42, changed), false);
        assert.equal(binding.invalidate(592329, changed), true);
        assert.notEqual(binding.state(true, changed), "ready");
        assert.equal(binding.state(true, cached), "incompatible");
        assert.equal(binding.invalidate(592329, changed), false);
        assert.equal(binding.markReady(592329, cached), true);
        assert.equal(binding.state(true, cached), "ready");
    }
});

test("mutating exports or loaded state cannot retain stale readiness", () => {
    const binding = new BindingState();
    const cached = module(true);
    binding.markReady(592329, cached);
    cached.exports = {};
    assert.equal(binding.state(true, cached), "incompatible");
    assert.equal(binding.invalidate(592329, cached), true);
    assert.equal(binding.markReady(592329, cached), true);
    cached.loaded = false;
    assert.equal(binding.state(true, cached), "pending");
    assert.equal(binding.invalidate(592329, cached), true);
    cached.loaded = true;
    assert.equal(binding.state(true, cached), "incompatible");
});

test("hostile cached module getters fail conservatively without throwing", () => {
    const binding = new BindingState();
    const cached = module(true);
    binding.markReady(592329, cached);
    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    const throwing = Object.defineProperty({}, "loaded", { get() { throw new Error("Untrusted getter"); } });
    for (const invalid of [revoked.proxy, throwing]) {
        assert.doesNotThrow(() => {
            assert.equal(binding.markReady(592329, invalid), false);
            assert.notEqual(binding.state(true, invalid), "ready");
        });
    }
    assert.equal(binding.invalidate(592329, throwing), true);
});
