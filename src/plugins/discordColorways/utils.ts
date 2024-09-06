/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PluginProps } from ".";

export function HexToHSL(H: string) {
    let r: any = 0, g: any = 0, b: any = 0;
    if (H.length === 4) r = "0x" + H[1] + H[1], g = "0x" + H[2] + H[2], b = "0x" + H[3] + H[3];
    else if (H.length === 7) {
        r = "0x" + H[1] + H[2];
        g = "0x" + H[3] + H[4];
        b = "0x" + H[5] + H[6];
    }
    r /= 255, g /= 255, b /= 255;
    var cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        l = 0;
    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    l = (cmax + cmin) / 2;
    s = delta === 0
        ? 0
        : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return [Math.round(h), Math.round(s), Math.round(l)];
}

export const canonicalizeHex = (hex: string) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = hex;
    hex = ctx.fillStyle;
    canvas.remove();

    return hex;
};

export const stringToHex = (str: string) => {
    let hex = "";
    for (
        let i = 0;
        i < str.length;
        i++
    ) {
        const charCode = str.charCodeAt(i);
        const hexValue = charCode.toString(16);
        hex += hexValue.padStart(2, "0");
    }
    return hex;
};

export const hexToString = (hex: string) => {
    let str = "";
    for (let i = 0; i < hex.length; i += 2) {
        const hexValue = hex.substr(i, 2);
        const decimalValue = parseInt(hexValue, 16);
        str += String.fromCharCode(decimalValue);
    }
    return str;
};

export function getHex(str: string): string {
    const color = Object.assign(
        document.createElement("canvas").getContext("2d") as {},
        { fillStyle: str }
    ).fillStyle;
    if (color.includes("rgba(")) {
        return getHex(String([...color.split(",").slice(0, 3), ")"]).replace(",)", ")").replace("a", ""));
    } else {
        return color;
    }
}

export function getFontOnBg(bgColor: string) {
    var color = (bgColor.charAt(0) === "#") ? bgColor.substring(1, 7) : bgColor;
    var r = parseInt(color.substring(0, 2), 16);
    var g = parseInt(color.substring(2, 4), 16);
    var b = parseInt(color.substring(4, 6), 16);
    return (((r * 0.299) + (g * 0.587) + (b * 0.114)) > 186) ?
        "#000000" : "#ffffff";
}

export function $e(funcArray: Array<(...vars: any) => void>, ...vars: any[]) {
    funcArray.forEach(e => e(vars));
}

export function hslToHex(h: number, s: number, l: number) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r: any, g: any, b: any;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHex(r: number, g: number, b: number) {
    const toHex = (x: number) => {
        const hex = Math.round(x * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function colorToHex(color: string) {
    var colorType = "hex";
    if (color.includes("hsl")) {
        colorType = "hsl";
    } else if (color.includes("rgb")) {
        colorType = "rgb";
    }
    color = color.replaceAll(",", "").replace(/.+?\(/, "").replace(")", "").replaceAll(/[ \t]+\/[ \t]+/g, " ").replaceAll("%", "").replaceAll("/", "");
    if (colorType === "hsl") {
        color = hslToHex(Number(color.split(" ")[0]), Number(color.split(" ")[1]), Number(color.split(" ")[2]));
    }
    if (colorType === "rgb") {
        color = rgbToHex(Number(color.split(" ")[0]), Number(color.split(" ")[1]), Number(color.split(" ")[2]));
    }
    return color.replace("#", "");
}

export const parseClr = (clr: number) => (clr & 0x00ffffff).toString(16).padStart(6, "0");

export async function getRepainterTheme(link: string): Promise<{ status: "success" | "fail", id?: string, colors?: string[], errorCode?: number, errorMsg?: string; }> {
    const linkCheck: string | undefined = link.match(/https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&\/\/=]*)/g)!.filter(x => x.startsWith("https://repainter.app/themes/"))[0];

    if (!linkCheck) return { status: "fail", errorCode: 0, errorMsg: "Invalid URL" };

    // const res = await (
    //     await fetch(
    //         `https://repainter.app/_next/data/Z0BCpVYZyrdkss0k0zqLC/themes/${link.match(/themes\/([a-z0-9]+)/i)?.[1] ?? ""
    //         }.json`,
    //         {
    //             "headers": {
    //                 "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    //                 "accept-language": "en-US,en;q=0.9",
    //                 "if-none-match": "W/\"4b2-Wsw1gFTK1l04ijqMn5s6ZUnH6hM\"",
    //                 "priority": "u=0, i",
    //                 "sec-ch-ua": "\"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
    //                 "sec-ch-ua-mobile": "?0",
    //                 "sec-ch-ua-platform": "\"Linux\"",
    //                 "sec-fetch-dest": "document",
    //                 "sec-fetch-mode": "navigate",
    //                 "sec-fetch-site": "none",
    //                 "sec-fetch-user": "?1",
    //                 "upgrade-insecure-requests": "1"
    //             },
    //             "referrerPolicy": "strict-origin-when-cross-origin",
    //             "body": null,
    //             "method": "GET",
    //             "mode": "cors",
    //             "credentials": "omit",
    //             "cache": "no-store"
    //         },
    //     )
    // );
    const { pageProps: { fallback: { a: { name, colors } } } } = { "pageProps": { "initialId": "01G5PMR5G9H76H1R2RET4A0ZHY", "fallback": { a: { "id": "01G5PMR5G9H76H1R2RET4A0ZHY", "name": "Midwinter Fire", "description": "Very red", "createdAt": "2022-06-16T16:15:11.881Z", "updatedAt": "2022-07-12T08:37:13.141Z", "settingsLines": ["Colorful", "Bright", "Vibrant style"], "voteCount": 309, "colors": [-1426063361, 4294901760, 4294901760, -1426071591, -1426080078, -1426089335, 4294901760, -1426119398, -1428615936, -1431629312, -1434644480, 4294901760, 4294901760, 4294901760, 4294901760, -1426067223, -1426071086, -1426079070, -1426088082, 4294901760, -1428201216, -1430761216, -1433255936, 4294901760, 4294901760, 4294901760, 4294901760, 4294901760, 4294901760, -1426070330, 4294901760, -1426086346, 4294901760, -1430030080, 4294901760, -1434431744, 4294901760, 4294901760, 4294901760, 4294901760, -1426064133, 4294901760, -1426071591, 4294901760, -1426874223, 4294901760, -1430359452, 4294901760, -1433845194, 4294901760, -1437922816, 4294901760, 4294901760, 4294901760, 4294901760, -1426071591, -1426080078, -1426089335, -1427799438, -1429640356, 4294901760, -1433191891, 4294901760, 4294901760, 4294901760] } } }, "__N_SSP": true } as any;
    return { status: "success", id: name, colors: colors.filter(c => c !== 4294901760).map(c => "#" + parseClr(c)) };
}

/**
 * Prompts the user to choose a file from their system
 * @param mimeTypes A comma separated list of mime types to accept, see https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept#unique_file_type_specifiers
 * @returns A promise that resolves to the chosen file or null if the user cancels
 */
export function chooseFile(mimeTypes: string) {
    return new Promise<File | null>(resolve => {
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        input.accept = mimeTypes;
        input.onchange = async () => {
            resolve(input.files?.[0] ?? null);
        };

        document.body.appendChild(input);
        input.click();
        setImmediate(() => document.body.removeChild(input));
    });
}

/**
 * Prompts the user to save a file to their system
 * @param file The file to save
 */
export function saveFile(file: File) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file);
    a.download = file.name;

    document.body.appendChild(a);
    a.click();
    setImmediate(() => {
        URL.revokeObjectURL(a.href);
        document.body.removeChild(a);
    });
}

export function classes(...classes: Array<string | null | undefined | false>) {
    return classes.filter(Boolean).join(" ");
}

export function getWsClientIdentity() {
    switch (PluginProps.clientMod) {
        case "Vencord":
            return "vencord";
        case "BetterDiscord":
            return "betterdiscord";
        default:
            return "discord";
    }
}
