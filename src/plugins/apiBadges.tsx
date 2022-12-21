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

import { BadgePosition, ProfileBadge } from "@api/Badges";
import DonateButton from "@components/DonateButton";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Heart } from "@components/Heart";
import { Devs } from "@utils/constants";
import IpcEvents from "@utils/IpcEvents";
import Logger from "@utils/Logger";
import { closeModal, Modals, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Forms, Margins } from "@webpack/common";

const CONTRIBUTOR_BADGE = "https://media.discordapp.net/stickers/1026517526106087454.webp";

/** List of vencord contributor IDs */
const contributorIds: string[] = Object.values(Devs).map(d => d.id.toString());

const ContributorBadge: ProfileBadge = {
    tooltip: "Vencord Contributor",
    image: CONTRIBUTOR_BADGE,
    position: BadgePosition.START,
    props: {
        style: {
            borderRadius: "50%",
            transform: "scale(0.9)" // The image is a bit too big compared to default badges
        }
    },
    shouldShow: ({ user }) => contributorIds.includes(user.id),
    onClick: () => VencordNative.ipc.invoke(IpcEvents.OPEN_EXTERNAL, "https://github.com/Vendicated/Vencord")
};

const DonorBadges = {} as Record<string, Pick<ProfileBadge, "image" | "tooltip">>;

export default definePlugin({
    name: "BadgeAPI",
    description: "API to add badges to users.",
    authors: [Devs.Megu],
    required: true,
    patches: [
        /* Patch the badges array */
        {
            find: "PREMIUM_GUILD_SUBSCRIPTION_TOOLTIP.format({date:",
            replacement: {
                match: /&&((\w{1,3})\.push\({tooltip:\w{1,3}\.\w{1,3}\.Messages\.PREMIUM_GUILD_SUBSCRIPTION_TOOLTIP\.format.+?;)(?:return\s\w{1,3};?})/,
                replace: (_, m, badgeArray) => `&&${m} return Vencord.Api.Badges.inject(${badgeArray}, arguments[0]);}`,
            }
        },
        /* Patch the badge list component on user profiles */
        {
            find: "Messages.PROFILE_USER_BADGES,role:",
            replacement: [
                {
                    match: /src:(\w{1,3})\[(\w{1,3})\.key\],/,
                    // <img src={badge.image ?? imageMap[badge.key]} {...badge.props} />
                    replace: (_, imageMap, badge) => `src: ${badge}.image ?? ${imageMap}[${badge}.key], ...${badge}.props,`
                },
                {
                    match: /spacing:(\d{1,2}),children:(.{1,40}(.{1,2})\.jsx.+(.{1,2})\.onClick.+\)})},/,
                    // if the badge provides it's own component, render that instead of an image
                    // the badge also includes info about the user that has it (type BadgeUserArgs), which is why it's passed as props
                    replace: (_, s, origBadgeComponent, React, badge) =>
                        `spacing:${s},children:${badge}.component ? () => (0,${React}.jsx)(${badge}.component, { ...${badge} }) : ${origBadgeComponent}},`
                }
            ]
        }
    ],

    async start() {
        Vencord.Api.Badges.addBadge(ContributorBadge);
        const badges = await fetch("https://gist.githubusercontent.com/Vendicated/51a3dd775f6920429ec6e9b735ca7f01/raw/badges.csv").then(r => r.text());
        const lines = badges.trim().split("\n");
        if (lines.shift() !== "id,tooltip,image") {
            new Logger("BadgeAPI").error("Invalid badges.csv file!");
            return;
        }
        for (const line of lines) {
            const [id, tooltip, image] = line.split(",");
            DonorBadges[id] = { image, tooltip };
        }
    },

    addDonorBadge(badges: ProfileBadge[], userId: string) {
        const badge = DonorBadges[userId];
        if (badge) {
            badges.unshift({
                ...badge,
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
                            VencordNative.ipc.invoke(IpcEvents.OPEN_EXTERNAL, "https://github.com/sponsors/Vendicated");
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
                                        <Forms.FormText className={Margins.marginTop20}>
                                            Please consider supporting the development of Vencord by becoming a donor. It would mean a lot!!
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
            });
        }
    }
});
