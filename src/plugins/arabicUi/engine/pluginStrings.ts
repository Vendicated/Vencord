/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { plugins } from "@api/PluginManager";
import type { PluginLocalePack } from "@plugins/arabicUi/types";
import { Logger } from "@utils/Logger";
import { OptionType, type Plugin } from "@utils/types";

import { getArabicByEnglish } from "./lookup";

const logger = new Logger("ArabicUI");

const packs = new Map<string, PluginLocalePack>();

interface Backup {
    description: string;
    settings: Record<string, { description?: string; displayName?: string; }>;
}

const backups = new Map<string, Backup>();
let overlayActive = false;

export function registerPluginPack(pluginName: string, pack: PluginLocalePack) {
    packs.set(pluginName, pack);
}

export function clearPluginPacks() {
    packs.clear();
}

export function getPluginDisplayName(plugin: Plugin): string {
    return plugin.name;
}

export function getPluginDisplayDescription(plugin: Plugin): string {
    if (!overlayActive) return plugin.description;
    return packs.get(plugin.name)?.description
        ?? getArabicByEnglish(plugin.description)
        ?? plugin.description;
}

function backupAndApply(plugin: Plugin, pack: PluginLocalePack) {
    if (backups.has(plugin.name)) return;

    const settingsBackup: Backup["settings"] = {};
    const def = plugin.settings?.def;
    if (def && pack.settings) {
        for (const [key, arabic] of Object.entries(pack.settings)) {
            const opt = def[key];
            if (!opt || opt.type === OptionType.CUSTOM) continue;
            settingsBackup[key] = {
                description: "description" in opt ? opt.description : undefined,
                displayName: "displayName" in opt ? (opt as any).displayName : undefined,
            };
            if ("description" in opt) (opt as any).description = arabic;
            if ("displayName" in opt && (opt as any).displayName != null)
                (opt as any).displayName = arabic;
        }
    }

    backups.set(plugin.name, {
        description: plugin.description,
        settings: settingsBackup,
    });

    if (pack.description) plugin.description = pack.description;
}

function restore(plugin: Plugin) {
    const bak = backups.get(plugin.name);
    if (!bak) return;

    plugin.description = bak.description;
    const def = plugin.settings?.def;
    if (def) {
        for (const [key, prev] of Object.entries(bak.settings)) {
            const opt = def[key];
            if (!opt || opt.type === OptionType.CUSTOM) continue;
            if (prev.description !== undefined && "description" in opt)
                (opt as any).description = prev.description;
            if (prev.displayName !== undefined && "displayName" in opt)
                (opt as any).displayName = prev.displayName;
        }
    }

    backups.delete(plugin.name);
}

export function applyPluginOverlay() {
    if (overlayActive) return;
    overlayActive = true;

    let applied = 0;
    for (const plugin of Object.values(plugins)) {
        const pack = packs.get(plugin.name);
        if (!pack) continue;
        try {
            backupAndApply(plugin, pack);
            applied++;
        } catch (e) {
            logger.error(`Failed to apply Arabic pack for ${plugin.name}`, e);
        }
    }

    logger.info(`Plugin overlay on (${applied} packs)`);
}

export function removePluginOverlay() {
    if (!overlayActive) return;

    for (const plugin of Object.values(plugins)) {
        try {
            restore(plugin);
        } catch (e) {
            logger.error(`Failed to restore ${plugin.name}`, e);
        }
    }

    overlayActive = false;
    logger.info("Plugin overlay off");
}
