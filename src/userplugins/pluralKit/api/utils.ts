/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
BSD 2-Clause License

Copyright (c) 2021, Grey Himmel
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

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
