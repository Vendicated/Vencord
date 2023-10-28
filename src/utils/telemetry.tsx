/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { Alerts } from "@webpack/common";

import { isPluginEnabled } from "../plugins";
import { Plugins } from "../Vencord";
import { isLinux, isMac, isWindows } from "./constants";

export function sendTelemetry() {
    // TODO: READ THIS CHECK BEFORE RELEASING!!
    // if (IS_DEV) return; // don't send on devbuilds, usually contains incorrect data

    // if we have not yet told the user about the telemetry's existence, or they haven't agreed at all, DON'T send a
    // probe now, but tell them and then let them decide if they want to opt in or not.
    if (Settings.telemetry === undefined) {
        Alerts.show({
            title: "Telemetry Notice",
            body: <>
                <p>
                    Vencord has a telemetry feature that sends anonymous data to us, which we use to improve the mod. We
                    gather your operating system, the version of Vencord you're using and a list of enabled plugins, and
                    we can use this data to help improve it for yourself and everyone else.
                </p>
                <p>
                    If you don't want this, that's okay! We haven't sent anything yet. Please decide if you want to allow
                    us to gather a little bit of data. You can change this setting at any time in the future. If you
                    grant consent, we will start sending the data above the next time you reload or restart Discord.
                </p>
            </>,
            confirmText: "Yes, that's fine",
            cancelText: "No, I don't want that",

            onConfirm() {
                Settings.telemetry = true;
            },

            onCancel() {
                Settings.telemetry = false;
            }
        });

        return;
    }

    // if it's disabled in settings, obviously don't do anything
    if (!Settings.telemetry) return;

    const activePluginsList = Object.keys(Plugins.plugins)
        .filter(p => isPluginEnabled(p));

    let operatingSystem = "Unknown";

    if (isWindows) operatingSystem = "Windows";
    else if (isMac) operatingSystem = "macOS";
    else if (isLinux) operatingSystem = "Linux";

    const data = {
        version: VERSION,
        plugins: activePluginsList,
        operatingSystem
    };

    navigator.sendBeacon("https://api.vencord.dev/v1/telemetry", JSON.stringify(data));
}
