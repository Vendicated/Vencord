/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Builds a profile theme color string in the legacy format, [#primary,#accent] where
 * primary and accent are base-16 24-bit colors, with each code point offset by +0xE0000
 * @param primary The base-10 24-bit primary color to be encoded
 * @param accent The base-10 24-bit accent color to be encoded
 * @returns The legacy encoded profile theme color string
 */
export function encodeColorsLegacy(primary: number, accent: number) {
    return String.fromCodePoint(...[...`[#${primary.toString(16)},#${accent.toString(16)}]`]
        .map(c => c.codePointAt(0)! + 0xE0000));
}

/**
 * Extracts profile theme colors from given legacy-format string
 * @param str The legacy-format string to extract profile theme colors from
 * @returns The profile theme colors. Colors will be -1 if not found.
 */
export function decodeColorsLegacy(str: string): [primaryColor: number, accentColor: number] {
    const colors = str.matchAll(/(?<=#)[\dA-Fa-f]{1,6}/g);
    return [parseInt(colors.next().value?.[0], 16) || -1, parseInt(colors.next().value?.[0], 16) || -1];
}

/**
 * Converts the given base-10 24-bit color to a base-4096 string with each code point offset by +0xE0000
 * @param color The base-10 24-bit color to be converted
 * @returns The converted base-4096 string with +0xE0000 offset
 */
export function encodeColor(color: number) {
    if (color === 0) return "\u{e0000}";
    let str = "";
    for (; color > 0; color = Math.trunc(color / 4096))
        str = String.fromCodePoint(color % 4096 + 0xE0000) + str;
    return str;
}

/**
 * Converts the given no-offset base-4096 string to a base-10 24-bit color
 * @param str The no-offset base-4096 string to be converted
 * @returns The converted base-10 24-bit color
 *          Will be -1 if the given string is empty and -2 if greater than the maximum 24-bit color, 16,777,215
 */
export function decodeColor(str: string) {
    if (str === "") return -1;
    let color = 0;
    for (let i = 0; i < str.length; i++) {
        if (color > 16_777_215) return -2;
        color += str.codePointAt(i)! * 4096 ** (str.length - 1 - i);
    }
    return color;
}

/**
 * Converts the given base-10 profile effect ID to a base-4096 string with each code point offset by +0xE0000
 * @param id The base-10 profile effect ID to be converted
 * @returns The converted base-4096 string with +0xE0000 offset
 */
export function encodeEffect(id: bigint) {
    if (id === 0n) return "\u{e0000}";
    let str = "";
    for (; id > 0n; id /= 4096n)
        str = String.fromCodePoint(Number(id % 4096n) + 0xE0000) + str;
    return str;
}

/**
 * Converts the given no-offset base-4096 string to a base-10 profile effect ID
 * @param str The no-offset base-4096 string to be converted
 * @returns The converted base-10 profile effect ID
 *          Will be -1n if the given string is empty and -2n if greater than the maximum profile effect ID
 */
export function decodeEffect(str: string) {
    if (str === "") return -1n;
    let id = 0n;
    for (let i = 0; i < str.length; i++) {
        if (id >= 10_000_000_000_000_000_000n) return -2n;
        id += BigInt(str.codePointAt(i)!) * 4096n ** BigInt(str.length - 1 - i);
    }
    return id;
}

/**
 * Builds a FPTE string containing the given primary/accent colors and effect ID. If the FPTE Builder is NOT set to
 * backwards compatibility mode, the primary and accent colors will be converted to base-4096 before they are encoded.
 * @param primary The primary profile theme color. Must be negative if unset.
 * @param accent The accent profile theme color. Must be negative if unset.
 * @param effect The profile effect ID. Must be empty if unset.
 * @param legacy Whether the primary and accent colors should be legacy encoded
 * @returns The built FPTE string. Will be empty if the given colors and effect are all unset.
 */
export function buildFPTE(primary: number, accent: number, effect: string, legacy: boolean) {
    const DELIM = "\u200b"; // The FPTE delimiter (zero-width space)

    let fpte = ""; // The FPTE string to be returned

    // If the FPTE Builder is set to backwards compatibility mode,
    // the primary and accent colors, if set, will be legacy encoded.
    if (legacy) {
        // Legacy FPTE strings must include both the primary and accent colors even if they are the same.

        if (primary >= 0) {
            // If both the primary and accent colors are set, they will be legacy encoded and added to the
            // string; otherwise, if the accent color is unset, the primary color will be used in its place.
            if (accent >= 0)
                fpte = encodeColorsLegacy(primary, accent);
            else
                fpte = encodeColorsLegacy(primary, primary);

            // If the effect ID is set, it will be encoded and added to the string prefixed by one delimiter.
            if (effect !== "")
                fpte += DELIM + encodeEffect(BigInt(effect));

            return fpte;
        }

        // Since the primary color is unset, the accent color, if set, will be used in its place.
        if (accent >= 0) {
            fpte = encodeColorsLegacy(accent, accent);

            // If the effect ID is set, it will be encoded and added to the string prefixed by one delimiter.
            if (effect !== "")
                fpte += DELIM + encodeEffect(BigInt(effect));

            return fpte;
        }
    }
    // If the primary color is set, it will be encoded and added to the string.
    else if (primary >= 0) {
        fpte = encodeColor(primary);

        // If the accent color is set and different from the primary color, it
        // will be encoded and added to the string prefixed by one delimiter.
        if (accent >= 0 && primary !== accent) {
            fpte += DELIM + encodeColor(accent);

            // If the effect ID is set, it will be encoded and added to the string prefixed by one delimiter.
            if (effect !== "")
                fpte += DELIM + encodeEffect(BigInt(effect));

            return fpte;
        }
    }
    // If only the accent color is set, it will be encoded and added to the string.
    else if (accent >= 0)
        fpte = encodeColor(accent);

    // Since either the primary/accent colors are the same, both are unset, or just one is set, only one color will be added
    // to the string; therefore, the effect ID, if set, will be encoded and added to the string prefixed by two delimiters.
    if (effect !== "")
        fpte += DELIM + DELIM + encodeEffect(BigInt(effect));

    return fpte;
}

/**
 * Extracts the delimiter-separated values of the first FPTE string found in the given string
 * @param str The string to be searched for a FPTE string
 * @returns An array of the extracted FPTE string's values. Values will be empty if not found.
 */
export function extractFPTE(str: string) {
    const fpte: [string, string, string] = ["", "", ""]; // The array containing extracted FPTE values
    let i = 0; // The current index of fpte getting extracted

    for (const char of str) {
        const cp = char.codePointAt(0)!; // The current character's code point

        // If the current character is a delimiter, then the current index of fpte has been completed.
        if (cp === 0x200B) {
            // If the current index of fpte is the last, then the extraction is done.
            if (i >= 2) break;
            i++; // Start extracting the next index of fpte
        }
        // If the current character is not a delimiter but a valid FPTE
        // character, it will be added to the current index of fpte.
        else if (cp >= 0xE0000 && cp <= 0xE0FFF)
            fpte[i] += String.fromCodePoint(cp - 0xE0000);
        // If an FPTE string has been found and its end has been reached, then the extraction is done.
        else if (i > 0 || fpte[0] !== "") break;
    }

    return fpte;
}
