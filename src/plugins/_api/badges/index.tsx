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

import { _getBadges, BadgePosition, BadgeRarity, BadgeUserArgs, DirectoryBadge, ProfileBadge } from "@api/Badges";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { Heading } from "@components/Heading";
import { Heart } from "@components/Heart";
import { CopyIcon, LinkIcon } from "@components/Icons";
import { Paragraph } from "@components/Paragraph";
import DonateButton from "@components/settings/DonateButton";
import { openContributorModal } from "@components/settings/tabs";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { Margins } from "@utils/margins";
import { shouldShowContributorBadge } from "@utils/misc";
import definePlugin from "@utils/types";
import { ContextMenuApi, Menu, Modal, openModal, showToast, UserStore } from "@webpack/common";

const ContributorBadge: ProfileBadge = {
    id: "vencord_contributor_badge",
    description: "Vencord Contributor",
    infoLabel: "Vencord",
    rarity: BadgeRarity.MYTHIC,
    iconSrc: "https://cdn.discordapp.com/emojis/1562267648857997356.webp?size=128",
    largeIconSrc: "https://cdn.discordapp.com/emojis/1562267648857997356.webp?size=512",
    position: BadgePosition.START,
    shouldShow: ({ userId }) => shouldShowContributorBadge(userId),
    onClick: (_, { userId }) => openContributorModal(UserStore.getUser(userId))
};



let DonorBadges = {} as Record<string, Array<Record<"tooltip" | "badge", string>>>;
let DirectoryBadges = {} as Record<string, DirectoryBadge>;

async function loadBadges(noCache = false) {
    const init = {} as RequestInit;
    if (noCache)
        init.cache = "no-cache";

    DonorBadges = await fetch("https://badges.vencord.dev/badges.json", init)
        .then(r => r.json());
}

let intervalId: any;

function toDirectoryBadge(b: ProfileBadge, userId: string): DirectoryBadge {
    const id = `vc-${userId}-${b.id}`;

    return DirectoryBadges[id] ??= {
        badge_id: id,
        name: b.name ?? b.description ?? "",
        description: b.detail ?? b.description ?? b.name ?? "",
        info_label: b.infoLabel ?? "Vencord",
        rarity: b.rarity ?? BadgeRarity.COMMON,
        simple_icon_url: b.iconSrc!,
        complex_icon_static_url: b.largeIconSrc ?? b.iconSrc!,
        obtained_at: b.obtainedAt,
        is_earnable: false,
        owned: true,
        hidden: false,
        tiers: []
    };
}

function BadgeContextMenu({ badge }: { badge: Omit<ProfileBadge, "id"> & BadgeUserArgs; }) {
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
                    leadingAccessory={{ type: "icon", icon: CopyIcon }}
                />
            )}
            {badge.iconSrc && (
                <Menu.MenuItem
                    id="vc-badge-copy-link"
                    label="Copy Badge Image Link"
                    action={() => copyWithToast(badge.iconSrc!)}
                    leadingAccessory={{ type: "icon", icon: LinkIcon }}
                />
            )}
        </Menu.Menu>
    );
}

export default definePlugin({
    name: "BadgeAPI",
    description: "API to add badges to users",
    authors: [Devs.Megu, Devs.Ven, Devs.TheSun, Devs.kaxtusik],
    required: true,
    patches: [
        {
            find: "#{intl::PROFILE_USER_BADGES}",
            replacement: [
                {
                    match: /alt:" ","aria-hidden":!0,src:.{0,50}(\i).iconSrc/,
                    replace: "...$1.props,$&"
                },
                // Path with 2026-04-badge-discovery OFF
                {
                    match: /(?<=forceOpen:.{0,40}?ariaHidden:!0,)children:(?=.{0,50}?(\i)\.id)/,
                    replace: "children:$1.component?$self.renderBadgeComponent({...$1}):"
                },
                // Path with 2026-04-badge-discovery ON
                {
                    match: /(?<=fallbackIconSrc:.{0,50}?)children:(?=.{0,50}?(\i)\.id)/,
                    replace: "children:$1.component?$self.renderBadgeComponent({...$1}):"
                },
                // handle onClick and onContextMenu
                {
                    match: /href:(\i)\.link/,
                    replace: "...$self.getBadgeMouseEventHandlers($1),$&"
                },
                {
                    match: /legacyBadgeId:(\i),userId:(\i),.{0,100}?=\i,\i=\(0,\i\.\i\)\(\1\)/,
                    replace: "$&??$self.getDirectoryBadgeId($1,$2)"
                }
            ]
        },
        {
            find: "getLegacyUsername(){",
            replacement: {
                match: /getBadges\(\)\{.{0,100}?return\[/,
                replace: "$&...$self.getBadges(this),"
            }
        },
        {
            find: '"BadgeDirectoryStore"',
            replacement: {
                match: /getBadgeById\((\i),(\i)\)\{/,
                replace: "$&const vencordBadge=$self.getDirectoryBadge($1);if(vencordBadge)return vencordBadge;"
            }
        },
        {
            find: "badge_directory_closed",
            replacement: {
                match: /(\i\.\i\.getBadges\((\i)\))(?=:\[\],\[\2\]\))/,
                replace: "[...$1,...$self.getDirectoryBadges($2)]"
            }
        }
    ],

    // for access from the console or other plugins
    get DonorBadges() {
        return DonorBadges;
    },

    toolboxActions: {
        async "Refetch Badges"() {
            await loadBadges(true);
            showToast({ text: "Successfully refetched badges!", variant: "success" });
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
        DirectoryBadges = {};
    },

    getBadges(profile: { userId: string; guildId: string; }) {
        if (!profile) return [];

        try {
            return _getBadges(profile);
        } catch (e) {
            new Logger("BadgeAPI#getBadges").error(e);
            return [];
        }
    },

    getDirectoryBadge(id: string) {
        return DirectoryBadges[id];
    },

    getDirectoryBadges(userId: string) {
        return this.getBadges({ userId, guildId: "" })
            .filter(b => b.iconSrc)
            .map(b => toDirectoryBadge(b, userId));
    },

    getDirectoryBadgeId(badgeId: string, userId?: string) {
        if (!userId) return;

        const badge = this.getBadges({ userId, guildId: "" })
            .find(b => b.id === badgeId && b.iconSrc);

        if (badge) return toDirectoryBadge(badge, userId).badge_id;
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
        return DonorBadges[userId]?.map((badge, idx) => ({
            id: `vencord_donor_badge_${idx}`,
            iconSrc: badge.badge,
            description: badge.tooltip,
            name: badge.tooltip,
            infoLabel: "Vencord Donor",
            rarity: BadgeRarity.MYTHIC,
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
                    <ErrorBoundary noop onError={() => {
                        props.onClose();
                        VencordNative.native.openExternal("https://github.com/sponsors/Vendicated");
                    }}>
                        <Modal
                            {...props}
                            title={
                                <Heading
                                    tag="h1"
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
                            }
                        >
                            <div>
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
                                        This badge is a special perk for Vencord Donors
                                    </Paragraph>
                                    <Paragraph className={Margins.top16}>
                                        Please consider supporting the development of Vencord by becoming a donor. It would mean a lot!!
                                    </Paragraph>
                                </div>
                            </div>
                            <div>
                                <Flex justifyContent="center" style={{ width: "100%" }}>
                                    <DonateButton variant="overlayPrimary" />
                                </Flex>
                            </div>
                        </Modal>
                    </ErrorBoundary>
                ));
            },
        } satisfies ProfileBadge));
    }
});
