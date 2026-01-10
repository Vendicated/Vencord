/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative, SettingsDefinition } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";
import type { MouseEvent } from "react";

interface URLReplacementRule {
    match: RegExp;
    replace: (...matches: string[]) => string;
    description: string;
    shortlinkMatch?: RegExp;
    accountViewReplace?: (userId: string) => string;
}

// Do not forget to add protocols to the ALLOWED_PROTOCOLS constant
const UrlReplacementRules: Record<string, URLReplacementRule> = {
    spotify: {
        match: /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|artist|playlist|user|episode|prerelease)\/(.+)(?:\?.+?)?$/,
        replace: (_, type, id) => `spotify://${type}/${id}`,
        description: "Open Spotify links in the Spotify app",
        shortlinkMatch: /^https:\/\/spotify\.link\/.+$/,
        accountViewReplace: userId => `spotify:user:${userId}`,
    },
    steam: {
        match: /^https:\/\/(steamcommunity\.com|(?:help|store)\.steampowered\.com)\/.+$/,
        replace: match => `steam://openurl/${match}`,
        description: "Open Steam links in the Steam app",
        shortlinkMatch: /^https:\/\/s.team\/.+$/,
        accountViewReplace: userId => `steam://openurl/https://steamcommunity.com/profiles/${userId}`,
    },
    epic: {
        match: /^https:\/\/store\.epicgames\.com\/(.+)$/,
        replace: (_, id) => `com.epicgames.launcher://store/${id}`,
        description: "Open Epic Games links in the Epic Games Launcher",
    },
    tidal: {
        match: /^https:\/\/(?:listen\.)?tidal\.com\/(?:browse\/)?(track|album|artist|playlist|user|video|mix)\/([a-f0-9-]+).*/,
        replace: (_, type, id) => `tidal://${type}/${id}`,
        description: "Open Tidal links in the Tidal app",
    },
    itunes: {
        match: /^https:\/\/(?:geo\.)?music\.apple\.com\/([a-z]{2}\/)?(album|artist|playlist|song|curator)\/([^/?#]+)\/?([^/?#]+)?(?:\?.*)?(?:#.*)?$/,
        replace: (_, lang, type, name, id) => id ? `itunes://music.apple.com/us/${type}/${name}/${id}` : `itunes://music.apple.com/us/${type}/${name}`,
        description: "Open Apple Music links in the iTunes app"
    },
};

const pluginSettings = definePluginSettings(
    Object.entries(UrlReplacementRules).reduce((acc, [key, rule]) => {
        acc[key] = {
            type: OptionType.BOOLEAN,
            description: rule.description,
            default: true,
        };
        return acc;
    }, {} as SettingsDefinition)
);


const Native = VencordNative.pluginHelpers.OpenInApp as PluginNative<typeof import("./native")>;

export default definePlugin({
    name: "OpenInApp",
    description: "Open links in their respective apps instead of your browser",
    authors: [Devs.Ven, Devs.surgedevs],
    settings: pluginSettings,

    patches: [
        {
            find: "trackAnnouncementMessageLinkClicked({",
            replacement: {
                match: /function (\i\(\i,\i\)\{)(?=.{0,150}trusted:)/,
                replace: "async function $1 if(await $self.handleLink(...arguments)) return;"
            }
        },
        {
            find: "no artist ids in metadata",
            predicate: () => !IS_DISCORD_DESKTOP && pluginSettings.store.spotify,
            replacement: [
                {
                    match: /\i\.\i\.isProtocolRegistered\(\)/g,
                    replace: "true"
                },
                {
                    match: /\(0,\i\.isDesktop\)\(\)/,
                    replace: "true"
                }
            ]
        },

        // User Profile Modal & User Profile Modal v2
        ...[".__invalid_connectedAccountOpenIconContainer", ".BLUESKY||"].map(find => ({
            find,
            replacement: {
                match: /(?<=onClick:(\i)=>\{)(?=.{0,100}\.CONNECTED_ACCOUNT_VIEWED)(?<==(\i)\.metadata.+?)/,
                replace: "if($self.handleAccountView($1,$2.type,$2.id)) return;"
            }
        }))
    ],

    async handleLink(data: { href: string; }, event?: MouseEvent) {
        if (!data) return false;

        let url = data.href;
        if (!url) return false;

        for (const [key, rule] of Object.entries(UrlReplacementRules)) {
            if (!pluginSettings.store[key]) continue;

            if (rule.shortlinkMatch?.test(url)) {
                event?.preventDefault();
                url = await Native.resolveRedirect(url);
            }

            if (rule.match.test(url)) {
                showToast("Opened link in native app", Toasts.Type.SUCCESS);

                const newUrl = url.replace(rule.match, rule.replace);
                await VencordNative.native.openExternal(newUrl);

                event?.preventDefault();
                return true;
            }
        }

        // in case short url didn't end up being something we can handle
        if (event?.defaultPrevented) {
            window.open(url, "_blank");
            return true;
        }

        return false;
    },

    handleAccountView(e: MouseEvent, platformType: string, userId: string) {
        const rule = UrlReplacementRules[platformType];
        if (rule?.accountViewReplace && pluginSettings.store[platformType]) {
            VencordNative.native.openExternal(rule.accountViewReplace(userId));
            e.preventDefault();
            return true;
        }
    }
});
