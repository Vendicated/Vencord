/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { commands } from "@plugins/discordKit/commands";
import { PKCache } from "@plugins/discordKit/utils";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts, UserStore } from "@webpack/common";
import PKClient, { SystemAutoproxySettings } from "pkapi.js";

export var pkClient: PKClient;
export var cache: PKCache = {
    token: () => settings.store.pkToken,
    autoproxy: [] as SystemAutoproxySettings[],
    system: {} as any,
    userId: ""
};

const settings = definePluginSettings({
    pkToken: {
        type: OptionType.STRING,
        description: "PluralKit Token",
        default: "",
        restartNeeded: true
    }
});

export default definePlugin({
    name: "PKIntegration",
    description: "Integrates PluralKit into the Discord client",
    authors: [Devs.y2k4],
    settings,

    commands,
    start: async () => {
        try {
            await VencordNative.csp.requestAddOverride(
                "https://api.pluralkit.me",
                ["connect-src"],
                "PluralKit Integration Plugin"
            );

            pkClient = new PKClient({ token: undefined });

            cache.system = await pkClient.getSystem(
                {
                    system: "@me",
                    fetch: ["config", "fronters", "group members", "groups", "members", "switches"],
                    token: cache.token()
                }
            );
            showToast(`Succesfully logged into PluralKit: ${cache.system.id}`, Toasts.Type.SUCCESS);
            cache.userId = UserStore.getCurrentUser()?.id;
        } catch (err) {
            showToast((err as Error).message as string, Toasts.Type.FAILURE);
        }
    }
});
