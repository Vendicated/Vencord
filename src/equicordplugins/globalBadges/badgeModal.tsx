/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { HeadingTertiary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { openInviteModal } from "@utils/discord";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import { User } from "@vencord/discord-types";
import { React, Tooltip } from "@webpack/common";

import { badgeData } from "./badgeComponent";
import { cl, INVITE_LINK } from "./utils";

export const BadgeModalComponent = ({ name, img }: { name: string, img: string; }) => {
    return (
        <>
            <Tooltip text={name} >
                {(tooltipProps: any) => (
                    <img
                        className={cl("modal-badge")}
                        {...tooltipProps}
                        src={img}
                    />
                )}
            </Tooltip>
        </>
    );
};

export function openBadgeModal(user: User) {
    const badgeDataElements = badgeData.map(badge => (
        <BadgeModalComponent key={badge.rawName} name={badge.name} img={badge.badge} />
    ));

    openModal(modalprops => (
        <ModalRoot {...modalprops}>
            <ErrorBoundary>
                <ModalHeader>
                    <img
                        className={cl("modal-avatar")}
                        src={user.getAvatarURL(undefined, 512, true)}
                        alt=""
                    />
                    <HeadingTertiary className={cl("modal-name")}>
                        {user.username}
                    </HeadingTertiary>
                </ModalHeader>
                <ModalContent className={cl("modal-description")}>
                    {badgeDataElements.length ? (
                        <>
                            <Paragraph className={cl("modal-text")}>
                                {badgeDataElements.length} global badge
                                {badgeDataElements.length > 1 ? "s" : ""}.
                            </Paragraph>
                            <div className={cl("modal-badges")}>
                                {badgeDataElements}
                            </div>
                        </>
                    ) : (
                        <Paragraph>
                            No global badges.
                        </Paragraph>
                    )}
                </ModalContent>
                <ModalFooter>
                    <Button
                        variant="link"
                        onClick={() => openInviteModal(INVITE_LINK)}
                    >
                        Join GlobalBadges Server
                    </Button>
                </ModalFooter>
            </ErrorBoundary>
        </ModalRoot>
    ));
}
