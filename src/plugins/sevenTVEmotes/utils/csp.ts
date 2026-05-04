/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SEVEN_TV_API_ORIGIN, SEVEN_TV_CDN_ORIGIN } from "@plugins/sevenTVEmotes/api/api";
import { relaunch } from "@utils/native";
import { Alerts } from "@webpack/common";

export async function ensureSevenTvCsp() {
    if (IS_WEB) return true;

    const hasApiConnect = await VencordNative.csp.isDomainAllowed(SEVEN_TV_API_ORIGIN, ["connect-src"]);
    const hasCdnImg = await VencordNative.csp.isDomainAllowed(SEVEN_TV_CDN_ORIGIN, ["img-src"]);

    let addedOverride = false;

    if (!hasApiConnect) {
        const result = await VencordNative.csp.requestAddOverride(SEVEN_TV_API_ORIGIN, ["connect-src"], "7TV Emotes");
        if (result === "ok") {
            addedOverride = true;
        } else {
            return false;
        }
    }

    if (!hasCdnImg) {
        const result = await VencordNative.csp.requestAddOverride(SEVEN_TV_CDN_ORIGIN, ["img-src"], "7TV Emotes");
        if (result === "ok") {
            addedOverride = true;
        } else {
            return false;
        }
    }

    if (addedOverride) {
        Alerts.show({
            title: "Restart Required",
            body: "7TV domains were allowed. Please fully restart Discord/Vesktop to apply CSP changes.",
            confirmText: "Restart now",
            cancelText: "Later",
            onConfirm: relaunch
        });
        return false;
    }

    return true;
}
