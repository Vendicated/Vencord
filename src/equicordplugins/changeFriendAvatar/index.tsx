/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { get } from "@api/DataStore";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { PencilIcon } from "@components/Icons";
import userpfp from "@equicordplugins/userpfp";
import { EquicordDevs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { extractAndLoadChunksLazy } from "@webpack";
import { IconUtils, Menu, UserStore } from "@webpack/common";

import { SetAvatarModal } from "./AvatarModal";

export const requireSettingsMenu = extractAndLoadChunksLazy(['name:"UserSettings"'], /createPromise:.{0,20}(\i\.\i\("?.+?"?\).*?).then\(\i\.bind\(\i,"?(.+?)"?\)\).{0,50}"UserSettings"/);
export const KEY_DATASTORE = "vencord-custom-avatars";
export let avatars: Record<string, string> = {};

const settings = definePluginSettings({
    overrideServerAvatars: {
        type: OptionType.BOOLEAN,
        description: "Override server avatars with custom avatars or the default user avatar if no custom avatar is set.",
        default: true
    }
});

export default definePlugin({
    name: "ChangeFriendAvatar",
    description: "Set custom avatar URLs for any user",
    authors: [EquicordDevs.soapphia],
    settings,

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
                    replace: "$1$self.getAvatarServerHook($2),"
                }
            ]
        },
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
                    action={async () => {
                        await requireSettingsMenu();
                        openModal(modalProps => <SetAvatarModal userId={user.id} modalProps={modalProps} />);
                    }}
                />
            );
        }
    },

    getAvatarHook: (original: any) => (user: User, animated: boolean, size: number) => {
        if (isPluginEnabled(userpfp.name) && userpfp.data?.avatars?.[user.id]) {
            if (userpfp.settings.store.preferNitro && user.avatar?.startsWith("a_")) return original(user, animated, size);

            const res = new URL(userpfp.data.avatars[user.id]);
            res.searchParams.set("animated", animated ? "true" : "false");
            if (res && !animated) {
                res.pathname = res.pathname.replaceAll(/\.gifv?/g, ".png");
            }

            return res.toString();
        }

        if (!avatars[user.id]) return original(user, animated, size);

        const customUrl = avatars[user.id];
        try {
            const res = new URL(customUrl);
            res.searchParams.set("size", size.toString());
            return res.toString();
        } catch {
            return customUrl;
        }
    },

    getAvatarServerHook: (original: any) => (config: any) => {
        const { userId, avatar, size, canAnimate } = config;
        if (!settings.store.overrideServerAvatars) return original(config);

        if (avatars[userId]) {
            const customUrl = avatars[userId];
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
        avatars = await get<Record<string, string>>(KEY_DATASTORE) || {};
    }
});
