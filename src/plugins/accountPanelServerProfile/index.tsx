/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { ContextMenuApi, Menu } from "@webpack/common";
import { User } from "discord-types/general";

interface UserProfileProps {
    popoutProps: Record<string, any>;
    currentUser: User;
    originalPopout: () => React.ReactNode;
}

const UserProfile = findComponentByCodeLazy("UserProfilePopoutWrapper: user cannot be undefined");

let shouldOpenUserProfile = false;
let accountPanelRef: React.MutableRefObject<Record<PropertyKey, any> | null> = { current: null };

const AccountPanelContextMenu = ErrorBoundary.wrap(() => {
    return (
        <Menu.Menu
            navId="vc-ap-server-profile"
            onClose={ContextMenuApi.closeContextMenu}
        >
            <Menu.MenuItem
                id="vc-ap-view-server-profile"
                label="View Server Profile"
                disabled={getCurrentChannel()?.getGuildId() == null}
                action={() => {
                    shouldOpenUserProfile = true;
                    accountPanelRef.current?.props.onMouseDown();
                    accountPanelRef.current?.props.onClick(new MouseEvent("click"));
                }}
            />
        </Menu.Menu>
    );
}, { noop: true });

export default definePlugin({
    name: "AccountPanelServerProfile",
    description: "Right click your account panel in the bottom left to view your profile in the current server",
    authors: [Devs.Nuckyz, Devs.relitrix],
    patches: [
        {
            find: ".Messages.ACCOUNT_SPEAKING_WHILE_MUTED",
            group: true,
            replacement: [
                {
                    match: /(?<=\.SIZE_32\)}\);)/,
                    replace: "$&$self.accountPanelRef=Vencord.Webpack.Common.useRef(null);"
                },
                {
                    match: /(\.AVATAR,children:.+?renderPopout:(\i)=>){(.+?)}(?=,position)(?<=currentUser:(\i).+?)/,
                    replace: (_, rest, popoutProps, originalPopout, currentUser) => `${rest}$self.UserProfile({popoutProps:${popoutProps},currentUser:${currentUser},originalPopout:()=>{${originalPopout}}})`
                },
                {
                    match: /\.AVATAR,children:.+?(?=renderPopout:)/,
                    replace: "$&onRequestClose:$self.onPopoutClose,"
                },
                {
                    match: /(?<=.avatarWrapper,)/,
                    replace: "ref:$self.accountPanelRef,onContextMenu:$self.openAccountPanelContextMenu,"
                }
            ]
        }
    ],

    get accountPanelRef() {
        return accountPanelRef;
    },

    set accountPanelRef(ref) {
        accountPanelRef = ref;
    },

    openAccountPanelContextMenu: (event: React.UIEvent) => {
        ContextMenuApi.openContextMenu(event, AccountPanelContextMenu);
    },

    onPopoutClose: () => {
        shouldOpenUserProfile = false;
    },

    UserProfile: ErrorBoundary.wrap(({ popoutProps, currentUser, originalPopout }: UserProfileProps) => {
        const currentChannel = getCurrentChannel();
        if (!shouldOpenUserProfile || currentChannel == null || currentChannel.getGuildId() == null) {
            return originalPopout();
        }

        return <UserProfile {...popoutProps} userId={currentUser.id} guildId={currentChannel.getGuildId()} channelId={currentChannel.id} />;
    }, { noop: true })
});
