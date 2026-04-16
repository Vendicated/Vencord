/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import { PresetManager } from "./components/presetManager";
import { loadPresets, PresetSection } from "./utils/storage";

export const cl = classNameFactory("vc-profile-presets-");
export const settings = definePluginSettings({
    avatarSize: {
        type: OptionType.SLIDER,
        description: "Avatar size in preset list.",
        markers: [56, 64, 72, 80, 88, 96],
        default: 56,
        stickToMarkers: true
    },
});

export default definePlugin({
    name: "ProfileSets",
    description: "Allows you to save and load different profile presets, via the Profile Section in Settings.",
    authors: [EquicordDevs.omaw, EquicordDevs.justjxke],
    settings,
    patches: [
        {
            find: "DefaultCustomizationSections: user cannot be undefined",
            replacement: {
                match: /return.{0,50}children:\[(?<=\.getLegacyUsername\(\).*?)/,
                replace: "$&$self.renderPresetSection(\"main\"),"
            }
        },
        {
            find: "USER_SETTINGS_GUILD_PROFILE)",
            replacement: {
                match: /guildId:(\i\.id),onChange:(\i)\}\)(?=.{0,25}profilePreviewTitle:)/,
                replace: 'guildId:$1,onChange:$2}),$self.renderPresetSection("server",$1)'
            }
        }
    ],
    start() {
        loadPresets("main");
    },
    renderPresetSection(section: PresetSection, guildId?: string) {
        return <PresetManager section={section} guildId={guildId} />;
    }
});
