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

import { BadgePosition, ProfileBadge } from "../api/Badges";
import { Flex } from "../components/Flex";
import { Devs } from "../utils/constants";
import IpcEvents from "../utils/IpcEvents";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModalLazy } from "../utils/modal";
import definePlugin from "../utils/types";
import { Button, Text } from "../webpack/common";

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
    onClick: () => {
        openModalLazy(async () => {
            return modalProps => {
                function openGithub() {
                    VencordNative.ipc.invoke(IpcEvents.OPEN_EXTERNAL, "https://github.com/Vendicated/Vencord");
                    modalProps.onClose();
                }
                return (
                    <ModalRoot {...modalProps} size={ModalSize.SMALL}>
                        <ModalHeader>
                            <Text variant="heading-md/bold">Vencord Contributor</Text>
                        </ModalHeader>
                        <ModalContent>
                            <div style={{ padding: "10px 0" }}>
                                <Text variant="text-md/normal">This user is a Vencord contributor!</Text>
                                <Text variant="text-md/normal">To learn how you can contribute to Vencord, visit our GitHub repo!</Text>
                            </div>
                        </ModalContent>
                        <ModalFooter>
                            <Flex style={{ gap: 6 }}>
                                <Button onClick={openGithub}>Visit GitHub</Button>
                                <Button onClick={modalProps.onClose}>Close</Button>
                            </Flex>
                        </ModalFooter>
                    </ModalRoot >
                );
            };
        });
    }
};

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
            replacement: {
                match: /src:(\w{1,3})\[(\w{1,3})\.key\],/,
                // <img src={badge.image ?? imageMap[badge.key]} {...badge.props} />
                replace: (_, imageMap, badge) => `src: ${badge}.image ?? ${imageMap}[${badge}.key], ...${badge}.props,`
            }
        }
    ],
    start() {
        Vencord.Api.Badges.addBadge(ContributorBadge);
    },
});
