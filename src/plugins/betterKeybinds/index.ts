/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { migratePluginSettings, SettingsStore } from "@api/Settings";
import { Devs, IS_LINUX } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { type PluginNative } from "@utils/types";
import type { FluxStore } from "@vencord/discord-types";
import { filters, findByPropsLazy, waitFor } from "@webpack";
import { MediaEngineStore, showToast } from "@webpack/common";

import { type Game, GameSelector, getGameStores, getRunningGames, isBindingEnabled, KeybindGroups, settings } from "./games";
import { type InputEvent, Keybinds, type KeyOptions, Recorder, type Shortcut } from "./input";
import type * as NativeModule from "./native";

const Native = IS_DISCORD_DESKTOP && IS_LINUX
    ? VencordNative.pluginHelpers.BetterKeybinds as PluginNative<typeof NativeModule>
    : undefined;
const AudioActions = findByPropsLazy("setTemporarySelfMute", "setSelfMute");
const logger = new Logger("BetterKeybinds");
const keybinds = new Keybinds();

type InputWatcher = (device: number, state: number, code: number, deviceId: string) => void;
interface Capture {
    recorder: Recorder;
    finish: (cancel?: boolean) => void;
}

interface GameBinding {
    callback: (down: boolean) => void;
    enabled: boolean;
    hold: boolean;
    pressed: boolean;
    active: boolean;
}

const gameBindings = new Map<number, GameBinding>();
const captures = new Set<Capture>();
const unregisterRecorders = new Set<() => void>();
let watcher: InputWatcher | null = null;
let generation = 0;
let running = false;
let ready = false;
let usingLinuxInput = false;
let keybindsEnabled = true;
let configureQueued = false;
let refreshQueued = false;
let restoreNative: (() => void) | undefined;
let gameStores: FluxStore[] = [];
let activeGames: readonly Game[] = [];

function configure() {
    const capturing = captures.size > 0 || watcher !== null;
    keybinds.setCapturing(capturing);
    if (!running || !ready || configureQueued) return;
    configureQueued = true;
    queueMicrotask(() => {
        configureQueued = false;
        if (!running || !ready) return;
        const currentGeneration = generation;
        Native!.configure(currentGeneration, keybinds.watch(), captures.size > 0 || watcher !== null)
            .catch(error => fail(currentGeneration, String(error)));
    });
}

function refreshGameBindings() {
    if (!running || refreshQueued) return;
    refreshQueued = true;

    queueMicrotask(() => {
        refreshQueued = false;
        if (!running) return;
        activeGames = getRunningGames();
        // Releasing a hold can synchronously replace Discord's registrations.
        for (const [id, binding] of [...gameBindings]) {
            if (gameBindings.get(id) !== binding) continue;
            binding.enabled = isBindingEnabled(id, activeGames);
            if (!binding.enabled) releaseGameBinding(binding);
        }
    });
}

function releaseGameBinding(binding: GameBinding) {
    if (!binding.active) return;
    binding.active = false;
    binding.callback(false);
}

function unregisterKeybind(id: number | string) {
    const key = Number(id);
    const binding = gameBindings.get(key);
    gameBindings.delete(key);
    if (binding) releaseGameBinding(binding);
}

function registerKeybind(id: number, callback: (down: boolean) => void, options: KeyOptions) {
    unregisterKeybind(id);
    const binding: GameBinding = {
        callback,
        enabled: isBindingEnabled(id, activeGames),
        hold: Boolean(options.keydown && options.keyup),
        pressed: false,
        active: false
    };
    gameBindings.set(id, binding);
    return (down: boolean) => {
        if (!running) return callback(down);
        if (gameBindings.get(id) !== binding) return;
        if (binding.hold) {
            if (down === binding.pressed) return;
            binding.pressed = down;
            if (!down) {
                releaseGameBinding(binding);
                return;
            }
        }
        if (!binding.enabled) return;
        if (binding.hold) binding.active = true;
        callback(down);
    };
}

function resetInput() {
    for (const binding of gameBindings.values()) {
        if (!binding.active) continue;
        AudioActions.setSelfMute("default", true, false);
        if (!MediaEngineStore.getSettings().mute)
            throw new Error("Discord did not apply the safety mute");
        break;
    }
    keybinds.reset();
    watcher = null;
    for (const capture of [...captures]) capture.finish(true);
    configure();
}

function stopLinuxInput() {
    ready = false;
    if (!usingLinuxInput) return;
    usingLinuxInput = false;
    for (const unregister of [...unregisterRecorders]) unregister();
    window.removeEventListener("focus", focusChanged);
    window.removeEventListener("blur", focusChanged);
    try {
        restoreNative?.();
    } finally {
        restoreNative = undefined;
        Native!.stop().catch(error => logger.error("Could not stop input helper", error));
    }
}

function fail(currentGeneration: number, message: string) {
    if (!running || currentGeneration !== generation) return;
    ready = false;
    try {
        if (usingLinuxInput) resetInput();
    } finally {
        stopLinuxInput();
        logger.error(message);
        showToast(`BetterKeybinds: ${message}`, "failure");
    }
}

function registerRecorder(elementId: string, callback: (shortcut: Shortcut) => void) {
    let active: Capture | undefined;
    const start = () => {
        if (active) return;
        if (!ready) {
            showToast("BetterKeybinds input helper is not ready. Check the plugin error and restart Discord.", "failure");
            return;
        }
        const recorder = new Recorder();
        const finish = (cancel = false) => {
            if (!active) return;
            clearTimeout(timer);
            captures.delete(active);
            active = undefined;
            configure();
            callback(cancel ? [] : recorder.result());
        };
        const timer = setTimeout(finish, 5000);
        active = { recorder, finish };
        captures.add(active);
        configure();
    };
    const stop = () => active?.finish();
    const register = DiscordNative.app.registerUserInteractionHandler;
    const listeners = [
        register(elementId, "click", start),
        register(elementId, "focus", start),
        register(elementId, "blur", stop)
    ];
    const unregister = () => {
        for (const remove of listeners) remove();
        active?.finish(true);
        unregisterRecorders.delete(unregister);
    };
    unregisterRecorders.add(unregister);
    return unregister;
}

function focusChanged() {
    const focused = document.hasFocus();
    keybinds.setFocused(focused);
    if (!focused) {
        watcher = null;
        for (const capture of [...captures]) capture.finish();
        configure();
    }
}

migratePluginSettings("BetterKeybinds", "LinuxKeybinds");

export default definePlugin({
    name: "BetterKeybinds",
    description: "Adds per-game keybind groups on any client, with optional Linux global keyboard and mouse input support.",
    tags: ["Shortcuts", "Voice"],
    authors: [Devs.logix],
    requiresRestart: true,
    settings,

    patches: [
        {
            find: "keybindDescriptions:",
            replacement: [
                {
                    match: /(\(0,\i\.jsx\))\(\i,\{keybind:(\i)\}\)(?=\]\}\)\}\))/,
                    replace: "$&,$1($self.GameSelector,{keybind:$2})"
                },
                {
                    // Keep Discord's original row renderer, but group the rows instead
                    // of inserting a divider between every item in one flat list.
                    match: /(\i)\.map\(\((\i),\i\)=>\(0,\i\.jsxs\)\(\i\.Fragment,\{children:\[((\(0,\i\.jsx\))\(\i,\{keybind:\2,keybindDescriptions:\i,keybindActionTypes:\i\}\)),.{0,150}?\]\},\2\.id\)\)/,
                    replace: "$4($self.KeybindGroups,{keybinds:$1,renderKeybind:$2=>$3})"
                },
                {
                    match: /(\.CUSTOM_KEYBINDS_SETTING,\{.{0,200}?Component:function\(\)\{return )\i\.\i\?/,
                    replace: "$1true?",
                    predicate: () => !IS_DISCORD_DESKTOP
                },
                {
                    match: /useHeaderDecoration:\(\)=>\i\.\i\?(?=\{type:\i\.\i\.BUTTON_GROUP,buttons:\[\{id:"add-keybind")/,
                    replace: "useHeaderDecoration:()=>true?",
                    predicate: () => !IS_DISCORD_DESKTOP
                }
            ]
        },
        {
            find: "KeybindStore: Looking for callback action",
            group: true,
            replacement: [
                {
                    match: /(\i)\.inputEventRegister\((\i),(\i),(\i),(\i)\)/,
                    replace: "$1.inputEventRegister($2,$3,$self.registerKeybind($2,$4,$5),$5)"
                },
                {
                    // Web/Vesktop unregister the old shortcut inside registration.
                    // Install the gate afterwards, before Discord's chord arbitration.
                    match: /\i\((\i)\.toString\(\)\);(?=let \i=\(0,\i\.\i\)\(document\);(\i)\.keyup&&\i\.bindGlobal\(.{0,80}?,\(\)=>(\i)\(!1\))/,
                    replace: "$&$3=$self.registerKeybind($1,$3,$2);"
                },
                {
                    match: /function \i\((\i)\)\{(?=if\(\i\.isPlatformEmbedded\)\i\.\i\.inputEventUnregister)/,
                    replace: "$&$self.unregisterKeybind($1);"
                }
            ]
        }
    ],

    GameSelector,
    KeybindGroups,
    registerKeybind,
    unregisterKeybind,

    flux: {
        KEYBINDS_ENABLE_ALL_KEYBINDS({ enable }: { enable: boolean; }) {
            keybindsEnabled = enable;
        },
        KEYBINDS_DELETE_KEYBIND({ id }: { id: string; }) {
            if (settings.store.gameBindings[id])
                delete settings.store.gameBindings[id];
        }
    },

    start() {
        running = true;
        const currentGeneration = ++generation;

        const actionsReady = Promise.withResolvers<{ enableAll(enable: boolean): void; }>();
        const gamesReady = Promise.withResolvers<void>();
        const activitiesReady = Promise.withResolvers<void>();
        waitFor(["addKeybind", "enableAll"], actionsReady.resolve);
        waitFor(filters.byStoreName("RunningGameStore"), gamesReady.resolve);
        if (IS_DISCORD_DESKTOP) activitiesReady.resolve();
        else waitFor(filters.byStoreName("LocalActivityStore"), activitiesReady.resolve);

        Promise.all([actionsReady.promise, gamesReady.promise, activitiesReady.promise]).then(async ([KeybindActions]) => {
            if (!running || generation !== currentGeneration) return;
            gameStores = getGameStores();
            for (const store of gameStores) store.addChangeListener(refreshGameBindings);
            SettingsStore.addChangeListener("plugins.BetterKeybinds.gameBindings", refreshGameBindings);
            refreshGameBindings();

            // Game scoping keeps Discord's input backend on every client.
            if (!Native || !settings.store.linuxCompatibility) return;
            const nativeReady = Promise.withResolvers<any>();
            waitFor(["getDiscordUtils", "inputEventRegister"], nativeReady.resolve);
            const DesktopNative = await nativeReady.promise;
            if (!running || generation !== currentGeneration) return;
            usingLinuxInput = true;

            const originalRequire = DesktopNative.requireModule;
            const originalUtils = DesktopNative.getDiscordUtils();
            const utils = Object.create(originalUtils);
            Object.defineProperties(utils, {
                inputEventRegister: {
                    value(id: number, shortcut: Shortcut, callback: (down: boolean) => void, options: KeyOptions) {
                        keybinds.register(id, shortcut, callback, options);
                        configure();
                    }
                },
                inputEventUnregister: {
                    value(id: number) {
                        keybinds.unregister(id);
                        configure();
                    }
                },
                inputCaptureRegisterElement: { value: registerRecorder },
                inputWatchAll: {
                    value(callback: InputWatcher | null) {
                        watcher = callback;
                        configure();
                    }
                }
            });

            const enabled = keybindsEnabled;
            KeybindActions.enableAll(false);
            const requireModule = function (name: string) {
                return name === "discord_utils" ? utils : originalRequire.call(DesktopNative, name);
            };
            DesktopNative.requireModule = requireModule;
            restoreNative = () => {
                const enabled = keybindsEnabled;
                KeybindActions.enableAll(false);
                if (DesktopNative.requireModule === requireModule)
                    DesktopNative.requireModule = originalRequire;
                KeybindActions.enableAll(enabled);
            };
            focusChanged();
            window.addEventListener("focus", focusChanged);
            window.addEventListener("blur", focusChanged);
            KeybindActions.enableAll(enabled);
            await Native.start(currentGeneration);
            if (!running || !usingLinuxInput || generation !== currentGeneration) return;
            ready = true;
            configure();
        }).catch(error => fail(currentGeneration, String(error)));
    },

    stop() {
        if (!running) return;
        try {
            if (usingLinuxInput) resetInput();
            for (const id of [...gameBindings.keys()]) unregisterKeybind(id);
        } finally {
            running = false;
            ++generation;
            for (const store of gameStores) store.removeChangeListener(refreshGameBindings);
            gameStores = [];
            activeGames = [];
            SettingsStore.removeChangeListener("plugins.BetterKeybinds.gameBindings", refreshGameBindings);
            stopLinuxInput();
        }
    },

    receive(currentGeneration: number, events: InputEvent[]) {
        if (!running || !ready || currentGeneration !== generation) return;
        for (const event of events) {
            keybinds.input(event);
            watcher?.(event[0], event[2] ? 1 : 0, event[1], "");
            for (const capture of [...captures])
                if (capture.recorder.input(event)) capture.finish();
        }
    },

    reset(currentGeneration: number, reason: string) {
        if (!running || !ready || currentGeneration !== generation) return;
        resetInput();
        logger.warn("Input state reset", reason);
    },

    failed: fail
});
