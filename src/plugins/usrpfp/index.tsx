/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "discord-types/general";

import { DataFile } from "./types";

const BASE_URL = "https://userpfp.github.io/UserPFP/source/data.json";

let data: DataFile = {
    avatars: {},
    badges: {},
};

const settings = definePluginSettings({
    preferNitro: {
        description:
            "Which avatar to use if both Nitro and UserPFP avatars are present",
        type: OptionType.SELECT,
        options: [
            { label: "UserPFP", value: false },
            { label: "Nitro", value: true, default: true },
        ],
    },
});

export default definePlugin({
    data,

    name: "UserPFP",
    description: "Allows you to use an animated avatar without Nitro",
    authors: [Devs.nexpid],
    settings,
    settingsAboutComponent: () => (
        <Link href="https://userpfp.github.io/UserPFP/#how-to-request-a-profile-picture-pfp">
            <b>SUBMIT YOUR OWN PFP HERE</b>
        </Link>
    ),
    patches: [
        {
            find: "getUserAvatarURL:",
            replacement: {
                match: /(getUserAvatarURL:)(\i),/,
                replace: "$1(user,anim,size)=>$self.patchGetAvatar(user)||$2(user,anim,size),"
            }
        }
    ],

    patchGetAvatar: (user: User) => {
        const customAvatar = data.avatars[user.id];
        if (settings.store.preferNitro && user.avatar?.startsWith("a_")) return;

        return customAvatar;
    },

    async start() {
        const res = await fetch(BASE_URL);
        if (res.ok) this.data = data = await res.json();
    },
});
