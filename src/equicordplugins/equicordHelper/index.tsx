/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@equicordplugins/_misc/styles.css";

import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { isEquicordGuild, isEquicordSupport } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Flex, showToast, Toasts } from "@webpack/common";
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
    renderMessageAccessory(props) {
        return pluginToggleButtons(props);
    }
});

function pluginToggleButtons(props) {
    const buttons = [] as JSX.Element[];
    const msg = props.message.content?.toLowerCase() ?? "";

    const contentWords = (msg.match(/`\w+`/g) ?? []).map(e => e.slice(1, -1));
    const matchedPlugins = Object.keys(Vencord.Plugins.plugins).filter(name => contentWords.includes(name.toLowerCase()));
    const matchedPlugin = matchedPlugins.sort((a, b) => b.length - a.length)[0];
    const pluginData = matchedPlugin ? Vencord.Plugins.plugins[matchedPlugin] : null;

    const isEquicord = isEquicordGuild(props.channel.id) && isEquicordSupport(props.message.author.id);
    const startsWithEnabled = msg.startsWith("enable");
    const startsWithDisabled = msg.startsWith("disable");

    const shouldAddPluginButtons = pluginData && isEquicord && (startsWithEnabled || startsWithDisabled);

    if (shouldAddPluginButtons) {
        if (pluginData.required || pluginData.name.endsWith("API")) return;
        const isEnabled = Vencord.Plugins.isPluginEnabled(matchedPlugin);

        let label = `${matchedPlugin} is already ${isEnabled ? "enabled" : "disabled"}`;
        let disabled = true;

        if ((startsWithDisabled && isEnabled) || (startsWithEnabled && !isEnabled)) {
            label = `${isEnabled ? "Disable" : "Enable"} ${matchedPlugin}`;
            disabled = false;
        }

        buttons.push(
            <Button
                key="vc-plugin-toggle"
                color={disabled ? Button.Colors.PRIMARY : (isEnabled ? Button.Colors.RED : Button.Colors.GREEN)}
                disabled={disabled}
                size={Button.Sizes.SMALL}
                onClick={async () => {
                    try {
                        const success = await toggleEnabled(matchedPlugin);
                        if (success) showToast(`${label}`, Toasts.Type.SUCCESS);
                    } catch (e) {
                        new Logger("EquicordHelper").error("Error while toggling:", e);
                        showToast(`Failed to ${label.toLowerCase()}`, Toasts.Type.FAILURE);
                    }
                }}
            >
                {label}
            </Button>
        );
    }

    return buttons.length
        ? <Flex>{buttons}</Flex>
        : null;
}
