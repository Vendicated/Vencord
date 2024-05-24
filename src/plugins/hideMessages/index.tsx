/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs, openModal } from "@utils/index";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Menu, UserStore } from "@webpack/common";
import { Message, User } from "discord-types/general";
import type { SVGProps } from "react";

import { HiddenPeopleModal } from "./HiddenPeopleModal";
import { STORE_KEY, userIds } from "./store";
import styles from "./styles.css?managed";
import { createIgnore, removeIgnore } from "./utils";


// Icons are taken from https://iconify.design/
export function UserAddOutlinedIcon(props: SVGProps<SVGSVGElement>) {
    return (<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" {...props}><path fill="currentColor" d="M678.3 642.4c24.2-13 51.9-20.4 81.4-20.4h.1c3 0 4.4-3.6 2.2-5.6a371.7 371.7 0 0 0-103.7-65.8c-.4-.2-.8-.3-1.2-.5C719.2 505 759.6 431.7 759.6 349c0-137-110.8-248-247.5-248S264.7 212 264.7 349c0 82.7 40.4 156 102.6 201.1c-.4.2-.8.3-1.2.5c-44.7 18.9-84.8 46-119.3 80.6a373.4 373.4 0 0 0-80.4 119.5A373.6 373.6 0 0 0 137 888.8a8 8 0 0 0 8 8.2h59.9c4.3 0 7.9-3.5 8-7.8c2-77.2 32.9-149.5 87.6-204.3C357 628.2 432.2 597 512.2 597c56.7 0 111.1 15.7 158 45.1a8.1 8.1 0 0 0 8.1.3M512.2 521c-45.8 0-88.9-17.9-121.4-50.4A171.2 171.2 0 0 1 340.5 349c0-45.9 17.9-89.1 50.3-121.6S466.3 177 512.2 177s88.9 17.9 121.4 50.4A171.2 171.2 0 0 1 683.9 349c0 45.9-17.9 89.1-50.3 121.6C601.1 503.1 558 521 512.2 521M880 759h-84v-84c0-4.4-3.6-8-8-8h-56c-4.4 0-8 3.6-8 8v84h-84c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h84v84c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8v-84h84c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8"></path></svg>);
}

export function UserDeleteOutlinedIcon(props: SVGProps<SVGSVGElement>) {
    return (<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 1024 1024" {...props}><path fill="currentColor" d="M678.3 655.4c24.2-13 51.9-20.4 81.4-20.4h.1c3 0 4.4-3.6 2.2-5.6a371.7 371.7 0 0 0-103.7-65.8c-.4-.2-.8-.3-1.2-.5C719.2 518 759.6 444.7 759.6 362c0-137-110.8-248-247.5-248S264.7 225 264.7 362c0 82.7 40.4 156 102.6 201.1c-.4.2-.8.3-1.2.5c-44.7 18.9-84.8 46-119.3 80.6a373.4 373.4 0 0 0-80.4 119.5A373.6 373.6 0 0 0 137 901.8a8 8 0 0 0 8 8.2h59.9c4.3 0 7.9-3.5 8-7.8c2-77.2 32.9-149.5 87.6-204.3C357 641.2 432.2 610 512.2 610c56.7 0 111.1 15.7 158 45.1a8.1 8.1 0 0 0 8.1.3M512.2 534c-45.8 0-88.9-17.9-121.4-50.4A171.2 171.2 0 0 1 340.5 362c0-45.9 17.9-89.1 50.3-121.6S466.3 190 512.2 190s88.9 17.9 121.4 50.4A171.2 171.2 0 0 1 683.9 362c0 45.9-17.9 89.1-50.3 121.6C601.1 516.1 558 534 512.2 534M880 772H640c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h240c4.4 0 8-3.6 8-8v-56c0-4.4-3.6-8-8-8"></path></svg>);
}


const userProfileContextPatch: NavContextMenuPatchCallback = (
    children,
    { user }: { user?: User; onClose(): void; },
) => {
    if (!user || UserStore.getCurrentUser().id === user.id) return;

    const isIgnored = userIds.includes(user.id);
    const label = (isIgnored ? "Unhide" : "Hide") + " " + (user.bot ? "Bot" : "User");
    children.push(
        <Menu.MenuItem
            label={label}
            id="vc-hide-user"
            icon={isIgnored ? UserDeleteOutlinedIcon : UserAddOutlinedIcon}
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
        const storedData: string[] | undefined = await DataStore.get(STORE_KEY);

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
