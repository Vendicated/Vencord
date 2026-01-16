/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";

export const cl = classNameFactory("vc-link-encode-");

export interface EncryptedMessage {
    encrypted: string;
    key: string;
    original: string;
}

export interface DecryptedValue {
    text: string;
}

// Reusable encoders/decoders for better performance
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

// Character set for key generation (pre-computed for performance)
const KEY_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const KEY_CHARS_LENGTH = KEY_CHARS.length;

function generateRandomKey(length: number = 16): string {
    // Use array join instead of string concatenation for better performance
    const chars: string[] = new Array(length);
    for (let i = 0; i < length; i++) {
        chars[i] = KEY_CHARS.charAt(Math.floor(Math.random() * KEY_CHARS_LENGTH));
    }
    return chars.join("");
}

function xorCipher(text: string, key: string): string {
    const keyBytes = textEncoder.encode(key);
    const textBytes = textEncoder.encode(text);
    const keyLength = keyBytes.length;
    const result = new Uint8Array(textBytes.length);
    
    for (let i = 0; i < textBytes.length; i++) {
        result[i] = textBytes[i] ^ keyBytes[i % keyLength];
    }
    
    // Use Uint8Array directly with btoa for better performance
    return btoa(String.fromCharCode(...result));
}

function xorDecipher(encoded: string, key: string): string {
    try {
        const data = atob(encoded);
        const keyBytes = textEncoder.encode(key);
        const keyLength = keyBytes.length;
        const dataLength = data.length;
        const dataBytes = new Uint8Array(dataLength);
        
        // Convert string to Uint8Array in one pass
        for (let i = 0; i < dataLength; i++) {
            dataBytes[i] = data.charCodeAt(i);
        }
        
        // XOR in place
        for (let i = 0; i < dataLength; i++) {
            dataBytes[i] ^= keyBytes[i % keyLength];
        }
        
        return textDecoder.decode(dataBytes);
    } catch (error) {
        throw new Error(`Invalid encoded data or key: ${error instanceof Error ? error.message : String(error)}`);
    }
}


export function encryptMessage(text: string): EncryptedMessage {
    const key = generateRandomKey(32);
    const encrypted = xorCipher(text, key);
    
    return {
        encrypted,
        key,
        original: text
    };
}

export function decryptMessage(encrypted: string, key: string): string {
    return xorDecipher(encrypted, key);
}

// Stealth mode uses emojis to make it look less like encryption
const ENCRYPTED_PREFIX_STEALTH = "🔐";
const KEY_PREFIX_STEALTH = "🗝️";
const SEPARATOR = " | ";

// Obvious format (for compatibility)
const ENCRYPTED_PREFIX_OBVIOUS = "encrypted:";
const KEY_PREFIX_OBVIOUS = "key:";

// Pre-compiled regex patterns for better performance (compiled once, reused)
const STEALTH_REGEX = new RegExp(`${ENCRYPTED_PREFIX_STEALTH}\\s*([^|]+)\\s*\\|\\s*${KEY_PREFIX_STEALTH}\\s*([^\\n]+)`, "s");
const OBVIOUS_ENCRYPTED_REGEX = new RegExp(`${ENCRYPTED_PREFIX_OBVIOUS}\\s*([^\\n]+)`, "i");
const OBVIOUS_KEY_REGEX = new RegExp(`${KEY_PREFIX_OBVIOUS}\\s*([^\\n]+)`, "i");

export function parseEncryptedMessage(content: string, stealthMode: boolean = true): { encrypted: string; key: string } | null {
    if (stealthMode) {
        // Try stealth format first (emoji-based, less obvious)
        // Match: 🔐<encrypted> | 🗝️<key>
        const stealthMatch = content.match(STEALTH_REGEX);
        if (stealthMatch) {
            return {
                encrypted: stealthMatch[1].trim(),
                key: stealthMatch[2].trim()
            };
        }
    }
    
    // Try obvious format (for backwards compatibility and non-stealth mode)
    const encryptedMatch = content.match(OBVIOUS_ENCRYPTED_REGEX);
    const keyMatch = content.match(OBVIOUS_KEY_REGEX);
    
    if (encryptedMatch && keyMatch) {
        return {
            encrypted: encryptedMatch[1].trim(),
            key: keyMatch[1].trim()
        };
    }
    
    return null;
}

export function formatEncryptedMessage(encrypted: string, key: string, stealthMode: boolean = true): string {
    if (stealthMode) {
        // Use emoji-based format that looks more like normal chat
        // This makes it less obvious to automated filters
        return `${ENCRYPTED_PREFIX_STEALTH}${encrypted}${SEPARATOR}${KEY_PREFIX_STEALTH}${key}`;
    } else {
        // Obvious format for compatibility
        return `${ENCRYPTED_PREFIX_OBVIOUS} ${encrypted}\n${KEY_PREFIX_OBVIOUS} ${key}`;
    }
}
