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
            iconSrc: "https://cdn.nest.rip/uploads/82a1b1b8-4ef1-4f2e-b206-1a73f03ce54f.png"
        },
        {
            title: "Blooming",
            description: "Your friendship is getting there! (1 Month)",
            requirement: 30,
            iconSrc: "https://cdn.nest.rip/uploads/6402fbb7-1124-4d3e-bf7f-dd96a7a60457.png"
        },
        {
            title: "Burning",
            description: "Your friendship has reached terminal velocity (3 Months)",
            requirement: 90,
            iconSrc: "https://cdn.nest.rip/uploads/aa4ad55c-0f2c-460e-8b09-7332ef1764e2.png"
        },
        {
            title: "Fighter",
            description: "Your friendship is strong (6 Months)",
            requirement: 182.5,
            iconSrc: "https://cdn.nest.rip/uploads/04b0b774-6157-40ad-a57d-908dca804f6d.png"
        },
        {
            title: "Star",
            description: "Your friendship has been going on for a WHILE (1 Year)",
            requirement: 365,
            iconSrc: "https://cdn.nest.rip/uploads/63c7e792-4ff1-44c9-9c61-d8dd7ebea040.png"
        },
        {
            title: "Royal",
            description: "Your friendship has gone through thick and thin- a whole 2 years!",
            requirement: 730,
            iconSrc: "https://cdn.nest.rip/uploads/4b05772b-419a-41a4-bf43-fccda1a35e20.png"
        },
        {
            title: "Besties",
            description: "How do you even manage this??? (5 Years)",
            requirement: 1826.25,
            iconSrc: "https://cdn.nest.rip/uploads/9418629c-04c7-40fe-a5b8-039de27a94d1.png"
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
