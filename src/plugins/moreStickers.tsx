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

export default definePlugin({
    name: "MoreStickers",
    description: "Adds sticker packs from apps like LINE",
    authors: [Devs.Arjix],

    patches: [{
        find: ".consolidateGifsStickersEmojis",
        replacement: {
            match: /(function \w{1,2}\(\w\)\{.*?\.consolidateGifsStickersEmojis.*?return.*?\(\)\.buttons,children:)(\w)/,
            replace: (_, g1, children) => `${g1}$self.patchTheseMfs(${children})`
        }
    }],
    patchTheseMfs(children: any[]) {
        const idx = children.findIndex(c => c.key === "sticker") || 0;
        children.splice(idx, 0, <this.moreStickersComponent key="moreStickers" />);

        return children;
    },

    moreStickersComponent() {
        return <button>Hi</button>;
    },
});
