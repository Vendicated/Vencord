/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Paragraph } from "@components/Paragraph";
import { classNameFactory } from "@utils/css";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { GuildMember } from "@vencord/discord-types";
import { Parser } from "@webpack/common";

const cl = classNameFactory("vc-inrole-");

export function showInRoleModal(members: GuildMember[], roleId: string, channelId: string) {
    openModal(props =>
        <>
            <ErrorBoundary>
                <ModalRoot {...props} size={ModalSize.DYNAMIC} fullscreenOnMobile={true} >
                    <ModalHeader className={cl("header")}>
                        <Paragraph style={{ fontSize: "1.2rem", fontWeight: "bold", marginRight: "7px" }}>Members of role {
                            Parser.parse(`<@&${roleId}>`, true, { channelId, viewingChannelId: channelId })
                        } ({members.length})</Paragraph>
                        <ModalCloseButton onClick={props.onClose} className={cl("close")} />
                    </ModalHeader>
                    <ModalContent>
                        <div style={{ padding: "13px 20px" }} className={cl("member-list")}>
                            {
                                members.length !== 0 ? members.map(member =>
                                    <>
                                        <Paragraph className={cl("modal-member")}>
                                            {Parser.parse(`<@${member.userId}>`, true, { channelId, viewingChannelId: channelId })}
                                        </Paragraph>
                                    </>
                                ) : <Paragraph>Looks like no online cached members with that role were found. Try scrolling down on your member list to cache more users!</Paragraph>
                            }
                        </div>
                    </ModalContent>
                </ModalRoot>
            </ErrorBoundary>
        </>
    );
}
