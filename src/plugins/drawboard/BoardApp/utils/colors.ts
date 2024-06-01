/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { waitFor } from "@webpack";

// Discord color functions

type inputAndReturn<I, R> = (v: I) => R;

export let getDarkness: inputAndReturn<number, number>;
export let hex2int: inputAndReturn<string, number>;
export let hex2rgb: inputAndReturn<string, string>;
export let int2hex: inputAndReturn<number, string>;
export let int2hsl: inputAndReturn<number, string>;
export let int2hslRaw: inputAndReturn<number, { h: number, s: number, l: number; }>;
export let int2rgbArray: inputAndReturn<number, number[]>;
export let int2rgb: inputAndReturn<number, string>;
export let isValidHex: inputAndReturn<string, boolean>;
export let rgb2int: inputAndReturn<string, number>;

waitFor(["hex2int", "getDarkness"], c => {
    ({
        getDarkness,
        hex2int,
        hex2rgb,
        int2hex,
        int2hsl,
        int2hslRaw,
        int2rgbArray,
        int2rgb,
        isValidHex,
        rgb2int
    } = c);
});
