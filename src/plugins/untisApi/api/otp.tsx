/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const base32ToUint8Array = (base32: string): Uint8Array => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const buffer: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of base32.toUpperCase()) {
        const index = alphabet.indexOf(char);
        if (index === -1) {
            if (char === "=") break;
            throw new Error(`Invalid character in base32: ${char}`);
        }

        value = (value << 5) | index;
        bits += 5;

        if (bits >= 8) {
            buffer.push((value >> (bits - 8)) & 0xff);
            bits -= 8;
        }
    }

    return new Uint8Array(buffer);
};

export const hmacSha1 = async (key: Uint8Array, data: Uint8Array): Promise<Uint8Array> => {
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
    return new Uint8Array(signature);
};

export const generateTOTP = async (secret: string, timeStep: number = 30): Promise<string> => {
    const epoch = Math.floor(Date.now() / 1000);
    const counter = Math.floor(epoch / timeStep);

    const key = base32ToUint8Array(secret);
    const counterBuffer = new Uint8Array(8);
    new DataView(counterBuffer.buffer).setUint32(4, counter, false);

    const hmac = await hmacSha1(key, counterBuffer);
    const offset = hmac[hmac.length - 1] & 0x0f;

    const code = (hmac[offset] & 0x7f) << 24 |
        (hmac[offset + 1] & 0xff) << 16 |
        (hmac[offset + 2] & 0xff) << 8 |
        (hmac[offset + 3] & 0xff);

    return (code % 10 ** 6).toString().padStart(6, "0");
};

