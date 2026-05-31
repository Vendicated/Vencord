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
import PKClient, { System, SystemFetchOptions } from "pkapi.js";

export var pkClient: PKClient;
export var cache: PKCache = {
    isReady: false,
    token: () => settings.store.pkToken,
    autoproxy: [],
    system: {} as System,
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
    name: "DiscordKit",
    description: "Integrates PluralKit into the Discord client",
    authors: [Devs.y2k4],
    settings,

    commands,
    start: async () => {
        try {
            if (cache.token().trim() !== "") {
                pkClient = new PKClient({ token: undefined });
                await VencordNative.csp.requestAddOverride(pkClient.base_url, ["connect-src"], "DiscordKit");

                cache.system = await pkClient.getSystem(
                    {
                        system: "@me",
                        fetch: ["config", "fronters", "group members", "groups", "members", "switches"] as SystemFetchOptions[],
                        token: cache.token()
                    }
                );

                cache.userId = UserStore.getCurrentUser()?.id;
                cache.isReady = true;

                showToast(`Succesfully logged into PluralKit: ${cache.system.id}`, Toasts.Type.SUCCESS);
            }
        } catch (err) {
            showToast((err as Error).message, Toasts.Type.FAILURE);
        }
    },
    stop: async () => {
        cache = {
            autoproxy: [],
            isReady: false,
            system: {} as System,
            userId: "",
            token: () => ""
        };
        await VencordNative.csp.removeOverride(pkClient.base_url);
        showToast("Unloaded DiscordKit", Toasts.Type.SUCCESS);
    }
});
