/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { localStorage } from "@utils/localStorage";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";

const tokenUtils = findByPropsLazy("getToken");

function generateEncryptionKey() {
    let key: any;
    async function generateKeyAsync() {
        const keyGenParams = {
            name: "AES-GCM",
            length: 256
        };
        key = await crypto.subtle.generateKey(keyGenParams, true, ["encrypt", "decrypt"]);
    }
    generateKeyAsync();
    return key;
}

const key = generateEncryptionKey();

function xorEncryptDecrypt(input: string, key: string): string {
    const encoder = new TextEncoder();
    const inputBytes = encoder.encode(input);
    const keyBytes = encoder.encode(key);

    const outputBytes = new Uint8Array(inputBytes.length);

    for (let i = 0; i < inputBytes.length; i++) {
        outputBytes[i] = inputBytes[i] ^ keyBytes[i % keyBytes.length];
    }

    const decoder = new TextDecoder();
    return decoder.decode(outputBytes);
}

function setToken(t: string) {
    if (settings.store.encrypted) {
        settings.store.token = xorEncryptDecrypt(t, key);
    } else {
        settings.store.token = settings.store.token;
    }
    tokenUtils.setToken("secured", undefined);
};

function handleGetToken(res: any) {
    if (res() !== "secured" && res()) {
        setToken(res());
        return res();
    } else if (settings.store.token && res()) {
        if (settings.store.encrypted) {
            return xorEncryptDecrypt(settings.store.token, key);
        } else {
            return settings.store.token;
        }
    } else {
        return undefined;
    }
};

function handleSetToken(v: any, res: any) {
    if (v === "secured") { res(); } else { setToken(v); }
    localStorage.setItem("tokens", "{}");
};

const settings = definePluginSettings({
    encrypted: {
        type: OptionType.BOOLEAN,
        description: "Whether the token should be encrypted, will require a login every restart",
        restartNeeded: true,
        default: true
    },
    token: {
        type: OptionType.STRING,
        hidden: true,
        description: "Discord token"
    }
});

export default definePlugin({
    name: "SecureToken",
    description: "Stores your Discord token safely.",
    authors: [Devs.Inbestigator],
    handleGetToken,
    handleSetToken,
    settings,
    patches: [
        {
            find: "decryptedToken",
            replacement: [
                {
                    match: /return\((\i)\(\),null!=(\i)\)\?_\[(\i)\]:(\i)/,
                    replace: "return $self.handleGetToken((()=>($1(),null!=$2)?_[$3]:$4))"
                },
                {
                    match: /if\(null==(\i)\)\{\i\(\i\);return\}\i=\i,null!=\i&&\(_\[\i\]=\i\),\i\?\i\(\):\(\i=\i,\i=_,\i\(\)\)/,
                    replace: "$self.handleSetToken($1,()=>{$&})"
                }
            ]
        }
    ],
    start: () => {
        tokenUtils.getToken();
    },
});
