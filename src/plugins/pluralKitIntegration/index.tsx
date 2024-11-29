/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addPreSendListener, MessageObject, removePreSendListener, SendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import { ActiveIcon, RestartIcon, UserCircleIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Avatar, Menu, Text } from "@webpack/common";
import PKAPI, { Member, System } from "pkapi.js";

const logger = new Logger("PluralKitIntegration");

const MenuButton = findComponentByCodeLazy(".menuItemColor");
const PopoutMenu = findComponentByCodeLazy("submenuPaddingContainer");

const MenuDividerClasses = findByPropsLazy("menuDivider");
const DefaultColorClass = findByPropsLazy("defaultColor");
const UserMenuClasses = findByPropsLazy("userMenuItem", "focused", "userMenuUsername", "userMenuText", "activeIcon");

const settings = definePluginSettings({
    pluralKitSystemId: {
        description: "The ID of the PluralKit system you want to integrate with",
        restartNeeded: true,
        type: OptionType.STRING
    },
    currentFronterId: {
        description: "The ID of the current fronter.",
        restartNeeded: false,
        hidden: true,
        type: OptionType.STRING
    }
});

function isEmpty(input: string) {
    return input.trim().length === 0;
}

export default definePlugin({
    name: "PluralKitIntegration",
    description: "Integrates PluralKit with Discord",
    authors: [Devs.JohnyTheCarrot],
    settings,
    dependencies: ["MessageEventsAPI"],
    patches: [
        {
            find: /"PRESS_SWITCH_ACCOUNTS"/,
            all: true,
            replacement: {
                match: /\(0,\i\.jsx\)\(\i\.\i,\{id:"switch-accounts"/,
                replace: "$self.SwitchMember(),$&"
            }
        }
    ],

    // State
    pkApi: null as PKAPI | null,
    system: null as System | null,
    members: null as Map<string, Member> | null,
    preSend: null as SendListener | null,
    tags: ["accessibility", "a11y"],
    async start() {
        logger.debug("Starting PluralKit integration");

        this.pkApi = new PKAPI();

        if (!this.settings.store.pluralKitSystemId || isEmpty(this.settings.store.pluralKitSystemId)) {
            return;
        }
        this.system = await this.pkApi.getSystem({
            system: this.settings.store.pluralKitSystemId
        });
        logger.debug("PluralKit integration started with system", this.system);
        this.preSend = addPreSendListener((_, msg) => this.onSend(msg));
        void this.fetchMembers();
    },
    stop() {
        if (this.preSend) {
            removePreSendListener(this.preSend);
        }
    },
    onSend(msg: MessageObject) {
        if (!this.system
            || !this.members
            || !this.settings.store.currentFronterId
            || isEmpty(this.settings.store.currentFronterId)
            || msg.content.startsWith("pk;"))
            return;

        const member = this.members.get(this.settings.store.currentFronterId);
        if (!member)
            return;

        const { proxy_tags: proxyTags } = member;
        if (!proxyTags || proxyTags.length === 0)
            return;

        const [someTag] = proxyTags;
        if (someTag.prefix) {
            msg.content = `${someTag.prefix} ${msg.content}`;
        } else {
            msg.content = `${msg.content} ${someTag.suffix}`;
        }
    },
    async fetchMembers() {
        this.system?.getMembers().then(members => {
            this.members = members;
        });
    },
    switchToMember(memberId: string | undefined) {
        this.settings.store.currentFronterId = memberId;
    },
    isMemberFronting(memberId: string) {
        return this.settings.store.currentFronterId === memberId;
    },
    PluralKitMemberItem({ member, isCurrentlyFronting, isFocused }: {
        member: Member,
        isCurrentlyFronting: boolean,
        isFocused: boolean
    }) {
        return (
            <div className={UserMenuClasses.userMenuItem}>
                {member.avatar_url &&
                    <Avatar size="SIZE_24" src={member.avatar_url}/>}
                <div className={UserMenuClasses.userMenuUsername}>
                    <Text variant="text-sm/normal"
                          className={classes(DefaultColorClass.defaultColor, UserMenuClasses.userMenuText)}>
                        {member.name}
                    </Text>
                </div>
                {isCurrentlyFronting &&
                    <ActiveIcon
                        className={UserMenuClasses.activeIcon}
                        width={18}
                        height={18}
                        color={isFocused ? "var(--brand-500)" : "var(--white-500)"}
                        secondaryColor={isFocused ? "var(--white-500)" : "var(--brand-500)"}
                    />
                }
            </div>
        );
    },
    SwitchMember() {
        if (!this.system || !this.members)
            return null;

        return (
            <>
                <MenuButton
                    icon={() => <UserCircleIcon width={16} height={16}/>}
                    label="Switch Proxy"
                    renderSubmenu={
                        ({ closePopout }) =>
                            (
                                <PopoutMenu navId="vc-pk-switch-member" variant="fixed" onClose={closePopout}>
                                    {Array.from(this.members.values()).map(member => (
                                        <Menu.MenuItem
                                            id={member.id}
                                            disabled={!member.proxy_tags || member.proxy_tags.length === 0}
                                            label={({ isFocused }) => (
                                                <this.PluralKitMemberItem
                                                    member={member}
                                                    isCurrentlyFronting={this.isMemberFronting(member.id)}
                                                    isFocused={isFocused}
                                                />
                                            )}
                                            action={() => {
                                                this.switchToMember(member.id);
                                                closePopout();
                                            }}
                                            focusedClassName={UserMenuClasses.focused}
                                        />
                                    ))}
                                    <Menu.MenuSeparator/>
                                    <Menu.MenuItem
                                        id="vc-pk-disable-pk"
                                        label="Disable"
                                        color="danger"
                                        action={() => {
                                            this.switchToMember(undefined);
                                            closePopout();
                                        }}
                                    />
                                    <Menu.MenuItem
                                        id="vc-pk-refresh"
                                        label="Refresh Member List"
                                        icon={RestartIcon}
                                        color="danger"
                                        action={() => {
                                            void this.fetchMembers();
                                            closePopout();
                                        }}
                                    />
                                </PopoutMenu>
                            )
                    }
                />
                <div className={MenuDividerClasses.menuDivider}/>
            </>
        );
    }
});
