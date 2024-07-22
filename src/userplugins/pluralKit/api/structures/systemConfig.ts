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

import { rawTimeZones } from "@vvo/tzdb";

import API from "../index";
import { verify } from "../utils";

function findTz(t: string) {
    return rawTimeZones.find(z => {
        return ([
            z.name.toLowerCase(),
            z.abbreviation.toLowerCase(),
            z.alternativeName.toLowerCase()
        ].includes(t.toLowerCase().replace("utc", "gmt")));
    });
}

const KEYS: any = {
    timezone: {
        test: (t: string) => findTz(t),
        err: "Timezone must be valid",
        transform: (t: string) => {
            var raw = findTz(t);
            return raw!.abbreviation.replace("GMT","UTC");
        }
    },
    pings_enabled: {
        transform: (v?: any) => !!v
    },
    latch_timeout: {
        test: (v?: any) => !isNaN(v)
    },
    member_default_private: {
        transform: (v?: any) => !!v
    },
    group_default_private: {
        transform: (v?: any) => !!v
    },
    show_private_info: {
        transform: (v?: any) => !!v
    },
    member_limit: { },
    group_limit: { }
};

export interface ISystemConfig {
    timezone?: string;
    pings_enabled?: boolean;
    latch_timeout?: number | null;
    member_default_private?: boolean;
    group_default_private?: boolean;
    show_private_info?: boolean;
    member_limit?: number;
    group_limit?: number;
}

export default class SystemConfig implements ISystemConfig {
    [key: string]: any;

    #api: API;

    timezone?: string;
    pings_enabled?: boolean;
    latch_timeout?: number | null;
    member_default_private?: boolean;
    group_default_private?: boolean;
    show_private_info?: boolean;
    member_limit?: number;
    group_limit?: number;

    constructor(api: API, data: Partial<SystemConfig> = { }) {
        this.#api = api;
        for(var k in data) {
            if(KEYS[k]) {
                if(KEYS[k].init) data[k] = KEYS[k].init(data[k]);
                this[k] = data[k];
            }
        }
    }

    async patch(token?: string) {
        var data = await this.#api.patchSystemConfig({ ...this, token });
        for(var k in data) if(KEYS[k]) this[k] = data[k];
        return this;
    }

    async verify() {
        return verify<SystemConfig>(this, KEYS);
    }
}
