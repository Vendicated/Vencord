/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** The FPTE delimiter codepoint (codepoint of zero-width space). */
const DELIMITER_CODEPOINT = 0x200B;
/** The FPTE delimiter (zero-width space). */
const DELIMITER = String.fromCodePoint(DELIMITER_CODEPOINT);
/** The FPTE radix (number of default-ignorable codepoints in the SSP plane). */
const RADIX = 0x1000;
/** The FPTE starting codepoint (first codepoint in the SSP plane). */
const STARTING_CODEPOINT = 0xE0000;
/** The FPTE starting character (first character in the SSP plane). */
const STARTING = String.fromCodePoint(STARTING_CODEPOINT);
/** The FPTE ending codepoint (last default-ignorable codepoint in the SSP plane). */
const ENDING_CODEPOINT = STARTING_CODEPOINT + RADIX - 1;

/**
 * Builds a theme color string in the legacy format: `[#primary,#accent]`, where primary and accent are
 * 24-bit colors as base-16 strings, with each codepoint of the string offset by +{@link STARTING_CODEPOINT}.
 * @param primary The 24-bit primary color.
 * @param accent The 24-bit accent color.
 * @returns The built legacy-format theme color string.
 */
export function encodeColorsLegacy(primary: number, accent: number) {
    let str = "";
    for (const char of `[#${primary.toString(16)},#${accent.toString(16)}]`)
        str += String.fromCodePoint(char.codePointAt(0)! + STARTING_CODEPOINT);
    return str;
}

/**
 * Extracts the theme colors from a legacy-format string.
 * @param str The legacy-format string to extract the theme colors from.
 * @returns The profile theme colors. Colors will be -1 if not found.
 * @see {@link encodeColorsLegacy}
 */
export function decodeColorsLegacy(str: string): [primaryColor: number, accentColor: number] {
    const [primary, accent] = str.matchAll(/(?<=#)[\dA-Fa-f]{1,6}/g);
    return [primary ? parseInt(primary[0], 16) : -1, accent ? parseInt(accent[0], 16) : -1];
}

/**
 * Converts a 24-bit color to a base-{@link RADIX} string with each codepoint offset by +{@link STARTING_CODEPOINT}.
 * @param color The 24-bit color to be converted.
 * @returns The converted base-{@link RADIX} string with +{@link STARTING_CODEPOINT} offset.
 */
export function encodeColor(color: number) {
    if (color === 0) return STARTING;
    let str = "";
    for (; color > 0; color = Math.trunc(color / RADIX))
        str = String.fromCodePoint(color % RADIX + STARTING_CODEPOINT) + str;
    return str;
}

/**
 * Converts a no-offset base-{@link RADIX} string to a 24-bit color.
 * @param str The no-offset base-{@link RADIX} string to be converted.
 * @returns The converted 24-bit color.
 *          Will be -1 if `str` is empty and -2 if the color is greater than the maximum 24-bit color, 0xFFFFFF.
 */
export function decodeColor(str: string) {
    if (!str) return -1;
    let color = 0;
    for (let i = 0; i < str.length; i++) {
        if (color > 0xFFF_FFF) return -2;
        color += str.codePointAt(i)! * RADIX ** (str.length - 1 - i);
    }
    return color;
}

/**
 * Converts an effect ID to a base-{@link RADIX} string with each code point offset by +{@link STARTING_CODEPOINT}.
 * @param id The effect ID to be converted.
 * @returns The converted base-{@link RADIX} string with +{@link STARTING_CODEPOINT} offset.
 */
export function encodeEffect(id: bigint) {
    if (id === 0n) return STARTING;
    let str = "";
    for (; id > 0n; id /= BigInt(RADIX))
        str = String.fromCodePoint(Number(id % BigInt(RADIX)) + STARTING_CODEPOINT) + str;
    return str;
}

/**
 * Converts a no-offset base-{@link RADIX} string to an effect ID.
 * @param str The no-offset base-{@link RADIX} string to be converted.
 * @returns The converted effect ID.
 *          Will be -1n if `str` is empty and -2n if the color is greater than the maximum effect ID.
 */
export function decodeEffect(str: string) {
    if (!str) return -1n;
    let id = 0n;
    for (let i = 0; i < str.length; i++) {
        if (id >= 10_000_000_000_000_000_000n) return -2n;
        id += BigInt(str.codePointAt(i)!) * BigInt(RADIX) ** BigInt(str.length - 1 - i);
    }
    return id;
}

/**
 * Builds a FPTE string containing the given primary/accent colors and effect ID. If the FPTE Builder is NOT set to backwards
 * compatibility mode, the primary and accent colors will be converted to base-{@link RADIX} before they are encoded.
 * @param primary The primary profile theme color. Must be negative if unset.
 * @param accent The accent profile theme color. Must be negative if unset.
 * @param effect The profile effect ID. Must be empty if unset.
 * @param legacy Whether the primary and accent colors should be legacy encoded.
 * @returns The built FPTE string. Will be empty if the given colors and effect are all unset.
 */
export function buildFPTE(primary: number, accent: number, effect: string, legacy: boolean) {
    /** The FPTE string to be returned. */
    let fpte = "";

    // If the FPTE Builder is set to backwards compatibility mode,
    // the primary and accent colors, if set, will be legacy encoded.
    if (legacy) {
        // Legacy FPTE strings must include both the primary and accent colors, even if they are the same.

        if (primary >= 0) {
            // If both the primary and accent colors are set, they will be legacy encoded and added to the
            // string; otherwise, if the accent color is unset, the primary color will be used in its place.
            if (accent >= 0)
                fpte = encodeColorsLegacy(primary, accent);
            else
                fpte = encodeColorsLegacy(primary, primary);

            // If the effect ID is set, it will be encoded and added to the string prefixed by one delimiter.
            if (effect)
                fpte += DELIMITER + encodeEffect(BigInt(effect));

            return fpte;
        }

        // Since the primary color is unset, the accent color, if set, will be used in its place.
        if (accent >= 0) {
            fpte = encodeColorsLegacy(accent, accent);

            // If the effect ID is set, it will be encoded and added to the string prefixed by one delimiter.
            if (effect)
                fpte += DELIMITER + encodeEffect(BigInt(effect));

            return fpte;
        }
    }
    // If the primary color is set, it will be encoded and added to the string.
    else if (primary >= 0) {
        fpte = encodeColor(primary);

        // If the accent color is set and different from the primary color, it
        // will be encoded and added to the string prefixed by one delimiter.
        if (accent >= 0 && primary !== accent) {
            fpte += DELIMITER + encodeColor(accent);

            // If the effect ID is set, it will be encoded and added to the string prefixed by one delimiter.
            if (effect)
                fpte += DELIMITER + encodeEffect(BigInt(effect));

            return fpte;
        }
    }
    // If only the accent color is set, it will be encoded and added to the string.
    else if (accent >= 0)
        fpte = encodeColor(accent);

    // Since either the primary/accent colors are the same, both are unset, or just one is set, only one color will be added
    // to the string; therefore, the effect ID, if set, will be encoded and added to the string prefixed by two delimiters.
    if (effect)
        fpte += DELIMITER + DELIMITER + encodeEffect(BigInt(effect));

    return fpte;
}

/**
 * Extracts the delimiter-separated values of the first FPTE substring in a string.
 * @param str The string to be searched for a FPTE substring.
 * @returns An array of the found FPTE substring's extracted values. Values will be empty if not found.
 */
export function extractFPTE(str: string) {
    /** The array of extracted FPTE values to be returned. */
    const fpte: [maybePrimaryOrLegacy: string, maybeAccentOrEffect: string, maybeEffect: string] = ["", "", ""];
    /** The current index of {@link fpte} getting extracted. */
    let i = 0;

    for (const char of str) {
        /** The current character's codepoint. */
        const cp = char.codePointAt(0)!;

        // If the current character is a delimiter, then the current index of fpte has been completed.
        if (cp === DELIMITER_CODEPOINT) {
            // If the current index of fpte is the last, then the extraction is done.
            if (i >= 2) break;
            i++; // Start extracting the next index of fpte.
        }
        // If the current character is not a delimiter but a valid FPTE
        // character, it will be added to the current index of fpte.
        else if (cp >= STARTING_CODEPOINT && cp <= ENDING_CODEPOINT)
            fpte[i] += String.fromCodePoint(cp - STARTING_CODEPOINT);
        // If an FPTE string has been found and its end has been reached, then the extraction is done.
        else if (i > 0 || fpte[0]) break;
    }

    return fpte;
}
