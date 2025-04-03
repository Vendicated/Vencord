/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs, EquicordDevs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import { openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, FluxDispatcher, React, RelationshipStore, Text, TextInput, UserStore } from "@webpack/common";
import { ButtonProps } from "@webpack/types";
import { User } from "discord-types/general";

let lastSearch = "";
let updateFunc = (v: any) => { };

const ChannelActions = findByPropsLazy("openPrivateChannel");
const ButtonComponent = findComponentByCodeLazy('submittingStartedLabel","submittingFinishedLabel"]);');
const ConfirmationModal = findByCodeLazy('"ConfirmModal")', "useLayoutEffect");

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
    },
    showUnblockConfirmation: {
        default: true,
        type: OptionType.BOOLEAN,
        description: "Show a confirmation dialog when clicking the 'Unblock' button.",
    }
});

export default definePlugin({
    name: "BetterBlockedUsers",
    description: "Allows you to search in blocked users list and makes names clickable in settings.",
    authors: [EquicordDevs.TheArmagan, Devs.Elvyra],
    settings,
    patches: [
        {
            find: '"],{numberOfBlockedUsers:',
            replacement: [
                {
                    match: /(?<=\}=(\i).*?\]\}\))/,
                    replace: ",$1.listType==='blocked'?$self.renderSearchInput():null"
                },
                {
                    match: /(?<=className:\i.userInfo,)(?=children:.{0,20}user:(\i))/,
                    replace: "style:{cursor:'pointer'},onClick:()=>$self.openUserProfile($1),"
                },
                {
                    match: /(?<=children:null!=(\i).globalName\?\i.username:null.*?}\),).*?(\{color:.{0,50}?children:\i.\i.string\((\i)\?.*?"8wXU9P"]\)})\)/,
                    replace: "$self.generateButtons({user:$1, originalProps:$2, isBlocked:$3})",
                },
                {
                    match: /(?<=\}=(\i).{0,10}(\i).useState\(.{0,1}\);)/,
                    replace: "let [searchResults,setSearchResults]=$2.useState([]);$self.setUpdateFunc($1,setSearchResults);"
                },
                {
                    match: /(usersList,children:)(\i)/,
                    replace: "$1(searchResults.length?searchResults:$2)"
                },
            ]
        },
        {
            find: "UserProfileModalHeaderActionButtons",
            replacement: [
                {
                    match: /(?<=return \i)\|\|(\i)===.*?.FRIEND/,
                    replace: (_, type) => `?null:${type} === 1|| ${type} === 2`,
                },
                {
                    match: /(?<=\i.bot.{0,50}children:.*?onClose:)(\i)/,
                    replace: "() => {$1();$self.closeSettingsWindow()}",
                }
            ],
        },
        {
            find: ',["user"])',
            replacement: {
                match: /(?<=isIgnored:.*?,\[\i,\i]=\i.useState\()\i\|\|\i\|\|\i.*?]\);/,
                replace: "false);"
            },
            predicate: () => settings.store.hideBlockedWarning,
        },
    ],
    renderSearchInput() {
        const [value, setValue] = React.useState(lastSearch);

        React.useEffect(() => {
            const searchResults = this.getFilteredUsers(lastSearch);
            updateFunc(searchResults);
        }, []);

        return <TextInput
            placeholder="Search users..."
            style={{ width: "200px" }}
            onInput={e => {
                const search = (e.target as HTMLInputElement).value.toLowerCase().trim();
                setValue(search);
                lastSearch = search;
                const searchResults = this.getFilteredUsers(search);
                updateFunc(searchResults);
            }} value={value}
        ></TextInput>;
    },
    setUpdateFunc(e, setResults) {
        if (e.listType !== "blocked") return;
        updateFunc = setResults;
        return true;
    },
    getFilteredUsers(search: string) {
        search = search.toLowerCase();
        return (RelationshipStore as any).getBlockedIDs().filter(id => {
            const user = UserStore.getUser(id) as any;
            if (!user) return id === search;
            return id === search || user?.username?.toLowerCase()?.includes(search) || user?.globalName?.toLowerCase()?.includes(search);
        }) as string[];
    },
    closeSettingsWindow() {
        FluxDispatcher.dispatch({ type: "LAYER_POP" });
    },
    openUserProfile(user: User) {
        openUserProfile(user.id);
    },
    generateButtons(props: { user: User, originalProps: ButtonProps, isBlocked: boolean; }) {
        const { user, originalProps, isBlocked } = props;

        if (settings.store.unblockButtonDanger) originalProps.color = Button.Colors.RED;

        // TODO add extra unblock confirmation after the click + setting.

        if (settings.store.showUnblockConfirmation) {
            const originalOnClick = originalProps.onClick!;
            originalProps.onClick = e => {
                if (e.shiftKey) return originalOnClick(e);

                openModal(m => <ConfirmationModal
                    className="vc-bbc-confirmation-modal"
                    {...m}
                    header={(isBlocked ? "Unblock" : "Unignore") + ` ${user.username}?`}
                    cancelText="Cancel"
                    confirmText={isBlocked ? "Unblock" : "Unignore"}
                    onConfirm={() => {
                        originalOnClick(e);
                    }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }} className="vc-bbc-confirmation-modal-text">
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <Text variant="text-md/semibold">{`Are you sure you want to ${isBlocked ? "unblock" : "unignore"} this user?`}</Text>
                            {isBlocked ? <Text variant="text-md/normal">{`This will allow ${user.username} to see your profile and message you again.`}</Text> : null}
                        </div>
                        <Text variant="text-md/normal">{`You can always ${isBlocked ? "block" : "ignore"} them again later.`}</Text>
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <Text variant="text-sm/medium" style={{ color: "var(--text-muted)" }}>{"If you just want to read the chat logs instead, you can just click on their profile."}</Text>
                            <Text variant="text-sm/normal" style={{ color: "var(--text-muted)" }}>{"Alternatively, you can enable a button to show DMs in the blocklist through the plugin settings."}</Text>
                        </div>
                    </div>
                </ConfirmationModal>);
            };
        }

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
