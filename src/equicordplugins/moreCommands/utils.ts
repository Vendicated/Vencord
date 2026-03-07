/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { CommandArgument, CommandContext } from "@vencord/discord-types";
import { DraftType, UploadAttachmentStore, UploadManager, UserSettingsActionCreators } from "@webpack/common";

export const settings = definePluginSettings({
    addFreakyEnding: {
        type: OptionType.BOOLEAN,
        description: "Add 👅 or ❤️ at the end",
        default: false
    },
    uwuEveryMessage: {
        description: "Make every single message uwuified",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: false
    },
    uwuEverything: {
        description: "Makes *all* text uwuified - really bad idea",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true
    }
});

export function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function getCuteAnimeBoys(sub: string) {
    const res = await fetch(`https://www.reddit.com/r/${sub}/top.json?limit=100&t=all`);
    const { children } = (await res.json()).data;
    const r = rand(0, children.length - 1);
    return children[r].data.url ?? "";
}

export async function getCuteNeko(): Promise<string> {
    const res = await fetch("https://nekos.best/api/v2/neko");
    const url = (await res.json()).results[0].url as string | null;
    return url ?? "";
}

export async function getCutePats(): Promise<string> {
    const res = await fetch("https://api.waifu.pics/sfw/pat");
    const url = (await res.json()).url as string | null;
    return url ?? "";
}

export function mock(input: string): string {
    let output = "";
    for (let i = 0; i < input.length; i++) {
        output += i % 2 ? input[i].toUpperCase() : input[i].toLowerCase();
    }
    return output;
}

const charMap: Record<string, string> = {
    q: "𝓺", w: "𝔀", e: "𝓮", r: "𝓻", t: "𝓽", y: "𝔂", u: "𝓾", i: "𝓲", o: "𝓸", p: "𝓹",
    a: "𝓪", s: "𝓼", d: "𝓭", f: "𝓯", g: "𝓰", h: "𝓱", j: "𝓳", k: "𝓴", l: "𝓵", z: "𝔃",
    x: "𝔁", c: "𝓬", v: "𝓿", b: "𝓫", n: "𝓷", m: "𝓶", Q: "𝓠", W: "𝓦", E: "𝓔", R: "𝓡",
    T: "𝓣", Y: "𝓨", U: "𝓤", I: "𝓘", O: "𝓞", P: "𝓟", A: "𝓐", S: "𝓢", D: "𝓓", F: "𝓕",
    G: "𝓖", H: "𝓗", J: "𝓙", K: "𝓚", L: "𝓛", Z: "𝓩", X: "𝓧", C: "𝓒", V: "𝓥", B: "𝓑",
    N: "𝓝", M: "𝓜",
};

const mapCharacters = (text: string, map: Record<string, string>) =>
    text.split("").map(char => map[char] || char).join("");

export function makeFreaky(text: string) {
    text = mapCharacters(text.trim() || "freaky", charMap);
    if (settings.store.addFreakyEnding) text += Math.random() < 0.25 ? " 👅" : " ❤️";
    return text;
}

const morseMap = {
    A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.",
    G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..",
    M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.",
    S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
    Y: "-.--", Z: "--..",
    0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-",
    5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----.",
    " ": "/"
};

export const toMorse = (text: string) => {
    return text.toUpperCase().split("").map(char => morseMap[char] ?? "").join(" ");
};

export const fromMorse = (text: string) => {
    const reversedMap = Object.fromEntries(Object.entries(morseMap).map(([k, v]) => [v, k]));
    const raw = text.split(" ").map(code => reversedMap[code] ?? "").join("").toLowerCase();
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export const isMorse = (text: string) => /^[.\-/ ]+$/.test(text);

export const endings = [
    "rawr x3",
    "OwO",
    "UwU",
    "o.O",
    "-.-",
    ">w<",
    "(⑅˘꒳˘)",
    "(ꈍᴗꈍ)",
    "(˘ω˘)",
    "(U ᵕ U❁)",
    "σωσ",
    "òωó",
    "(///ˬ///✿)",
    "(U ﹏ U)",
    "( ͡o ω ͡o )",
    "ʘwʘ",
    ":3",
    ":3", // important enough to have twice
    ":3", // important enough to have thrice
    "XD",
    "nyaa~~",
    "mya",
    ">_<",
    "😳",
    "🥺",
    "😳😳😳",
    "rawr",
    "^^",
    "^^;;",
    "(ˆ ﻌ ˆ)♡",
    "^•ﻌ•^",
    "/(^•ω•^)",
    "(✿oωo)"
];

export const replacements = [
    ["small", "smol"],
    ["cute", "kawaii"],
    ["fluff", "floof"],
    ["love", "luv"],
    ["stupid", "baka"],
    ["what", "nani"],
    ["meow", "nya"],
    ["hello", "hewwo"],
];

export function selectRandomElement(arr) {
    // generate a random index based on the length of the array
    const randomIndex = Math.floor(Math.random() * arr.length);

    // return the element at the randomly generated index
    return arr[randomIndex];
}
export const isOneCharacterString = (str: string): boolean => {
    return str.split("").every((char: string) => char === str[0]);
};

export function replaceString(inputString) {
    let replaced = false;
    for (const replacement of replacements) {
        const regex = new RegExp(`\\b${replacement[0]}\\b`, "gi");
        if (regex.test(inputString)) {
            inputString = inputString.replace(regex, replacement[1]);
            replaced = true;
        }
    }
    return replaced ? inputString : false;
}

export function uwuify(message: string): string {
    const rule = /\S+|\s+/g;
    const words: string[] | null = message.match(rule);
    let answer = "";

    if (words === null) return "";

    for (let i = 0; i < words.length; i++) {
        if (isOneCharacterString(words[i]) || words[i].startsWith("https://")) {
            answer += words[i];
            continue;
        }

        if (!replaceString(words[i])) {
            answer += words[i]
                .replace(/n(?=[aeo])/g, "ny")
                .replace(/l|r/g, "w");
        } else answer += replaceString(words[i]);

    }

    answer += " " + selectRandomElement(endings);
    return answer;
}

export function uwuifyArray(arr) {
    const newArr = [...arr];

    newArr.forEach((item, index) => {
        if (Array.isArray(item)) {
            newArr[index] = uwuifyArray(item);
        } else if (typeof item === "string") {
            newArr[index] = uwuify(item);
        }
    });

    return newArr;
}

export function getMessage(opts, other) {
    const frecencyStore = UserSettingsActionCreators.FrecencyUserSettingsActionCreators.getCurrentValue();

    const gifsArray = Object.keys(frecencyStore.favoriteGifs.gifs);

    const chosenGifUrl = gifsArray[Math.floor(Math.random() * gifsArray.length)];

    return `${chosenGifUrl}`;
}

export function calculateAffinityScore(affinity): number {
    const weights = {
        friend: 0.15,
        dm: 0.30,
        vc: 0.25,
        serverMsg: 0.20,
        communication: 0.10
    };

    let score = 0;
    if (affinity.isFriend) score += weights.friend * 100;
    score += affinity.dmProbability * weights.dm * 100;
    score += affinity.vcProbability * weights.vc * 100;
    score += affinity.serverMessageProbability * weights.serverMsg * 100;
    score += affinity.communicationProbability * weights.communication * 100;

    return Math.round(Math.min(100, Math.max(0, score)) * 100) / 100;
}

// stolen from petpet thanks vee
export function loadFriendImage(source: File | string): Promise<HTMLImageElement> {
    const isFile = source instanceof File;
    const url = isFile ? URL.createObjectURL(source) : source;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (isFile) URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (event, _source, _lineno, _colno, err) => reject(err || event);
        img.crossOrigin = "anonymous";
        img.src = url;
    });
}

export function generatePoissonDiskPosition(
    existingPositions: Array<{ x: number, y: number, size: number; }>,
    canvasWidth: number,
    canvasHeight: number,
    size: number
): { x: number, y: number; } {
    const edgePadding = 10;
    const minDist = size * 1.5;
    const textSpace = 60;
    const k = 30;

    function isValid(x: number, y: number) {
        if (
            x < edgePadding ||
            x + size > canvasWidth - edgePadding ||
            y < edgePadding ||
            y + size > canvasHeight - textSpace - edgePadding
        ) return false;

        return !existingPositions.some(pos => {
            const dx = pos.x - x;
            const dy = pos.y - y;
            const dist = Math.hypot(dx, dy);
            const minAllowed = (pos.size + size) / 2 + (minDist - size);
            return dist < minAllowed;
        });
    }

    if (existingPositions.length === 0) {
        return {
            x: canvasWidth / 2 - size / 2,
            y: canvasHeight / 2 - size / 2
        };
    }

    for (let tries = 0; tries < 100; tries++) {
        const base = existingPositions[Math.floor(Math.random() * existingPositions.length)];
        for (let i = 0; i < k; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = minDist + Math.random() * minDist;
            const x = base.x + Math.cos(angle) * radius;
            const y = base.y + Math.sin(angle) * radius;
            if (isValid(x, y)) {
                return {
                    x: Math.max(edgePadding, Math.min(x, canvasWidth - size - edgePadding)),
                    y: Math.max(edgePadding, Math.min(y, canvasHeight - size - textSpace - edgePadding))
                };
            }
        }
    }

    for (let tries = 0; tries < 100; tries++) {
        const x = Math.random() * (canvasWidth - size - edgePadding * 2) + edgePadding;
        const y = Math.random() * (canvasHeight - size - textSpace - edgePadding * 2) + edgePadding;
        if (isValid(x, y)) {
            return {
                x: Math.max(edgePadding, Math.min(x, canvasWidth - size - edgePadding)),
                y: Math.max(edgePadding, Math.min(y, canvasHeight - size - textSpace - edgePadding))
            };
        }
    }

    return {
        x: edgePadding,
        y: edgePadding
    };
}

export function calculateCanvasSize(userCount: number, avatarSize: number): { width: number, height: number; } {
    const padding = 50;
    const textSpace = 60;
    const itemWidth = avatarSize + padding;
    const itemHeight = avatarSize + textSpace + padding;
    const aspectRatio = 16 / 9;
    const cols = Math.ceil(Math.sqrt(userCount * aspectRatio));
    const rows = Math.ceil(userCount / cols);

    return {
        width: Math.max(1000, cols * itemWidth + padding),
        height: Math.max(700, rows * itemHeight + padding)
    };
}

export const FRAMES = 1;

export function loadImage(source: File | string) {
    const isFile = source instanceof File;
    const url = isFile ? URL.createObjectURL(source) : source;

    return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (isFile) URL.revokeObjectURL(url);
            resolve(img);
        };
        img.onerror = (event, _source, _lineno, _colno, err) => reject(err || event);
        img.crossOrigin = "Anonymous";
        img.src = url;
    });
}

export async function resolveImage(options: CommandArgument[], ctx: CommandContext): Promise<{ image: File | null; width: number | null; height: number | null; }> {
    let image: File | null = null;
    let width: number | null = null;
    let height: number | null = null;

    for (const opt of options) {
        switch (opt.name) {
            case "image":
                const upload = UploadAttachmentStore.getUpload(ctx.channel.id, opt.name, DraftType.SlashCommand);
                if (upload) {
                    if (!upload.isImage) {
                        UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
                        throw "Upload is not an image";
                    }
                    image = upload.item.file;
                }
                break;
            case "width":
                width = Number(opt.value);
                break;
            case "height":
                height = Number(opt.value);
                break;
        }
    }

    UploadManager.clearAll(ctx.channel.id, DraftType.SlashCommand);
    return { image, width, height };
}
