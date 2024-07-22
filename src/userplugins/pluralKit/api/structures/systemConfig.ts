/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
