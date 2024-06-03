/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
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

import { BadgePosition, BadgeUserArgs, ProfileBadge } from "@api/Badges";
import { Badges } from "@api/index";
import definePlugin from "@utils/types";
import { ChannelStore, GuildChannelStore, GuildMemberStore, GuildStore, UserStore } from "@webpack/common";
import { GuildMember } from "discord-types/general";
import React from "react";

var registered: ProfileBadge[] = [];

function badge(key: string, badge: Badge) {
    const b: ProfileBadge = new class implements ProfileBadge {
        component: React.ComponentType<ProfileBadge & BadgeUserArgs> | undefined;
        description: string | undefined;
        image: string | undefined;
        key: string | undefined;
        link: string | undefined;
        position: BadgePosition | undefined;
        props: React.HTMLProps<HTMLImageElement> | undefined;

        onClick(): void {
            badge?.onClick();
        }

        shouldShow(userInfo: BadgeUserArgs): boolean {
            return badge.shouldShow(userInfo);
        }
    };

    b.key = badge.key;
    b.image = badge.image;
    b.description = badge.description;
    b.link = badge.link;
    b.position = badge.position;

    if (b.position===undefined)
        b.position=BadgePosition.START;
    Badges.addBadge(badge);
    registered.push(badge);
}

class Badge {
    key: string | undefined;
    image: string | undefined;
    description: string | undefined;
    shouldShow(_: BadgeUserArgs): boolean {
        return false;
    }
    link: string | undefined;
    onClick(): void {}
    position: BadgePosition | undefined;
}

export default definePlugin({
    name: "Scyye Badges",
    description: "A set of badges by scyye",
    authors: [{ id: 553652308295155723n, name: "Scyye" }],
    start() {
        addScyyeBadges();
    },
    stop() {
        removeScyyeBadges();
    }
});

function removeScyyeBadges() {
    registered.forEach(b => {
        Badges.removeBadge(b);
    });
    registered = [];
}

function addScyyeBadges() {
    badge("scyye", {
        key: undefined, link: undefined, position: undefined, onClick(): void {
        },
        description: "Scyye",
        image: "https://i.imgur.com/u8fTrP9.png",
        shouldShow(userInfo: BadgeUserArgs): boolean {
            return userInfo.user.id==="553652308295155723";
        }
    });
    badge("scyye_dms", {
        key: undefined, link: undefined, position: undefined, onClick(): void {
        },
        description: "In my DM server",
        image: GuildStore.getGuild("1116093904266211358").getIconURL(500, true),
        shouldShow(userInfo: BadgeUserArgs): boolean {
            return GuildMemberStore.isMember("1116093904266211358", userInfo.user.id);
        }
    });
    badge("root", {
        key: undefined, link: undefined, position: undefined, onClick(): void {
        },
        description: "Root",
        image: UserStore.getUser("318902553024659456").getAvatarURL(),
        shouldShow(userInfo: BadgeUserArgs): boolean {
            // UserStore.getUser(userInfo.user.id);
            if ((userInfo.user as any).globalName === undefined || (userInfo.user as any).globalName === null) return false;
            return (userInfo.user as any).globalName.includes("』");
        }
    });
    badge("cc", {
        key: undefined, link: undefined, position: undefined, onClick(): void {
        },
        description: "Card Creator",
        image: "https://cdn.discordapp.com/role-icons/945402769525858355/e95ef5364010c2ff97e3dcce45b9aa80.webp?size=24&quality=lossless",
        shouldShow(userInfo: BadgeUserArgs): boolean {
            return GuildMemberStore.isMember("844974450927730738", userInfo.user.id)
            && GuildMemberStore.getMember("844974450927730738", userInfo.user.id).roles.includes("945402769525858355");
        }
    });
}

