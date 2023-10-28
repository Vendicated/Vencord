/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";
import { Alerts, SettingsRouter } from "@webpack/common";

import { isPluginEnabled } from "../plugins";
import { Plugins } from "../Vencord";
import { isLinux, isMac, isWindows } from "./constants";
import { localStorage } from "./localStorage";

export function sendTelemetry() {
    // TODO: READD THIS CHECK BEFORE RELEASING!!
    // if (IS_DEV) return; // don't send on devbuilds, usually contains incorrect data

    // if we have not yet told the user about the telemetry's existence, DON'T send
    // a probe now, but tell them and then let them decide if they want to opt in or
    // not. this only takes place the next time the mod starts.
    if (!localStorage.getItem("Vencord_telemetryAcknowledged")) {
        Alerts.show({
            title: "Telemetry Notice",
            body: <>
                <p>
                    Vencord has a telemetry feature that sends anonymous data to us, which we use to improve the mod.
                </p>
                <p>
                    If you don't want this, that's okay! We haven't sent anything yet. You can disable this in the
                    settings at any time, easily. If you choose to do nothing, we'll send some information the next time
                    you reload or restart Discord.
                </p>
            </>,
            confirmText: "Okay",
            secondaryConfirmText: "Vencord Settings",
            onConfirmSecondary() {
                SettingsRouter.open("VencordSettings");
            },
        });

        localStorage.setItem("Vencord_telemetryAcknowledged", "1");

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
