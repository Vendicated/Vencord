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

// Import required modules and components
import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

// Importing the style managed fixes on and off switch
import betterauthapps from "./css/betterauthapps.css?managed";
import betterstatuspicker from "./css/betterstatuspicker.css?managed";
import discordicons from "./css/discordicons.css?managed";
import gradientbuttons from "./css/gradientbuttons.css?managed";
import nitrothemesfix from "./css/nitrothemesfix.css?managed";
import settingsicons from "./css/settingsicons.css?managed";
import userreimagined from "./css/userreimagined.css?managed";

// Forcing restartNeeded: true to not overcomplicate the live update of the settings using FluxDispatcher and making it complex
const settings = definePluginSettings({
    betterAuthApps: {
        type: OptionType.BOOLEAN,
        description: "Enable Better Auth Apps CSS",
        restartNeeded: true,
        default: false
    },
    betterStatusPicker: {
        type: OptionType.BOOLEAN,
        description: "Enable Better Status Picker CSS",
        restartNeeded: true,
        default: false
    },
    discordicons: {
        type: OptionType.BOOLEAN,
        description: "Enable Discord Icons CSS",
        restartNeeded: true,
        default: false
    },
    gradientButtons: {
        type: OptionType.BOOLEAN,
        description: "Enable Gradient Buttons CSS",
        restartNeeded: true,
        default: false
    },
    nitroThemesFix: {
        type: OptionType.BOOLEAN,
        description: "Enable Fix Nitro Themes CSS",
        restartNeeded: true,
        default: false
    },
    settingsIcons: {
        type: OptionType.BOOLEAN,
        description: "Enable Settings Icons CSS",
        restartNeeded: true,
        default: false
    },
    userReimagined: {
        type: OptionType.BOOLEAN,
        description: "Enable User Reimagined CSS",
        restartNeeded: true,
        default: false
    }
});

let settingsArray: Array<any> = [];
let cssArray: Array<any> = [];

export default definePlugin({
    name: "EquicordCSS",
    description: "CSS for Equicord users. You will need to look at the settings.",
    authors: [EquicordDevs.thororen, EquicordDevs.Panniku],
    dependencies: ["ThemeAttributes"],
    settings,
    start() {

        // Push variables to array to iterate on start() and stop()
        settingsArray.push(
            settings.store.betterAuthApps,
            settings.store.betterStatusPicker,
            settings.store.discordicons,
            settings.store.gradientButtons,
            settings.store.nitroThemesFix,
            settings.store.settingsIcons,
            settings.store.userReimagined
        );
        cssArray.push(
            betterauthapps,
            betterstatuspicker,
            discordicons,
            gradientbuttons,
            nitrothemesfix,
            settingsicons,
            userreimagined
        );

        settingsArray.forEach((s, i) => {
            if (s) enableStyle(cssArray[i]);
        });
    },
    stop() {

        settingsArray.forEach((s, i) => {
            if (s) disableStyle(cssArray[i]);
        });

        settingsArray = [];
        cssArray = [];
    }
});
