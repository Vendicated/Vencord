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
import { GuildMemberStore, GuildStore, UserStore } from "@webpack/common";
import { User } from "discord-types/general/index.js";
import React from "react";

let registered: ProfileBadge[] = [];


interface ScyyeBadge {
    image: string;
    shouldShow(info: BadgeUserArgs): boolean;
}

function badge(key: string, badge: ScyyeBadge, position: BadgePosition = BadgePosition.START, link: string = "",
    onClick: () => void = () => {}) {
    const b: ProfileBadge = new class implements ProfileBadge {
        component: React.ComponentType<ProfileBadge & BadgeUserArgs> | undefined;
        description: string | undefined;
        image: string | undefined;
        key: string | undefined;
        link: string | undefined;
        position: BadgePosition | undefined;
        props: React.HTMLProps<HTMLImageElement> | undefined;

        onClick(): void {
            onClick();
        }

        shouldShow(userInfo: BadgeUserArgs): boolean {
            return badge.shouldShow(userInfo);
        }
    };

    b.key = key;
    b.image = badge.image;
    b.description = format(key);
    b.link = link;
    b.position = position;

    Badges.addBadge(badge);
    registered.push(badge);
}

function format(id: string) {
    let result = "";
    let startOfWord = true;
    for (const c of id) {
        if (c === "_") {
            startOfWord = true;
            result += " ";
        } else if (startOfWord) {
            result += c.toUpperCase();
            startOfWord = false;
        } else {
            result += c;
        }
    }
    return result;
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
        image: "https://i.imgur.com/u8fTrP9.png",
        shouldShow(userInfo: BadgeUserArgs): boolean {
            return userInfo.userId==="553652308295155723";
        }
    });
    badge("in_my_DM_server", {
        image: GuildStore.getGuild("1116093904266211358").getIconURL(500, true),
        shouldShow(userInfo: BadgeUserArgs): boolean {
            return GuildMemberStore.isMember("1116093904266211358", userInfo.userId);
        }
    });
    badge("root", {
        image: UserStore.getUser("318902553024659456").getAvatarURL(),
        shouldShow(userInfo: BadgeUserArgs): boolean {
            const user: User = UserStore.getUser(userInfo.userId);
            return (user.globalName??user.username).includes("』");
        }
    });
    badge("card_creator", {
        image: "https://cdn.discordapp.com/role-icons/945402769525858355/e95ef5364010c2ff97e3dcce45b9aa80.webp?size=24&quality=lossless",
        shouldShow(userInfo: BadgeUserArgs): boolean {
            return GuildMemberStore.isMember("844974450927730738", userInfo.userId)
            && GuildMemberStore.getMember("844974450927730738", userInfo.userId).roles.includes("945402769525858355");
        }
    });
}

