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

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

const SpotifyMatcher = /https:\/\/open\.spotify\.com\/(track|album|artist|playlist|user)\/([^S]+)/;

export default definePlugin({
    name: "OpenInApp",
    description: "Open spotify URLs in app",
    authors: [Devs.Ven],

    patches: [
        {
            find: '"MaskedLinkStore"',
            replacement: {
                match: /return ((\i)\.apply\(this,arguments\))(?=\}function \i.{0,200}\.trusted)/,
                replace: "return $self.handleLink(...arguments)||$1"
            }
        },
        // Make Spotify profile activity links open in app on web
        {
            find: "WEB_OPEN(",
            predicate: () => !IS_DISCORD_DESKTOP,
            replacement: {
                match: /\i\.\i\.isProtocolRegistered\(\)(.{0,100})window.open/g,
                replace: "true$1VencordNative.native.openExternal"
            }
        },
        {
            find: ".CONNECTED_ACCOUNT_VIEWED,",
            replacement: {
                match: /(?<=href:\i,onClick:function\(\)\{)(?=return \i=(\i)\.type,.{0,50}CONNECTED_ACCOUNT_VIEWED)/,
                replace: "$self.handleAccountView(arguments[0],$1.type,$1.id);"
            }
        }
    ],

    handleLink(data: { href: string; }, event: MouseEvent) {
        if (!data) return;

        const match = SpotifyMatcher.exec(data.href);
        if (!match) return;

        const [, type, id] = match;
        VencordNative.native.openExternal(`spotify:${type}:${id}`);
        event.preventDefault();

        return Promise.resolve();
    },

    handleAccountView(event: MouseEvent, platformType: string, otherUserId: string) {
        if (platformType !== "spotify") return;

        VencordNative.native.openExternal(`spotify:user:${otherUserId}`);
        event.preventDefault();
    }
});
