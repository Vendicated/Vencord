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

import API, { PKAPI } from "../index";
import { verify } from "../utils";
import Member from "./member";

const KEYS: any = {
    id: { },
    timestamp: {
        init: (t: Date | string) => new Date(t),
        // transform: (d) => d.toISOString()
    },
    members: {
        transform: (mems: Map<string, Member> | Array<string>) => {
            var arr: string[] = [];
            if(mems instanceof Map) for(var m of mems.values()) arr.push(m.id ?? m);
            else arr = mems.map((m: Member | string) => {
                return m instanceof Member ? m.id : m;
            });
            return arr;
        }
    }
};

export interface ISwitch {
    id: string;
    timestamp: Date | string;
    members?: Map<string, Member> | Array<string>;
}

export default class Switch implements ISwitch {
    [key: string]: any;

    #api: PKAPI;

    id: string = "";
    timestamp: Date | string = "";
    members?: Map<string, Member> | Array<string>;

    constructor(api: API, data: Partial<Switch>) {
        this.#api = api;
        if(!data.timestamp || !data.members)
            throw new Error("Switch objects require a timestamp and members key");

        for(const k in data) {
            if(KEYS[k]) {
                if(KEYS[k].init) data[k] = KEYS[k].init(data[k]);
                this[k] = data[k];
            }
        }
    }

    async patchTimestamp(timestamp: Date, token?: string) {
        const data = await this.#api.patchSwitchTimestamp({ switch: this.id, timestamp, token });
        for(const k in data) if(KEYS[k]) this[k] = data[k];
        return this;
    }

    async patchMembers(token?: string, members?: Array<string>) {
        const data = await this.#api.patchSwitchMembers({ switch: this.id, members, token });
        for(const k in data) if(KEYS[k]) this[k] = data[k];
        return this;
    }

    async delete(token?: string) {
        return await this.#api.deleteSwitch({ switch: this.id, token });
    }

    async verify() {
        return verify<Switch>(this, KEYS);
    }
}
