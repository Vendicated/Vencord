/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, FluxDispatcher, showToast } from "@webpack/common";
import { ButtonProps } from "@webpack/types";
import { User } from "discord-types/general";

const RelationshipTypes = findByPropsLazy("FRIEND", "BLOCKED", "PENDING_OUTGOING");
const ButtonComponent = findComponentByCodeLazy('submittingStartedLabel","submittingFinishedLabel"]);');

const ChannelActions = findByPropsLazy("openPrivateChannel");

const settings = definePluginSettings({
    hideBlockedWarning: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Skip the warning about blocked/ignored users when opening the profile through the blocklist.",
        restartNeeded: true,
    },
    addDmsButton: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Adds a 'View DMs' button to the users in the blocked list.",
    },
    unblockButtonDanger: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Changes the 'Unblock' button to a red color to make it's 'danger' more obvious.",
    }
});

export default definePlugin({
    name: "BetterBlockedContext",
    description: "Allows you to view a users profile by clicking on them in the blocked/ignored list.",
    authors: [Devs.Elvyra],
    settings,
    patches: [
        {
            find: ".lastRow]",
            replacement: [
                // Allow the user profile to be opened from the blocklist.
                {
                    match: /(?<=className:\i.userInfo,)(?=children:.{0,20}user:(\i))/,
                    replace: "style:{cursor:'pointer'},onClick:() => $self.openUserProfile($1),"
                },
                // Add an extra message button into the blocklist for easy access to past DMs, in case those are needed.
                {
                    match: /(?<=children:null!=(\i).globalName\?\i.username:null.*?}\),).*?(\{color:.{0,75}?"8wXU9P"]\)})\)/,
                    replace: "$self.generateButtons({user:$1, originalProps:$2})",
                }
            ],
        },
        // Allow opening DMs from the popout even if a user is blocked, so you can read the chat logs if needed.
        {
            find: "UserProfileModalHeaderActionButtons",
            replacement:  [
                // make the blocked modal be equal to the friends modal as the only difference is the message button.
                {
                    match: /(?<=return \i)\|\|(\i)===.*?.FRIEND/,
                    replace: (_, type) => `?null:${type} === ${RelationshipTypes.FRIEND} || ${type} === ${RelationshipTypes.BLOCKED}`,
                },
                // fix settings not closing when clicking the Message button
                {
                    match: /(?<=\i.bot.{0,50}children:.*?onClose:)(\i)/,
                    replace: "() => {$1();$self.closeSettingsWindow()}",
                }
            ],
        },
        // Skip the warning about blocked/ignored users when opening the profile through the blocked menu.
        // You will already know that you blocked the user, so it is unnecessary.
        // However, if a user wants to see the warning, they can disable this setting.
        {
            find: ',["user"])',
            replacement: {
                match: /(?<=isIgnored:.*?,\[\i,\i]=\i.useState\()\i\|\|\i\|\|\i.*?]\);/,
                replace: "false);"
            },
            predicate: () => settings.store.hideBlockedWarning,
        },
    ],

    closeSettingsWindow(){
        Promise.resolve(FluxDispatcher.dispatch({ type: "LAYER_POP" })).catch(
            e => {
                showToast("Failed to close settings window! Check the console for more info");
                console.error(e);
            }
        );
    },

    openUserProfile(user: User) {
        Promise.resolve(openUserProfile(user.id)).catch(e =>{
            showToast("Failed to open profile for user '" + user.username + "'! Check the console for more info");
            console.error(e);
        });
    },

    generateButtons(props: { user: User, originalProps: ButtonProps }) {
        const { user, originalProps } = props;

        if (settings.store.unblockButtonDanger) originalProps.color = Button.Colors.RED;

        const originalButton = <ButtonComponent {...originalProps} />;

        if (!settings.store.addDmsButton) return originalButton;

        const dmButton = <ButtonComponent color={Button.Colors.BRAND_NEW} onClick={() => this.openDMChannel(user)}>Show DMs</ButtonComponent>;

        return <div style={{ display: "flex", gap: "8px" }} className="vc-bbc-button-container">
            {dmButton}
            {originalButton}
        </div>;
    },

    openDMChannel(user: User) {
        ChannelActions.openPrivateChannel(user.id);
        this.closeSettingsWindow();
        return null;
    },
});
