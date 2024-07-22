/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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
