/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Heart } from "@components/Heart";
import { Devs, EquicordDevs } from "@utils/constants";
import { openInviteModal } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";

const cl = classNameFactory("vc-userpfp-");
const DONO_URL = "https://ko-fi.com/coolesding";
const INVITE_LINK = "userpfp-1129784704267210844";

let data = { avatars: {} as Record<string, string> };
const settings = definePluginSettings({
    preferNitro: {
        description: "Which avatar to use if both default animated (Nitro) pfp and UserPFP avatars are present",
        type: OptionType.SELECT,
        options: [
            { label: "UserPFP", value: false },
            { label: "Nitro", value: true, default: true },
        ],
    },
    databaseSource: {
        description: "URL to load database from",
        type: OptionType.STRING,
        default: "https://userpfp.github.io/UserPFP/source/data.json",
        isValid: (value => {
            if (!value) return false;
            return true;
        })
    }
});

export default definePlugin({
    name: "UserPFP",
    description: "Allows you to use an animated avatar without Nitro",
    authors: [EquicordDevs.nexpid, Devs.thororen],
    settings,
    settingsAboutComponent: () => (
        <Flex className={cl("settings")}>
            <Button
                variant="link"
                className={cl("settings-button")}
                onClick={() => openInviteModal(INVITE_LINK)}
            >
                Join UserPFP Server
            </Button>
            <Button
                variant="secondary"
                className={cl("settings-button")}
                onClick={() => VencordNative.native.openExternal(DONO_URL)}
            >
                Support UserPFP here <Heart className={cl("settings-heart")} />
            </Button>
        </Flex>
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
        if (!data.avatars[user.id]) return original(user, animated, size);

        const res = new URL(data.avatars[user.id]);
        res.searchParams.set("animated", animated ? "true" : "false");
        if (res && !animated) {
            res.pathname = res.pathname.replaceAll(/\.gifv?/g, ".png");
        }

        return res.toString();
    },
    async start() {
        await fetch(settings.store.databaseSource)
            .then(async res => {
                if (res.ok) data = await res.json();
            })
            .catch(() => null);
    }
});
