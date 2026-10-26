/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 MentionControl contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";

import { defaultDocument, defaultOptions, setAccountOptions } from "@plugins/mentionControl/preferences";
import type { SettingsPanelProps } from "@plugins/mentionControl/SettingsPanel";
import { build } from "esbuild";

const accountId = "100000000000000001";
const otherAccount = "100000000000000002";
const channelId = "200000000000000001";
const guildId = "300000000000000001";
const message = { id: "500000000000000001", channel_id: channelId, mention_everyone: true, mentions: [], mention_roles: [] };

interface Harness {
    plugin: {
        start(): void;
        stop(): void;
        markReady(id: unknown, module: unknown): void;
        flux: { MESSAGE_CREATE(event: unknown): void; CONNECTION_OPEN(): void; };
        shouldSuppress(data: unknown): boolean;
        settings: { def: { controls: { component(): { props: { children: ({ props?: SettingsPanelProps; } | false)[]; }; }; }; }; };
    };
    env: {
        account: string | undefined;
        enabled: boolean;
        loaded: boolean;
        cachedModule: { id: number; exports: Record<string, unknown>; readonly loaded: boolean; } | undefined;
        throwRoles: boolean;
        store: { preferences?: unknown; };
        factories: Set<(factory: unknown, id: PropertyKey) => void>;
        cleanups: Set<() => void>;
        calls: number;
        roles: string[];
        throwUpdates: boolean;
        channelType: number;
        authListeners: Set<() => void>;
        authAddCalls: number;
        deferred: (() => void)[];
        acks: Record<string, unknown>[];
        canRead: boolean;
        lastMessageId: string | null;
        ackMessageId: string | null;
    };
}

async function harness(): Promise<Harness> {
    const root = resolve(__dirname, "..");
    const mocks: Record<string, string> = {
        "@test/state": `export const env={account:${JSON.stringify(accountId)},enabled:true,loaded:false,throwRoles:false,throwUpdates:false,store:{},factories:new Set(),cleanups:new Set(),calls:0,roles:[],authListeners:new Set(),authAddCalls:0,deferred:[],acks:[],canRead:true,lastMessageId:null,ackMessageId:null,channelType:0};env.cachedModule={id:592329,exports:{},get loaded(){return env.loaded}};`,
        "@api/Settings": "import{env}from'@test/state';export const definePluginSettings=def=>({def,withPrivateSettings(){return this},store:env.store,use:()=>env.store});",
        "@api/PluginManager": "import{env}from'@test/state';export const isPluginEnabled=()=>env.enabled;",
        "@utils/types": "export const OptionType={COMPONENT:1};export default value=>value;",
        "@utils/constants": "export const Devs={OwaisByte:{name:'OwaisByte',id:0n}};",
        "@webpack": "import{env}from'@test/state';export const factoryListeners=env.factories;export const wreq={c:new Proxy({},{get:(_,id)=>String(id)==='592329'?env.cachedModule:undefined})};",
        "@webpack/common": `import{env}from'@test/state';export const AuthenticationStore={getId:()=>env.account,addChangeListener:fn=>{env.authAddCalls++;env.authListeners.add(fn)},removeChangeListener:fn=>env.authListeners.delete(fn)};export const ChannelStore={getChannel:id=>({id,type:env.channelType,guild_id:[1,3].includes(env.channelType)?null:${JSON.stringify(guildId)},recipients:[${JSON.stringify(otherAccount)}],isMessageRequest:false,isSpam:false,safetyWarnings:[],isSystemDM:()=>false,isThread:()=>false})};export const GuildMemberStore={getMember:()=>{env.calls++;if(env.throwRoles)throw Error('secret must not escape');return{roles:env.roles}}};export const UserGuildSettingsStore={isSuppressEveryoneEnabled:()=>false,isSuppressRolesEnabled:()=>false};export const MessageStore={getMessage:()=>undefined};export const PermissionsBits={VIEW_CHANNEL:1024n};export const PermissionStore={can:()=>env.canRead};export const ReadStateStore={lastMessageId:()=>env.lastMessageId,getTrackedAckMessageId:()=>env.ackMessageId};export const FluxDispatcher={wait:fn=>env.deferred.push(fn),dispatch:async event=>{env.acks.push(event)}};export const useState=initial=>[initial,()=>{if(env.throwUpdates)throw Error('render subscriber failed')}];export const useStateFromStores=(stores,read)=>read();export const useEffect=fn=>{const cleanup=fn();if(cleanup)env.cleanups.add(cleanup)};export const React={createElement:(type,props,...children)=>({type,props:{...props,children}})};`,
        "./SettingsPanel": "export const SettingsPanel=()=>null;",
        "@components/BaseText": "export const BaseText=()=>null;"
    };
    const result = await build({
        stdin: { contents: `export{default as plugin}from${JSON.stringify(resolve(root, "index.tsx"))};export{env}from'@test/state';`, resolveDir: root },
        bundle: true, write: false, platform: "node", format: "cjs", jsxFactory: "React.createElement",
        plugins: [{
            name: "native-boundaries-only",
            setup(builder) {
                builder.onResolve({ filter: /.*/ }, args => args.path in mocks ? { path: args.path, namespace: "native-mock" } : undefined);
                builder.onLoad({ filter: /.*/, namespace: "native-mock" }, args => ({ contents: mocks[args.path], loader: "js" }));
            }
        }]
    });
    const module = { exports: {} };
    // Only our plugin and synthetic native boundaries are evaluated, never Discord source.
    new Function("module", "exports", result.outputFiles[0].text)(module, module.exports);
    return module.exports as Harness;
}

const target = { RELEASE_CHANNEL: "stable", BUILD_NUMBER: "649389", VERSION_HASH: "a4e81a1fff2ccc1e9c47281017039f16f16b2664" };

function panel(plugin: Harness["plugin"]) {
    const last = plugin.settings.def.controls.component().props.children.at(-1);
    assert.ok(last && last.props);
    return last.props;
}

function completeFactory(plugin: Harness["plugin"], env: Harness["env"]) {
    plugin.markReady(592329, env.cachedModule);
    env.loaded = true;
}

test("real plugin integration retains native behavior until enabled, started, ready and configured", async () => {
    const previous = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: { GLOBAL_ENV: target }, configurable: true, writable: true });
    try {
        const { plugin, env } = await harness();
        const selected = { ...defaultOptions(), suppressEveryone: true };
        env.store.preferences = setAccountOptions(defaultDocument(), accountId, selected);
        assert.equal(plugin.shouldSuppress(message), false);
        plugin.start();
        plugin.start();
        assert.equal(env.factories.size, 1);
        assert.equal(env.authAddCalls, 1);
        assert.equal(plugin.shouldSuppress(message), false);
        completeFactory(plugin, env);
        assert.equal(plugin.shouldSuppress(message), true);
        assert.equal(plugin.shouldSuppress({ ...message, type: 21 }), false);
        env.enabled = false;
        assert.equal(plugin.shouldSuppress(message), false);
        env.enabled = true;
        env.store.preferences = setAccountOptions(defaultDocument(), accountId, { ...selected, paused: true });
        assert.equal(plugin.shouldSuppress(message), false);
        env.store.preferences = setAccountOptions(defaultDocument(), accountId, selected);
        env.account = otherAccount;
        assert.equal(plugin.shouldSuppress(message), false);
        env.account = accountId;
        for (const listener of env.factories) listener(() => {}, 592329);
        assert.equal(plugin.shouldSuppress(message), true); // a duplicate lazy factory keeps the loaded cache
        assert.ok(env.cachedModule);
        env.cachedModule.exports = {};
        assert.equal(plugin.shouldSuppress(message), false);
        completeFactory(plugin, env);
        assert.equal(plugin.shouldSuppress(message), true);
        const cached = env.cachedModule;
        env.cachedModule = undefined;
        assert.equal(plugin.shouldSuppress(message), false);
        env.cachedModule = { ...cached, exports: {} };
        assert.equal(plugin.shouldSuppress(message), false);
        completeFactory(plugin, env);
        plugin.stop();
        assert.equal(env.factories.size, 0);
        assert.equal(plugin.shouldSuppress(message), false);
        plugin.start();
        assert.equal(plugin.shouldSuppress(message), true);
        plugin.stop();
    } finally {
        Object.defineProperty(globalThis, "window", { value: previous, configurable: true, writable: true });
    }
});

test("real settings callbacks reject stale accounts/options and preserve other accounts", async () => {
    const previous = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: { GLOBAL_ENV: target }, configurable: true, writable: true });
    try {
        const { plugin, env } = await harness();
        const first = panel(plugin);
        assert.deepEqual(first.options, defaultOptions());
        first.onOptionsChange({ ...first.options, suppressEveryone: true });
        const saved = structuredClone(env.store.preferences);
        env.account = otherAccount;
        first.onOptionsChange({ ...first.options, suppressPersonal: true });
        first.onReset();
        assert.deepEqual(env.store.preferences, saved);
        const second = panel(plugin);
        assert.deepEqual(second.options, defaultOptions());
        second.onOptionsChange({ ...second.options, suppressPersonal: true });
        env.account = accountId;
        const current = panel(plugin);
        assert.equal(current.options.suppressEveryone, true);
        first.onReset(); // same account, stale options snapshot
        assert.equal(panel(plugin).options.suppressEveryone, true);
        current.onReset();
        assert.deepEqual(panel(plugin).options, defaultOptions());
        env.account = otherAccount;
        assert.equal(panel(plugin).options.suppressPersonal, true);
        for (let i = 0; i < 20; i++) plugin.settings.def.controls.component();
        assert.equal(env.calls, 0);
        assert.equal(env.acks.length, 0);
        assert.equal(env.deferred.length, 0);
        for (const cleanup of env.cleanups) cleanup();
    } finally {
        Object.defineProperty(globalThis, "window", { value: previous, configurable: true, writable: true });
    }
});

test("invalid saved data, native read failures and changed client builds fail to original without overwriting preferences", async () => {
    const previous = globalThis.window;
    const windowMock = { GLOBAL_ENV: { ...target } };
    Object.defineProperty(globalThis, "window", { value: windowMock, configurable: true, writable: true });
    try {
        const { plugin, env } = await harness();
        plugin.start();
        completeFactory(plugin, env);
        const invalid = { version: 9, accounts: {} };
        env.store.preferences = invalid;
        assert.equal(plugin.shouldSuppress(message), false);
        const rendered = panel(plugin);
        assert.ok(rendered.storageError);
        rendered.onOptionsChange({ ...defaultOptions(), suppressEveryone: true });
        rendered.onReset();
        assert.equal(env.store.preferences, invalid);
        env.store.preferences = setAccountOptions(defaultDocument(), accountId, { ...defaultOptions(), suppressEveryone: true });
        env.throwRoles = true;
        assert.doesNotThrow(() => assert.equal(plugin.shouldSuppress(message), false));
        env.throwRoles = false;
        assert.equal(plugin.shouldSuppress(message), true);
        windowMock.GLOBAL_ENV.BUILD_NUMBER = "649390";
        assert.equal(plugin.shouldSuppress(message), false);
        plugin.stop();
    } finally {
        Object.defineProperty(globalThis, "window", { value: previous, configurable: true, writable: true });
    }
});

test("a failed settings write allows a later retry without treating valid saved data as corrupt", async () => {
    const previous = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: { GLOBAL_ENV: target }, configurable: true, writable: true });
    try {
        const { plugin, env } = await harness();
        let saved: unknown;
        let failing = true;
        Object.defineProperty(env.store, "preferences", {
            get: () => saved,
            set: value => {
                if (failing) throw new Error("Storage temporarily unavailable");
                saved = value;
            }
        });
        const first = panel(plugin);
        first.onOptionsChange({ ...first.options, suppressEveryone: true });
        assert.equal(saved, undefined);
        const retry = panel(plugin);
        assert.equal(retry.storageError, undefined);
        failing = false;
        retry.onOptionsChange({ ...retry.options, suppressEveryone: true });
        assert.equal(panel(plugin).options.suppressEveryone, true);
    } finally {
        Object.defineProperty(globalThis, "window", { value: previous, configurable: true, writable: true });
    }
});

test("failed UI subscribers cannot escape factory readiness or the native notification error boundary", async () => {
    const previous = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: { GLOBAL_ENV: target }, configurable: true, writable: true });
    try {
        const { plugin, env } = await harness();
        env.store.preferences = setAccountOptions(defaultDocument(), accountId, { ...defaultOptions(), suppressEveryone: true });
        panel(plugin);
        env.throwUpdates = true;
        assert.doesNotThrow(() => plugin.start());
        assert.doesNotThrow(() => completeFactory(plugin, env));
        assert.equal(plugin.shouldSuppress(message), true);
        panel(plugin);
        env.throwRoles = true;
        assert.doesNotThrow(() => assert.equal(plugin.shouldSuppress(message), false));
        assert.doesNotThrow(() => plugin.stop());
        for (const cleanup of env.cleanups) cleanup();
    } finally {
        Object.defineProperty(globalThis, "window", { value: previous, configurable: true, writable: true });
    }
});

test("a mute selection itself hands off one exact native ACK with account and permission cancellation", async () => {
    const previous = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: { GLOBAL_ENV: target, __OVERLAY__: false }, configurable: true, writable: true });
    try {
        const { plugin, env } = await harness();
        env.store.preferences = setAccountOptions(defaultDocument(), accountId, { ...defaultOptions(), suppressEveryone: true });
        plugin.start();
        completeFactory(plugin, env);
        await new Promise(resolve => setTimeout(resolve, 5));
        const id = ((BigInt(Date.now() - 1420070400000) << 22n) + 1n).toString();
        const incoming = { ...message, id, type: 0, author: { id: otherAccount } };
        env.lastMessageId = id;
        const event = { type: "MESSAGE_CREATE", channelId, message: incoming, optimistic: false };
        plugin.flux.MESSAGE_CREATE(event);
        assert.equal(env.acks.length, 0);
        assert.equal(env.deferred.length, 1);
        env.deferred.shift()?.();
        await new Promise(resolve => setImmediate(resolve));
        assert.deepEqual(env.acks, [{ type: "CHANNEL_ACK", channelId, messageId: id, immediate: false, force: false, context: "APP", location: undefined }]);
        plugin.flux.MESSAGE_CREATE(event);
        assert.equal(env.deferred.length, 0);
        plugin.flux.CONNECTION_OPEN();
        await new Promise(resolve => setTimeout(resolve, 5));
        const nextId = ((BigInt(Date.now() - 1420070400000) << 22n) + 1n).toString();
        env.lastMessageId = nextId;
        plugin.flux.MESSAGE_CREATE({ ...event, message: { ...incoming, id: nextId } });
        assert.equal(env.deferred.length, 1);
        env.account = otherAccount;
        for (const listener of env.authListeners) listener();
        env.deferred.shift()?.();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(env.acks.length, 1);
        env.account = accountId;
        env.canRead = false;
        plugin.flux.MESSAGE_CREATE({ ...event, message: { ...incoming, id: nextId } });
        assert.equal(env.deferred.length, 0);
        plugin.stop();
        assert.equal(env.authListeners.size, 0);
    } finally {
        Object.defineProperty(globalThis, "window", { value: previous, configurable: true, writable: true });
    }
});

test("a replies-only mute selection reaches the native notification veto", async () => {
    const previous = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: { GLOBAL_ENV: target }, configurable: true, writable: true });
    try {
        const { plugin, env } = await harness();
        env.store.preferences = setAccountOptions(defaultDocument(), accountId, { ...defaultOptions(), suppressReplies: true });
        plugin.start();
        completeFactory(plugin, env);
        const parentId = "500000000000000002";
        const reply = {
            ...message, type: 19, mention_everyone: false, mentions: [{ id: accountId }],
            message_reference: { channel_id: channelId, message_id: parentId, guild_id: guildId },
            referenced_message: { id: parentId, channel_id: channelId, author: { id: accountId } }
        };
        assert.equal(plugin.shouldSuppress(reply), true);
        assert.equal(plugin.shouldSuppress({ ...message, mention_everyone: false, mentions: [{ id: accountId }] }), false);
        plugin.stop();
    } finally {
        Object.defineProperty(globalThis, "window", { value: previous, configurable: true, writable: true });
    }
});

test("private mute unifies native alerts and exact read handoff without guild permissions", async () => {
    const previous = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: { GLOBAL_ENV: target, __OVERLAY__: false }, configurable: true, writable: true });
    try {
        for (const channelType of [1, 3]) {
            const { plugin, env } = await harness();
            env.channelType = channelType;
            env.canRead = false; // A private channel has no guild VIEW_CHANNEL bit.
            env.store.preferences = setAccountOptions(defaultDocument(), accountId, { ...defaultOptions(), suppressDirectMessages: true });
            plugin.start();
            completeFactory(plugin, env);
            await new Promise(resolve => setTimeout(resolve, 5));
            const id = ((BigInt(Date.now() - 1420070400000) << 22n) + 1n).toString();
            const incoming = { id, channel_id: channelId, guild_id: null, type: 0, author: { id: otherAccount } };
            assert.equal(plugin.shouldSuppress(incoming), true);
            env.lastMessageId = id;
            plugin.flux.MESSAGE_CREATE({ type: "MESSAGE_CREATE", channelId, message: incoming });
            assert.equal(env.acks.length, 0);
            assert.equal(env.deferred.length, 1);
            env.deferred.shift()?.();
            await new Promise(resolve => setImmediate(resolve));
            assert.deepEqual(env.acks, [{ type: "CHANNEL_ACK", channelId, messageId: id, immediate: false, force: false, context: "APP", location: undefined }]);
            const selected = panel(plugin);
            selected.onOptionsChange(defaultOptions());
            assert.equal(plugin.shouldSuppress(incoming), false);
            plugin.stop();
            for (const cleanup of env.cleanups) cleanup();
        }
    } finally {
        Object.defineProperty(globalThis, "window", { value: previous, configurable: true, writable: true });
    }
});

test("all filters off avoids message context reads as well as read acknowledgements", async () => {
    const previous = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: { GLOBAL_ENV: target, __OVERLAY__: false }, configurable: true, writable: true });
    try {
        const { plugin, env } = await harness();
        plugin.start();
        completeFactory(plugin, env);
        await new Promise(resolve => setTimeout(resolve, 5));
        const id = ((BigInt(Date.now() - 1420070400000) << 22n) + 1n).toString();
        const incoming = { ...message, id, type: 0, author: { id: otherAccount } };
        env.lastMessageId = id;
        plugin.flux.MESSAGE_CREATE({ type: "MESSAGE_CREATE", channelId, message: incoming });
        assert.equal(plugin.shouldSuppress(incoming), false);
        assert.equal(env.calls, 0);
        assert.equal(env.deferred.length, 0);
        assert.equal(env.acks.length, 0);
        plugin.stop();
    } finally {
        Object.defineProperty(globalThis, "window", { value: previous, configurable: true, writable: true });
    }
});

test("each server mute category owns its alert veto and read handoff without output switches", async () => {
    const previous = globalThis.window;
    Object.defineProperty(globalThis, "window", { value: { GLOBAL_ENV: target, __OVERLAY__: false }, configurable: true, writable: true });
    try {
        const roleId = "600000000000000001";
        const parentId = "500000000000000002";
        const variants = [
            { option: "suppressEveryone", metadata: { mention_everyone: true, mentions: [], mention_roles: [] } },
            { option: "suppressPersonal", metadata: { mention_everyone: false, mentions: [{ id: accountId }], mention_roles: [] } },
            { option: "suppressReplies", metadata: { type: 19, mention_everyone: false, mentions: [{ id: accountId }], mention_roles: [],
                message_reference: { channel_id: channelId, message_id: parentId, guild_id: guildId },
                referenced_message: { id: parentId, channel_id: channelId, author: { id: accountId } } } },
            { option: "suppressRoles", metadata: { mention_everyone: false, mentions: [], mention_roles: [roleId] } }
        ] as const;
        for (const { option, metadata } of variants) {
            const { plugin, env } = await harness();
            env.roles = [roleId];
            env.store.preferences = setAccountOptions(defaultDocument(), accountId, { ...defaultOptions(), [option]: true });
            plugin.start();
            completeFactory(plugin, env);
            await new Promise(resolve => setTimeout(resolve, 5));
            const id = ((BigInt(Date.now() - 1420070400000) << 22n) + 1n).toString();
            const incoming = { ...message, id, type: 0, author: { id: otherAccount }, ...metadata };
            assert.equal(plugin.shouldSuppress(incoming), true, option);
            env.lastMessageId = id;
            plugin.flux.MESSAGE_CREATE({ type: "MESSAGE_CREATE", channelId, message: incoming });
            assert.equal(env.acks.length, 0);
            assert.equal(env.deferred.length, 1, option);
            env.deferred.shift()?.();
            await new Promise(resolve => setImmediate(resolve));
            assert.equal(env.acks.length, 1, option);
            assert.equal(env.acks[0].messageId, id);
            const untouched = { ...incoming, type: 0, mention_everyone: false, mentions: [], mention_roles: [] };
            assert.equal(plugin.shouldSuppress(untouched), false, option);
            plugin.stop();
            for (const cleanup of env.cleanups) cleanup();
        }
    } finally {
        Object.defineProperty(globalThis, "window", { value: previous, configurable: true, writable: true });
    }
});
