/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";
import type { MouseEvent } from "react";

const ShortUrlMatcher = /^https:\/\/(spotify\.link|s\.team)\/.+$/;
const SpotifyMatcher = /^https:\/\/open\.spotify\.com\/(track|album|artist|playlist|user)\/(.+)(?:\?.+?)?$/;
const SteamMatcher = /^https:\/\/(steamcommunity\.com|(?:help|store)\.steampowered\.com)\/.+$/;
const EpicMatcher = /^https:\/\/store\.epicgames\.com\/(.+)$/;

const settings = definePluginSettings({
    spotify: {
        type: OptionType.BOOLEAN,
        description: "Open Spotify links in the Spotify app",
        default: true,
    },
    steam: {
        type: OptionType.BOOLEAN,
        description: "Open Steam links in the Steam app",
        default: true,
    },
    epic: {
        type: OptionType.BOOLEAN,
        description: "Open Epic Games links in the Epic Games Launcher",
        default: true,
    }
});

export default definePlugin({
    name: "OpenInApp",
    description: "Open Spotify, Steam and Epic Games URLs in their respective apps instead of your browser",
    authors: [Devs.Ven],
    settings,

    patches: [
        {
            find: "trackAnnouncementMessageLinkClicked({",
            replacement: {
                match: /(?<=handleClick:function\(\)\{return (\i)\}.+?)async function \1\(.+?\)\{/,
                replace: "$& if(await $self.handleLink(...arguments)) return;"
            }
        },
        // Make Spotify profile activity links open in app on web
        {
            find: "WEB_OPEN(",
            predicate: () => !IS_DISCORD_DESKTOP && settings.store.spotify,
            replacement: {
                match: /\i\.\i\.isProtocolRegistered\(\)(.{0,100})window.open/g,
                replace: "true$1VencordNative.native.openExternal"
            }
        },
        {
            find: ".CONNECTED_ACCOUNT_VIEWED,",
            replacement: {
                match: /(?<=href:\i,onClick:\i=>\{)(?=.{0,10}\i=(\i)\.type,.{0,100}CONNECTED_ACCOUNT_VIEWED)/,
                replace: "$self.handleAccountView(arguments[0],$1.type,$1.id);"
            }
        }
    ],

    async handleLink(data: { href: string; }, event?: MouseEvent) {
        if (!data) return false;

        let url = data.href;
        if (!IS_WEB && ShortUrlMatcher.test(url)) {
            event?.preventDefault();
            // CORS jumpscare
            url = await VencordNative.pluginHelpers.OpenInApp.resolveRedirect(url);
        }

        spotify: {
            if (!settings.store.spotify) break spotify;

            const match = SpotifyMatcher.exec(url);
            if (!match) break spotify;

            const [, type, id] = match;
            VencordNative.native.openExternal(`spotify:${type}:${id}`);

            event?.preventDefault();
            return true;
        }

        steam: {
            if (!settings.store.steam) break steam;

            if (!SteamMatcher.test(url)) break steam;

            VencordNative.native.openExternal(`steam://openurl/${url}`);
            event?.preventDefault();

            // Steam does not focus itself so show a toast so it's slightly less confusing
            showToast("Opened link in Steam", Toasts.Type.SUCCESS);
            return true;
        }

        epic: {
            if (!settings.store.epic) break epic;

            const match = EpicMatcher.exec(url);
            if (!match) break epic;

            VencordNative.native.openExternal(`com.epicgames.launcher://store/${match[1]}`);
            event?.preventDefault();

            return true;
        }

        // in case short url didn't end up being something we can handle
        if (event?.defaultPrevented) {
            window.open(url, "_blank");
            return true;
        }

        return false;
    },

    handleAccountView(event: { preventDefault(): void; }, platformType: string, userId: string) {
        if (platformType === "spotify" && settings.store.spotify) {
            VencordNative.native.openExternal(`spotify:user:${userId}`);
            event.preventDefault();
        } else if (platformType === "steam" && settings.store.steam) {
            VencordNative.native.openExternal(`steam://openurl/https://steamcommunity.com/profiles/${userId}`);
            showToast("Opened link in Steam", Toasts.Type.SUCCESS);
            event.preventDefault();
        }
    }
});
