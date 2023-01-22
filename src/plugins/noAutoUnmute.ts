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
import definePlugin, { OptionType } from "@utils/types";

const boolSetting = (description, def?: boolean) => ({
    type: OptionType.BOOLEAN,
    description,
    default: def
}) as const;

const PLUGIN_NAME = "NoAutoUnmute";

export default definePlugin({
    name: PLUGIN_NAME,
    description: "Stops Discord from automatically unmuting you when you join a voice channel.",
    authors: [{
        name: "My-Name-Is-Jeff",
        id: 150427554166210560n
    }],
    settings: definePluginSettings({
        autoMute: boolSetting("Automatically mute when joining a voice channel.", false),
        autoDeafen: boolSetting("Automatically deafen when joining a voice channel.", false),
    }),
    patches: [
        {
            find: ".displayName=\"MediaEngineStore\"",
            replacement: {
                match: /(?<pre>VOICE_CHANNEL_SELECT:function\(.{1,2}\){.{0,250}?\if\(.{1,2}\.mute\|\|.{1,2}\.deaf)(?<mid>\).{0,50}?\({)deaf:!1,mute:!1(?<post>}\);)/,
                replace: `$<pre>||Vencord.Plugins.plugins.${PLUGIN_NAME}.shouldOverride()$<mid>deaf:Vencord.Plugins.plugins.${PLUGIN_NAME}.shouldDeafen(),mute:true$<post>`,
            },
        },
    ],
    shouldOverride() {
        return this.settings.store.autoMute || this.settings.store.autoDeafen;
    },
    shouldDeafen() {
        return this.settings.store.autoDeafen;
    }
});
