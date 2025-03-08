/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "discord-types/general";

const enum RelationshipType {
    FRIEND = 1,
    BLOCKED = 2,
    INCOMING_REQUEST = 3,
    OUTGOING_REQUEST = 4,
}

const settings = definePluginSettings({
    userList: {
        description: "List of users to block (separated by commas or spaces)",
        type: OptionType.STRING,
        default: "1234567890123445,1234567890123445",
    }
});

function getBlockedList() {
    let f: { id: string; type: RelationshipType; nickname: null; user: User | {}; localblock: Boolean | undefined; }[] = [];
    settings.store.userList.replace(/\D/g, " ")
        .split(" ")
        .filter(Boolean)
        .forEach(id => {
            return f.push({ id: id, type: RelationshipType.BLOCKED, nickname: null, user: {}, localblock: true });
        });
    return f;
}

export default definePlugin({
    name: "LocalBlock",
    description: "Allows you to block users locally, without actually blocking them",
    settings: settings,
    authors: [
        Devs.pythonplayer123
    ],
    patches: [
        {
            find: "fetchRelationships\(\)\{",
            replacement: [
                {
                    match: /"LOAD_RELATIONSHIPS_SUCCESS",relationships:e.body/,
                    replace: "$&+$self.getBlockedList()"
                }
            ]
        },
        {
            find: "\"RelationshipStore\"",
            replacement: [
                {
                    match: /CONNECTION_OPEN:function\((\i)\)\{/,
                    replace: "$&$self.getBlockedList().forEach(aaaa=>{$1.relationships.push(aaaa)}),"
                },
                {
                    match: /OVERLAY_INITIALIZE:function\((\i)\)\{/,
                    replace: "$&$self.getBlockedList().forEach(aaaa=>{$1.relationships.push(aaaa)}),"
                }
            ]
        }
    ],
    getBlockedList
});
