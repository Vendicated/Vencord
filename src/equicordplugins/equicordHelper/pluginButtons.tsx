/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled, plugins } from "@api/PluginManager";
import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import { isEquicordGuild, isEquicordSupport } from "@utils/misc";
import { Message } from "@vencord/discord-types";
import { Button, showToast, Toasts } from "@webpack/common";
import { JSX } from "react";

import { toggleEnabled } from "./utils";

export const PluginButtons = ErrorBoundary.wrap(function PluginCards({ message }: { message: Message; }) {
    const pluginButtons = [] as JSX.Element[];
    const msg = message.content?.toLowerCase() ?? "";

    const contentWords = (msg.match(/`\w+`/g) ?? []).map(e => e.slice(1, -1));
    const matchedPlugins = Object.keys(plugins).filter(name => contentWords.includes(name.toLowerCase()));
    const matchedPlugin = matchedPlugins.sort((a, b) => b.length - a.length)[0];
    const pluginData = matchedPlugin ? plugins[matchedPlugin] : null;

    const isEquicord = isEquicordGuild(message.channel_id) && isEquicordSupport(message.author.id);
    const startsWithEnabled = msg.startsWith("enable");
    const startsWithDisabled = msg.startsWith("disable");

    const shouldAddPluginButtons = pluginData && isEquicord && (startsWithEnabled || startsWithDisabled);

    if (shouldAddPluginButtons) {
        if (pluginData.required || pluginData.name.endsWith("API")) return;
        const isEnabled = isPluginEnabled(matchedPlugin);

        let label = `${matchedPlugin} is already ${isEnabled ? "enabled" : "disabled"}`;
        let disabled = true;

        if ((startsWithDisabled && isEnabled) || (startsWithEnabled && !isEnabled)) {
            label = `${isEnabled ? "Disable" : "Enable"} ${matchedPlugin}`;
            disabled = false;
        }

        pluginButtons.push(
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

    if (pluginButtons.length === 0) return null;

    return (
        <div className="vc-plugins-action-buttons" style={{ marginTop: "0px" }}>
            {pluginButtons}
        </div>
    );
}, { noop: true });
