/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addMessagePreSendListener, removeMessagePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore } from "@webpack/common";

const emojis = ["🥰", "😊", "💕", "💖", "💗", "🌸", "✨", "🦄", "🌈", "🍭", "🧸", "🌟", "💫", "🌻", "🍬", "🎀", "💝", "💓", "🍨", "🌷", "🦋", "🐇", "🐱", "🐶", "🦊", "🥺", "👉👈", "🍡", "🧁", "🍰", "🌺", "🌹", "💮", "🧚‍♀️", "💘", "💞", "🩷", "🩵", "🌞", "🫧", "🫶", "🦢", "🐹", "🐰", "🌼", "🧿"];
const kaomojis = ["(◕‿◕)", "♡(˘▽˘)♡", "(つ≧▽≦)つ", "(≧◡≦)", "(*^ω^*)", "(っ˘ω˘ς)", "(´｡• ω •｡`)", "ʕ•ᴥ•ʔ", "(づ｡◕‿‿◕｡)づ", "ฅ^•ﻌ•^ฅ", "(*˘︶˘*)", "(*¯︶¯*)", "( ˘ ³˘)♥", "(っ•ᴗ•)っ", "ლ(╹◡╹ლ)", "(๑˃ᴗ˂)ﻭ", "(灬ºωº灬)♡", "૮₍˶ᵔ ᵕ ᵔ˶₎ა", "ฅ^•ﻌ•^ฅ", "(*ฅ́˘ฅ̀*)", "(●'◡'●)", "ฅ(^◕ᴥ◕^)ฅ", "(=^･ω･^=)", "ʕっ•ᴥ•ʔっ", "ʕ ꈍᴥꈍʔ", "ʕ´•ᴥ•`ʔ", "(◡ ω ◡)", "(◕ᴗ◕✿)", "꒰⑅ᵕ༚ᵕ꒱˖♡", "ପ(๑•ᴗ•๑)ଓ ♡", "(⁄ ⁄•⁄ω⁄•⁄ ⁄)"];
const sparkles = ["✨", "⭐", "★", "☆", "₊˚⊹", "˚₊· ͟͟͞͞➳❥", "⋆｡°✩", "☆彡", "⊰", "⊱", "✧･ﾟ", "♡", "❀", "❁", "❃", "❋", "✿", "♫", "♪", "✧˖°", "⋆｡˚", "⋆⭒˚｡⋆", "✧*。", "⁺˚*•̩̩͙✩•̩̩͙*˚⁺", "‧₊˚✧", "ପ♡ଓ", "✩°｡⋆⸜", "✮", "✩₊˚.⋆", "☽˚｡⋆", "❥", "༘⋆", "⋆⭒˚｡⋆", "✮.°:⋆ₓₒ", "✧･ﾟ:✧･ﾟ", "*ੈ✩‧₊˚", "┊͙ ˘͈ᵕ˘͈", "ೃ࿔₊", "˗ˏˋ ★ ˎˊ˗"];
const uwu_suffixes = ["~", " nya~", " uwu", " owo", " >w<", " :3", " nyaaa", "σωσ", "◡ ω ◡", " OwO", " UwU~", " hehe~", " rawr~", " mew", " purr~", " ehehe", " uwu~", " (⁄ ⁄>⁄ω⁄<⁄ ⁄)", " kyaa~", " nyaa", " nyuu~", " mya~", " (◕ᴗ◕✿)", " teehee", " hehehe", " awoo~", " *blushes*", " purrr", " pwease", " nya?"];
const extended_exclamations = ["~!", "!!", "!!!", "!~", "!❤", "!✨", "!💖", "!⭐", "!!!1!", "! nya~", "!?!?", "!!!💕", "~!!~", "! ꒰◍ᐡᐤᐡ◍꒱", "! ❁◕ ‿ ◕❁", "!!♡", "! (*ฅ́˘ฅ̀*)", "~✿!", "! ♡₊˚", "!⋆₊", "! 🎀", "! 🌸", "!🌟", "!☆"];
const vowels_ru = "аеёиоуыэюяАЕЁИОУЫЭЮЯ";
const vowels_en = "aeiouyAEIOUY";
const cute_actions_ru = ["*обнимает*", "*нежно обнимает*", "*гладит по голове*", "*хихикает*", "*мурлычет*", "*улыбается*", "*подмигивает*", "*машет лапкой*", "*краснеет*", "*прыгает от радости*", "*делает большие глаза*", "*играет с волосами*", "*качает хвостиком*", "*делает милое личико*", "*танцует от счастья*", "*прячется за лапками*", "*радостно вздыхает*"];
const cute_actions_en = ["*hugs*", "*gentle hug*", "*pats head*", "*giggles*", "*purrs*", "*smiles*", "*winks*", "*waves paw*", "*blushes*", "*jumps with joy*", "*makes big eyes*", "*plays with hair*", "*wags tail*", "*makes cute face*", "*happy dance*", "*hides behind paws*", "*happy sigh*", "*nuzzles*", "*tippy taps*", "*boops nose*"];
const cute_period_replacements = [".~", ".!", ".✨", ".🌸", ".💖", "~~", " .·͙*̩̩͙˚̩̥̩̥*̩̩̥͙·̩̩̥͙*̩̩͙‧͙ .·˖*", " ^^", "₊˚ʚ ᗢ₊˚✧", "✿", ".♡", ".˚ʚ♡ɞ˚", ".˖°", ".⋆", ".♬", ".⋆˙⟡♡", ".𓆩♡𓆪"];
const cute_question_mark_replacements = ["?!!", "???", "❓💖", "?~", "❓✨", " uwu?", "?✧", "?🥺", "?(ㅅ´ ˘ `)", "??♡", "??🌸", "?☆", "?♡", "?⁺◟"];
const consonants_ru = "бвгджзйклмнпрстфхцчшщБВГДЖЗЙКЛМНПРСТФХЦЧШЩ";
const text_borders = [
    ["🌸 ", " 🌸"], ["✧･ﾟ: ", " :･ﾟ✧"], ["— ♡ ", " ♡ —"], ["꒰ ", " ꒱"], ["₊˚⊹ ", " ⊹˚₊"],
    ["⋆⭒˚｡⋆ ", " ⋆｡˚⭒⋆"], ["─── ⋆⋅☆⋅⋆ ", " ⋆⋅☆⋅⋆ ───"], ["┊͙ ", " ┊͙"], ["ꔛ ", " ꔛ"],
    ["✿ ", " ✿"], ["༉‧₊˚ ", " ₊˚✧"], ["𓂃 𓈒𓏸 ", " 𓈒𓏸"], ["♡⋆.ೃ࿔", "♡⋆.ೃ࿔"]
];

const themes = {
    pastel: {
        emojis: ["🌸", "🧁", "🍼", "🩰", "🎀", "🧸", "🍦", "🫧", "🤍", "🩷", "🩵", "🫐", "🐇"],
        words: ["cute", "soft", "sweet", "pastel", "lovely", "gentle"],
        prefix: ["✿", "♡", "✧", "⋆"],
        suffix: ["✧", "♡", "✿", "⋆"]
    },
    magical: {
        emojis: ["✨", "🌟", "🔮", "🧚", "⭐", "🌙", "🪄", "🦄", "🧿", "🪞", "🔆"],
        words: ["magic", "sparkle", "twinkle", "enchant", "fairy", "mystic"],
        prefix: ["✧", "⋆", "🔮", "☆"],
        suffix: ["✨", "⋆", "✧", "☆"]
    },
    nature: {
        emojis: ["🌷", "🌱", "🍄", "🦋", "🐝", "🌻", "🪴", "🌿", "🍃", "🌺", "🌼"],
        words: ["bloom", "flower", "garden", "blossom", "meadow", "butterfly"],
        prefix: ["❀", "🌱", "🌿", "🍃"],
        suffix: ["❀", "🌱", "🌿", "🍄"]
    }
};

function isUpperCase(str: string) {
    return str === str.toUpperCase() && str !== str.toLowerCase();
}

function transformStutter(word: string) {
    if (word.length > 1 && /^[a-zA-Zа-яА-ЯЁё]/.test(word) && !word.includes("-")) {
        const firstChar = word.charAt(0);
        let prefix = firstChar + "-";
        if (Math.random() < 0.4) {
            prefix += firstChar + "-";
        }
        return prefix + word;
    }
    return word;
}

function transformVowelStretch(word: string, stretchProb: number, maxStretch: number, vowels: string) {
    if (!word || !vowels) return word;
    let output = "";
    for (let i = 0; i < word.length; i++) {
        const char = word[i];
        output += char;
        if (vowels.includes(char) && Math.random() < stretchProb) {
            const addCount = Math.floor(Math.random() * maxStretch) + 1;
            for (let k = 0; k < addCount; k++) {
                output += char; // preserves original vowel case
            }
        }
    }
    return output;
}

function addSoftSign(word: string, prob: number) {
    if (word && word.length > 1) {
        const lastChar = word[word.length - 1];
        if (consonants_ru.includes(lastChar) && !["ь", "ъ", "Ь", "Ъ"].includes(lastChar) && Math.random() < prob) {
            if (lastChar !== "й" && lastChar !== "Й") {
                const isCaps = isUpperCase(lastChar);
                word += isCaps ? "Ь" : "ь";
            }
        }
    }
    return word;
}

function transformText(text: string, settingsState: any) {
    if (settingsState.enableLowercase) {
        text = text.toLowerCase();
    }

    if (settingsState.enableUwU) {
        // Case preservation (if it was caps, replacement is also caps)
        text = text.replace(/r/g, "w").replace(/l/g, "w")
                   .replace(/R/g, "W").replace(/L/g, "W")
                   .replace(/р/g, "в").replace(/л/g, "в")
                   .replace(/Р/g, "В").replace(/Л/g, "В");
    }

    let sentences = text.split(/([.!?]+\s*)/);
    const resultParts = [];

    const isCyrillic = /[а-яА-ЯЁё]/.test(text);
    const cuteActions = isCyrillic ? cute_actions_ru : cute_actions_en;

    let currentTheme: any = null;
    if (settingsState.theme === "pastel") currentTheme = themes.pastel;
    else if (settingsState.theme === "magical") currentTheme = themes.magical;
    else if (settingsState.theme === "nature") currentTheme = themes.nature;
    else if (settingsState.theme === "random" && Math.random() < 0.3) {
        const themeVals = Object.values(themes);
        currentTheme = themeVals[Math.floor(Math.random() * themeVals.length)];
    }

    if (currentTheme && Math.random() < 0.7) {
        if (text.length < 100 && Math.random() < 0.5) {
            const prefix = currentTheme.prefix[Math.floor(Math.random() * currentTheme.prefix.length)];
            const suffix = currentTheme.suffix[Math.floor(Math.random() * currentTheme.suffix.length)];
            if (Math.random() < 0.3) text = `${prefix} ${text} ${suffix}`;
        }
        if (text.length > 20 && Math.random() < 0.3) {
            const word = currentTheme.words[Math.floor(Math.random() * currentTheme.words.length)];
            const emoji = currentTheme.emojis[Math.floor(Math.random() * currentTheme.emojis.length)];
            const words = text.split(" ");
            if (words.length > 5) {
                const pos = Math.floor(Math.random() * (words.length - 4)) + 2;
                words.splice(pos, 0, `${word} ${emoji}`);
                text = words.join(" ");
                sentences = text.split(/([.!?]+\s*)/);
            }
        }
    }

    for (let i = 0; i < sentences.length; i += 2) {
        let sentencePart = sentences[i].trim();
        let endingPunc = (i + 1 < sentences.length) ? sentences[i + 1] : "";

        if (!sentencePart && endingPunc) {
            if ((settingsState.textStyle === "sparkles" || settingsState.textStyle === "all") && endingPunc.includes("!")) {
                if (Math.random() < settingsState.classicFreq / 100) {
                    endingPunc = endingPunc.replace(/!/g, () => extended_exclamations[Math.floor(Math.random() * extended_exclamations.length)]);
                }
            }
            if (settingsState.enableCutePunctuation && Math.random() < settingsState.cutePunctuationFreq / 100) {
                if (endingPunc.includes("?")) {
                    endingPunc = endingPunc.replace(/([?!]+)(\s*)$/, (m, p1, p2) => {
                        return p1.includes("?") ? cute_question_mark_replacements[Math.floor(Math.random() * cute_question_mark_replacements.length)] + p2 : m;
                    });
                } else if (endingPunc.includes(".") && !endingPunc.includes("...")) {
                    endingPunc = endingPunc.replace(/(\.+)(\s*)$/, (m, p1, p2) => {
                        return p1.length === 1 ? cute_period_replacements[Math.floor(Math.random() * cute_period_replacements.length)] + p2 : m;
                    });
                }
            }
            resultParts.push(endingPunc);
            continue;
        }

        if (!sentencePart && !endingPunc) continue;

        const words = sentencePart.split(" ");
        const processedWords = [];

        for (const word of words) {
            let leadingPunc = "", trailingPunc = "", tempWord = word;
            const mLead = tempWord.match(/^([^\w\sа-яА-ЯЁё]+)/);
            if (mLead) {
                leadingPunc = mLead[1];
                tempWord = tempWord.slice(leadingPunc.length);
            }
            const mTrail = tempWord.match(/([^\w\sа-яА-ЯЁё]+)$/);
            if (mTrail) {
                trailingPunc = mTrail[1];
                tempWord = tempWord.slice(0, -trailingPunc.length);
            }

            if (!tempWord) {
                processedWords.push(word);
                continue;
            }

            const vowels = /[а-яА-ЯЁё]/.test(tempWord) ? vowels_ru : vowels_en;

            if (settingsState.enableStuttering && Math.random() < settingsState.stutteringFreq / 100) {
                tempWord = transformStutter(tempWord);
            }

            if (settingsState.enableVowelStretch && Math.random() < settingsState.vowelStretchFreq / 100) {
                tempWord = transformVowelStretch(tempWord, 0.6, settingsState.vowelStretchMax, vowels);
            }

            if (settingsState.enableSoftSign && Math.random() < settingsState.softSignFreq / 100) {
                tempWord = addSoftSign(tempWord, 1.0);
            }

            processedWords.push(leadingPunc + tempWord + trailingPunc);
        }
        sentencePart = processedWords.join(" ");

        if (settingsState.textStyle === "emojis" || settingsState.textStyle === "all") {
            const emojiList = (currentTheme && Math.random() < 0.7) ? currentTheme.emojis : emojis;
            sentencePart = sentencePart.split(" ").map(w => {
                return (w && Math.random() < settingsState.classicFreq / 100) ? `${w} ${emojiList[Math.floor(Math.random() * emojiList.length)]}` : w;
            }).join(" ").trim();
        }

        if (settingsState.textStyle === "kaomoji" || settingsState.textStyle === "all") {
            if (Math.random() < settingsState.classicFreq / 100) {
                sentencePart = (sentencePart + " " + kaomojis[Math.floor(Math.random() * kaomojis.length)]).trim();
            }
        }

        if (settingsState.enableUwUSuffixes && Math.random() < settingsState.uwuSuffixFreq / 100) {
            const suffix = uwu_suffixes[Math.floor(Math.random() * uwu_suffixes.length)];
            sentencePart = sentencePart ? (sentencePart + " " + suffix) : suffix;
            sentencePart = sentencePart.trim();
        }

        if (settingsState.enableCutePunctuation && Math.random() < settingsState.cutePunctuationFreq / 100) {
             if (endingPunc.includes("?")) {
                endingPunc = endingPunc.replace(/([?!]+)(\s*)$/, (m, p1, p2) => {
                    return p1.includes("?") ? cute_question_mark_replacements[Math.floor(Math.random() * cute_question_mark_replacements.length)] + p2 : m;
                });
            } else if (endingPunc.includes(".") && !endingPunc.includes("...")) {
                endingPunc = endingPunc.replace(/(\.+)(\s*)$/, (m, p1, p2) => {
                    return p1.length === 1 ? cute_period_replacements[Math.floor(Math.random() * cute_period_replacements.length)] + p2 : m;
                });
            }
        }

        if (settingsState.textStyle === "sparkles" || settingsState.textStyle === "all") {
            if (Math.random() < (settingsState.classicFreq / 100) * 0.7) {
                const s1 = sparkles[Math.floor(Math.random() * sparkles.length)];
                const s2 = sparkles[Math.floor(Math.random() * sparkles.length)];
                sentencePart = `${s1} ${sentencePart} ${s2}`.trim();
            }
            if (endingPunc.includes("!") && Math.random() < settingsState.classicFreq / 100) {
                endingPunc = endingPunc.replace(/!/g, () => extended_exclamations[Math.floor(Math.random() * extended_exclamations.length)]);
            }
        }

        if (settingsState.enableTextBorders && sentencePart && Math.random() < settingsState.textBordersFreq / 100) {
            if (sentencePart.length < 50) {
                const border = text_borders[Math.floor(Math.random() * text_borders.length)];
                sentencePart = `${border[0]}${sentencePart}${border[1]}`;
            }
        }

        resultParts.push(sentencePart);
        resultParts.push(endingPunc);

        if (settingsState.enableCuteActions && sentencePart && Math.random() < settingsState.cuteActionsFreq / 100) {
            const action = cuteActions[Math.floor(Math.random() * cuteActions.length)];
            if (settingsState.actionsOnNewLine) {
                if (resultParts.length > 0 && resultParts[resultParts.length - 1]) {
                    resultParts[resultParts.length - 1] = resultParts[resultParts.length - 1].trimEnd();
                }
                resultParts.push("\n" + action);
            } else {
                if (resultParts.length > 0 && resultParts[resultParts.length - 1] && !/\s$/.test(resultParts[resultParts.length - 1])) {
                    resultParts.push(" " + action);
                } else {
                    resultParts.push(action);
                }
            }
        }
    }

    return resultParts.join("");
}

const settings = definePluginSettings({
    enabled: { type: OptionType.BOOLEAN, default: true, description: "Enable Cute Messages" },
    ignorePrefix: { type: OptionType.BOOLEAN, default: true, description: "Ignore commands (starting with ., /, ! etc.)" },
    listMode: {
        type: OptionType.SELECT,
        description: "Whitelist/Blacklist Mode",
        options: [
            { label: "Disabled (Works everywhere)", value: "none", default: true },
            { label: "Whitelist (Only for specified)", value: "whitelist" },
            { label: "Blacklist (Everywhere except specified)", value: "blacklist" }
        ]
    },
    listIds: {
        type: OptionType.STRING,
        default: "",
        description: "Server or User IDs (comma-separated) for whitelist/blacklist"
    },
    textStyle: {
        type: OptionType.SELECT,
        description: "Text Style (Classic)",
        options: [
            { label: "Emojis only", value: "emojis" },
            { label: "Kaomoji (◕‿◕)", value: "kaomoji" },
            { label: "Sparkles ✨", value: "sparkles", default: true },
            { label: "All classic effects", value: "all" }
        ]
    },
    classicFreq: { type: OptionType.SLIDER, default: 50, min: 0, max: 100, description: "Classic effects frequency (%)", markers: [0, 25, 50, 75, 100] },
    theme: {
        type: OptionType.SELECT,
        description: "Theme",
        options: [
            { label: "Random", value: "random", default: true },
            { label: "Pastel", value: "pastel" },
            { label: "Magical", value: "magical" },
            { label: "Nature", value: "nature" }
        ]
    },
    enableLowercase: { type: OptionType.BOOLEAN, default: false, description: "Convert text to lowercase" },
    enableUwU: { type: OptionType.BOOLEAN, default: false, description: "Enable UwU speak (r/l → w)" },
    enableUwUSuffixes: { type: OptionType.BOOLEAN, default: false, description: "Add UwU suffixes (nya, owo)" },
    uwuSuffixFreq: { type: OptionType.SLIDER, default: 50, min: 0, max: 100, description: "UwU suffix frequency (%)", markers: [0, 25, 50, 75, 100] },
    enableStuttering: { type: OptionType.BOOLEAN, default: false, description: "Enable stuttering (h-hello)" },
    stutteringFreq: { type: OptionType.SLIDER, default: 50, min: 0, max: 100, description: "Stuttering frequency (%)", markers: [0, 25, 50, 75, 100] },
    enableVowelStretch: { type: OptionType.BOOLEAN, default: false, description: "Stretch vowels (cuuute)" },
    vowelStretchFreq: { type: OptionType.SLIDER, default: 50, min: 0, max: 100, description: "Vowel stretch frequency (%)", markers: [0, 25, 50, 75, 100] },
    vowelStretchMax: { type: OptionType.SLIDER, default: 2, min: 2, max: 3, description: "Max stretched vowel length", markers: [2,3] },
    enableSoftSign: { type: OptionType.BOOLEAN, default: false, description: "Add soft sign ('ь') at the end of words (Russian only)" },
    softSignFreq: { type: OptionType.SLIDER, default: 50, min: 0, max: 100, description: "Soft sign frequency (%)", markers: [0, 25, 50, 75, 100] },
    enableCutePunctuation: { type: OptionType.BOOLEAN, default: false, description: "Cute punctuation (. → .~)" },
    cutePunctuationFreq: { type: OptionType.SLIDER, default: 50, min: 0, max: 100, description: "Cute punctuation frequency (%)", markers: [0, 25, 50, 75, 100] },
    enableCuteActions: { type: OptionType.BOOLEAN, default: false, description: "Add cute actions (*hugs*)" },
    cuteActionsFreq: { type: OptionType.SLIDER, default: 50, min: 0, max: 100, description: "Cute actions frequency (%)", markers: [0, 25, 50, 75, 100] },
    actionsOnNewLine: { type: OptionType.BOOLEAN, default: false, description: "Actions on a new line" },
    enableTextBorders: { type: OptionType.BOOLEAN, default: false, description: "Enable text borders" },
    textBordersFreq: { type: OptionType.SLIDER, default: 50, min: 0, max: 100, description: "Text borders frequency (%)", markers: [0, 25, 50, 75, 100] },
});

let preSendListener: any;

export default definePlugin({
    name: "CuteMessages",
    description: "Makes your messages cute and adorable with tons of customization options!",
    authors: [{ name: "dimabrozy", id: 550314591448727552n }],
    dependencies: ["MessageEventsAPI"],
    settings,

    start() {
        preSendListener = addMessagePreSendListener(async (channelId, messageObj) => {
            if (!settings.store.enabled) return;

            if (!messageObj || typeof messageObj.content !== "string") return;

            // Ignore commands and prefixes
            if (settings.store.ignorePrefix && /^[./!$?#]/.test(messageObj.content)) return;

            // Handle Whitelist and Blacklist
            if (settings.store.listMode !== "none") {
                const list = settings.store.listIds.split(",").map((s: string) => s.trim()).filter((s: string) => s);
                const channel = ChannelStore.getChannel(channelId);

                const targetIds = [channelId]; // Check channel ID by default
                if (channel) {
                    if (channel.guild_id) {
                        targetIds.push(channel.guild_id); // If it's a server, check guild ID
                    }
                    if (channel.recipients) {
                        targetIds.push(...channel.recipients); // If it's a DM, check recipients' IDs
                    }
                }

                // Check if there is any match
                const hasMatch = targetIds.some(id => list.includes(id));

                if (settings.store.listMode === "whitelist" && !hasMatch) return;
                if (settings.store.listMode === "blacklist" && hasMatch) return;
            }

            // Transform message content
            messageObj.content = transformText(messageObj.content, settings.store);
        });
    },

    stop() {
        if (preSendListener) {
            removeMessagePreSendListener(preSendListener);
            preSendListener = null;
        }
    }
});
