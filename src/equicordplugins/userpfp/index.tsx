/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Link } from "@components/Link";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "discord-types/general";

let data = {
    avatars: {} as Record<string, string>,
};
const API_URL = "https://userpfp.github.io/UserPFP/source/data.json";
const settings = definePluginSettings({
    preferNitro: {
        description: "Which avatar to use if both default animated (Nitro) pfp and UserPFP avatars are present",
        type: OptionType.SELECT,
        options: [
            { label: "UserPFP", value: false },
            { label: "Nitro", value: true, default: true },
        ],
    }
});

export default definePlugin({
    data,
    name: "UserPFP",
    description: "Allows you to use an animated avatar without Nitro",
    authors: [EquicordDevs.nexpid, EquicordDevs.thororen],
    settings,
    settingsAboutComponent: () => (
        <>
            <Link href="https://userpfp.github.io/UserPFP/#how-to-request-a-profile-picture-pfp">
                <b>Submit your own PFP here!</b>
            </Link>
            <br></br>
            <Link href="https://ko-fi.com/coolesding">
                <b>Support UserPFP here!</b>
            </Link>
        </>
    ),
    patches: [
        {
            find: "getUserAvatarURL:",
            replacement: [
                {
                    match: /(getUserAvatarURL:)(\i),/,
                    replace: "$1$self.getAvatarHook($2),"
                }
            ]
        }
    ],
    getAvatarHook: (original: any) => (user: User, animated: boolean, size: number) => {
        if (settings.store.preferNitro && user.avatar?.startsWith("a_")) return original(user, animated, size);

        return data.avatars[user.id] ?? original(user, animated, size);
    },
    async start() {
        await fetch(API_URL)
            .then(async res => {
                if (res.ok) this.data = data = await res.json();
            })
            .catch(() => null);
    }
});
