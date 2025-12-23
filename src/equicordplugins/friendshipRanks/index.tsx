/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { BadgeUserArgs, ProfileBadge } from "@api/Badges";
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
            iconSrc: "https://images.equicord.org/api/files/raw/019b494c-e995-7005-8964-c21f69c5af1f"
        },
        {
            title: "Blooming",
            description: "Your friendship is getting there! (1 Month)",
            requirement: 30,
            iconSrc: "https://images.equicord.org/api/files/raw/019b494c-e995-7001-a9ea-9c24268bf34e"
        },
        {
            title: "Burning",
            description: "Your friendship has reached terminal velocity (3 Months)",
            requirement: 90,
            iconSrc: "https://images.equicord.org/api/files/raw/019b494c-e995-7002-96d6-70c91b2e2979"
        },
        {
            title: "Fighter",
            description: "Your friendship is strong (6 Months)",
            requirement: 182.5,
            iconSrc: "https://images.equicord.org/api/files/raw/019b494c-e995-7003-a48c-4208802fa00d"
        },
        {
            title: "Star",
            description: "Your friendship has been going on for a WHILE (1 Year)",
            requirement: 365,
            iconSrc: "https://images.equicord.org/api/files/raw/019b494c-e995-7006-81d6-8cec81991bad"
        },
        {
            title: "Royal",
            description: "Your friendship has gone through thick and thin- a whole 2 years!",
            requirement: 730,
            iconSrc: "https://images.equicord.org/api/files/raw/019b494c-e995-7004-9f94-a81b66b5db30"
        },
        {
            title: "Besties",
            description: "How do you even manage this??? (5 Years)",
            requirement: 1826.25,
            iconSrc: "https://images.equicord.org/api/files/raw/019b494c-e995-7000-84e2-2c310a8fc730"
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
            onClick: () => openRankModal(rank),
            shouldShow: (info: BadgeUserArgs) => shouldShowBadge(info.userId, rank.requirement, index),
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
