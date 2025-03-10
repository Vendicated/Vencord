/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./fixDiscordBadgePadding.css";
import "./badgeModal.css";

import { _getBadges, BadgePosition, BadgeUserArgs, ProfileBadge } from "@api/Badges";
import DonateButton from "@components/DonateButton";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Heart } from "@components/Heart";
import { Link } from "@components/Link";
import { openContributorModal } from "@components/PluginSettings/ContributorModal";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { isPluginDev } from "@utils/misc";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Forms, Toasts, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

import { NxSpark } from "./NxSpark";


const CONTRIBUTOR_BADGE = "https://github.com/Nexulien/assets/blob/main/badges/contributor.png?raw=true";

const ContributorBadge: ProfileBadge = {
    description: "Nexulien Contributor",
    image: CONTRIBUTOR_BADGE,
    position: BadgePosition.START,
    shouldShow: ({ userId }) => isPluginDev(userId),
    onClick: (_, { userId }) => openContributorModal(UserStore.getUser(userId))
};


let DonorBadges = {} as Record<string, Array<Record<"tooltip" | "badge", string>>>;
let NexulienBadges = {} as Record<string, Array<Record<"tooltip" | "badge", string>>>;
let ActiveUserBadges = { users: [] as Array<{ name: string, user: string; }> };

async function loadBadges(noCache = false) {
    DonorBadges = {};
    NexulienBadges = {};
    ActiveUserBadges = { users: [] };

    const init = {} as RequestInit;
    if (noCache)
        init.cache = "no-cache";

    NexulienBadges = await fetch("https://raw.githubusercontent.com/Nexulien/assets/main/badges.json", init)
        .then(r => r.json());

    DonorBadges = await fetch("https://badges.vencord.dev/badges.json", init)
        .then(r => r.json());

    ActiveUserBadges = await fetch("https://api.zoid.one/nexulien/users", init)
        .then(r => r.json());
}

export default definePlugin({
    name: "BadgeAPI",
    description: "API to add badges to users.",
    authors: [Devs.Megu, Devs.Ven, Devs.TheSun],
    required: true,
    patches: [
        {
            find: ".FULL_SIZE]:26",
            replacement: {
                match: /(?=;return 0===(\i)\.length\?)(?<=(\i)\.useMemo.+?)/,
                replace: ";$1=$2.useMemo(()=>[...$self.getBadges(arguments[0].displayProfile),...$1],[$1])"
            }
        },
        {
            find: "#{intl::PROFILE_USER_BADGES}",
            replacement: [
                {
                    match: /(alt:" ","aria-hidden":!0,src:)(.{0,20}(\i)\.icon\))/,
                    replace: (_, rest, originalSrc, badge) => `...${badge}.props,${rest}${badge}.image??(${originalSrc})`
                },
                {
                    match: /(?<="aria-label":(\i)\.description,.{0,200})children:/,
                    replace: "children:$1.component?$self.renderBadgeComponent({...$1}) :"
                },
                // conditionally override their onClick with badge.onClick if it exists
                {
                    match: /href:(\i)\.link/,
                    replace: "...($1.onClick&&{onClick:vcE=>$1.onClick(vcE,$1)}),$&"
                }
            ]
        }
    ],

    toolboxActions: {
        async "Refetch Badges"() {
            await loadBadges(true);
            Toasts.show({
                id: Toasts.genId(),
                message: "Successfully refetched badges!",
                type: Toasts.Type.SUCCESS
            });
        }
    },

    userProfileBadge: ContributorBadge,

    async start() {
        await loadBadges();
    },

    getBadges(props: { userId: string; user?: User; guildId: string; }) {
        if (!props) return [];

        try {
            props.userId ??= props.user?.id!;

            return _getBadges(props);
        } catch (e) {
            new Logger("BadgeAPI#hasBadges").error(e);
            return [];
        }
    },

    renderBadgeComponent: ErrorBoundary.wrap((badge: ProfileBadge & BadgeUserArgs) => {
        const Component = badge.component!;
        return <Component {...badge} />;
    }, { noop: true }),


    getDonorBadges(userId: string) {
        if (userId !== "343383572805058560") {
            return DonorBadges[userId]?.map(badge => ({
                image: badge.badge,
                description: badge.tooltip,
                position: BadgePosition.START,
                props: {
                    style: {
                        borderRadius: "50%",
                        transform: "scale(0.9)" // The image is a bit too big compared to default badges
                    }
                },
                onClick() {
                    const modalKey = openModal(props => (
                        <ErrorBoundary noop onError={() => {
                            closeModal(modalKey);
                            VencordNative.native.openExternal("https://github.com/sponsors/Vendicated");
                        }}>
                            <ModalRoot {...props}>
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
                                            <Heart />
                                            Vencord Donor
                                        </Forms.FormTitle>
                                    </Flex>
                                </ModalHeader>
                                <ModalContent className={Margins.bottom16}>
                                    <div className="nx-badge-modal-header">
                                        <span className="nx-badge-modal-badge yucky-vencord">
                                            <img src={badge.badge} draggable="false"></img>
                                        </span>
                                        <div>
                                            <Forms.FormTitle
                                                tag="h1"
                                                style={{
                                                    margin: 0
                                                }}
                                            >
                                                {badge.tooltip}
                                            </Forms.FormTitle>
                                            <Forms.FormText>
                                                This Badge was given to this user as a special perk for Vencord Donors.
                                            </Forms.FormText>
                                        </div>
                                    </div>
                                    <div className="nx-badge-modal-description">
                                        <Forms.FormText>
                                            Please consider supporting the development of Vencord by becoming a donor. It would mean a lot to them!
                                        </Forms.FormText>
                                    </div>
                                </ModalContent>
                                <ModalFooter>
                                    <Flex style={{ width: "100%", justifyContent: "center" }}>
                                        <DonateButton />
                                    </Flex>
                                </ModalFooter>
                            </ModalRoot>
                        </ErrorBoundary>
                    ));
                },
            }));
        }
    },

    getNexulienBadges(userId: string) {
        return NexulienBadges[userId]?.map(badge => ({
            image: badge.badge,
            description: badge.tooltip,
            position: BadgePosition.START,
            props: {
                style: {
                    borderRadius: "50%",
                    transform: "scale(0.9)" // The image is a bit too big compared to default badges
                }
            },
            onClick() {
                const modalKey = openModal(props => (
                    <ErrorBoundary noop onError={() => {
                        closeModal(modalKey);
                        VencordNative.native.openExternal("https://github.com/Nexulien/assets/blob/main/badges.json");
                    }}>
                        <ModalRoot {...props}>
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
                                        Special Badge
                                    </Forms.FormTitle>
                                </Flex>
                            </ModalHeader>
                            <ModalContent className={Margins.bottom16}>
                                <div className="nx-badge-modal-header">
                                    <span className="nx-badge-modal-badge">
                                        <img src={badge.badge} draggable="false"></img>
                                    </span>
                                    <div>
                                        <Forms.FormTitle
                                            tag="h1"
                                            style={{
                                                margin: 0
                                            }}
                                        >
                                            {badge.tooltip} <NxSpark />
                                        </Forms.FormTitle>
                                        <Forms.FormText>
                                            This Badge was granted to this user by the owner of Nexulien.
                                        </Forms.FormText>
                                    </div>
                                </div>
                                <div className="nx-badge-modal-description">
                                    <Forms.FormText>
                                        Currently the only way to get one is by asking @thezoidmaster, or getting a PR accepted in the assets repo.
                                    </Forms.FormText>
                                </div>
                            </ModalContent>
                            <ModalFooter>
                                <Flex style={{ width: "100%", justifyContent: "center" }}>
                                    <Forms.FormText>
                                        <Link href="https://github.com/Nexulien/assets">Visit the assets repo</Link>
                                    </Forms.FormText>
                                </Flex>
                            </ModalFooter>
                        </ModalRoot>
                    </ErrorBoundary>
                ));
            },
        }));
    },

    getActiveUserBadges(userId: string) {
        var badge = {
            image: "https://github.com/Nexulien/Assets/blob/main/badges/active_user.png?raw=true",
            description: "Active Nexulien User",
            position: BadgePosition.START,
            props: {
                style: {
                    borderRadius: "50%",
                    transform: "scale(0.9)" // The image is a bit too big compared to default badges
                }
            }
        };
        return Object.entries(ActiveUserBadges.users).some(([_, usernames]) => usernames.user.includes(userId)) ? [badge] : [];
    }
});
