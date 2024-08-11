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

const settings = definePluginSettings({
    encrypted: {
        type: OptionType.BOOLEAN,
        description: "Whether the token should be encrypted, will require a login every restart (enable storeKey to stop that)",
        restartNeeded: true,
        default: true
    },
    storeKey: {
        type: OptionType.BOOLEAN,
        description: "Whether the encryption key should be stored and not regenerated on restart",
        restartNeeded: true,
        default: false
    },
    key: {
        type: OptionType.STRING,
        hidden: true,
        description: "Key"
    },
    token: {
        type: OptionType.STRING,
        hidden: true,
        description: "Discord token"
    }
});

const tokenUtils = findByPropsLazy("getToken");
const uuid = crypto.randomUUID();

function key() {
    if (settings.store.storeKey) {
        if (!settings.store.key) settings.store.key = uuid;
        return settings.store.key;
    } else {
        return uuid;
    }
}


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
        settings.store.token = xorEncryptDecrypt(t, key());
    } else {
        settings.store.token = settings.store.token;
    }
    tokenUtils.setToken("secured", undefined);
}

function handleGetToken(res: any) {
    if (res() !== "secured" && res()) {
        setToken(res());
        return res();
    } else if (settings.store.token && res()) {
        if (settings.store.encrypted) {
            return xorEncryptDecrypt(settings.store.token, key());
        } else {
            return settings.store.token;
        }
    } else {
        return undefined;
    }
}

function handleSetToken(v: any, res: any) {
    if (v === "secured") { res(); } else { setToken(v); }
    localStorage.setItem("tokens", "{}");
}

export default definePlugin({
    name: "SecureTokens",
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
                    match: /return(\(\i\(\),null!=\i\)\?_\[\i\]:\i)/,
                    replace: "return $self.handleGetToken((()=>$1))"
                },
                {
                    match: /if\(null==(\i)\).{0,55}\i\(\)\)/,
                    replace: "$self.handleSetToken($1,()=>{$&})"
                }
            ]
        }
    ],
    start: () => {
        tokenUtils.getToken();
    },
});
