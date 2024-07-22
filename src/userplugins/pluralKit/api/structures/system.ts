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

import axios from "axios";
import tc, { Instance } from "tinycolor2";
import validUrl from "valid-url";

import API, { ISwitch } from "../index";
import { validatePrivacy, verify } from "../utils";
import Group from "./group";
import Member from "./member";
import Switch from "./switch";
import SystemAutoproxyConfig from "./systemAutoproxySettings";
import SystemConfig from "./systemConfig";
import SystemGuildSettings from "./systemGuildSettings";

export const enum SystemPrivacyKeys {
    Description = 	"description_privacy",
    Pronouns = 		"pronoun_privacy",
    MemberList = 	"member_list_privacy",
    GroupList = 	"group_list_privacy",
    Front = 		"front_privacy",
    FrontHistory = 	"front_history_privacy"
}

const pKeys = [
    SystemPrivacyKeys.Description,
    SystemPrivacyKeys.Pronouns,
    SystemPrivacyKeys.MemberList,
    SystemPrivacyKeys.GroupList,
    SystemPrivacyKeys.Front,
    SystemPrivacyKeys.FrontHistory
];

export interface SystemPrivacy {
    description_privacy?: string;
    pronoun_privacy?: string;
    member_list_privacy?: string;
    group_list_privacy?: string;
    front_privacy?: string;
    front_history_privacy?: string;
}

const KEYS: any = {
    id: { },
    uuid: { },
    name: {
        test: (n: string) => !n.length || n.length <= 100,
        err: "Name must be 100 characters or less"
    },
    description: {
        test: (d: string) => !d.length || d.length < 1000,
        err: "Description must be 1000 characters or less"
    },
    tag: { },
    pronouns: { },
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
    banner: {
        test: async (a: string) => {
            if(!validUrl.isWebUri(a)) return false;
            try {
                const data = await axios.head(a);
                return !!data.headers["content-type"]?.startsWith("image");
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
        init: (d: Date | string) => new Date(d)
    },
    privacy: {
        transform: (o: Partial<SystemPrivacy>) => validatePrivacy(pKeys, o)
    }
};

export interface ISystem {
    id: string;
    uuid: string;
    name?: string | null;
    description?: string | null;
    tag?: string | null;
    pronouns?: string | null;
    avatar_url?: string | null;
    banner?: string | null;
    color?: string | null;
    created: Date | string;
    privacy?: SystemPrivacy;

    members?: Map<string, Member>;
    groups?: Map<string, Group>;
    fronters?: Switch;
    switches?: Switch[] | Map<string, ISwitch>;
    settings?: Map<string, SystemGuildSettings>;
    config?: SystemConfig;
    autoproxySettings?: Map<string, SystemAutoproxyConfig>;
}

export default class System implements ISystem {
    [key: string]: any;

    #api: API;

    id: string = "";
    uuid: string = "";
    name?: string | null;
    description?: string | null;
    tag?: string | null;
    pronouns?: string | null;
    avatar_url?: string | null;
    banner?: string | null;
    color?: string | null;
    created: Date | string = "";
    privacy?: SystemPrivacy;

    members?: Map<string, Member>;
    groups?: Map<string, Group>;
    fronters?: Switch;
    switches?: Switch[] | Map<string, ISwitch>;
    settings?: Map<string, SystemGuildSettings>;
    config?: SystemConfig;
    autoproxySettings?: Map<string, SystemAutoproxyConfig>;

    constructor(api: API, data: Partial<System>) {
        this.#api = api;
        for(var k in data) {
            if(KEYS[k]) {
                if(KEYS[k].init) data[k] = KEYS[k].init(data[k]);
                this[k] = data[k];
            }
        }
    }

    async patch(token?: string) {
        var data = await this.#api.patchSystem({ system: this.id, ...this, token });
        for(var k in data) if(KEYS[k]) this[k] = data[k];
        return this;
    }

    async createMember(data: Partial<Member>) {
        var mem = await this.#api.createMember(data);
        if(!this.members) this.members = new Map();
        this.members.set(mem.id, mem);
        return mem;
    }

    async getMember(member: string, token?: string) {
        var mem = await this.#api.getMember({ member, token });
        if(!this.members) this.members = new Map();
        this.members.set(mem.id, mem);
        return mem;
    }

    async getMembers(token?: string) {
        var mems = await this.#api.getMembers({ system: this.id, token });
        this.members = mems;
        return mems;
    }

    async deleteMember(member: string, token?: string) {
        await this.#api.deleteMember({ member, token });
        if(this.members) this.members.delete(member);
        return;
    }

    async createGroup(data: Partial<Group>) {
        var group = await this.#api.createGroup(data);
        if(!this.groups) this.groups = new Map();
        this.groups.set(group.id, group);
        return group;
    }

    async getGroups(token?: string, with_members: boolean = false, raw: boolean = false) {
        var groups = await this.#api.getGroups({ system: this.id, with_members, raw, token });
        this.groups = groups;
        return groups;
    }

    async getGroup(group: string, token?: string) {
        var grp = await this.#api.getGroup({ group, token });
        if(!this.groups) this.groups = new Map<string, Group>();
        this.groups.set(grp.id, grp);
        return grp;
    }

    async deleteGroup(group: string, token?: string) {
        await this.#api.deleteGroup({ group, token });
        if(this.groups) this.groups.delete(group);
        return;
    }

    async createSwitch(data: Partial<Switch>) {
        return this.#api.createSwitch(data);
    }

    async getSwitches(token?: string, raw: boolean = false, before?: Date, limit: number = 100) {
        var switches = await this.#api.getSwitches({ system: this.id, token, raw, before, limit });
        this.switches = switches;
        return switches;
    }

    async getFronters(token?: string) {
        var fronters = await this.#api.getFronters({ system: this.id, token });
        this.fronters = fronters;
        return fronters;
    }

    async deleteSwitch(switchid: string, token?: string) {
        await this.#api.deleteSwitch({ switch: switchid, token });
        if(this.switches)
            if (this.switches instanceof Map)
                this.switches.delete(switchid);
            else
                this.switches = this.switches.filter(s => s.id !== switchid);
        return;
    }

    async getConfig(token?: string) {
        const settings = await this.#api.getSystemConfig({ token });
        this.config = settings;
        return settings;
    }

    async getGuildSettings(guild: string, token?: string) {
        const settings = await this.#api.getSystemGuildSettings({ guild, token });
        if(!this.settings) this.settings = new Map();
        this.settings.set(guild, settings);
        return settings;
    }

    async getAutoproxySettings(guild: string, token?: string) {
        const settings = await this.#api.getSystemAutoproxySettings({ guild, token });
        if(!this.autoproxySettings) this.autoproxySettings = new Map();
        this.autoproxySettings.set(guild, settings);
        return settings;
    }

    async verify() {
        return verify<System>(this, KEYS);
    }
}
