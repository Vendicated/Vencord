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

import "./fixBadgeOverflow.css";

import { BadgePosition, BadgeUserArgs, ProfileBadge } from "@api/Badges";
import DonateButton from "@components/DonateButton";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Heart } from "@components/Heart";
import { openContributorModal } from "@components/PluginSettings/ContributorModal";
import { Devs } from "@utils/constants";
import { Margins } from "@utils/margins";
import { isEquicordPluginDev, isPluginDev } from "@utils/misc";
import { closeModal, Modals, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Forms, Toasts } from "@webpack/common";

const CONTRIBUTOR_BADGE = "https://vencord.dev/assets/favicon.png";
const EQUICORD_CONTRIBUTOR_BADGE = "https://i.imgur.com/rJDRtUB.png";

const ContributorBadge: ProfileBadge = {
    description: "Vencord Contributor",
    image: CONTRIBUTOR_BADGE,
    position: BadgePosition.START,
    shouldShow: ({ user }) => isPluginDev(user.id),
    onClick: (_, { user }) => openContributorModal(user)
};

const EquicordContributorBadge: ProfileBadge = {
    description: "Equicord Contributor",
    image: EQUICORD_CONTRIBUTOR_BADGE,
    position: BadgePosition.START,
    props: {
        style: {
            borderRadius: "50%",
            transform: "scale(0.9)" // The image is a bit too big compared to default badges
        }
    },
    shouldShow: ({ user }) => isEquicordPluginDev(user.id),
    link: "https://github.com/Equicord/Equicord"
};

let DonorBadges = {} as Record<string, Array<Record<"tooltip" | "badge", string>>>;
let EquicordDonorBadges = {} as Record<string, Array<Record<"tooltip" | "badge", string>>>;

async function loadBadges(url: string, noCache = false) {
    const init = {} as RequestInit;
    if (noCache) init.cache = "no-cache";

    return await fetch(url, init).then(r => r.json());
}

async function loadAllBadges(noCache = false) {
    const vencordBadges = await loadBadges("https://badges.vencord.dev/badges.json", noCache);
    const equicordBadges = await loadBadges("https://raw.githubusercontent.com/Equicord/Ignore/main/badges.json", noCache);

    DonorBadges = vencordBadges;
    EquicordDonorBadges = equicordBadges;
}


export default definePlugin({
    name: "BadgeAPI",
    description: "API to add badges to users.",
    authors: [Devs.Megu, Devs.Ven, Devs.TheSun],
    required: true,
    patches: [
        /* Patch the badge list component on user profiles */
        {
            find: 'id:"premium",',
            replacement: [
                {
                    match: /&&(\i)\.push\(\{id:"premium".+?\}\);/,
                    replace: "$&$1.unshift(...Vencord.Api.Badges._getBadges(arguments[0]));",
                },
                {
                    // alt: "", aria-hidden: false, src: originalSrc
                    match: /alt:" ","aria-hidden":!0,src:(?=(\i)\.src)/,
                    // ...badge.props, ..., src: badge.image ?? ...
                    replace: "...$1.props,$& $1.image??"
                },
                // replace their component with ours if applicable
                {
                    match: /(?<=text:(\i)\.description,spacing:12,.{0,50})children:/,
                    replace: "children:$1.component ? () => $self.renderBadgeComponent($1) :"
                },
                // conditionally override their onClick with badge.onClick if it exists
                {
                    match: /href:(\i)\.link/,
                    replace: "...($1.onClick && { onClick: vcE => $1.onClick(vcE, arguments[0]) }),$&"
                }
            ]
        }
    ],

    toolboxActions: {
        async "Refetch Badges"() {
            await loadAllBadges(true);
            Toasts.show({
                id: Toasts.genId(),
                message: "Successfully refetched badges!",
                type: Toasts.Type.SUCCESS
            });
        }
    },

    async start() {
        Vencord.Api.Badges.addBadge(ContributorBadge);
        Vencord.Api.Badges.addBadge(EquicordContributorBadge);
        await loadAllBadges();
    },

    renderBadgeComponent: ErrorBoundary.wrap((badge: ProfileBadge & BadgeUserArgs) => {
        const Component = badge.component!;
        return <Component {...badge} />;
    }, { noop: true }),


    getDonorBadges(userId: string) {
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
                        <Modals.ModalRoot {...props}>
                            <Modals.ModalHeader>
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
                            </Modals.ModalHeader>
                            <Modals.ModalContent>
                                <Flex>
                                    <img
                                        role="presentation"
                                        src="https://cdn.discordapp.com/emojis/1026533070955872337.png"
                                        alt=""
                                        style={{ margin: "auto" }}
                                    />
                                    <img
                                        role="presentation"
                                        src="https://cdn.discordapp.com/emojis/1026533090627174460.png"
                                        alt=""
                                        style={{ margin: "auto" }}
                                    />
                                </Flex>
                                <div style={{ padding: "1em" }}>
                                    <Forms.FormText>
                                        This Badge is a special perk for Vencord Donors
                                    </Forms.FormText>
                                    <Forms.FormText className={Margins.top20}>
                                        Please consider supporting the development of Vencord by becoming a donor. It would mean a lot!
                                    </Forms.FormText>
                                </div>
                            </Modals.ModalContent>
                            <Modals.ModalFooter>
                                <Flex style={{ width: "100%", justifyContent: "center" }}>
                                    <DonateButton />
                                </Flex>
                            </Modals.ModalFooter>
                        </Modals.ModalRoot>
                    </ErrorBoundary>
                ));
            },
        }));
    },

    getEquicordDonorBadges(userId: string) {
        return EquicordDonorBadges[userId]?.map(badge => ({
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
                        // Will get my own in the future
                        VencordNative.native.openExternal("https://github.com/sponsors/Vendicated");
                    }}>
                        <Modals.ModalRoot {...props}>
                            <Modals.ModalHeader>
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
                                        Equicord Donor
                                    </Forms.FormTitle>
                                </Flex>
                            </Modals.ModalHeader>
                            <Modals.ModalContent>
                                <Flex>
                                    <img
                                        role="presentation"
                                        src="https://cdn.discordapp.com/emojis/1026533070955872337.png"
                                        alt=""
                                        style={{ margin: "auto" }}
                                    />
                                    <img
                                        role="presentation"
                                        src="https://cdn.discordapp.com/emojis/1026533090627174460.png"
                                        alt=""
                                        style={{ margin: "auto" }}
                                    />
                                </Flex>
                                <div style={{ padding: "1em" }}>
                                    <Forms.FormText>
                                        This Badge is a special perk for Equicord Donors
                                    </Forms.FormText>
                                    <Forms.FormText className={Margins.top20}>
                                        Please consider supporting the development of Equicord by becoming a donor. It would mean a lot!!
                                    </Forms.FormText>
                                </div>
                            </Modals.ModalContent>
                            <Modals.ModalFooter>
                                <Flex style={{ width: "100%", justifyContent: "center" }}>
                                    <DonateButton />
                                </Flex>
                            </Modals.ModalFooter>
                        </Modals.ModalRoot>
                    </ErrorBoundary>
                ));
            },
        }));
    }
});
