/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const MARKER = "\u2063\u2062\u2064\u2063";
const ALPHABET = "\u200C\u200D\u2060\u2061";
const LEGACY_MARKER = "\u2063\uFE00\uFE01\uFE02\uFE03";
const AAD = new TextEncoder().encode("Vencord HiddenMessages v1");
const ITERATIONS = 310_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const OPEN_KEY_BYTES = 32;

function encodeBytes(bytes: Uint8Array) {
    let result = "";
    for (const byte of bytes) {
        result += ALPHABET[byte >> 6]
            + ALPHABET[byte >> 4 & 3]
            + ALPHABET[byte >> 2 & 3]
            + ALPHABET[byte & 3];
    }
    return result;
}

function decodeBytes(encoded: string) {
    if (!encoded || encoded.length % 4) throw new Error("Invalid hidden message");

    const bytes = new Uint8Array(encoded.length / 4);
    for (let i = 0; i < encoded.length; i += 4) {
        const values = [...encoded.slice(i, i + 4)].map(char => ALPHABET.indexOf(char));
        if (values.some(value => value < 0)) throw new Error("Invalid hidden message");
        bytes[i / 4] = values[0] << 6 | values[1] << 4 | values[2] << 2 | values[3];
    }
    return bytes;
}

function decodeLegacyBytes(encoded: string) {
    if (!encoded || encoded.length % 2) throw new Error("Invalid hidden message");

    const bytes = new Uint8Array(encoded.length / 2);
    for (let i = 0; i < encoded.length; i += 2) {
        const high = encoded.charCodeAt(i) - 0xFE00;
        const low = encoded.charCodeAt(i + 1) - 0xFE00;
        if (high < 0 || high > 15 || low < 0 || low > 15) throw new Error("Invalid hidden message");
        bytes[i / 2] = high << 4 | low;
    }
    return bytes;
}

function getPacket(content: string) {
    const start = content.lastIndexOf(MARKER);
    if (start >= 0) {
        const payloadStart = start + MARKER.length;
        let payloadEnd = payloadStart;
        while (payloadEnd < content.length && ALPHABET.includes(content[payloadEnd])) payloadEnd++;
        return decodeBytes(content.slice(payloadStart, payloadEnd));
    }

    const legacyStart = content.lastIndexOf(LEGACY_MARKER);
    if (legacyStart >= 0) return decodeLegacyBytes(content.slice(legacyStart + LEGACY_MARKER.length));
    throw new Error("No hidden message");
}

async function deriveKey(password: string, salt: Uint8Array, usage: KeyUsage) {
    const material = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
        material,
        { name: "AES-GCM", length: 256 },
        false,
        [usage]
    );
}

function importKey(bytes: Uint8Array, usage: KeyUsage) {
    return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [usage]);
}

export async function hideMessage(publicMessage: string, hiddenMessage: string, password: string | null) {
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const saltOrKey = crypto.getRandomValues(new Uint8Array(password === null ? OPEN_KEY_BYTES : SALT_BYTES));
    const key = password === null
        ? await importKey(saltOrKey, "encrypt")
        : await deriveKey(password, saltOrKey, "encrypt");
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
        { name: "AES-GCM", iv, additionalData: AAD },
        key,
        new TextEncoder().encode(hiddenMessage)
    ));

    const packet = new Uint8Array(1 + saltOrKey.length + iv.length + ciphertext.length);
    packet[0] = password === null ? 2 : 1;
    packet.set(saltOrKey, 1);
    packet.set(iv, 1 + saltOrKey.length);
    packet.set(ciphertext, 1 + saltOrKey.length + iv.length);
    const firstWhitespace = publicMessage.search(/\s/);
    const characters = [...publicMessage];
    const insertionPoint = firstWhitespace >= 0 && firstWhitespace < publicMessage.length - 1
        ? firstWhitespace + 1
        : characters.length > 1
            ? characters[0].length
            : 0;

    return publicMessage.slice(0, insertionPoint)
        + MARKER + encodeBytes(packet)
        + publicMessage.slice(insertionPoint);
}

export function hasHiddenMessage(content: string) {
    try {
        const packet = getPacket(content);
        return packet[0] === 1
            ? packet.length >= 1 + SALT_BYTES + IV_BYTES + 16
            : packet[0] === 2 && packet.length >= 1 + OPEN_KEY_BYTES + IV_BYTES + 16;
    } catch {
        return false;
    }
}

export function requiresPassword(content: string) {
    const packet = getPacket(content);
    if (packet[0] === 1) return true;
    if (packet[0] === 2) return false;
    throw new Error("Invalid hidden message");
}

export async function revealMessage(content: string, password = "") {
    const packet = getPacket(content);
    const keyBytes = packet[0] === 1 ? SALT_BYTES : packet[0] === 2 ? OPEN_KEY_BYTES : 0;
    if (!keyBytes || packet.length < 1 + keyBytes + IV_BYTES + 16)
        throw new Error("Invalid hidden message");

    const saltOrKey = packet.slice(1, 1 + keyBytes);
    const iv = packet.slice(1 + keyBytes, 1 + keyBytes + IV_BYTES);
    const ciphertext = packet.slice(1 + keyBytes + IV_BYTES);
    const key = packet[0] === 1
        ? await deriveKey(password, saltOrKey, "decrypt")
        : await importKey(saltOrKey, "decrypt");

    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(await crypto.subtle.decrypt(
            { name: "AES-GCM", iv, additionalData: AAD },
            key,
            ciphertext
        ));
    } catch {
        throw new Error("Wrong password or damaged message");
    }
}

export async function selfTest() {
    const visible = "Hey everyone!";
    const secret = "I'm hiding this message! 🔒";
    const content = await hideMessage(visible, secret, "Password1234");
    const rendered = [...content].filter(char => !ALPHABET.includes(char) && !MARKER.includes(char)).join("");
    if (rendered !== visible || !hasHiddenMessage(content)) throw new Error("Encoding failed");
    if (await revealMessage(content, "Password1234") !== secret) throw new Error("Decryption failed");

    try {
        await revealMessage(content, "wrong");
        throw new Error("Wrong password was accepted");
    } catch (error) {
        if ((error as Error).message === "Wrong password was accepted") throw error;
    }

    const openContent = await hideMessage(visible, secret, null);
    if (requiresPassword(openContent) || await revealMessage(openContent) !== secret)
        throw new Error("No-password mode failed");
}
