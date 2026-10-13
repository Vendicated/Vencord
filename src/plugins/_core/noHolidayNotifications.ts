/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SettingsStore } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";

const SoundpackStore = findStoreLazy("SoundpackStore");

export default definePlugin({
    name: "NoHolidayNotifications",
    description: "Disable Discord's holiday notification sound packs",
    authors: [Devs.hadesflames],
    required: true,

    patches: [
        {
            find: 'persistKey="SoundpackStore"',
            replacement: {
                match: /getSoundpack\(\)\{/,
                replace: '$&if (Vencord.Settings.disableHolidayNotifications) return "classic";'
            }
        }
    ],

    start() {
        SettingsStore.addChangeListener("disableHolidayNotifications", this.refreshSoundpack);
    },

    stop() {
        SettingsStore.removeChangeListener("disableHolidayNotifications", this.refreshSoundpack);
    },

    refreshSoundpack() {
        SoundpackStore.emitChange();
    }
});
