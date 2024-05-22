/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { ImageInvisible, ImageVisible } from "@components/Icons";
import { Devs, openModal } from "@utils/index";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Menu, UserStore } from "@webpack/common";
import { Message, User } from "discord-types/general";

import { HiddenPeopleModal } from "./HiddenPeopleModal";
import { STORE_KEY, userIds } from "./store";
import styles from "./styles.css?managed";
import { createIgnore, removeIgnore } from "./utils";

const userProfileContextPatch: NavContextMenuPatchCallback = (children, { user }: { user?: User, onClose(): void; }) => {
    if (!user || UserStore.getCurrentUser().id === user.id) return;

    const isIgnored = userIds.includes(user.id);
    const label = (isIgnored ? "Unhide" : "Hide") + " " + (user.bot ? "Bot" : "User");
    children.push(
        <Menu.MenuItem
            label={label}
            id="vc-hide-user"
            icon={isIgnored ? ImageVisible : ImageInvisible}
            action={() => {
                isIgnored ? removeIgnore(user.id) :
                    createIgnore(user.id);
            }}
        />
    );
};

const OpenHiddenUsersModalComponent = () => {
    return (
        <Button onClick={() => openModal(props => {
            return <HiddenPeopleModal rootProps={props} />;
        })}>
            Open a list of hidden users
        </Button>
    );
};

const settings = definePluginSettings({
    hiddenUsers: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => <OpenHiddenUsersModalComponent />
    },
});

export default definePlugin({
    name: "HideMessages",
    description: "Hide messages without blocking!",
    authors: [Devs.Hen],
    settings,
    contextMenus: {
        "user-context": userProfileContextPatch,
        "user-profile-actions": userProfileContextPatch
    },
    patches: [
        {
            find: ".messageListItem",
            replacement: {
                match: /(\i)\.messageListItem,/,
                replace: "$self.checkHidden(arguments[0]?.message)+$&"
            }
        }
    ],
    async start() {
        const storedData = await DataStore.get(STORE_KEY);

        enableStyle(styles);
        (storedData || []).forEach(id => createIgnore(id));
    },
    stop() {
        disableStyle(styles);
    },
    checkHidden(message: Message): string {
        if (userIds.includes(message.author.id)) {
            return "vc-message-hidden ";
        }

        return "";
    }
});
