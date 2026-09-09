/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts, UserSettingsProtoStore } from "@webpack/common";

import { SettingsPanel } from "./SettingsPanel";
import { DefaultStatusType, isRuleActive, ScheduleRule, statusName } from "./types";

const StatusSettings = getUserSettingLazy<string>("status", "status")!;

export const settings = definePluginSettings({
    settingsPanel: {
        type: OptionType.COMPONENT,
        component: SettingsPanel,
    },
}).withPrivateSettings<{
    schedules: ScheduleRule[];
    defaultStatus: DefaultStatusType;
    notifyOnChange: boolean;
}>();

let checkInterval: ReturnType<typeof setInterval> | null = null;
let lastApplied: string | null = null;
let savedStatus: string | null = null;
let activeRuleId: string | null = null;

function getStatus() {
    try { return StatusSettings?.getSetting?.(); }
    catch { return undefined; }
}

function onSettingsChange() {
    const status = getStatus();
    if (!status || status === lastApplied) return;
    if (!activeRuleId) savedStatus = status;
}

export async function evaluate(manual = false) {
    try {
        const status = getStatus();
        if (!status) return;

        const rules: ScheduleRule[] = settings.store.schedules ?? [];
        const now = new Date();
        const active = rules.find(r => isRuleActive(r, now));

        if (active) {
            if (activeRuleId == null && !savedStatus) savedStatus = status;
            activeRuleId = active.id;

            if (status !== active.status) {
                lastApplied = active.status;
                await StatusSettings.updateSetting(active.status);

                if (settings.store.notifyOnChange || manual)
                    showToast(`Set to ${statusName(active.status)} (${active.name})`, Toasts.Type.SUCCESS);
            } else if (manual) {
                showToast(`Already ${statusName(active.status)} (${active.name})`, Toasts.Type.MESSAGE);
            }
        } else if (activeRuleId != null) {
            activeRuleId = null;
            const def = settings.store.defaultStatus ?? "previous";
            let restore: string | null = null;

            if (def === "previous") restore = savedStatus ?? "online";
            else if (def !== "keep") restore = def;

            if (restore && status !== restore) {
                lastApplied = restore;
                await StatusSettings.updateSetting(restore);

                if (settings.store.notifyOnChange || manual)
                    showToast(`Restored to ${statusName(restore)}`, Toasts.Type.MESSAGE);
            }
            savedStatus = null;
        } else if (manual) {
            showToast("No active schedule right now.", Toasts.Type.MESSAGE);
        }
    } catch (e) {
        console.error(e);
    }
}

export default definePlugin({
    name: "ScheduledStatus",
    description: "Automatically changes your status based on scheduled times and days of the week",
    authors: [Devs.DaintyDust],
    tags: ["Activity", "Utility"],
    dependencies: ["UserSettingsAPI"],
    settings,

    start() {
        savedStatus = getStatus() ?? null;
        UserSettingsProtoStore.addChangeListener(onSettingsChange);
        evaluate().catch(console.error);
        checkInterval = setInterval(() => { evaluate().catch(console.error); }, 15_000);
    },

    stop() {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }

        UserSettingsProtoStore.removeChangeListener(onSettingsChange);

        if (activeRuleId && savedStatus && (settings.store.defaultStatus ?? "previous") === "previous") {
            StatusSettings.updateSetting(savedStatus).catch(console.error);
        }

        activeRuleId = null;
        savedStatus = null;
        lastApplied = null;
    },
});
