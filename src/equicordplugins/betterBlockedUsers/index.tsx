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
                    match: /(?<=children:null!=(\i).globalName\?.+?}\),).*?(\{color:.{0,65}?string\((\i).+?"8wXU9P"]\)})\)/,
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
            find: "#{intl::UNBLOCK}),",
            replacement: {
                match: /(?<=#{intl::UNBLOCK}.+?Click=)\(\)=>(\{.+?(\i.getRecipientId\(\))\)})/,
                replace: "event => $self.openConfirmationModal(event, ()=>$1, $2)",
            },
            predicate: () => settings.store.showUnblockConfirmationEverywhere,
        },
        {
            find: "#{intl::BLOCK}),action",
            replacement: {
                match: /(?<=id:"block".{0,100}action:\i\?)\(\)=>(\{.{0,25}unblockUser\((\i).{0,60}:void 0\)})/,
                replace: "event => {$self.openConfirmationModal(event, ()=>$1,$2)}",
            },
            predicate: () => settings.store.showUnblockConfirmationEverywhere,
        }
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

        if (settings.store.showUnblockConfirmation || settings.store.showUnblockConfirmationEverywhere) {
            const originalOnClick = originalProps.onClick!;
            originalProps.onClick = e => {
                if (!isBlocked) return originalOnClick(e);
                this.openConfirmationModal(e as unknown as MouseEvent, () => originalOnClick(e), user, true);
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
    openConfirmationModal(event: MouseEvent, callback: () => any, user: User | string, isSettingsOrigin: boolean = false) {
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
