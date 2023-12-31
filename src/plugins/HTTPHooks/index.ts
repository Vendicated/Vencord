/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getCurrentChannel, openPrivateChannel } from "@utils/discord";
import definePlugin, { OptionType, PluginNative } from "@utils/types";

const Native = VencordNative.pluginHelpers.HTTPHooks as PluginNative<typeof import("./native")>;

const settings = definePluginSettings({
    serverPort: {
        type: OptionType.NUMBER,
        description: "The port the HTTP server should listen on",
        target: "DESKTOP",
        default: 1675,
        restartNeeded: true,
        async onChange() {
            await Native.stopServer();
        }
    }
});

export default definePlugin({
    name: "HTTPHooks",
    description: "Plugin that supports controlling Discord via HTTP endpoints",
    authors: [{
        id: 549866818269872138n,
        name: "lockieluke3389"
    }],
    settings,
    async start() {
        if (!IS_DISCORD_DESKTOP) {
            console.error("HTTPHooks is only available in the Desktop client");
            return;
        }
        await Native.startServer(settings.store.serverPort);
        console.log("HTTPHooks enabled");

        window.httphooks = {
            startVC: (userId: string) => {
                openPrivateChannel(userId);

                const timer = setInterval(() => {
                    const joinVC = document.querySelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > div > div > div.chat__52833 > section > div > div.toolbar__88c63 > div:nth-child(1)");
                    const currentChannel = getCurrentChannel();
                    if (joinVC && currentChannel.isDM() && currentChannel.recipients.includes(userId)) {
                        (joinVC as HTMLElement).click();
                        clearInterval(timer);
                    }
                }, 200);
            },
            endVC: () => {
                const leaveVC = document.querySelector("#app-mount > div.appAsidePanelWrapper__714a6 > div.notAppAsidePanel__9d124 > div.app_b1f720 > div > div.layers__1c917.layers_a23c37 > div > div > div > div > div.sidebar_ded4b5 > section > div.wrapper__0ed4a > div > div.flex_f5fbb7.horizontal__992f6.justifyStart__42744.alignCenter__84269.noWrap__5c413.connection__5bb32 > div.flex_f5fbb7.horizontal__992f6.justifyStart__42744.alignStretch_e239ef.noWrap__5c413 > button:nth-child(2)");
                if (leaveVC)
                    (leaveVC as HTMLElement).click();
            }
        };
    },
    async stop() {
        await Native.stopServer();
        console.log("HTTPHooks disabled");
    },
    beforeSave(options: Record<string, any>) {
        if (options.serverPort < 0 || options.serverPort > 65535)
            return "Port must be between 0 and 65535";
        return true;
    }
});
