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
import API from "../index";
import { verify } from "../utils";

export enum AutoProxyModes {
    Off = "off",
    Front = "front",
    Latch = "latch",
    Member = "member"
}

const apVals: string[] = [
    AutoProxyModes.Off,
    AutoProxyModes.Front,
    AutoProxyModes.Latch,
    AutoProxyModes.Member
];

const KEYS: any = {
    guild: { },
    autoproxy_mode: {
        test: (s?: string) => s && apVals.includes(s),
        err: `Invalid mode provided. Valid autoproxy mode values: ${apVals.join(", ")}`
    },
    autoproxy_member: { },
    last_latch_timestamp: {
        init: (d: Date | string) => d ? new Date(d) : d
    }
};

export interface ISystemAutoproxySettings {
    guild: string;
    autoproxy_mode?: AutoProxyModes;
    autoproxy_member?: string | null;
    last_latch_timestamp?: Date;
}

export default class SystemAutoproxySettings implements ISystemAutoproxySettings {
    [key: string]: any;

    #api: API;

    guild: string = "";
    autoproxy_mode?: AutoProxyModes;
    autoproxy_member?: string | null;
    last_latch_timestamp?: Date;

    constructor(api: API, data: Partial<SystemAutoproxySettings> = { }) {
        this.#api = api;
        for(var k in data) {
            if(KEYS[k]) {
                if(KEYS[k].init) data[k] = KEYS[k].init(data[k]);
                this[k] = data[k];
            }
        }
    }

    async patch(token?: string) {
        var data = await this.#api.patchSystemAutoproxySettings({ ...this, token });
        for(var k in data) if(KEYS[k]) this[k] = data[k];
        return this;
    }

    async verify() {
        return verify<SystemAutoproxySettings>(this, KEYS);
    }
}
