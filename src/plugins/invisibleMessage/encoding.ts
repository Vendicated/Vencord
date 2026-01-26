/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Encoding/Decoding utilities for invisible messages
 * Uses zero-width Unicode characters that Discord preserves
 */

// Zero-width characters that Discord doesn't filter
const ZWSP = "\u200b"; // Zero Width Space
const ZWNJ = "\u200c"; // Zero Width Non-Joiner
const ZWJ = "\u200d";  // Zero Width Joiner

// Markers for start and end of encoded message
export const PADDING_START = ZWNJ + ZWSP;
export const PADDING_END = ZWSP + ZWNJ;

// Pattern to detect text that should be encoded: >text<
export const SHOULD_ENCODE_PATTERN = / *>(.+?)< */;

// Pattern to detect encoded text
export const ENCODED_PATTERN = new RegExp(`${ZWNJ}${ZWSP}([${ZWSP}${ZWNJ}${ZWJ}]+?)${ZWSP}${ZWNJ}`, "g");

/**
 * Encode a string to binary using zero-width characters
 * Each character is converted to binary, then binary is encoded as ZWSP (0) and ZWJ (1)
 */
export const encode = (s: string): string => {
    let result = PADDING_START;

    for (let i = 0; i < s.length; i++) {
        const charCode = s.charCodeAt(i);
        const binary = charCode.toString(2).padStart(16, "0");

        for (const bit of binary) {
            result += bit === "0" ? ZWSP : ZWJ;
        }
    }

    result += PADDING_END;
    return result;
};

/**
 * Decode an invisible message
 */
export const decode = (s: string): string => {
    ENCODED_PATTERN.lastIndex = 0;

    const match = ENCODED_PATTERN.exec(s);
    if (!match) {
        return "";
    }

    const encoded = match[1];
    let result = "";
    let binary = "";

    for (const char of encoded) {
        if (char === ZWSP) {
            binary += "0";
        } else if (char === ZWJ) {
            binary += "1";
        }

        // Every 16 bits = 1 character
        if (binary.length === 16) {
            const charCode = parseInt(binary, 2);
            result += String.fromCharCode(charCode);
            binary = "";
        }
    }

    return result;
};

/**
 * Check if a string contains encoded text
 */
export const checkEncode = (s: string): boolean => {
    ENCODED_PATTERN.lastIndex = 0;
    return ENCODED_PATTERN.test(s);
};
