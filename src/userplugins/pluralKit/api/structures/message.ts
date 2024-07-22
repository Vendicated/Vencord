/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import API from "../index";
import Member from "./member";
import System from "./system";

const KEYS: any = {
    timestamp: {
        init: (t: Date | string) => new Date(t)
    },
    id: { },
    original: { },
    sender: { },
    channel: { },
    guild: { },
    system: {
        init: (s: Partial<System>, api: API) => s ? new System(api, s) : null
    },
    member: {
        init: (m: Partial<Member>, api: API) => m ? new Member(api, m) : null
    }
};

export interface IMessage {
    timestamp: Date | string;
    id: string;
    original?: string;
    sender: string;
    channel: string;
    guild: string;
    system?: string | System;
    member?: string | Member;
}

export default class Message implements IMessage {
    [key: string]: any;

    #api: API;

    timestamp: Date | string = "";
    id: string = "";
    original?: string;
    sender: string = "";
    channel: string = "";
    guild: string = "";
    system?: string | System;
    member?: string | Member;

    constructor(api: API, data: Partial<Message>) {
        this.#api = api;
        for(const k in data) {
            if(KEYS[k]) {
                if(KEYS[k].init) data[k] = KEYS[k].init(data[k]);
                this[k] = data[k];
            }
        }
    }
}
