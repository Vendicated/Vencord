/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { get } from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Heart } from "@components/Heart";
import { PencilIcon } from "@components/Icons";
import { Margins } from "@components/margins";
import { Notice } from "@components/Notice";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { openInviteModal } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { extractAndLoadChunksLazy } from "@webpack";
import { IconUtils, Menu, openModal, UserStore } from "@webpack/common";

import { SetAvatarModal } from "./AvatarModal";

const cl = classNameFactory("vc-userpfp-");
const DONO_URL = "https://ko-fi.com/coolesding";
const INVITE_LINK = "userpfp-1129784704267210844";
const USERPFP_IMG_URL = "https://raw.githubusercontent.com/UserPFP/img";

export const requireSettingsModal = extractAndLoadChunksLazy(['type:"USER_SETTINGS_MODAL_OPEN"']);
export const KEY_DATASTORE = "vencord-custom-avatars";
export const data = { avatars: {} as Record<string, string> };

const settings = definePluginSettings({
    overrideServerAvatars: {
        type: OptionType.BOOLEAN,
        description: "Override server avatars with custom avatars or the default user avatar if no custom avatar is set.",
        default: true
    },
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
        hidden: !IS_DEV,
        isValid: (value => {
            if (!value) {
                value = "https://userpfp.github.io/UserPFP/source/data.json";
                return false;
            }
            return true;
        })
    },
});

export default definePlugin({
    name: "UserPFP",
    description: "Allows you to set local static or animated avatars for yourself and other users",
    tags: ["Appearance", "Customisation", "Servers"],
    authors: [EquicordDevs.nexpid, Devs.thororen, EquicordDevs.soapphia, EquicordDevs.sketchmyname],
    settings,
    data,
    settingsAboutComponent: () => (
        <>
            <Notice.Info className={Margins.bottom8}>
                Using the set avatar feature is local only meaning only you see it change.
            </Notice.Info>
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
        </>
    ),
    patches: [
        {
            find: "getUserAvatarURL:",
            replacement: [
                {
                    match: /(getUserAvatarURL:)(\i),/,
                    replace: "$1$self.getAvatarHook($2),"
                },
                {
                    match: /(getGuildMemberAvatarURLSimple:)(\i),/,
                    replace: "$1$self.getAvatarServerHook($2),",
                    predicate: () => settings.store.overrideServerAvatars
                }
            ]
        }
    ],
    contextMenus: {
        "user-context": (children, { user }) => {
            if (!user?.id) return;

            children.push(
                <Menu.MenuSeparator />,
                <Menu.MenuItem
                    label="Set Avatar"
                    id="set-avatar"
                    icon={PencilIcon}
                    leadingAccessory={{ type: "icon", icon: PencilIcon }}
                    action={async () => {
                        await requireSettingsModal();
                        openModal(modalProps => <SetAvatarModal userId={user.id} modalProps={modalProps} />);
                    }}
                />
            );
        }
    },
    getAvatarHook: (original: any) => (user: User, animated: boolean, size: number) => {
        if (settings.store.preferNitro && user.avatar?.startsWith("a_")) return original(user, animated, size);
        if (!data.avatars[user.id]) return original(user, animated, size);

        const avatarUrl = data.avatars[user.id];

        if (avatarUrl.startsWith("data:")) return avatarUrl;

        try {
            const res = new URL(avatarUrl);
            if (avatarUrl.startsWith(USERPFP_IMG_URL)) {
                res.searchParams.set("animated", animated ? "true" : "false");
                if (!animated) {
                    res.pathname = res.pathname.replaceAll(/\.gifv?/g, ".png");
                }
            }
            return res.toString();
        } catch {
            return original(user, animated, size);
        }
    },
    getAvatarServerHook: (original: any) => (config: any) => {
        const { userId, avatar, size, canAnimate } = config;
        const { avatars } = data;

        if (avatars[userId]) {
            const customUrl = avatars[userId];
            if (customUrl.startsWith("data:")) return customUrl;

            try {
                const res = new URL(customUrl);
                if (size) res.searchParams.set("size", size.toString());
                return res.toString();
            } catch {
                return customUrl;
            }
        }

        if (avatar) {
            const user = UserStore.getUser(userId);
            if (user?.avatar) {
                return IconUtils.getUserAvatarURL(user, canAnimate, size);
            }
        }

        return original(config);
    },
    async start() {
        data.avatars = await get<Record<string, string>>(KEY_DATASTORE) || {};

        await fetch(settings.store.databaseSource)
            .then(res => res.ok && res.json())
            .then(remote => remote?.avatars && Object.assign(data.avatars, remote.avatars))
            .catch(() => null);
    }
});
