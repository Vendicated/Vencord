/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const boolSetting = (description, def?: boolean) => ({
    type: OptionType.BOOLEAN,
    description,
    default: def
}) as const;

const PLUGIN_NAME = "JoinVoiceSettings";
const PLUGIN_PATH = `Vencord.Plugins.plugins.${PLUGIN_NAME}`;

export default definePlugin({
    name: PLUGIN_NAME,
    description: "Gives you more control over your mute and deafen state when joining a voice channel.",
    authors: [Devs.MyNameIsJeff],
    settings: definePluginSettings({
        autoMute: boolSetting("Automatically mute when joining a voice channel", false),
        autoDeafen: boolSetting("Automatically deafen when joining a voice channel", false),
        noAutoUnmute: boolSetting("Stop Discord from automatically unmuting when joining a voice channel", false),
        noAutoUndeafen: boolSetting("Stop Discord from automatically undeafening when joining a voice channel", false),
    }),
    patches: [
        {
            find: ".displayName=\"MediaEngineStore\"",
            replacement: {
                match: /(?<pre>VOICE_CHANNEL_SELECT:function\(.{1,2}\){.{0,250}?\if\((?<var>.{1,2})\.mute\|\|.{1,2}\.deaf)(?<mid>\).{0,50}?\({)deaf:!1,mute:!1(?<post>}\);)/,
                replace: `$<pre>||${PLUGIN_PATH}.shouldOverride($<var>)$<mid>deaf:${PLUGIN_PATH}.shouldDeafen($<var>),mute:${PLUGIN_PATH}.shouldMute($<var>)$<post>`,
            },
        },
    ],
    shouldOverride(_s: AudioSettings) {
        return this.settings.store.autoMute || this.settings.store.autoDeafen;
    },
    shouldDeafen(s: AudioSettings) {
        return this.settings.store.autoDeafen || (s.deaf && this.settings.store.noAutoUndeafen);
    },
    shouldMute(s: AudioSettings) {
        return this.settings.store.autoDeafen || this.settings.store.autoMute || (s.mute && (this.settings.store.noAutoUnmute || (s.deaf && this.settings.store.noAutoUndeafen)));
    }
});

type AudioSettings = {
    mute: boolean,
    deaf: boolean;
};
