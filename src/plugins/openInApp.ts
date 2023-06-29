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

const SpotifyMatcher = /https:\/\/open\.spotify\.com\/(track|album|artist|playlist)\/([^S]+)/;

export default definePlugin({
    name: "OpenInApp",
    description: "Open spotify URLs in app",
    authors: [Devs.Ven],

    patches: [{
        find: '"MaskedLinkStore"',
        replacement: {
            match: /return ((\i)\.apply\(this,arguments\))(?=\}function \i.{0,200}\.trusted)/,
            replace: "return $self.handleLink(...arguments)||$1"
        }
    }],

    handleLink(data: { href: string; }, event: MouseEvent) {
        if (!data) return;

        const match = SpotifyMatcher.exec(data.href);
        if (!match) return;

        const [, type, id] = match;
        VencordNative.native.openExternal(`spotify:${type}:${id}`);
        event.preventDefault();

        return Promise.resolve();
    }
});
