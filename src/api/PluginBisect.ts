/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PlainSettings } from "@api/Settings";
import { localStorage } from "@utils/localStorage";
import { Logger } from "@utils/Logger";

import Plugins from "~plugins";

const STORAGE_KEY = "Vencord_pluginBisect";

const logger = new Logger("PluginBisect", "#a6d189");

export type BisectResult =
    | { type: "found"; plugin: string; }
    /** The issue persisted with all plugins disabled */
    | { type: "notPlugin"; }
    /** The issue could not be narrowed down to a single plugin, likely caused by multiple plugins together */
    | { type: "inconclusive"; };

export interface BisectState {
    /** Enabled state of every plugin before the bisect started. Restored once the bisect ends */
    originalEnabled: Record<string, boolean>;
    /** Plugins that might still be causing the issue */
    suspects: string[];
    /** Plugins enabled during the current step. Every other non required plugin is disabled */
    testing: string[];
    step: number;
    result?: BisectResult;
}

export function getBisectState(): BisectState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        logger.error("Failed to read bisect state", e);
        return null;
    }
}

export const isBisecting = () => getBisectState() != null;

function saveState(state: BisectState | null) {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
}

/**
 * Plugins the user enabled themselves. Required plugins and plugins only enabled as a dependency are excluded,
 * since those get enabled automatically by the plugins that need them
 */
export function getBisectCandidates() {
    return Object.keys(Plugins).filter(name => {
        const p = Plugins[name];
        return PlainSettings.plugins[name]?.enabled && !p.required && !p.isDependency;
    });
}

/**
 * Writes the enabled state of all plugins directly to the plain settings and saves them once, then reloads.
 * Bypassing the settings proxy avoids hundreds of saves and doesn't mark the settings as dirty for cloud sync
 */
async function applyEnabledAndReload(isEnabled: (name: string) => boolean) {
    for (const name in Plugins) {
        if (Plugins[name].required) continue;

        (PlainSettings.plugins[name] ??= {} as any).enabled = isEnabled(name);
    }

    await VencordNative.settings.set(PlainSettings);
    location.reload();
}

export function startBisect() {
    const suspects = getBisectCandidates();
    if (!suspects.length) throw new Error("No enabled plugins to bisect");

    const originalEnabled = {} as Record<string, boolean>;
    for (const name in Plugins) {
        originalEnabled[name] = PlainSettings.plugins[name]?.enabled ?? false;
    }

    // Start by disabling everything to verify the issue is caused by a plugin at all
    const state: BisectState = { originalEnabled, suspects, testing: [], step: 1 };
    saveState(state);
    return applyEnabledAndReload(() => false);
}

/**
 * Advances the bisect based on whether the issue still happens with the currently enabled plugins
 */
export async function reportBisectStep(issuePresent: boolean) {
    const state = getBisectState();
    if (!state || state.result) throw new Error("No bisect in progress");

    const { testing } = state;
    const suspects = issuePresent
        ? testing
        : state.suspects.filter(p => !testing.includes(p));

    if (suspects.length === 0) {
        // Issue with nothing enabled -> not a plugin. Issue gone with the last suspect enabled alone -> multiple plugins
        state.result = testing.length === 0
            ? { type: "notPlugin" }
            : { type: "inconclusive" };
        state.suspects = [];
        saveState(state);
        return state;
    }

    if (suspects.length === 1 && issuePresent && testing.length === 1) {
        state.result = { type: "found", plugin: suspects[0] };
        state.suspects = suspects;
        saveState(state);
        return state;
    }

    // If only one suspect is left but it was never tested on its own, verify it before blaming it
    state.suspects = suspects;
    state.testing = suspects.slice(0, Math.ceil(suspects.length / 2));
    state.step++;
    saveState(state);

    await applyEnabledAndReload(name => state.testing.includes(name));
    return state;
}

/**
 * Ends the bisect and restores the plugins enabled before it started
 * @param disable Plugins to leave disabled, e.g. the plugin found to cause the issue
 */
export function stopBisect(disable: string[] = []) {
    const state = getBisectState();
    saveState(null);

    if (!state) return;

    return applyEnabledAndReload(name =>
        !disable.includes(name) && (state.originalEnabled[name] ?? PlainSettings.plugins[name]?.enabled ?? false)
    );
}

/** Rough amount of restarts left until the bisect is done */
export function estimateRemainingSteps({ suspects, testing }: BisectState) {
    if (testing.length === 0) return Math.ceil(Math.log2(suspects.length)) + 1;
    return Math.max(1, Math.ceil(Math.log2(suspects.length)));
}
