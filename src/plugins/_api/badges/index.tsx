/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@plugins/_api/badges/fixDiscordBadgePadding.css";

import { _getBadges, addProfileBadge, BadgePosition, BadgeUserArgs, ProfileBadge } from "@api/Badges";
import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Heart } from "@components/Heart";
import { Paragraph } from "@components/Paragraph";
import DonateButton from "@components/settings/DonateButton";
import { openContributorModal } from "@components/settings/tabs";
import { Devs, EAGLECORD_ICON_IMAGE, OWNER_BADGE } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { shouldShowContributorBadge } from "@utils/misc";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { ContextMenuApi, Menu, Toasts, UserStore } from "@webpack/common";

const ContributorBadge: ProfileBadge = {
    description: "Vencord Contributor",
    iconSrc: EAGLECORD_ICON_IMAGE,
    position: BadgePosition.START,
    shouldShow: ({ userId }) => shouldShowContributorBadge(userId),
    onClick: (_, { userId }) => openContributorModal(UserStore.getUser(userId))
};

const EagleCordAdminBadge: ProfileBadge = {
    description: "Owner",
    iconSrc: OWNER_BADGE,
    position: BadgePosition.END,
    shouldShow: ({ userId }) => ["893759402832699392"].includes(userId),
    onClick: () => openEaglePage(),
};

function openEaglePage() {
    VencordNative.native.openExternal("https://www.prodbyeagle.dev/").then(r => console.log(r));
}

let DonorBadges = {} as Record<string, Array<Record<"tooltip" | "badge", string>>>;
let EagleBadges = {} as Record<string, Array<Record<"tooltip" | "badge", string>>>;

async function loadBadges(noCache = false) {
    const init = {} as RequestInit;
    if (noCache)
        init.cache = "no-cache";

    DonorBadges = await fetch("https://badges.vencord.dev/badges.json", init)
        .then(r => r.json());

    EagleBadges = await fetch("https://raw.githubusercontent.com/prodbyeagle/dotfiles/refs/heads/main/Vencord/eagleCord/badges.json", init)
        .then(r => r.json());

    addProfileBadge(EagleCordAdminBadge);
}

let intervalId: any;

function BadgeContextMenu({ badge }: { badge: ProfileBadge & BadgeUserArgs; }) {
    return (
        <Menu.Menu
            navId="vc-badge-context"
            onClose={ContextMenuApi.closeContextMenu}
            aria-label="Badge Options"
        >
            {badge.description && (
                <Menu.MenuItem
                    id="vc-badge-copy-name"
                    label="Copy Badge Name"
                    action={() => copyWithToast(badge.description!)}
                />
            )}
            {badge.iconSrc && (
                <Menu.MenuItem
                    id="vc-badge-copy-link"
                    label="Copy Badge Image Link"
                    action={() => copyWithToast(badge.iconSrc!)}
                />
            )}
        </Menu.Menu>
    );
}

export default definePlugin({
    name: "BadgeAPI",
    description: "API to add badges to users. (modded by prodbyeagle)",
    authors: [Devs.Megu, Devs.Ven, Devs.TheSun, Devs.Eagle],
    required: true,
    patches: [
        {
            find: "#{intl::PROFILE_USER_BADGES}",
            replacement: [
                {
                    match: /(?<=\{[^}]*?)badges:\i(?=[^}]*?}=(\i))/,
                    replace: "_$&=$self.useBadges($1.displayProfile).concat($1.badges)"
                },
                {
                    match: /alt:" ","aria-hidden":!0,src:.{0,50}(\i).iconSrc/,
                    replace: "...$1.props,$&"
                },
                {
                    match: /(?<="aria-label":(\i)\.description,.{0,200}?)children:/g,
                    replace: "children:$1.component?$self.renderBadgeComponent({...$1}) :"
                },
                // handle onClick and onContextMenu
                {
                    match: /href:(\i)\.link/,
                    replace: "...$self.getBadgeMouseEventHandlers($1),$&"
                }
            ]
        }
    ],

    // for access from the console or other plugins
    get DonorBadges() {
        return DonorBadges;
    },

    // for access from the console or other plugins
    get EagleBadges() {
        return EagleBadges;
    },

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

        clearInterval(intervalId);
        intervalId = setInterval(loadBadges, 1000 * 60 * 30); // 30 minutes
    },

    async stop() {
        clearInterval(intervalId);
    },

    // doesn't use hooks itself, but some plugins might do so in their getBadges function
    useBadges(profile: { userId: string; guildId: string; }) {
        if (!profile) return [];

        try {
            return _getBadges(profile);
        } catch (e) {
            new Logger("BadgeAPI#useBadges").error(e);
            return [];
        }
    },

    renderBadgeComponent: ErrorBoundary.wrap((badge: ProfileBadge & BadgeUserArgs) => {
        const Component = badge.component!;
        return <Component {...badge} />;
    }, { noop: true }),


    getBadgeMouseEventHandlers(badge: ProfileBadge & BadgeUserArgs) {
        const handlers = {} as Record<string, (e: React.MouseEvent) => void>;

        if (!badge) return handlers; // sanity check

        const { onClick, onContextMenu } = badge;

        if (onClick) handlers.onClick = e => onClick(e, badge);
        if (onContextMenu) handlers.onContextMenu = e => onContextMenu(e, badge);

        return handlers;
    },


    getDonorBadges(userId: string) {
        return DonorBadges[userId]?.map(badge => ({
            iconSrc: badge.badge,
            description: badge.tooltip,
            position: BadgePosition.START,
            props: {
                style: {
                    borderRadius: "50%",
                    transform: "scale(0.9)" // The image is a bit too big compared to default badges
                }
            },
            onContextMenu(event, badge) {
                ContextMenuApi.openContextMenu(event, () => <BadgeContextMenu badge={badge} />);
            },
            onClick() {
                const modalKey = openModal(props => (
                    <ErrorBoundary noop onError={() => {
                        closeModal(modalKey);
                        VencordNative.native.openExternal("https://github.com/sponsors/Vendicated").then(r => console.error(r));
                    }}>
                        <ModalRoot {...props}>
                            <ModalHeader>
                                <Heading
                                    tag="h2"
                                    style={{
                                        width: "100%",
                                        textAlign: "center",
                                        margin: 0
                                    }}
                                >
                                    <Flex justifyContent="center" alignItems="center" gap="0.5em">
                                        <Heart />
                                        Vencord Donor
                                    </Flex>
                                </Heading>
                            </ModalHeader>
                            <ModalContent>
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
                                    <Paragraph>
                                        This Badge is a special perk for Vencord Donors
                                    </Paragraph>
                                    <Paragraph className={Margins.top20}>
                                        Please consider supporting the development of Vencord by becoming a donor. It would mean a lot!!
                                    </Paragraph>
                                </div>
                            </ModalContent>
                            <ModalFooter>
                                <Flex justifyContent="center" style={{ width: "100%" }}>
                                    <DonateButton />
                                </Flex>
                            </ModalFooter>
                        </ModalRoot>
                    </ErrorBoundary>
                ));
            },
        } satisfies ProfileBadge));
    },

    getEagleCordBadges(userId: string) {
        return EagleBadges[userId]?.map(badge => ({
            iconSrc: badge.badge,
            description: badge.tooltip,
            position: BadgePosition.START,
            props: {
                style: {
                    borderRadius: "50%",
                    transform: "scale(0.9)" // The image is a bit too big compared to default badges
                }
            },
            onContextMenu(event, badge) {
                ContextMenuApi.openContextMenu(event, () => <BadgeContextMenu badge={badge} />);
            },
            onClick() {
                openModal(props => (
                    <ModalRoot {...props} size={ModalSize.SMALL} aria-label="EagleCord Badge">
                        <ModalHeader separator>
                            <Flex justifyContent="center" alignItems="center" style={{ width: "100%" }}>
                                <Heading tag="h2">
                                    🦅 EagleCord Badge
                                </Heading>
                            </Flex>
                        </ModalHeader>

                        <ModalContent>
                            <Flex
                                flexDirection="column"
                                alignItems="center"
                                gap="0.75em"
                                style={{ textAlign: "center", padding: "0.5em 0" }}
                            >
                                <img
                                    src={badge.badge}
                                    alt={badge.tooltip}
                                    style={{
                                        width: 128,
                                        height: 128,
                                        borderRadius: "50%",
                                    }}
                                />

                                <Heading tag="h3" style={{ wordBreak: "break-word" }}>
                                    {badge.tooltip}
                                </Heading>

                                <BaseText style={{ opacity: 0.85, maxWidth: 420 }}>
                                    This is a <strong>custom EagleCord badge</strong> assigned to this user.
                                    Badge text and imagery are entirely user-defined and may be ironic,
                                    humorous, or personal in nature.
                                </BaseText>

                                <BaseText style={{ fontSize: "0.85em", opacity: 0.6 }}>
                                    Issued via EagleCord • Not an official Discord badge
                                </BaseText>
                            </Flex>
                        </ModalContent>
                    </ModalRoot>
                ));
            },
        }) satisfies ProfileBadge);
    }
});
