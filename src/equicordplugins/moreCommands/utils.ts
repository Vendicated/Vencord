/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

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
