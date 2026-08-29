/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { cl } from "@plugins/kaomojiPicker/cl";

export const KAOMOJI_VIEW = cl("picker-tab");

export type Kaomoji = {
    id: string;
    value: string;
    tags: string[];
};

export const BUILTIN_CATEGORIES = [
    "wave",
    "happy",
    "excited",
    "cute",
    "love",
    "angry",
    "sad",
    "surprised"
] as const;

export const BUILTIN_KAOMOJI: Kaomoji[] = [

    // Wave

    { id: "hello", value: "(￣▽￣)ノ", tags: ["wave"] },
    { id: "shy-wave", value: "( *⌒ヮ⌒*)ゞ", tags: ["wave", "happy"] },
    { id: "happy-wave", value: "ヽ(o´∀｀o)ﾉ", tags: ["wave", "happy"] },
    { id: "hello-flower", value: "ヽ(✿ﾟ▽ﾟ)ノ", tags: ["wave", "happy"] },
    { id: "waving", value: "ヾ(\\*’Ｏ’\\*)/", tags: ["wave", "excited"] },

    // Happy

    { id: "relax", value: "(＾▽＾)", tags: ["happy"] },
    { id: "so-happy", value: "(*´▽`*)", tags: ["happy"] },
    { id: "grin", value: "（＾ｖ＾）", tags: ["happy"] },
    { id: "joy", value: "ヽ(´▽`)/", tags: ["happy"] },
    { id: "sparkle", value: "✧(≖ ◡ ≖✿)", tags: ["happy"] },
    { id: "cheer", value: "＼(^o^)／", tags: ["happy"] },
    { id: "yay", value: "\\(^o^)/", tags: ["happy"] },
    { id: "agree", value: "ദ്ദി ( ᵔ ᗜ ᵔ )", tags: ["happy"] },
    { id: "happy", value: "(๑ᵔ⤙ᵔ๑)", tags: ["happy"] },
    { id: "very-happy", value: "(˶˃ ᵕ ˂˶)", tags: ["happy"] },
    { id: "hug", value: "(っ˶ ˘ ᵕ˘)ˆᵕ ˆ˶ς)", tags: ["happy"] },

    // Excited

    { id: "cute-joy", value: "(๑>ᴗ<๑)", tags: ["excited", "happy", "cute"] },
    { id: "excited", value: "o(>ω<)o", tags: ["excited", "happy"] },
    { id: "very-excited", value: "(˶˃ ᵕ ˂˶) .ᐟ.ᐟ", tags: ["excited", "happy"] },
    { id: "sparkle-excited", value: "ヾ(｡✪ω✪｡)ｼ", tags: ["excited"] },
    { id: "cat-excited", value: ">⩊<", tags: ["excited"] },
    { id: "flowercited", value: "(๑´>᎑<)~*", tags: ["excited"] },

    // Cute

    { id: "hello-cat", value: "ฅ(•˕ •マ⟆", tags: ["cute", "wave"] },
    { id: "cat-calm", value: "=^..^=", tags: ["cute"] },
    { id: "happy-cat", value: "ฅ^•ﻌ•^ฅ", tags: ["cute", "happy"] },
    { id: "excited-cat", value: "ฅ^>⩊<^ฅ", tags: ["cute", "excited"] },
    { id: "sleepy-cat", value: "/ᐠ - ˕ -マ ᶻ 𝗓 𐰁", tags: ["cute"] },
    { id: "sparkle-nya", value: "(ฅ✧ω✧ฅ)ﾆｬ✧", tags: ["cute"] },
    { id: "bear", value: "ʕ•ᴥ•ʔ", tags: ["cute"] },
    { id: "happy-bear", value: "ฅ՞•ﻌ•՞ฅ", tags: ["cute", "happy"] },
    { id: "sparkle-bunny", value: "݁ ˖Ი𐑼⋆", tags: ["cute"] },
    { id: "ribbon-bunny", value: "Ი⑅𐑼", tags: ["cute"] },
    { id: "patpat", value: "ヾ(•ω•`)o", tags: ["cute"] },
    { id: "pat", value: "(っ˘ω˘ς )", tags: ["cute"] },

    // Love

    { id: "heart", value: "⸜(｡˃ ᵕ ˂ )⸝♡", tags: ["love"] },
    { id: "kiss", value: "(˶ ˘ ³˘)ˆᵕ ˆ˶) ❤︎.ᐟ", tags: ["love"] },
    { id: "kiss-calm", value: "(˶˘ ³˘(´͈ ᵕ `͈˶)", tags: ["love"] },
    { id: "kiss-happy", value: "( ˶˘ ³˘(ˊᗜˋ*)!♡", tags: ["love"] },
    { id: "in-love", value: "(⸝⸝ ♡﹏♡⸝⸝)", tags: ["love"] },
    { id: "flustered", value: "(⸝⸝๑﹏๑⸝⸝)", tags: ["love"] },
    { id: "blush", value: "(⸝⸝>⸝⸝<⸝⸝)", tags: ["love"] },
    { id: "shy", value: "(⁄ ⁄•⁄ω⁄•⁄ ⁄)", tags: ["love"] },
    { id: "happy-cry", value: "(╥‸╥)♡", tags: ["love", "happy"] },
    { id: "calm-shy", value: "(⸝⸝⩌⸝⸝⩌⸝⸝)", tags: ["love"] },
    { id: "calm-shy-1", value: "(,,¬﹏¬,,)", tags: ["love"] },
    { id: "hug", value: "(っ˶ ˘ ᵕ˘)ˆᵕ ˆ˶ς)", tags: ["love"] },
    { id: "excited-love", value: "(≧ヮ≦) 💕", tags: ["love", "excited"] },

    // Angry

    { id: "jii", value: "(￢_￢;)", tags: ["angry"] },
    { id: "pout", value: "(˶˃⤙˂˶)", tags: ["angry"] },
    { id: "fume", value: "(¬_¬)", tags: ["angry"] },
    { id: "mad", value: "( ,,⩌'︿'⩌ꐦ,,)", tags: ["angry"] },
    { id: "are-u-kidding-me", value: "(｀Д´)", tags: ["angry"] },
    { id: "yandere", value: "ヾ(๑╹◡╹)ﾉ🔪", tags: ["angry"] },
    { id: "so-mad", value: "ヽ(｀Д´#)ﾉ ﾑｷｰ!!", tags: ["angry"] },

    // Sad

    { id: "cry", value: "(╥﹏╥)", tags: ["sad"] },
    { id: "worried-cry", value: "(；′⌒`)", tags: ["sad"] },
    { id: "huhuu-cry", value: "(╥ᆺ╥;)", tags: ["sad"] },
    { id: "tears", value: "(ಥ﹏ಥ)", tags: ["sad"] },
    { id: "sulk", value: "(´-ω-`)", tags: ["sad"] },
    { id: "worried", value: "(,,•᷄﹏•᷅,,)", tags: ["sad"] },
    { id: "ehh-i-see", value: "(|lI.‸.)", tags: ["sad"] },
    { id: "meh", value: "（´＿｀）", tags: ["sad"] },

    // Surprised

    { id: "wa", value: "( ˶°ㅁ°) !!", tags: ["surprised"] },
    { id: "gasp", value: "Σ(°△°|||)", tags: ["surprised"] },
    { id: "wow", value: "w(°ｏ°)w", tags: ["surprised"] },
    { id: "shock", value: "(⊙_⊙)", tags: ["surprised"] },
    { id: "oops", value: "(・◇・)", tags: ["surprised"] },
    { id: "what", value: "Σ(ﾟДﾟ)", tags: ["surprised"] },

    // Uncategorized

    { id: "its-fine-pat", value: "( ´･･)ﾉ(._.`)", tags: ["misc"] },
    { id: "smug", value: "(¬‿¬)", tags: ["misc", "smug"] },
    { id: "shrug", value: "¯\\_(ツ)_/¯", tags: ["misc", "smug"] },
    { id: "tableflip", value: "(╯°□°）╯︵ ┻━┻", tags: ["misc", "angry"] },
    { id: "sleepy", value: "(−_−) …zzz", tags: ["misc", "cute"] },
];
