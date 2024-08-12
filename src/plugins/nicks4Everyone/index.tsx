/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, Menu, UserStore } from "@webpack/common";
import type { User as DiscordUser } from "discord-types/general";

import { buildModal } from "./modal";

interface User extends DiscordUser {
    globalName?: string;
}

const settings = definePluginSettings({
    nicks: {
        type: OptionType.STRING,
        description: "",
        default: "{}",
        hidden: true,
    },
});

let nicks: Record<string, { name: string, nick: string; }> = {};

function UserContext(): NavContextMenuPatchCallback {
    return (children, props: { user: User; }) => {
        if (!props.user) return;
        children.splice(-1, 0, (
            <Menu.MenuGroup>
                <Menu.MenuItem
                    id="change-nick"
                    label={`${nicks[props.user.id] ? "Change" : "Add"} Custom Nickname`}
                    action={() =>
                        buildModal({ ...props.user, globalName: nicks[props.user.id]?.name ?? props.user.globalName, customNick: nicks[props.user.id]?.nick ?? "" })
                    }
                />
            </Menu.MenuGroup>
        ));
    };
}

export default definePlugin({
    name: "Nicks4Everyone",
    description: "Set custom nicknames for everyone.",
    authors: [Devs.Inbestigator],
    settings,
    patches: [
        {
            find: ",getUserTag:",
            replacement: {
                match: /if\(\i\((\i)\.global_name\)\)return(?=.{0,100}return"\?\?\?")/,
                replace: "if($self.getNick($1)) return $self.getNick($1).nick;$&"
            }
        }
    ],
    getNick: (user: User) => nicks[user.id],
    start: async () => {
        nicks = await JSON.parse(settings.store.nicks);
    },
    contextMenus: {
        "user-context": UserContext(),
    }
});

export function setUsername(nickname: string, userId: string) {
    const user: User = UserStore.getUser(userId);
    if (nicks[userId]) {
        nicks[userId].nick = nickname;
        if (nicks[userId].nick === nicks[userId].name) delete nicks[userId];
    } else {
        nicks[userId] = {
            name: user.globalName!,
            nick: nickname,
        };
    }
    if (!nickname.length) delete nicks[userId];
    settings.store.nicks = JSON.stringify(nicks);
    FluxDispatcher.dispatch({
        type: "USER_UPDATE",
        user: {
            ...user,
            globalName: nickname,
        },
    });
}
