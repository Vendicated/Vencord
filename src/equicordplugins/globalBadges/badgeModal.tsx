/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { HeadingPrimary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { ModalContent, ModalRoot, openModal } from "@utils/modal";
import { User } from "@vencord/discord-types";
import { React, Tooltip } from "@webpack/common";

import { badgeImages } from "./badgeComponent";
import { cl } from "./utils";

export const BadgeModalComponent = ({ name, img }: { name: string, img: string; }) => {
    return (
        <Tooltip text={name} >
            {(tooltipProps: any) => (
                <img
                    {...tooltipProps}
                    src={img}
                    style={{ width: "50px", height: "50px", margin: "2px 2px" }}
                />
            )}
        </Tooltip>
    );
};

export function BadgeModal({ user }: { user: User; }) {
    return (
        <>
            <div className={cl("header")}>
                <img
                    className={cl("avatar")}
                    src={user.getAvatarURL(void 0, 512, true)}
                    alt=""
                />
                <HeadingPrimary className={cl("name")}>{user.username}</HeadingPrimary>
            </div>
            {badgeImages.length ? (
                <Paragraph>
                    {user.username} has {badgeImages.length} global badges.
                </Paragraph>
            ) : (
                <Paragraph>
                    {user.username} has no global badges.
                </Paragraph>
            )}
            {!!badgeImages.length && (
                <div className={cl("badges")}>
                    {badgeImages}
                </div>
            )}
        </>
    );
}

export function openBadgeModal(user: User) {
    openModal(modalprops =>
        <ModalRoot {...modalprops}>
            <ErrorBoundary>
                <ModalContent className={cl("root")}>
                    <BadgeModal user={user} />
                </ModalContent>
            </ErrorBoundary>
        </ModalRoot>
    );
}
