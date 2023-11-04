/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Link } from "@components/Link";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

import { DataFile } from "./types";

const isAnimated = (url: string) => new URL(url).pathname.endsWith(".gif");

const BASE_URL = "https://userpfp.github.io/UserPFP/source/data.json";

let data: DataFile = {
    avatars: {},
    badges: {},
};

const settings = definePluginSettings({
    priority: {
        description:
            "Which avatar to use if both Discord and UserPFP avatars are present",
        type: OptionType.SELECT,
        options: [
            { label: "UserPFP", value: "usrpfp", default: true },
            { label: "Prefer animated", value: "animated" },
            { label: "Prefer static", value: "static" },
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
            find: ",SUPPORTS_WEBP:",
            replacement: [
                {
                    match: /getUserAvatarURL:(C)/,
                    replace:
                        "getUserAvatarURL:(u,anim,sz)=>$self.patchGetAvatar(u,$1(u,anim,sz))",
                },
            ],
        },
    ],

    patchGetAvatar: (user: any, originalAvatar: string) => {
        const customAvatar = data.avatars[user.id];
        if (!customAvatar) return originalAvatar;

        if (settings.store.priority === "usrpfp") return customAvatar;
        else if (settings.store.priority === "animated")
            return isAnimated(customAvatar) ? customAvatar : originalAvatar;
        else return !isAnimated(customAvatar) ? customAvatar : originalAvatar;
    },

    async start() {
        const res = await fetch(BASE_URL);
        if (res.ok) this.data = data = await res.json();
    },
});
