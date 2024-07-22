/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import SystemAutoproxySettings from "./structures/systemAutoproxySettings";

export function validatePrivacy(keys: Array<string>, obj: any) {
    var priv: any = {};
    for(var k of keys) {
        if(obj[k] === undefined) continue;
        if(["private", "public"].includes(obj[k])) {
            priv[k] = obj[k];
            continue;
        }

        priv[k] = obj[k] ? "public" : "private";
    }

    return priv;
}

export function formatDate(D: Date) {
    const y = ("000" + D.getFullYear()).slice(-4);
    const m = ("0" + (D.getMonth() + 1)).slice(-2);
    const d = ("0" + (D.getDate())).slice(-2);

    return `${y}-${m}-${d}`;
}

export async function verify <T> (instance: any, KEYS: any): Promise<Partial<T>> {
    const val: Partial<T> = {};
    const errors: string[] = [];
    for(const k in KEYS) {
        let test = true;
        if(instance[k] == null) {
            val[k] = instance[k];
            continue;
        }
        if(instance[k] === undefined) continue;

        if(KEYS[k].test) test = await KEYS[k].test(instance[k]);
        if(!test) {
            errors.push(KEYS[k].err);
            continue;
        }
        if(KEYS[k].transform) instance[k] = KEYS[k].transform(instance[k]);
        val[k] = instance[k];
    }

    if(errors.length) throw new Error(errors.join("\n"));

    return val;
}
