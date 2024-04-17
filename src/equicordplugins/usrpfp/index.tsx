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

const BASE_URL = "https://userpfp.github.io/UserPFP/source/data.json";

let data = {
    avatars: {} as Record<string, string>,
};

const settings = definePluginSettings({
    preferNitro: {
        description:
            "Which avatar to use if both default animated (Nitro) pfp and UserPFP avatars are present",
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
    authors: [Devs.nexpid, Devs.thororen, Devs.FoxStorm1, Devs.coolesding],
    settings,
    settingsAboutComponent: () => (
        <Link href="https://userpfp.github.io/UserPFP/#how-to-request-a-profile-picture-pfp">
            <b>SUBMIT YOUR OWN PFP HERE</b>
        </Link>
    ),
    patches: [
        {
            // Normal Profiles
            find: "getUserAvatarURL:",
            replacement: [
                {
                    match: /(getUserAvatarURL:)(\i),/,
                    replace: "$1$self.getAvatarHook($2),"
                },
                {
                    match: /(getUserAvatarURL:\i\(\){return )(\i)}/,
                    replace: "$1$self.getAvatarHook($2)}"
                }
            ]
        }
    ],

    getAvatarHook: (original: any) => (user: User, animated: boolean, size: number) => {
        if (settings.store.preferNitro && user.avatar?.startsWith("a_")) return original(user, animated, size);

        return data.avatars[user.id] ?? original(user, animated, size);
    },

    async start() {
        const res = await fetch(BASE_URL);
        if (res.ok) this.data = data = await res.json();
    },
});
