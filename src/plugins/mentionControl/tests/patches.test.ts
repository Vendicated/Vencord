/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

import { BindingState } from "@plugins/mentionControl/compatibility";
import { patches } from "@plugins/mentionControl/patches";
import { canonicalizeMatch } from "@utils/patches";
import { Patch, PatchReplacement } from "@utils/types";
import ts from "typescript";

// Authored fixtures model only the inspected branch shapes. No real Discord bundle is executed.
const pair = "let p=(0,O.lx)(a,c,!ed),T=F.A.getNotifyMessagesInSelectedChannel()&&(0,O.kY)(a,c);if(!p&&!T)return!1;";
const fixture = `0,function(m,x,r){"use strict";var O=r(176154),F=r(803224),J=r(479975),K=r(652215);class Store{static displayName="NotificationStore"}let store={MESSAGE_CREATE:function(e){let{channelId:c,message:a,optimistic:b}=e;if(b)return!1;deps.pre(this,a);let ed=deps.focused;${pair}if(T&&(J.A.playNotificationSound("message3",.4),!ed)||!p)return!1;let q=deps.sound,s="message1",v=.4;if(F.A.getDesktopType()===K.nRU.NEVER)return q&&J.A.playNotificationSound(s,v),!1;J.A.showNotification("icon","title","body",{type:"MESSAGE_CREATE"},{sound:q?s:void 0,volume:v,onClick(){}}).then(e=>{deps.after(e)});},MESSAGE_ACK:function(e){deps.ack(e);return!1},VOICE_STATE:function(){deps.voice()}};x.store=store;x.factoryThis=this;deps.initialize();}`;

function apply(source: string, list: readonly Omit<Patch, "plugin">[] = patches, self = "PLUGIN"): string {
    let code = source;
    for (const patch of list) {
        const find = canonicalizeMatch(patch.find);
        if (typeof find === "string" ? !source.includes(find) : !find.test(source)) continue;
        const previous = code;
        for (const replacement of Array.isArray(patch.replacement) ? patch.replacement : [patch.replacement]) {
            const match = canonicalizeMatch(replacement.match);
            const next = code.replace(match, replacement.replace as (substring: string, ...args: string[]) => string);
            if (next === code && patch.group) { code = previous; break; }
            code = next;
        }
    }
    return code.replaceAll("$self", self);
}

function callable(value: unknown): (...args: unknown[]) => unknown {
    assert.equal(typeof value, "function");
    return value as (...args: unknown[]) => unknown;
}

function object(value: unknown): Record<string, unknown> {
    assert.ok(value !== null && typeof value === "object");
    return value as Record<string, unknown>;
}

function harness() {
    const binding = new BindingState();
    const message = { id: "300000000000000001", channel_id: "200000000000000001" };
    const event = { channelId: message.channel_id, message, optimistic: false };
    const sequence: string[] = [];
    const calls = { popups: 0, sounds: [] as unknown[][], popupArgs: [] as unknown[], filters: [] as unknown[], nativeArgs: [] as unknown[][], normalThis: undefined as unknown, selectedThis: undefined as unknown, preferenceThis: undefined as unknown, popupThis: undefined as unknown, handlerThis: undefined as unknown, a11y: 0, acks: 0, voice: 0, after: 0, promiseThis: undefined as unknown };
    let blocked = false;
    let normal = true;
    let selected = false;
    let selectedPreference = true;
    let desktop = "ALL";
    let sound = true;
    let focused = true;
    let readyTarget = true;
    let cachedModule: unknown;
    let fault: "normal" | "selected" | "initialize" | undefined;
    const nativeError = new Error("Synthetic native failure");
    const nativePromise = { then(this: unknown, callback: (value: unknown) => void) { calls.promiseThis = this; callback(null); } };
    const preferences = {
        getNotifyMessagesInSelectedChannel() { sequence.push("preference"); calls.preferenceThis = this; return selectedPreference; },
        getDesktopType() { return desktop; }
    };
    const notifications = {
        playNotificationSound(...args: unknown[]) { sequence.push("sound"); calls.sounds.push(args); },
        showNotification(...args: unknown[]) { sequence.push("popup"); calls.popups++; calls.popupThis = this; calls.popupArgs = args; return nativePromise; }
    };
    const PLUGIN = {
        markReady(moduleId: unknown, module: unknown) { assert.equal(module, cachedModule); binding.markReady(moduleId, module); },
        shouldSuppress(value: unknown) { sequence.push("filter"); calls.filters.push(value); return binding.state(readyTarget, cachedModule) === "ready" && blocked; }
    };
    const ONEPING = { isPrivateChannelRead: () => false };
    const deps = {
        get focused() { return focused; }, get sound() { return sound; },
        pre(receiver: unknown, original: unknown) { sequence.push("a11y"); calls.handlerThis = receiver; assert.equal(original, message); calls.a11y++; },
        ack() { calls.acks++; }, voice() { calls.voice++; }, after() { calls.after++; },
        initialize() { if (fault === "initialize") throw nativeError; }
    };
    function imports(id: number): unknown {
        switch (id) {
            case 176154: return {
                lx: function (this: unknown, ...args: unknown[]) { sequence.push("normal"); calls.normalThis = this; calls.nativeArgs.push(args); if (fault === "normal") throw nativeError; return normal; },
                kY: function (this: unknown, ...args: unknown[]) { sequence.push("selected"); calls.selectedThis = this; calls.nativeArgs.push(args); if (fault === "selected") throw nativeError; return selected; }
            };
            case 803224: return { A: preferences };
            case 479975: return { A: notifications };
            case 652215: return { nRU: { NEVER: "NEVER" } };
            default: throw new Error(`Unexpected synthetic import ${id}`);
        }
    }
    const receiver = { factory: true };
    function load(source = apply(fixture), moduleId: unknown = 592329): Record<string, unknown> {
        const exports: Record<string, unknown> = {};
        const module = { id: moduleId, exports, loaded: false };
        cachedModule = module;
        const factory: unknown = runInNewContext(source, { PLUGIN, ONEPING, deps });
        callable(factory).call(receiver, module, exports, imports);
        module.loaded = true;
        return { ...object(exports.store), factoryThis: exports.factoryThis };
    }
    return { binding, calls, sequence, event, message, nativeError, nativePromise, preferences, notifications, receiver, load,
        cached: () => cachedModule,
        evictCache() { cachedModule = undefined; },
        setBlocked(value: boolean) { blocked = value; },
        setNative(normalValue: boolean, selectedValue = false) { normal = normalValue; selected = selectedValue; },
        setSelectedPreference(value: boolean) { selectedPreference = value; },
        setDesktop(value: string) { desktop = value; },
        setSound(value: boolean) { sound = value; },
        setFocused(value: boolean) { focused = value; },
        setTarget(value: boolean) { readyTarget = value; },
        setFault(value?: typeof fault) { fault = value; }
    };
}

test("paired patch changes the intended factory and fails closed on missing, excess, unrelated or unsupported shapes", () => {
    assert.notEqual(apply(fixture), fixture);
    for (const changed of [
        fixture.replace("NotificationStore", "AnotherStore"),
        fixture.replace("getNotifyMessagesInSelectedChannel", "unsupportedPreference"),
        fixture.replace("(0,O.kY)(a,c)", "(0,O.kY)(a,c,extra)"),
        fixture.replace("let p=(0,O.lx)", "let p=unsupported"),
        fixture.replace("0,function(m,x,r)", "0,()=>"),
        fixture.slice(0, -1) + `function extra(){${pair}}}`,
        fixture.slice(0, -1) + "function extra(){let T=F.A.getNotifyMessagesInSelectedChannel()&&(0,O.kY)(a,c);if(!p&&!T)return!1;}}"
    ]) assert.equal(apply(changed), changed);
    assert.equal(apply("0,function(m,x,r){x.unrelated=42;}"), "0,function(m,x,r){x.unrelated=42;}");
});

test("factory initialization, repeated handler retrieval and unrelated actions launch no notifications", () => {
    const h = harness();
    h.setBlocked(true);
    let store = h.load();
    for (let i = 0; i < 100; i++) store = h.load();
    assert.equal(store.factoryThis, h.receiver);
    assert.equal(h.calls.popups, 0);
    assert.equal(h.calls.sounds.length, 0);
    assert.equal(h.calls.filters.length, 0);
    callable(store.MESSAGE_ACK)(h.event);
    callable(store.VOICE_STATE)();
    assert.equal(h.calls.acks, 1);
    assert.equal(h.calls.voice, 1);
    assert.equal(h.calls.filters.length, 0);
});

test("allowed path keeps native argument identities, unbound receivers, evaluation order and return values", () => {
    const h = harness();
    h.setNative(true, true);
    const store = h.load();
    const receiver = { handler: true };
    assert.equal(callable(store.MESSAGE_CREATE).call(receiver, h.event), undefined);
    assert.equal(h.calls.handlerThis, receiver);
    assert.equal(h.calls.normalThis, undefined);
    assert.equal(h.calls.selectedThis, undefined);
    assert.equal(h.calls.preferenceThis, h.preferences);
    assert.equal(h.calls.popupThis, h.notifications);
    assert.equal(h.calls.promiseThis, h.nativePromise);
    assert.equal(h.calls.nativeArgs[0][0], h.message);
    assert.deepEqual(h.calls.nativeArgs[0], [h.message, h.event.channelId, false]);
    assert.deepEqual(h.calls.nativeArgs[1], [h.message, h.event.channelId]);
    assert.deepEqual(h.calls.filters, [h.message, h.message]);
    assert.equal(h.calls.popups, 1);
    assert.deepEqual(h.calls.sounds, [["message3", .4]]);
    assert.equal(h.calls.after, 1);
    assert.equal(h.calls.a11y, 1);
    assert.equal(h.calls.acks, 0);
    assert.deepEqual(h.sequence, ["a11y", "normal", "filter", "preference", "selected", "filter", "sound", "popup"]);
});

for (const [normal, selected] of [[true, false], [false, true], [true, true], [false, false]]) {
    test(`suppression vetoes only eligible local alert routes (normal=${normal}, selected=${selected})`, () => {
        const h = harness();
        h.setBlocked(true);
        h.setNative(normal, selected);
        const store = h.load();
        assert.equal(callable(store.MESSAGE_CREATE)(h.event), false);
        assert.equal(h.calls.popups, 0);
        assert.equal(h.calls.sounds.length, 0);
        assert.equal(h.calls.filters.length, Number(normal) + Number(selected));
        assert.equal(h.calls.a11y, 1);
        assert.equal(h.calls.acks, 0);
        assert.equal(h.calls.voice, 0);
    });
}

test("native false remains false, selected-channel preference remains authoritative, and settings apply next event", () => {
    const h = harness();
    const store = h.load();
    h.setNative(false, true);
    h.setSelectedPreference(false);
    assert.equal(callable(store.MESSAGE_CREATE)(h.event), false);
    assert.equal(h.calls.nativeArgs.length, 1);
    assert.equal(h.calls.filters.length, 0);
    h.setNative(true);
    h.setBlocked(true);
    assert.equal(callable(store.MESSAGE_CREATE)(h.event), false);
    h.setBlocked(false);
    assert.equal(callable(store.MESSAGE_CREATE)(h.event), undefined);
    assert.equal(h.calls.popups, 1);
});

test("native desktop disabled keeps its sound-only fallback and native sound toggles", () => {
    const h = harness();
    const store = h.load();
    h.setDesktop("NEVER");
    assert.equal(callable(store.MESSAGE_CREATE)(h.event), false);
    assert.equal(h.calls.popups, 0);
    assert.deepEqual(h.calls.sounds, [["message1", .4]]);
    h.setBlocked(true);
    callable(store.MESSAGE_CREATE)(h.event);
    assert.equal(h.calls.sounds.length, 1);
    const other = harness();
    other.setSound(false);
    const otherStore = other.load();
    callable(otherStore.MESSAGE_CREATE)(other.event);
    assert.equal(object(other.calls.popupArgs[4]).sound, undefined);
});

test("selected sound stays independent of normal popup eligibility and focus behavior", () => {
    const h = harness();
    h.setNative(false, true);
    h.setFocused(false);
    const store = h.load();
    assert.equal(callable(store.MESSAGE_CREATE)(h.event), false);
    assert.deepEqual(h.calls.sounds, [["message3", .4]]);
    assert.equal(h.calls.popups, 0);
    assert.deepEqual(h.calls.filters, [h.message]);
});

test("optimistic events and mismatched target or module keep native behavior without creating readiness", () => {
    const h = harness();
    h.setBlocked(true);
    const store = h.load(undefined, 42);
    assert.equal(h.binding.state(true, h.cached()), "incompatible");
    assert.equal(callable(store.MESSAGE_CREATE)(h.event), undefined);
    assert.equal(h.calls.popups, 1);
    h.setTarget(false);
    const matched = h.load();
    assert.equal(callable(matched.MESSAGE_CREATE)(h.event), undefined);
    assert.equal(h.calls.popups, 2);
    h.event.optimistic = true;
    assert.equal(callable(matched.MESSAGE_CREATE)(h.event), false);
    assert.equal(h.calls.popups, 2);
});

test("failed patched factory falls back with no ready flag; late initialization and factory replacement are conservative", () => {
    const h = harness();
    assert.equal(h.binding.state(true, h.cached()), "pending");
    h.setFault("initialize");
    assert.throws(() => h.load(), error => error === h.nativeError);
    assert.equal(h.binding.state(true, h.cached()), "pending");
    h.setFault();
    h.load(fixture); // Models Vencord's successful original-factory fallback.
    assert.equal(h.binding.state(true, h.cached()), "incompatible");
    const store = h.load();
    assert.equal(h.binding.state(true, h.cached()), "ready");
    h.setBlocked(true);
    h.evictCache();
    h.binding.invalidate(592329, h.cached());
    assert.equal(callable(store.MESSAGE_CREATE)(h.event), undefined);
    assert.equal(h.calls.popups, 1);
});

test("later duplicate factory registration keeps a proven cached handler filtered", () => {
    const h = harness();
    const store = h.load();
    h.setBlocked(true);
    assert.equal(h.binding.state(true, h.cached()), "ready");
    assert.equal(h.binding.invalidate(592329, h.cached()), false);
    assert.equal(callable(store.MESSAGE_CREATE)(h.event), false);
    assert.equal(h.calls.popups, 0);
    assert.equal(h.calls.sounds.length, 0);
    const cached = object(h.cached());
    cached.exports = {};
    assert.equal(h.binding.state(true, h.cached()), "incompatible");
    assert.equal(callable(store.MESSAGE_CREATE)(h.event), undefined);
    assert.equal(h.calls.popups, 1);
});

for (const stage of ["normal", "selected"] as const) {
    test(`native ${stage} exception identity and existing side effects are preserved`, () => {
        const h = harness();
        const store = h.load();
        h.setFault(stage);
        assert.throws(() => callable(store.MESSAGE_CREATE)(h.event), error => error === h.nativeError);
        assert.equal(h.calls.popups, 0);
        assert.equal(h.calls.a11y, 1);
        assert.equal(h.calls.filters.length, stage === "normal" ? 0 : 1);
    });
}

function onePingPatches(): Omit<Patch, "plugin">[] {
    const source = readFileSync(resolve(__dirname, "../../../plugins/onePingPerDM/index.ts"), "utf8");
    const ast = ts.createSourceFile("onePingPerDM.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const replacements: PatchReplacement[] = [];
    function walk(node: ts.Node) {
        if (ts.isObjectLiteralExpression(node)) {
            const properties = node.properties.filter(ts.isPropertyAssignment);
            const match = properties.find(property => property.name.getText(ast) === "match")?.initializer;
            const replace = properties.find(property => property.name.getText(ast) === "replace")?.initializer;
            if (match && ts.isRegularExpressionLiteral(match) && replace && ts.isStringLiteral(replace)) {
                const text = match.getText(ast);
                const last = text.lastIndexOf("/");
                replacements.push({ match: new RegExp(text.slice(1, last), text.slice(last + 1)), replace: replace.text });
            }
        }
        ts.forEachChild(node, walk);
    }
    walk(ast);
    assert.equal(replacements.length, 2);
    return [{ find: '"NotificationStore"', replacement: replacements }];
}

for (const first of ["mention", "one-ping"] as const) {
    test(`source composition with current OnePingPerDM (${first} first) preserves both filters`, () => {
        const onePing = onePingPatches();
        const code = first === "mention" ? apply(apply(fixture), onePing, "ONEPING") : apply(apply(fixture, onePing, "ONEPING"));
        const h = harness();
        const store = h.load(code);
        assert.equal(callable(store.MESSAGE_CREATE)(h.event), undefined);
        assert.equal(h.calls.popups, 1);
        assert.equal(object(h.calls.popupArgs[4]).sound, undefined);
        h.setBlocked(true);
        assert.equal(callable(store.MESSAGE_CREATE)(h.event), false);
        assert.equal(h.calls.popups, 1);
        assert.equal(h.calls.sounds.length, 0);
    });
}
