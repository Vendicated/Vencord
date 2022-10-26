/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { findOption,OptionalMessageOption } from "../api/Commands";
import definePlugin from "../utils/types";

export default definePlugin({
    name: "moarKaomojis",
    description: "Adds more Kaomojis to discord. ヽ(´▽`)/",
    authors: [
        {
            name: "Jacob.Tm",
            id: 302872992097107991n
        }
    ],
    dependencies: ["CommandsAPI"],
    commands: [
        { name: "dissatisfaction", description: " ＞﹏＜" },
        { name: "smug", description: " ಠ_ಠ" },
        { name: "happy", description: " ヽ(´▽`)/" },
        { name: "crying", description: " ಥ_ಥ" },
        { name: "angry", description: " ヽ(｀Д´)ﾉ" },
        { name: "anger", description: " ヽ(ｏ`皿′ｏ)ﾉ" },
        { name: "joy", description: " <(￣︶￣)>" },
    ].map(data => ({
        ...data,
        options: [OptionalMessageOption],
        execute: opts => ({
            content: findOption(opts, "message", "") + data.description
        })
    }))
});
