/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and Megumin
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

import "@equicordplugins/_misc/styles.css";

import { Devs, EQUICORD_HELPERS, EquicordDevs, GUILD_ID } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Button, ChannelStore, Flex, Forms, GuildMemberStore, showToast, Toasts } from "@webpack/common";
import { JSX } from "react";

import { toggleEnabled } from "./utils";


export default definePlugin({
    name: "EquicordHelper",
    description: "Fixes some misc issues with discord",
    authors: [Devs.thororen, EquicordDevs.nyx, EquicordDevs.Naibuu],
    settingsAboutComponent: () => <>
        <Forms.FormText className="plugin-warning" style={{ textAlign: "left" }}>
            This plugin was created to allow us as the Equicord Team & Contributors
            to fix miscellaneous issues Discord may run into or cause.
            <br />
            This includes but is not limited to:
            <br />
            - Unknown Resolution/FPS Fixed?
            <br />
            - Whitelists all domains in CSP
        </Forms.FormText>
    </>,
    required: true,
    patches: [
        // Fixes Unknown Resolution/FPS Crashing
        {
            find: "Unknown resolution:",
            replacement: [
                {
                    match: /throw Error\("Unknown resolution: ".concat\((\i)\)\)/,
                    replace: "return $1;"
                },
                {
                    match: /throw Error\("Unknown frame rate: ".concat\((\i)\)\)/,
                    replace: "return $1;"
                }
            ]
        }
    ],
    renderMessageAccessory(props) {
        const buttons = [] as JSX.Element[];

        const equicordSupport = GuildMemberStore.getMember(GUILD_ID, props.message.author.id)?.roles?.includes(EQUICORD_HELPERS);

        const msg = props.message.content?.toLowerCase() ?? "";

        const contentWords = (msg.match(/`\w+`/g) ?? []).map(e => e.slice(1, -1));
        const matchedPlugins = Object.keys(Vencord.Plugins.plugins).filter(name => contentWords.includes(name.toLowerCase()));
        const matchedPlugin = matchedPlugins.sort((a, b) => b.length - a.length)[0];
        const pluginData = matchedPlugin && Vencord.Plugins.plugins[matchedPlugin];
        const equicordGuild = ChannelStore.getChannel(props.channel.id)?.guild_id === GUILD_ID;
        const ableCheck = msg.startsWith("enable") || msg.startsWith("disable");
        const shouldAddPluginButtons = equicordGuild && equicordSupport && matchedPlugin && pluginData && ableCheck;

        if (shouldAddPluginButtons) {
            if (pluginData.required || pluginData.name.endsWith("API")) return;
            const isEnabled = Vencord.Plugins.isPluginEnabled(matchedPlugin);
            buttons.push(
                <Button
                    key="vc-plugin-toggle"
                    color={isEnabled ? Button.Colors.RED : Button.Colors.GREEN}
                    onClick={async () => {
                        try {
                            const success = await toggleEnabled(matchedPlugin);
                            if (success) showToast(`${isEnabled ? "Disabled" : "Enabled"} ${matchedPlugin}`, Toasts.Type.SUCCESS);
                        } catch (e) {
                            new Logger(this.name).error("Error while toggling:", e);
                            showToast(`Failed to toggle ${matchedPlugin}`, Toasts.Type.FAILURE);
                        }
                    }}
                >
                    {`${isEnabled ? "Disable" : "Enable"} ${matchedPlugin}`}
                </Button>
            );
        }

        return buttons.length
            ? <Flex>{buttons}</Flex>
            : null;
    }
});
