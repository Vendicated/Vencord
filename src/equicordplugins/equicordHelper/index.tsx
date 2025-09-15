/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@equicordplugins/_misc/styles.css";

import { definePluginSettings, Settings } from "@api/Settings";
import { Devs, EQUICORD_HELPERS, EquicordDevs, GUILD_ID } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { Button, ChannelStore, Flex, GuildMemberStore, showToast, Toasts } from "@webpack/common";
import { JSX } from "react";

import { toggleEnabled } from "./utils";

const settings = definePluginSettings({
    disableCreateDMButton: {
        type: OptionType.BOOLEAN,
        description: "Disables the create dm button",
        restartNeeded: true,
        default: false,
    },
    disableDMContextMenu: {
        type: OptionType.BOOLEAN,
        description: "Disables the DM list context menu in favor of the x button",
        restartNeeded: true,
        default: false
    }
});

export default definePlugin({
    name: "EquicordHelper",
    description: "Used to provide support, fix discord caused crashes, and other misc features.",
    authors: [Devs.thororen, EquicordDevs.nyx, EquicordDevs.Naibuu],
    required: true,
    settings,
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
        },
        {
            find: ".createDMButtonContainer,",
            replacement: {
                match: /"create-dm"\)/,
                replace: "$&&&false"
            },
            predicate: () => settings.store.disableCreateDMButton
        },
        {
            find: "#{intl::d+e27u::raw}",
            replacement: {
                match: /\{dotsInsteadOfCloseButton:(\i),rearrangeContextMenu:(\i).*?autoTrackExposure:!0\}\)/,
                replace: "$1=false,$2=false"
            },
            predicate: () => settings.store.disableDMContextMenu
        },
    ],
    start() {
        if (Settings.plugins?.PinDMs?.disableCreateDMButton) {
            settings.store.disableCreateDMButton = true;
        }
    },
    renderMessageAccessory(props) {
        return pluginToggleButtons(props);
    }
});

function pluginToggleButtons(props) {
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
                        new Logger("EquicordHelper").error("Error while toggling:", e);
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
