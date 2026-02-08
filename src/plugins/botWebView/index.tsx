/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Mavaki
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Toasts } from "@webpack/common";

const logger = new Logger("BotWebView");

const AccountPanelButton = findComponentByCodeLazy(".GREEN,positionKeyStemOverride:");
const Native = VencordNative.pluginHelpers.botWebView as PluginNative<typeof import("./native")>;

function getDashboardUrl() {
    return (Settings.plugins.botWebView.dashboardUrl || "").trim();
}

async function openDashboardNativeWindow(url: string) {
    if (!url) {
        Toasts.show({
            message: "Dashboard url not configured (plugin settings)",
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
            options: { duration: 2500 }
        });
        return;
    }

    if (!Native?.openDashboardWindow) {
        Toasts.show({
            message: "Embedded window opening unavailable (native)",
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
            options: { duration: 2500 }
        });
        return;
    }

    try {
        const ok = await Native.setDashboardUrl?.(url);
        if (!ok) {
            Toasts.show({
                message: "Invalid dashboard url (http/https required)",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId(),
                options: { duration: 2500 }
            });
            return;
        }

        await Native.openDashboardWindow();
    } catch (e) {
        logger.error("Error opening dashboard window", e);
        Toasts.show({
            message: "Unable to open the dashboard window (see console/logs)",
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
            options: { duration: 2500 }
        });
    }
}

function DashboardIcon({ height = 20, width = 20 }: { height?: number; width?: number; }) {
    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
        >
            <path d="M3 3h8v10H3V3Zm10 0h8v6h-8V3ZM3 15h8v6H3v-6Zm10-4h8v10h-8V11Z" />
        </svg>
    );
}

function DashboardPanelButtonImpl(props: { nameplate?: any; }) {
    return (
        <AccountPanelButton
            tooltipText="Open the bot dashboard"
            icon={DashboardIcon}
            plated={props?.nameplate != null}
            onClick={() => {
                if (IS_WEB) {
                    const url = getDashboardUrl();
                    if (!url) {
                        Toasts.show({
                            message: "Dashboard url not configured (plugin settings)",
                            type: Toasts.Type.FAILURE,
                            id: Toasts.genId(),
                            options: { duration: 2500 }
                        });
                        return;
                    }

                    window.open(url, "_blank", "noopener,noreferrer");
                    return;
                }

                void openDashboardNativeWindow(getDashboardUrl());
            }}
        />
    );
}

export default definePlugin({
    name: "botWebView",
    displayName: "Bot WebView",
    description: "A plugin that adds a webview to a bot dashboard.",
    authors: [Devs.mavaki],

    patches: [
        {
            // Injecte un bouton dans le panneau compte (bas-gauche)
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            replacement: {
                match: /children:\[(?=.{0,25}?accountContainerRef)/,
                replace: "children:[$self.DashboardPanelButton(arguments[0]),"
            }
        }
    ],

    DashboardPanelButton: ErrorBoundary.wrap(DashboardPanelButtonImpl, { noop: true }),

    options: {
        dashboardUrl: {
            type: OptionType.STRING,
            description: "Dashboard url (ex: https://bot.example.com/login)",
            default: ""
        },
    },

    start() {
        logger.info("Bot WebView started");
    },

    stop() {
        logger.info("Bot WebView stopped");
    }
});
