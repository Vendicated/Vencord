/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { InfoIcon } from "@components/Icons";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { findByCodeLazy, findExportedComponentLazy } from "@webpack";
import { Constants, GuildChannelStore, GuildMemberStore, GuildStore, Parser, RestAPI, ScrollerThin, Text, Tooltip, useEffect, UserStore, useState } from "@webpack/common";
import { UnicodeEmoji } from "@webpack/types";
import type { Role } from "discord-types/general";

import { cl, GuildUtils } from "../utils";

type GetRoleIconData = (role: Role, size: number) => { customIconSrc?: string; unicodeEmoji?: UnicodeEmoji; };
const ThreeDots = findExportedComponentLazy("Dots", "AnimatedDots");
const getRoleIconData: GetRoleIconData = findByCodeLazy("convertSurrogateToName", "customIconSrc", "unicodeEmoji");



function getRoleIconSrc(role: Role) {
    const icon = getRoleIconData(role, 20);
    if (!icon) return;

    const { customIconSrc, unicodeEmoji } = icon;
    return customIconSrc ?? unicodeEmoji?.url;
}

function MembersContainer({ guildId, roleId }: { guildId: string; roleId: string; }) {

    const channelId = GuildChannelStore.getChannels(guildId).SELECTABLE[0].channel.id;

    // RMC: RoleMemberCounts
    const [RMC, setRMC] = useState({});
    useEffect(() => {
        let loading = true;
        const interval = setInterval(async () => {
            try {
                await RestAPI.get({
                    url: Constants.Endpoints.GUILD_ROLE_MEMBER_COUNTS(guildId)
                }).then(x => {
                    if (x.ok) setRMC(x.body); clearInterval(interval);
                });
            } catch (error) { console.error("Error fetching member counts", error); }
        }, 1000);
        return () => { loading = false; };
    }, []);

    let usersInRole = [];
    const [rolesFetched, setRolesFetched] = useState(Array<string>);
    useEffect(() => {
        if (!rolesFetched.includes(roleId)) {
            const interval = setInterval(async () => {
                try {
                    const response = await RestAPI.get({
                        url: Constants.Endpoints.GUILD_ROLE_MEMBER_IDS(guildId, roleId),
                    });
                    ({ body: usersInRole } = response);
                    await GuildUtils.requestMembersById(guildId, usersInRole, !1);
                    setRolesFetched([...rolesFetched, roleId]);
                    clearInterval(interval);
                } catch (error) { console.error("Error fetching members:", error); }
            }, 1200);
            return () => clearInterval(interval);
        }
    }, [roleId]); // Fetch roles

    const [members, setMembers] = useState(GuildMemberStore.getMembers(guildId));
    useEffect(() => {
        const interval = setInterval(async () => {
            if (usersInRole) {
                const guildMembers = GuildMemberStore.getMembers(guildId);
                const storedIds = guildMembers.map(user => user.userId);
                usersInRole.every(id => storedIds.includes(id)) && clearInterval(interval);
                if (guildMembers !== members) {
                    setMembers(GuildMemberStore.getMembers(guildId));
                }
            }
        }, 500);
        return () => clearInterval(interval);
    }, [roleId, rolesFetched]);

    const roleMembers = members.filter(x => x.roles.includes(roleId)).map(x => UserStore.getUser(x.userId));

    return (
        <div className={cl("modal-members")}>
            <div className={cl("member-list-header")}>
                <div className={cl("member-list-header-text")}>
                    <Text>
                        {roleMembers.length} loaded / {RMC[roleId] || 0} members with this role<br />
                    </Text>
                    <Tooltip text="For roles with over 100 members, only the first 100 and the cached members will be shown.">
                        {props => <InfoIcon {...props} />}
                    </Tooltip>
                </div>

            </div>
            <ScrollerThin orientation="auto">
                {roleMembers.map(x => {
                    return (
                        <div key={x.id} className={cl("user-div")}>
                            <img
                                className={cl("user-avatar")}
                                src={x.getAvatarURL()}
                                alt=""
                            />
                            {Parser.parse(`<@${x.id}>`, true, { channelId, viewingChannelId: channelId })}
                        </div>
                    );
                })}
                {
                    (Object.keys(RMC).length === 0) ? (
                        <div className={cl("member-list-footer")}>
                            <ThreeDots dotRadius={5} themed={true} />
                        </div>
                    ) : !RMC[roleId] ? (
                        <Text className={cl("member-list-footer")} variant="text-md/normal">No member found with this role</Text>
                    ) : RMC[roleId] === roleMembers.length ? (
                        <>
                            <div className={cl("divider")} />
                            <Text className={cl("member-list-footer")} variant="text-md/normal">All members loaded</Text>
                        </>
                    ) : rolesFetched.includes(roleId) ? (
                        <>
                            <div className={cl("divider")} />
                            <Text className={cl("member-list-footer")} variant="text-md/normal">All cached members loaded</Text>
                        </>
                    ) : (
                        <div className={cl("member-list-footer")}>
                            <ThreeDots dotRadius={5} themed={true} />
                        </div>
                    )
                }
            </ScrollerThin>
        </div>
    );
}

function VMWRModal({ guildId, props }: { guildId: string; props: ModalProps; }) {
    const roleObj = GuildStore.getRoles(guildId);
    const roles = Object.keys(roleObj).map(key => roleObj[key]).sort((a, b) => b.position - a.position);

    const [selectedRole, selectRole] = useState(roles[0]);

    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text className={cl("modal-title")} variant="heading-lg/semibold">View members with role</Text>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <ModalContent className={cl("modal-content")}>
                <div className={cl("modal-container")}>
                    <ScrollerThin className={cl("modal-list")} orientation="auto">
                        {roles.map((role, index) => {

                            if (role.id === guildId) return;

                            const roleIconSrc = role != null ? getRoleIconSrc(role) : undefined;

                            return (
                                <div
                                    className={cl("modal-list-item-btn")}
                                    onClick={() => selectRole(roles[index])}
                                    role="button"
                                    tabIndex={0}
                                    key={role.id}
                                >
                                    <div
                                        className={cl("modal-list-item", { "modal-list-item-active": selectedRole.id === role.id })}
                                    >
                                        <span
                                            className={cl("modal-role-circle")}
                                            style={{ backgroundColor: role?.colorString || "var(--primary-300)" }}
                                        />
                                        {
                                            roleIconSrc != null && (
                                                <img
                                                    className={cl("modal-role-image")}
                                                    src={roleIconSrc}
                                                />
                                            )

                                        }
                                        <Text variant="text-md/normal">
                                            {role?.name || "Unknown role"}
                                        </Text>
                                    </div>
                                </div>
                            );
                        })}
                    </ScrollerThin>
                    <div className={cl("modal-divider")} />
                    <MembersContainer
                        guildId={guildId}
                        roleId={selectedRole.id}
                    />
                </div>
            </ModalContent>
        </ModalRoot >
    );
}

export function openVMWRModal(guildId) {

    openModal(props =>
        <VMWRModal
            guildId={guildId}
            props={props}
        />
    );
}

