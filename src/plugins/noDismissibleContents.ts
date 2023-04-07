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
    name: "NoDismissibleContents",
    description: "Dismiss all upsell popups about Discord features or Nitro ads before you ever see them",
    authors: [Devs.dzshn],

    start() {
        UserSettings.getCurrentValue().userContent.dismissedContents = Uint8Array.from(Array(128), () => 255);
    }
});
