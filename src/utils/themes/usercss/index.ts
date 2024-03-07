/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { parse as originalParse, UserstyleHeader } from "usercss-meta";

const UserCSSLogger = new Logger("UserCSS", "#d2acf5");

export async function usercssParse(text: string, fileName: string): Promise<UserstyleHeader> {
    const { metadata, errors } = originalParse(text.replace(/\r/g, ""), {
        allowErrors: true,
        unknownKey: "assign"
    });

    if (errors.length) {
        UserCSSLogger.warn("Parsed", fileName, "with errors:", errors);
    }

    const requiredPlugins = metadata["vc-requiredPlugins"]?.split(",").map(p => p.trim());

    return {
        ...metadata,
        fileName,
        id: await getUserCssId(metadata),
        requiredPlugins
    };
}

export async function getUserCssId(header: UserstyleHeader): Promise<string> {
    const encoder = new TextEncoder();

    const nameBuf = encoder.encode(header.name);
    const namespaceBuf = encoder.encode(header.namespace);

    const nameHash = new Uint8Array(await window.crypto.subtle.digest("SHA-256", nameBuf));
    const namespaceHash = new Uint8Array(await window.crypto.subtle.digest("SHA-256", namespaceBuf));

    const idHash = await window.crypto.subtle.digest("SHA-256", new Uint8Array([...nameHash, ...namespaceHash]));

    return window.btoa(String.fromCharCode(...new Uint8Array(idHash))).substring(0, 43); // base64 adds one more padding character
}
