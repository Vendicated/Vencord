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
                match: /(?<pre>VOICE_CHANNEL_SELECT:function\((?<event>.{1,2})\){.*?\if\((?<var>.{1,2})\.mute\|\|\k<var>\.deaf)(?<mid>\).{0,50}?\({)deaf:!1,mute:!1(?<post>}\);)/,
                replace: `$<pre>||${PLUGIN_PATH}.shouldOverride()$<mid>deaf:${PLUGIN_PATH}.shouldDeafen($<event>,$<var>),mute:${PLUGIN_PATH}.shouldMute($<event>,$<var>)$<post>`,
            },
        },
        {
            find: ".displayName=\"MediaEngineStore\"",
            replacement: {
                match: /(?<pre>VOICE_CHANNEL_SELECT:function\((?<event>.{1,2})\){var (?<var>.{1,2})=\k<event>\.guildId.+?if\()(?<cond>null==\k<var>)/,
                replace: `$<pre>($<cond>||${PLUGIN_PATH}.shouldOverride())`
            }
        }
    ],
    shouldOverride() {
        return this.settings.store.autoMute || this.settings.store.autoDeafen;
    },
    shouldDeafen(e: VoiceChannelSelectEvent, s: AudioSettings) {
        return this.settings.store.autoDeafen || (s.deaf && (e.guildId != null || this.settings.store.noAutoUndeafen));
    },
    shouldMute(e: VoiceChannelSelectEvent, s: AudioSettings) {
        return this.settings.store.autoDeafen || this.settings.store.autoMute || (s.mute && (e.guildId != null || this.settings.store.noAutoUnmute || (s.deaf && this.settings.store.noAutoUndeafen)));
    }
});

interface AudioSettings {
    mute: boolean,
    deaf: boolean;
}

interface VoiceChannelSelectEvent {
    type: "VOICE_CHANNEL_SELECT";
    guildId?: string;
    channelId?: string;
    currentVoiceChannelId?: string;
    video: boolean;
    stream: boolean;
}
