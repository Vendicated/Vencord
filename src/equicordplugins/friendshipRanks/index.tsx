/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BadgeUserArgs, ProfileBadge } from "@api/Badges";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Flex, Forms, RelationshipStore } from "@webpack/common";

import { bestiesIcon, bloomingIcon, burningIcon, fighterIcon, royalIcon, sproutIcon, starIcon } from "./icons";

interface rankInfo {
    title: string;
    description: string;
    requirement: number;
    assetSVG: any;
}

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
            assetSVG: sproutIcon
        },
        {
            title: "Blooming",
            description: "Your friendship is getting there! (1 Month)",
            requirement: 30,
            assetSVG: bloomingIcon
        },
        {
            title: "Burning",
            description: "Your friendship has reached terminal velocity (3 Months)",
            requirement: 90,
            assetSVG: burningIcon
        },
        {
            title: "Fighter",
            description: "Your friendship is strong (6 Months)",
            requirement: 182.5,
            assetSVG: fighterIcon
        },
        {
            title: "Star",
            description: "Your friendship has been going on for a WHILE (1 Year)",
            requirement: 365,
            assetSVG: starIcon
        },
        {
            title: "Royal",
            description: "Your friendship has gone through thick and thin- a whole 2 years!",
            requirement: 730,
            assetSVG: royalIcon
        },
        {
            title: "Besties",
            description: "How do you even manage this??? (5 Years)",
            requirement: 1826.25,
            assetSVG: bestiesIcon
        }
    ];

function openRankModal(rank: rankInfo) {
    openModal(props => (
        <ErrorBoundary>
            <ModalRoot {...props} size={ModalSize.DYNAMIC}>
                <ModalHeader>
                    <Flex style={{ width: "100%", justifyContent: "center" }}>
                        <Forms.FormTitle
                            tag="h2"
                            style={{
                                width: "100%",
                                textAlign: "center",
                                margin: 0
                            }}
                        >
                            {rank.title}
                        </Forms.FormTitle>
                    </Flex>
                </ModalHeader>
                <ModalContent>
                    <div style={{ padding: "1em", textAlign: "center" }}>
                        <rank.assetSVG height="150px"></rank.assetSVG>
                        <Forms.FormText className={Margins.top16}>
                            {rank.description}
                        </Forms.FormText>
                    </div>
                </ModalContent>
            </ModalRoot>
        </ErrorBoundary >
    ));
}

function getBadgeComponent(rank,) {
    // there may be a better button component to do this with
    return (
        <div style={{ transform: "scale(0.80)" }}>
            <Button onClick={() => openRankModal(rank)} width={"21.69px"} height={"21.69px"} size={Button.Sizes.NONE} look={Button.Looks.BLANK}>
                <rank.assetSVG height={"21.69px"} />
            </Button>
        </div>
    );
}

function getBadgesToApply() {
    const badgesToApply: ProfileBadge[] = ranks.map((rank, index, self) => {
        return (
            {
                description: rank.title,
                component: () => getBadgeComponent(rank),
                shouldShow: (info: BadgeUserArgs) => {
                    if (!RelationshipStore.isFriend(info.userId)) { return false; }

                    const days = daysSince(RelationshipStore.getSince(info.userId));

                    if (self[index + 1] == null) {
                        return days > rank.requirement;
                    }

                    return (days > rank.requirement && days < self[index + 1].requirement);
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
        getBadgesToApply().forEach(thing => Vencord.Api.Badges.addProfileBadge(thing));

    },
    stop() {
        getBadgesToApply().forEach(thing => Vencord.Api.Badges.removeProfileBadge(thing));
    },
});
