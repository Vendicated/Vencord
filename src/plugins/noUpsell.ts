/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Sofia Lima
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
import { findByPropsLazy } from "@webpack";

const UserSettings = findByPropsLazy("markDirtyFromMigration");

export default definePlugin({
    name: "NoUpsell",
    description: "Suppresses all dismissible Nitro and feature ad popups",
    authors: [Devs.dzshn],

    patches: [
        {
            find: "HUB_WAITLIST_UPSELL=0",
            replacement: {
                match: /(?<=(\i)={dismissedContents:)new Uint8Array\(0\)(};.+?;)/,
                replace: "new Uint8Array(192).fill(0xff)$2return $1;"
            }
        },
    ],

    start() {
        // force cache to be out of sync with the parser patch
        UserSettings.updateAsync("userContent", (v: any) => {
            v.dismissedContents = new Uint8Array(48).fill(0xff);
        });
    },
});
