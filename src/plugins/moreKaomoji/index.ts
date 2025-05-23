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

import { findOption, OptionalMessageOption } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "MoreKaomoji",
    description: "Adds more Kaomoji to discord. ヽ(´▽`)/ (They are all slash commands)",
    authors: [Devs.JacobTm],
    commands: [
        { name: "dissatisfaction", description: " ＞﹏＜" },
        { name: "smug", description: "ಠ_ಠ" },
        { name: "happy", description: "ヽ(´▽`)/" },
        { name: "crying", description: "ಥ_ಥ" },
        { name: "angry", description: "ヽ(｀Д´)ﾉ" },
        { name: "anger", description: "ヽ(ｏ`皿′ｏ)ﾉ" },
        { name: "joy", description: "<(￣︶￣)>" },
        { name: "blush", description: "૮ ˶ᵔ ᵕ ᵔ˶ ა" },
        { name: "confused", description: "(•ิ_•ิ)?" },
        { name: "sleeping", description: "(ᴗ_ᴗ)" },
        { name: "laughing", description: "o(≧▽≦)o" },
        { name: "laughing1", description: "(＾▽＾)" },
        { name: "laughing2", description: "（⌒▽⌒）" },
        { name: "wave", description: "( ´ ∀ ` )ﾉ" },
        { name: "wave1", description: "ヾ(・ω・)" },
        { name: "shrug", description: "¯\\_(ツ)_/¯" },
        { name: "surprised", description: "(O_O)" },
        { name: "surprised1", description: "Σ(°ロ°)" },
        { name: "love", description: "(❤ω❤)" },
        { name: "excited", description: "☆*:.｡.o(≧▽≦)o.｡.:*☆" },
        { name: "wink", description: "(^_-)-☆" },
        { name: "lenny", description: "( ͡° ͜ʖ ͡°)" },
        { name: "cute", description: "(｡◕‿◕｡)" },
        { name: "bear", description: "ʕ •ᴥ•ʔ" },
        { name: "bearhug", description: "(/・ω・)/" },
        { name: "love1", description: "（*＾3＾）/～♡" },
        { name: "dance", description: "♪┏(°.°)┛┗(°.°)┓┗(°.°)┛┏(°.°)┓♪" },
        { name: "neko", description: "(≽^°ω°^≼)" },
        { name: "happy_simple", description: ":)" },
        { name: "sad_simple", description: ":(" },
        { name: "tongue_simple", description: ":P" },
        { name: "surprised_simple", description: ":O" }

    ].map(data => ({
        ...data,
        options: [OptionalMessageOption],
        execute: opts => ({
            content: findOption(opts, "message", "") + " " + data.description
        })
    }))
});
