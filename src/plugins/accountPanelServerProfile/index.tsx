/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { ContextMenuApi, Menu, useEffect, useRef } from "@webpack/common";
import { User } from "discord-types/general";

interface UserProfileProps {
    popoutProps: Record<string, any>;
    currentUser: User;
    originalPopout: () => React.ReactNode;
}

const UserProfile = findComponentByCodeLazy("UserProfilePopoutWrapper: user cannot be undefined");
const styles = findByPropsLazy("accountProfilePopoutWrapper");

let openAlternatePopout = false;
let accountPanelRef: React.MutableRefObject<Record<PropertyKey, any> | null> = { current: null };

const AccountPanelContextMenu = ErrorBoundary.wrap(() => {
    const { prioritizeServerProfile } = settings.use(["prioritizeServerProfile"]);

    return (
        <Menu.Menu
            navId="vc-ap-server-profile"
            onClose={ContextMenuApi.closeContextMenu}
        >
            <Menu.MenuItem
                id="vc-ap-view-alternate-popout"
                label={prioritizeServerProfile ? "View Account Profile" : "View Server Profile"}
                disabled={getCurrentChannel()?.getGuildId() == null}
                action={e => {
                    openAlternatePopout = true;
                    accountPanelRef.current?.props.onMouseDown();
                    accountPanelRef.current?.props.onClick(e);
                }}
            />
            <Menu.MenuCheckboxItem
                id="vc-ap-prioritize-server-profile"
                label="Prioritize Server Profile"
                checked={prioritizeServerProfile}
                action={() => settings.store.prioritizeServerProfile = !prioritizeServerProfile}
            />
        </Menu.Menu>
    );
}, { noop: true });

const settings = definePluginSettings({
    prioritizeServerProfile: {
        type: OptionType.BOOLEAN,
        description: "Prioritize Server Profile when left clicking your account panel",
        default: false
    }
});

export default definePlugin({
    name: "AccountPanelServerProfile",
    description: "Right click your account panel in the bottom left to view your profile in the current server",
    authors: [Devs.Nuckyz, Devs.relitrix],
    settings,

    patches: [
        {
            find: "#{intl::ACCOUNT_SPEAKING_WHILE_MUTED}",
            group: true,
            replacement: [
                {
                    match: /(?<=\.SIZE_32\)}\);)/,
                    replace: "$self.useAccountPanelRef();"
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
                    match: /(?<=\.avatarWrapper,)/,
                    replace: "ref:$self.accountPanelRef,onContextMenu:$self.openAccountPanelContextMenu,"
                }
            ]
        }
    ],

    get accountPanelRef() {
        return accountPanelRef;
    },

    useAccountPanelRef() {
        useEffect(() => () => {
            accountPanelRef.current = null;
        }, []);

        return (accountPanelRef = useRef(null));
    },

    openAccountPanelContextMenu(event: React.UIEvent) {
        ContextMenuApi.openContextMenu(event, AccountPanelContextMenu);
    },

    onPopoutClose() {
        openAlternatePopout = false;
    },

    UserProfile: ErrorBoundary.wrap(({ popoutProps, currentUser, originalPopout }: UserProfileProps) => {
        if (
            (settings.store.prioritizeServerProfile && openAlternatePopout) ||
            (!settings.store.prioritizeServerProfile && !openAlternatePopout)
        ) {
            return originalPopout();
        }

        const currentChannel = getCurrentChannel();
        if (currentChannel?.getGuildId() == null) {
            return originalPopout();
        }

        return (
            <div className={styles.accountProfilePopoutWrapper}>
                <UserProfile {...popoutProps} userId={currentUser.id} guildId={currentChannel.getGuildId()} channelId={currentChannel.id} />
            </div>
        );
    }, { noop: true })
});
