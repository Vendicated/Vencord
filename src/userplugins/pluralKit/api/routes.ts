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
const ROUTES: any = {
    1: {
        GET_SYSTEM: (sid: string) => ({ method: "GET", route: `/s/${sid}` }),
        GET_OWN_SYSTEM: () => ({ method: "GET", route: "/s" }),
        GET_ACCOUNT: (aid: string) => ({ method: "GET", route: `/a/${aid}` }),
        PATCH_SYSTEM: () => ({ method: "PATCH", route: "/s" }),

        ADD_MEMBER: () => ({ method: "POST", route: "/m" }),
        GET_MEMBER: (mid: string) => ({ method: "GET", route: `/m/${mid}` }),
        GET_MEMBERS: (sid: string) => ({ method: "GET", route: `/s/${sid}/members` }),
        PATCH_MEMBER: (mid: string) => ({ method: "PATCH", route: `/m/${mid}` }),
        DELETE_MEMBER: (mid: string) => ({ method: "DELETE", route: `/m/${mid}` }),

        ADD_SWITCH: () => ({ method: "POST", route: "/s/switches" }),
        GET_SWITCHES: (sid: string) => ({ method: "GET", route: `/s/${sid}/switches` }),
        GET_FRONTERS: (sid: string) => ({ method: "GET", route: `/s/${sid}/fronters` }),

        GET_MESSAGE: (mid: string) => ({ method: "GET", route: `/msg/${mid}` })
    },
    2: {
        GET_SYSTEM: (sid: string) => ({ method: "GET", route: `/systems/${sid}` }),
        GET_OWN_SYSTEM: () => ({ method: "GET", route: "/systems/@me" }),
        GET_ACCOUNT: (sid: string) => ({ method: "GET", route: `/systems/${sid}` }),

        ADD_MEMBER: () => ({ method: "POST", route: "/members" }),
        GET_MEMBER: (mid: string) => ({ method: "GET", route: `/members/${mid}` }),
        GET_MEMBERS: (sid: string) => ({ method: "GET", route: `/systems/${sid}/members` }),
        PATCH_MEMBER: (mid: string) => ({ method: "PATCH", route: `/members/${mid}` }),
        DELETE_MEMBER: (mid: string) => ({ method: "DELETE", route: `/members/${mid}` }),

        ADD_GROUP: () => ({ method: "POST", route: "/groups" }),
        GET_GROUPS: (sid: string, members?: boolean) => ({ method: "GET", route: `/systems/${sid}/groups?with_members=${members ? "true" : "false"}` }),
        GET_GROUP: (gid: string) => ({ method: "GET", route: `/groups/${gid}` }),
        PATCH_GROUP: (gid: string) => ({ method: "PATCH", route: `/groups/${gid}` }),
        DELETE_GROUP: (gid: string) => ({ method: "DELETE", route: `/groups/${gid}` }),

        GET_GROUP_MEMBERS: (gid: string) => ({ method: "GET", route: `/groups/${gid}/members` }),
        ADD_GROUP_MEMBERS: (gid: string) => ({ method: "POST", route: `/groups/${gid}/members/add` }),
        REMOVE_GROUP_MEMBERS: (gid: string) => ({ method: "POST", route: `/groups/${gid}/members/remove` }),
        SET_GROUP_MEMBERS: (gid: string) => ({ method: "POST", route: `/groups/${gid}/members/overwrite` }),

        GET_MEMBER_GROUPS: (mid: string) => ({ method: "GET", route: `/members/${mid}/groups` }),
        ADD_MEMBER_GROUPS: (mid: string) => ({ method: "POST", route: `/members/${mid}/groups/add` }),
        REMOVE_MEMBER_GROUPS: (mid: string) => ({ method: "POST", route: `/members/${mid}/groups/remove` }),
        SET_MEMBER_GROUPS: (mid: string) => ({ method: "POST", route: `/members/${mid}/groups/overwrite` }),

        ADD_SWITCH: () => ({ method: "POST", route: "/systems/@me/switches" }),
        GET_SWITCHES: (sid: string, before: Date, limit: number) => {
            const tmp = { method: "GET", route: `/systems/${sid}/switches` };
            const adds: string[] = [];

            if(before) adds.push(`before=${before.toISOString()}`);
            if(limit) adds.push(`limit=${limit}`);

            if(adds.length) tmp.route += `?${adds.join("&")}`;

            return tmp;
        },
        GET_FRONTERS: (sid: string) => ({ method: "GET", route: `/systems/${sid}/fronters` }),
        GET_SWITCH: (sid: string, swid: string) => ({ method: "GET", route: `/systems/${sid}/switches/${swid}` }),
        PATCH_SWITCH: (swid: string) => ({ method: "PATCH", route: `/systems/@me/switches/${swid}` }),
        PATCH_SWITCH_MEMBERS: (swid: string) => ({ method: "PATCH", route: `/systems/@me/switches/${swid}/members` }),
        DELETE_SWITCH: (swid: string) => ({ method: "DELETE", route: `/systems/@me/switches/${swid}` }),

        GET_SYSTEM_CONFIG: () => ({ method: "GET", route: "/systems/@me/settings" }),
        PATCH_SYSTEM_CONFIG: () => ({ method: "PATCH", route: "/systems/@me/settings" }),

        GET_SYSTEM_GUILD_SETTINGS: (gid: string) => ({ method: "GET", route: `/systems/@me/guilds/${gid}` }),
        PATCH_SYSTEM_GUILD_SETTINGS: (gid: string) => ({ method: "PATCH", route: `/systems/@me/guilds/${gid}` }),

        GET_SYSTEM_AUTOPROXY_SETTINGS: (gid: string) => ({ method: "GET", route: `/systems/@me/autoproxy?guild_id=${gid}` }),
        PATCH_SYSTEM_AUTOPROXY_SETTINGS: (gid: string) => ({ method: "PATCH", route: `/systems/@me/autoproxy?guild_id=${gid}` }),

        GET_MEMBER_GUILD_SETTINGS: (mid: string, gid: string) => ({ method: "GET", route: `/members/${mid}/guilds/${gid}` }),
        PATCH_MEMBER_GUILD_SETTINGS: (mid: string, gid: string) => ({ method: "PATCH", route: `/members/${mid}/guilds/${gid}` }),

        GET_MESSAGE: (mid: string) => ({ method: "GET", route: `/messages/${mid}` })
    }
};

export default ROUTES;
