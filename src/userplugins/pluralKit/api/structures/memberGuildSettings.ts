/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import axios from "axios";
import validUrl from "valid-url";

import API from "../index";
import { verify } from "../utils";

const KEYS: any = {
    guild: { },
    member: { },
    display_name: {
        test: (s: string) => s.length <= 100,
        err: "Display name must be 100 characters or less"
    },
    avatar_url: {
        test: async (a: string) => {
            if(!validUrl.isWebUri(a)) return false;
            try {
                const data = await axios.head(a);
                return !!data.headers["content-type"]?.startsWith("image");
            } catch(e) { return false; }
        },
        err: "Avatar URL must be a valid image and less than 256 characters"
    },
    keep_proxy: {
        transform: (v?: any) => !!v
    }
};

export interface IMemberGuildSettings {
    [key: string]: any;

    guild: string;
    member: string;
    display_name?: string | null;
    avatar_url?: string | null;
    keep_proxy?: boolean;
}

export default class MemberGuildSettings implements IMemberGuildSettings {
    [key: string]: any;

    #api: API;
    guild = "";
    member = "";
    display_name?: string | null;
    avatar_url?: string | null;
    keep_proxy?: boolean;

    constructor(api: API, data: Partial<MemberGuildSettings>) {
        this.#api = api;
        for(var k in data) {
            if(KEYS[k]) {
                if(KEYS[k].init) data[k] = KEYS[k].init(data[k]);
                this[k] = data[k];
            }
        }
    }

    async patch(token?: string) {
        var data = await this.#api.patchMemberGuildSettings({ ...this, token });
        for(var k in data) if(KEYS[k]) this[k] = data[k];
        return this;
    }

    async verify() {
        return verify<MemberGuildSettings>(this, KEYS);
    }
}
