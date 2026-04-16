/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { BadgePosition, BadgeUserArgs, ProfileBadge } from "@api/Badges";
import { Badges } from "@api/index";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Forms, RelationshipStore } from "@webpack/common";

interface rankInfo {
    title: string;
    description: string;
    requirement: number;
    iconSrc: string;
}

const cl = classNameFactory("vc-friendship-ranks-");

function daysSince(dateString: string): number {
    const date = new Date(dateString);
    const currentDate = new Date();

    const differenceInMs = currentDate.getTime() - date.getTime();

    const days = differenceInMs / (1000 * 60 * 60 * 24);

    return Math.floor(days);
}

const ranks: rankInfo[] =
    [
        {
            title: "Sprout",
            description: "Your friendship is just starting",
            requirement: 0,
            iconSrc: "https://equicord.org/assets/plugins/friendshipRanks/sprout.png"
        },
        {
            title: "Blooming",
            description: "Your friendship is getting there! (1 Month)",
            requirement: 30,
            iconSrc: "https://equicord.org/assets/plugins/friendshipRanks/blooming.png"
        },
        {
            title: "Burning",
            description: "Your friendship has reached terminal velocity (3 Months)",
            requirement: 90,
            iconSrc: "https://equicord.org/assets/plugins/friendshipRanks/burning.png"
        },
        {
            title: "Fighter",
            description: "Your friendship is strong (6 Months)",
            requirement: 182.5,
            iconSrc: "https://equicord.org/assets/plugins/friendshipRanks/fighter.png"
        },
        {
            title: "Star",
            description: "Your friendship has been going on for a WHILE (1 Year)",
            requirement: 365,
            iconSrc: "https://equicord.org/assets/plugins/friendshipRanks/star.png"
        },
        {
            title: "Royal",
            description: "Your friendship has gone through thick and thin- a whole 2 years!",
            requirement: 730,
            iconSrc: "https://equicord.org/assets/plugins/friendshipRanks/royal.png"
        },
        {
            title: "Besties",
            description: "How do you even manage this??? (5 Years)",
            requirement: 1826.25,
            iconSrc: "https://equicord.org/assets/plugins/friendshipRanks/besties.png"
        }
    ];

function openRankModal(rank: rankInfo) {
    openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.DYNAMIC}>
                <ModalHeader>
                    <Flex className={cl("flex")}>
                        <Forms.FormTitle
                            className={cl("img")}
                            tag="h2"
                        >
                            <img src={rank.iconSrc} alt="rank icon" />
                            {rank.title}
                        </Forms.FormTitle>
                    </Flex>
                </ModalHeader>
                <ModalContent>
                    <div className={cl("text")}>
                        <Paragraph>
                            {rank.description}
                        </Paragraph>
                    </div>
                </ModalContent>
            </ModalRoot>
        </ErrorBoundary >
    ));
}

function shouldShowBadge(userId: string, requirement: number, index: number) {
    if (!RelationshipStore.isFriend(userId)) return false;

    const days = daysSince(RelationshipStore.getSince(userId));

    if (ranks[index + 1] == null) return days > requirement;

    return (days > requirement && days < ranks[index + 1].requirement);
}

function getBadgesToApply() {
    const badgesToApply: ProfileBadge[] = ranks.map((rank, index) => {
        return ({
            description: rank.title,
            iconSrc: rank.iconSrc,
            position: BadgePosition.END,
            onClick: () => openRankModal(rank),
            shouldShow: (info: BadgeUserArgs) => shouldShowBadge(info.userId, rank.requirement, index),
            props: {
                style: {
                    borderRadius: "50%",
                    transform: "scale(0.9)"
                }
            },
        });
    });

    return badgesToApply;
}

export default definePlugin({
    name: "FriendshipRanks",
    description: "Adds badges showcasing how long you have been friends with a user for",
    authors: [Devs.Samwich],
    start() {
        getBadgesToApply().forEach(b => Badges.addProfileBadge(b));

    },
    stop() {
        getBadgesToApply().forEach(b => Badges.removeProfileBadge(b));
    },
});
