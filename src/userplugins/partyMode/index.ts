/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { GenericStore } from "@webpack/common";

import { waitForStore } from "../../webpack/common/internal";


let PoggerModeSettingsStore: GenericStore;
let initialized: boolean = false;

enum Intensity {
    Normal,
    Better,
    ProjectX,
}

const settings = definePluginSettings({
    superIntensePartyMode: {
        description: "Party intensity (disable and re-enable plugin to apply changes)",
        type: OptionType.SELECT,
        options: [
            { label: "Normal", value: Intensity.Normal, default: true },
            { label: "Better", value: Intensity.Better },
            { label: "Project X", value: Intensity.ProjectX },
        ],
        restartNeeded: false
    },
});
export default definePlugin({
    name: "Party mode 🎉",
    description: "Allows you to use party mode cause party never ends ✨",
    authors: [
        {
            id: 691413039156690994n,
            name: "UwU",
        },
    ],
    settings,
    patches: [],
    start() {
        setPoggerState(true);
        setSettings(settings.store.superIntensePartyMode);
    },
    stop() {
        setPoggerState(false);
    },
});

function setPoggerState(state: boolean) {
    if (!initialized) {
        waitForStore("PoggermodeSettingsStore", m => PoggerModeSettingsStore = m);
        initialized = true;
    }
    PoggerModeSettingsStore.__getLocalVars().state.enabled = state;
    PoggerModeSettingsStore.__getLocalVars().state.settingsVisible = state;
}

function setSettings(intensity: Intensity) {
    if (intensity === Intensity.Normal) {
        console.log("Set party to normal mode");
        PoggerModeSettingsStore.__getLocalVars().state.screenshakeEnabledLocations = {
            0: true,
            1: false,
            2: false
        };
        PoggerModeSettingsStore.__getLocalVars().state.shakeIntensity = 1;
        PoggerModeSettingsStore.__getLocalVars().state.confettiSize = 16;
        PoggerModeSettingsStore.__getLocalVars().state.confettiCount = 5;
        PoggerModeSettingsStore.__getLocalVars().state.combosRequiredCount = 5;
    } else if (intensity === Intensity.Better) {
        console.log("Set party to metter mode");
        PoggerModeSettingsStore.__getLocalVars().state.screenshakeEnabledLocations = {
            0: true,
            1: true,
            2: true
        };
        PoggerModeSettingsStore.__getLocalVars().state.shakeIntensity = 1;
        PoggerModeSettingsStore.__getLocalVars().state.confettiSize = 12;
        PoggerModeSettingsStore.__getLocalVars().state.confettiCount = 8;
        PoggerModeSettingsStore.__getLocalVars().state.combosRequiredCount = 1;
    } else {
        console.log("Set party to project X mode");
        PoggerModeSettingsStore.__getLocalVars().state.screenshakeEnabledLocations = {
            0: true,
            1: true,
            2: true
        };
        PoggerModeSettingsStore.__getLocalVars().state.shakeIntensity = 20; // wtf is happening xd
        PoggerModeSettingsStore.__getLocalVars().state.confettiSize = 25;
        PoggerModeSettingsStore.__getLocalVars().state.confettiCount = 15;
        PoggerModeSettingsStore.__getLocalVars().state.combosRequiredCount = 1;
    }
}
