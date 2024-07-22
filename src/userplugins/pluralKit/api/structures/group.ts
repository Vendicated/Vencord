/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import axios from "axios";
import tc, { Instance } from "tinycolor2";
import validUrl from "valid-url";

import API from "../index";
import { validatePrivacy, verify } from "../utils";
import Member from "./member";

export const enum GroupPrivacyKeys {
    Name = 			"name_privacy",
    Description = 	"description_privacy",
    Icon = 			"icon_privacy",
    List = 			"list_privacy",
    Metadata = 		"metadata_privacy",
    Visibility = 	"visibility",
}

const pKeys = [
    GroupPrivacyKeys.Name,
    GroupPrivacyKeys.Description,
    GroupPrivacyKeys.Icon,
    GroupPrivacyKeys.List,
    GroupPrivacyKeys.Metadata,
    GroupPrivacyKeys.Visibility
];

export interface GroupPrivacy {
    name_privacy?: string | null;
    description_privacy?: string | null;
    icon_privacy?: string | null;
    list_privacy?: string | null;
    metadata_privacy?: string | null;
    visibility?: string | null;
}

const KEYS: any = {
    id: { },
    uuid: { },
    system: { },
    name: {
        test: (n: string) => n.length && n.length <= 100,
        err: "Name must be 100 characters or less",
        required: true
    },
    display_name: {
        test: (n: string) => !n.length || n.length <= 100,
        err: "Display name must be 100 characters or less"
    },
    description: {
        test: (d: string) => !d.length || d.length < 1000,
        err: "Description must be 1000 characters or less"
    },
    icon: {
        test: async (a: string) => {
            if(!validUrl.isWebUri(a)) return false;
            try {
                var data = await axios.head(a);
                if(data.headers["content-type"]?.startsWith("image")) return true;
                return false;
            } catch(e) { return false; }
        },
        err: "Icon URL must be a valid image and less than 256 characters"
    },
    banner: {
        test: async (a: string) => {
            if(a.length > 256) return false;
            if(!validUrl.isWebUri(a)) return false;
            try {
                var data = await axios.head(a);
                if(data.headers["content-type"]?.startsWith("image")) return true;
                return false;
            } catch(e) { return false; }
        },
        err: "Banner URL must be a valid image and less than 256 characters"
    },
    color: {
        test: (c: string | Instance) => { c = tc(c); return c.isValid(); },
        err: "Color must be a valid hex code",
        transform: (c: string | Instance) => { c = tc(c); return c.toHex(); }
    },
    created: {
        init: (d: string | Date) => new Date(d)
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
    },
    privacy: {
        transform: (o: any) => validatePrivacy(pKeys, o)
    }
};

export interface IGroup {
    id: string;
    uuid: string;
    system?: string;
    name: string;
    display_name?: string | null;
    description?: string | null;
    icon?: string | null;
    banner?: string | null;
    color?: string | null;
    created: Date | string;
    privacy: GroupPrivacy;
    members?: Map<string, Member> | Array<string>;
}

export default class Group implements IGroup {
    [key: string]: any;

    #api: API;

    id: string = "";
    uuid: string = "";
    system?: string = "";
    name: string = "";
    display_name?: string | null;
    description?: string | null;
    icon?: string | null;
    banner?: string | null;
    color?: string | null;
    created: Date | string = "";
    privacy: GroupPrivacy = {};
    members?: Map<string, Member> | Array<string>;

    constructor(api: API, data: Partial<Group>) {
        this.#api = api;
        for(var k in data) {
            if(KEYS[k]) {
                if(KEYS[k].init) data[k] = KEYS[k].init(data[k]);
                this[k] = data[k];
            }
        }
    }

    async patch(token?: string) {
        var data = await this.#api.patchGroup({ group: this.id, ...this, token });
        for(var k in data) if(KEYS[k]) this[k] = data[k];
        return this;
    }

    async delete(token?: string) {
        return await this.#api.deleteGroup({ group: this.id, token });
    }

    async getMembers(token?: string) {
        var mems = await this.#api.getGroupMembers({ group: this.id, token });
        this.members = mems;
        return mems;
    }

    async addMembers(members: Array<string>, token?: string) {
        await this.#api.addGroupMembers({ group: this.id, members, token });
        var mems = await this.getMembers(token);
        this.members = mems;
        return mems;
    }

    async removeMembers(members: Array<string>, token?: string) {
        await this.#api.removeGroupMembers({ group: this.id, members, token });
        var mems = await this.getMembers(token);
        this.members = mems;
        return mems;
    }

    async setMembers(members: Array<string>, token?: string) {
        await this.#api.setGroupMembers({ group: this.id, members, token });
        var mems = await this.getMembers(token);
        this.members = mems;
        return mems;
    }

    async verify() {
        return verify(this, KEYS);
    }

}
