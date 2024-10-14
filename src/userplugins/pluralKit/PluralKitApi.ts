/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const API_URL = "https://api.pluralkit.me/v2/";
const API_HEADERS = {
    "Content-Type": "application/json",
    "User-Agent": "Scyye Vencord/1.0 (contact @scyye on Discord for any issues)"
}
async function request<T>(endpoint: string) {
    return fetch(API_URL + endpoint, {
        method:"GET",
        headers: API_HEADERS,
    }).then(res => res.json() as T);
}

async function getSystem(id: string) {
    return await request<System>(`systems/${id}`);
}

async function getMessage(id: string) {
    return await request<PKMessage>(`messages/${id}`);
}

async function getSystemGuildSettings(system: string, guild: string) {
    return await request<SystemGuildSettings>(`systems/${system}/guilds/${guild}`);
}

async function getMembers(system: string) {
    return await request<Member[]>(`systems/${system}/members`);
}

async function getMember(member: string) {
    return await request<Member>(`members/${member}`);
}

async function getMemberGuildSettings(member: string, guild: string) {
    return await request<MemberGuildSettings>(`members/${member}/guilds/${guild}`);
}

type System = {
    id: string;
    uuid: string;
    name: string;
    description: string;
    tag: string;
    pronouns: string;
    avatar_url: string;
    banner: string;
    color: string;
    created: string;
    privacy: SystemPrivacy;
}

type SystemPrivacy = {
    description_privacy: "public"|"private";
    pronoun_privacy: "public"|"private";
    member_list_privacy: "public"|"private";
    group_list_privacy: "public"|"private";
    front_privacy: "public"|"private";
    front_history_privacy: "public"|"private";
}

type Member = {
    id: string;
    uuid: string;
    system: string;
    name: string;
    display_name: string;
    color: string;
    birthday: string;
    pronouns: string;
    avatar_url: string;
    webhook_avatar_url: string;
    banner: string;
    description: string;
    created: string;
    proxy_tags: { prefix:string; suffix:string }[];
    keep_proxy: boolean;
    tts: boolean;
    autoproxy_enabled: boolean;
    message_count: number;
    last_message_timestamp: string;
    privacy: MemberPrivacy;
}

type MemberPrivacy = {
    visibility: "public"|"private";
    name_privacy: "public"|"private";
    description_privacy: "public"|"private";
    birthday_privacy: "public"|"private";
    pronoun_privacy: "public"|"private";
    avatar_privacy: "public"|"private";
    metadata_privacy: "public"|"private";
    proxy_privacy: "public"|"private";
}

type PKMessage = {
    timestamp: string;
    id: string;
    original: string;
    sender: string;
    channel: string;
    guild: string;
    system?: System;
    member?: Member;
}

type SystemGuildSettings = {
    guild_id?: string;
    proxying_enabled: boolean;
    tag: string;
    tag_enabled: boolean;
}

type MemberGuildSettings = {
    guild_id: string;
    display_name: string;
    avatar_url?: string;
    keep_proxy?: boolean;
}

