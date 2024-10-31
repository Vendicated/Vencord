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
    description: "Adds more Kaomoji to discord. ヽ(´▽`)/",
    authors: [Devs.JacobTm],
    commands: [
        {
            name: "dissatisfaction",
            description: " ＞﹏＜",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " " + " ＞﹏＜",
            }),
        },
        {
            name: "smug",
            description: "ಠ_ಠ",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " " + "ಠ_ಠ",
            }),
        },
        {
            name: "happy",
            description: "ヽ(´▽`)/",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " " + "ヽ(´▽`)/",
            }),
        },
        {
            name: "crying",
            description: "ಥ_ಥ",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " " + "ಥ_ಥ",
            }),
        },
        {
            name: "angry",
            description: "ヽ(｀Д´)ﾉ",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " " + "ヽ(｀Д´)ﾉ",
            }),
        },
        {
            name: "anger",
            description: "ヽ(ｏ`皿′ｏ)ﾉ",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " " + "ヽ(ｏ`皿′ｏ)ﾉ",
            }),
        },
        {
            name: "joy",
            description: "<(￣︶￣)>",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " " + "<(￣︶￣)>",
            }),
        },
        {
            name: "blush",
            description: "૮ ˶ᵔ ᵕ ᵔ˶ ა",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " " + "૮ ˶ᵔ ᵕ ᵔ˶ ა",
            }),
        },
        {
            name: "confused",
            description: "(•ิ_•ิ)?",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " " + "(•ิ_•ิ)?",
            }),
        },
        {
            name: "sleeping",
            description: "(ᴗ_ᴗ)",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " " + "(ᴗ_ᴗ)",
            }),
        },
        {
            name: "laughing",
            description: "o(≧▽≦)o",
            options: [OptionalMessageOption],
            execute: opts => ({
                content: findOption(opts, "message", "") + " " + "o(≧▽≦)o",
            }),
        }
    ]
});
