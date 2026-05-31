/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { authorize, tryLogin } from "@plugins/discordKit/auth";
import { commands } from "@plugins/discordKit/commands";
import { PKCache } from "@plugins/discordKit/utils";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";
import PKClient, { System } from "pkapi.js";

export let pkClient: PKClient;
export const cache: PKCache = {
    isReady: false,
    token: () => settings.store.pk_token,
    autoproxy: [],
    system: {} as System,
    userId: ""
};

export enum PK {
    csp = "*.pluralkit.me",
    clientID = "466378653216014359",
    redirect = "https://dash.pluralkit.me/login/discord",
    callback = "https://api.pluralkit.me/private/discord/callback",
    dashboard = "https://dash.pluralkit.me"
}

export const settings = definePluginSettings({
    authorize: {
        type: OptionType.COMPONENT,
        component: () => (
            <Button onClick={() => {
                authorize(async (token: string) => {
                    settings.store.pk_token = token;
                    await tryLogin(pkClient, cache);
                });
            }}>
                Log into PluralKit
            </Button>
        )
    },
    pk_token: {
        type: OptionType.STRING,
        hidden: true,
        description: "PluralKit API token",
        default: ""
    }
});

export default definePlugin({
    name: "DiscordKit",
    description: "Integrates PluralKit into the Discord client",
    authors: [Devs.y2k4],
    settings,

    commands,
    start: async () => {
        await VencordNative.csp.requestAddOverride(PK.csp, ["connect-src"], "DiscordKit");
        pkClient = new PKClient({ token: undefined });

        if (cache.token() !== "") {
            if (!await tryLogin(pkClient, cache)) {
                settings.store.pk_token = "";
            }
        }
    },
    stop: async () => {
        await VencordNative.csp.removeOverride(PK.csp);
        showToast("Unloaded DiscordKit", Toasts.Type.SUCCESS);
    }
});
