/*
 * Vencord, a Discord client mod
 * Copyright (c) 2022 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findOption, OptionalMessageOption } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "MoreKaomoji",
    description: "Adds more Kaomoji to discord. ヽ(´▽`)/",
    authors: [Devs.JacobTm],
    dependencies: ["CommandsAPI"],
    commands: [
        { name: "dissatisfaction", description: " ＞﹏＜" },
        { name: "smug", description: " ಠ_ಠ" },
        { name: "happy", description: " ヽ(´▽`)/" },
        { name: "crying", description: " ಥ_ಥ" },
        { name: "angry", description: " ヽ(｀Д´)ﾉ" },
        { name: "anger", description: " ヽ(ｏ`皿′ｏ)ﾉ" },
        { name: "joy", description: " <(￣︶￣)>" },
        { name: "blush", description: "૮ ˶ᵔ ᵕ ᵔ˶ ა" },
        { name: "confused", description: "(•ิ_•ิ)?" },
        { name: "sleeping", description: "(ᴗ_ᴗ)" },
        { name: "laughing", description: "o(≧▽≦)o" },

    ].map(data => ({
        ...data,
        options: [OptionalMessageOption],
        execute: opts => ({
            content: findOption(opts, "message", "") + data.description
        })
    }))
});
