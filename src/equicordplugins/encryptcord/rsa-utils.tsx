/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const generateKeys = async () => {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 4096,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["encrypt", "decrypt"]
    );

    const exportedPublicKey = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKey = formatPemKey(exportedPublicKey, "public");

    return { privateKey: keyPair.privateKey, publicKey };
};

export const encryptData = async (pemPublicKey, data) => {
    const publicKey = await importPemPublicKey(pemPublicKey);

    const chunkSize = 446;

    const encryptedChunks: any[] = [];
    const encoder = new TextEncoder();

    for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = await data.substring(i, i + chunkSize);
        const encryptedChunk = await crypto.subtle.encrypt(
            {
                name: "RSA-OAEP",
            },
            publicKey,
            encoder.encode(chunk)
        );
        encryptedChunks.push(arrayBufferToBase64(encryptedChunk));
    }

    return encryptedChunks;
};

export const decryptData = async (privateKey, encArray) => {
    const decryptionPromises = encArray.map(async encStr => {
        const encBuffer = base64ToArrayBuffer(encStr);

        const dec = await crypto.subtle.decrypt(
            {
                name: "RSA-OAEP",
            },
            privateKey,
            encBuffer
        );

        return new TextDecoder().decode(dec);
    });

    const decryptedMessages = await Promise.all(decryptionPromises);

    return decryptedMessages.join("");
};

// Helper functions
const arrayBufferToBase64 = buffer => {
    const binary = String.fromCharCode(...new Uint8Array(buffer));
    return btoa(binary);
};

const base64ToArrayBuffer = base64String => {
    const binaryString = atob(base64String);
    const { length } = binaryString;
    const buffer = new ArrayBuffer(length);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < length; i++) {
        view[i] = binaryString.charCodeAt(i);
    }

    return buffer;
};

export const formatPemKey = (keyData, type) => {
    const base64Key = arrayBufferToBase64(keyData);
    return `-----BEGIN ${type.toUpperCase()} KEY-----\n` + base64Key + `\n-----END ${type.toUpperCase()} KEY----- `;
};

const importPemPublicKey = async pemKey => {
    try {
        const trimmedPemKey = pemKey.trim();

        const keyBody = trimmedPemKey
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "");

        const binaryDer = atob(keyBody);

        const arrayBuffer = new Uint8Array(binaryDer.length);
        for (let i = 0; i < binaryDer.length; i++) {
            arrayBuffer[i] = binaryDer.charCodeAt(i);
        }

        return await crypto.subtle.importKey(
            "spki",
            arrayBuffer,
            {
                name: "RSA-OAEP",
                hash: { name: "SHA-256" },
            },
            true,
            ["encrypt"]
        );
    } catch (error) {
        console.error("Error importing PEM public key:", error);
        throw error;
    }
};
