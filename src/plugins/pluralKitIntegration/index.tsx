/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { ActiveIcon, UserCircleIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Avatar, Menu, Text, useEffect, useState } from "@webpack/common";
import PKAPI, { Member, Switch, System } from "pkapi.js";

const logger = new Logger("PluralKitIntegration");

const MenuButton = findComponentByCodeLazy(".menuItemColor");
const PopoutMenu = findComponentByCodeLazy("submenuPaddingContainer");

const MenuDividerClasses = findByPropsLazy("menuDivider");
const DefaultColorClass = findByPropsLazy("defaultColor");
const UserMenuClasses = findByPropsLazy("userMenuItem", "userMenuUsername", "userMenuText", "activeIcon");

const settings = definePluginSettings({
    pluralkitToken: {
        description: "Your PluralKit token. Obtain it by running pk;token",
        type: OptionType.STRING
    }
});

export default definePlugin({
    name: "PluralKitIntegration",
    description: "Integrates PluralKit with Discord",
    authors: [Devs.JohnyTheCarrot],
    settings,
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
    initialized: false,
    pkApi: null as PKAPI | null,
    system: null as System | null,
    fronters: undefined as Switch | undefined,
    tags: ["accessibility", "a11y"],
    async start() {
        logger.debug("Starting PluralKit integration");

        this.initialized = false;
        if (!settings.store.pluralkitToken) {
            logger.debug("No PluralKit token provided, skipping integration");
            return;
        }
        this.pkApi = new PKAPI({
            token: settings.store.pluralkitToken
        });
        this.initialized = true;
        this.system = await this.pkApi.getSystem();
        logger.debug("PluralKit integration started with system", this.system);
        void this.getFronters();
    },
    stop() {
        this.initialized = false;
        this.pkApi = null;
    },
    async getFronters() {
        if (!this.system)
            return;

        this.system.getFronters().then(newFronters => {
            this.fronters = newFronters;
        });
    },
    switchToMember(memberId: string) {
        this.system?.createSwitch({
            members: [memberId]
        });
        void this.getFronters();
    },
    isMemberFronting(memberId: string) {
        if (!this.fronters || !this.fronters.members)
            return false;

        // assert members is a map, the docs say "only contains member IDS if getting raw switches" which we're not doing
        const map = this.fronters.members as Map<string, Member>;

        return map.has(memberId);
    },
    PluralKitMemberItem({ member, isCurrentlyFronting }: { member: Member, isCurrentlyFronting: boolean }) {
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
                    />
                }
            </div>
        );
    },
    SwitchMember() {
        const [members, setMembers] = useState<Map<string, Member>>(new Map());

        useEffect(() => {
            if (!this.pkApi || !this.system)
                return;

            this.system.getMembers().then(m => {
                setMembers(m);
            });
        }, []);

        if (!this.pkApi)
            return null;

        return (
            <>
                <MenuButton
                    icon={() => <UserCircleIcon width={16} height={16}/>}
                    label="Switch Proxy"
                    renderSubmenu={
                        ({ closePopout }) => {
                            return (
                                <PopoutMenu navId="vc-pk-switch-member" variant="fixed" onClose={closePopout}>
                                    {Array.from(members.values()).map(member => (
                                        <Menu.MenuItem
                                            id={member.id}
                                            label={
                                                <this.PluralKitMemberItem
                                                    member={member}
                                                    isCurrentlyFronting={this.isMemberFronting(member.id)}
                                                />
                                            }
                                            action={() => {
                                                this.switchToMember(member.id);
                                                closePopout();
                                            }}
                                            className="vc-pk-user-menu-item"
                                        />
                                    ))}
                                </PopoutMenu>
                            );
                        }
                    }
                />
                <div className={MenuDividerClasses.menuDivider}/>
            </>
        );
    }
});
