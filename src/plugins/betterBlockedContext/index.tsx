/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, FluxDispatcher, showToast, Text, UserStore } from "@webpack/common";
import { ButtonProps } from "@webpack/types";
import { User } from "discord-types/general";
import { MouseEvent } from "react";

const ChannelActions = findByPropsLazy("openPrivateChannel");
const RelationshipTypes = findByPropsLazy("FRIEND", "BLOCKED", "PENDING_OUTGOING");

const ButtonComponent = findComponentByCodeLazy('submittingStartedLabel","submittingFinishedLabel"]);');
const ConfirmationModal = findByCodeLazy('"ConfirmModal")', "useLayoutEffect");

const settings = definePluginSettings({
    addDmsButton: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Adds a 'View DMs' button to the users in the blocked/ignored list.",
    },
    hideBlockedWarning: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Skip the warning about blocked/ignored users when opening any profile anywhere on discord outside of the blocklist.",
        restartNeeded: true,
    },
    showUnblockConfirmation: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Show a warning before unblocking a user from the blocklist.",
    },
    showUnblockConfirmationEverywhere: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Show a warning before unblocking a user anywhere on discord.",
        restartNeeded: true,
    },
    unblockButtonDanger: {
        default: false,
        type: OptionType.BOOLEAN,
        description: "Color the unblock button in the blocklist red instead of gray.",
    },
});

export default definePlugin({
    name: "BetterBlockedContext",
    description: "Improves the way the blocked and ignored list behaves and improves the interactions with blocked user profiles.",
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
                    match: /(?<=children:null!=(\i).globalName\?.+?}\),).*?(\{color:.{0,65}?string\((\i).+?"8wXU9P"]\)})\)/,
                    replace: "$self.generateButtons({user:$1, originalProps:$2, isBlocked:$3})",
                }
            ],
        },
        // Allow opening DMs from the popout even if a user is blocked, so you can read the chat logs if needed.
        {
            find: "UserProfileModalHeaderActionButtons",
            replacement:  [
                // make the profile modal type "friend" so the message button is on it (if we keep it as "blocked", then you won't be able to get to DMs) 
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
        // You will already know that you blocked the user, so it's completely useless.
        {
            find: ',["user"])',
            replacement: {
                match: /(?<=isIgnored:.*?,\[\i,\i]=\i.useState\()\i\|\|\i\|\|\i.*?]\);/,
                replace: "false);"
            },
        },

        // If the users wishes to, they can disable the warning in all other places as well.
        ...[
            "UserProfilePanelWrapper: currentUser cannot be undefined",
            "UserProfilePopoutWrapper: currentUser cannot be undefined",
        ].map(x => ({
            find: x,
            replacement: {
                match: /(?<=isIgnored:.*?,\[\i,\i]=\i.useState\()\i\|\|\i\|\|\i\)(?:;\i.useEffect.*?]\))?/,
                replace: "false)",
            },
            predicate: () => settings.store.hideBlockedWarning,
        })),

        {
            find: ".BLOCKED:return",
            replacement: {
                match: /(?<=\i.BLOCKED:return.{0,65}onClick:)\(\)=>\{(\i.\i.unblockUser\((\i).+?}\))/,
                replace: "(event) => {$self.openConfirmationModal(event,()=>{$1}, $2)",
            },
            predicate: () => settings.store.showUnblockConfirmationEverywhere,
        },
        {
            find: ".XyHpKC),",
            replacement: {
                match: /(?<=.XyHpKC.+?Click=)\(\)=>(\{.+?(\i.getRecipientId\(\))\)})/,
                replace: "event => $self.openConfirmationModal(event, ()=>$1, $2)",
            },
            predicate: () => settings.store.showUnblockConfirmationEverywhere,
        },
        {
            find: ".showUnblockSuccessToast",
            replacement: {
                match: /(?<=id:"block".{0,100}action:\i\?)\(\)=>(\{.{0,25}unblockUser\((\i).{0,60}:void 0\)})/,
                replace: "event => {$self.openConfirmationModal(event, ()=>$1,$2)}",
            },
            predicate: () => settings.store.showUnblockConfirmationEverywhere,
        }
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

    generateButtons(props: { user: User, originalProps: ButtonProps, isBlocked: boolean }) {
        const { user, originalProps, isBlocked } = props;

        if (settings.store.unblockButtonDanger) originalProps.color = Button.Colors.RED;

        if (settings.store.showUnblockConfirmation || settings.store.showUnblockConfirmationEverywhere) {
            const originalOnClick = originalProps.onClick!;
            originalProps.onClick = e => {
                if (!isBlocked) return originalOnClick(e);
                this.openConfirmationModal(e, () => originalOnClick(e), user, true);

            };
        }

        const unblockButton = <ButtonComponent {...originalProps} />;

        if (!settings.store.addDmsButton) return unblockButton;

        const dmButton = <ButtonComponent color={Button.Colors.BRAND_NEW} onClick={() => this.openDMChannel(user)}>Show DMs</ButtonComponent>;

        return <div style={{ display: "flex", gap: "8px" }} className="vc-bbc-button-container">
            {dmButton}
            {unblockButton}
        </div>;
    },

    openDMChannel(user: User) {
        ChannelActions.openPrivateChannel(user.id);
        this.closeSettingsWindow();
        return null;
    },

    openConfirmationModal(event: MouseEvent, callback: () => any, user: User|string, isSettingsOrigin: boolean = false) {
        if (event.shiftKey) return callback();

        if (typeof user === "string") {
            user = UserStore.getUser(user);
        }

        return openModal(m => <ConfirmationModal
            {...m}
            className="vc-bbc-confirmation-modal"
            header={`Unblock ${user?.username ?? "?"}?`}
            cancelText="Cancel"
            confirmText="Unblock"
            onConfirm={() => {
                callback();
            }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} className="vc-bbc-confirmation-modal-text">
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Text variant="text-md/semibold">{`Are you sure you want to unblock ${user?.username ?? "this user"}?`}</Text>
                    <Text variant="text-md/normal">{`This will allow ${user?.username ?? "them"} to see your profile and message you again.`}</Text>
                </div>
                <Text variant="text-md/normal">{"You can always block them again later."}</Text>
                {isSettingsOrigin ? <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <Text variant="text-sm/medium" style={{ color: "var(--text-muted)" }}>{"If you just want to read the chat logs instead, you can just click on their profile."}</Text>
                    <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>{"Alternatively, you can enable a button to jump to DMs in the blocklist through the plugin settings."}</Text>
                </div> : <Text variant="text-sm/medium" style={{ color: "var(--text-muted)" }}>{"If you just want to read the chat logs, you can do this without unblocking them."}</Text>}
            </div>
        </ConfirmationModal>);
    },
});
