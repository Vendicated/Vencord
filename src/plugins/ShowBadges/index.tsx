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

import { addDecoration, removeDecoration } from "@api/MessageDecorations";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { isPluginDev } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";

import BadgeApi from "../../plugins/_api/badges";

let RoleIconComponent: React.ComponentType<any> = () => null;
let roleIconClassName = "";

const discordBadges: readonly [number, string, string][] = Object.freeze([
    [0, "Discord Staff", "5e74e9b61934fc1f67c65515d1f7e60d"],
    [1, "Partnered Server Owner", "3f9748e53446a137a052f3454e2de41e"],
    [2, "HypeSquad Events", "bf01d1073931f921909045f3a39fd264"],
    [6, "HypeSquad Bravery", "8a88d63823d8a71cd5e390baa45efa02"],
    [7, "HypeSquad Brilliance", "011940fd013da3f7fb926e4a1cd2e618"],
    [8, "HypeSquad Balance", "3aa41de486fa12454c3761e8e223442e"],
    [3, "Discord Bug Hunter", "2717692c7dca7289b35297368a940dd0"],
    [14, "Discord Bug Hunter", "848f79194d4be5ff5f81505cbd0ce1e6"],
    [22, "Active Developer", "6bdc42827a38498929a4920da12695d9"],
    [17, "Early Verified Bot Developer", "6df5892e0f35b051f8b61eace34f4967"],
    [9, "Early Supporter", "7060786766c9c840eb3019e725d2b358"],
    [18, "Moderator Programs Alumni", "fee1624003e2fee35cb398e125dc479b"]
]);

function vencordDonorChatBadges(userID: string) {
    return [
        <span style={{ order: settings.store.VencordDonorBadgesPosition }}>
            {BadgeApi.getDonorBadges(userID)?.map(badge =>
                <RoleIconComponent
                    className={roleIconClassName}
                    name={badge.description}
                    size={20}
                    src={badge.image}
                />
            )}
        </span>
    ];
}

function vencordContributorChatBadge(userID: string) {
    return isPluginDev(userID) ? [
        <span style={{ order: settings.store.vencordContributorBadgePosition }}>
            <RoleIconComponent
                className={roleIconClassName}
                name={"Vencord Contributor"}
                size={20}
                src={"https://vencord.dev/assets/favicon.png"}
            />
        </span>
    ] : [];
}


function discordProfileChatBadges(userFlags: number) {
    const chatBadges = discordBadges.reduce((badges: JSX.Element[], curr) => {
        if ((userFlags & 1 << curr[0]) !== 0)
            badges.push(
                <RoleIconComponent
                    className={roleIconClassName}
                    name={curr[1]}
                    size={20}
                    src={`https://cdn.discordapp.com/badge-icons/${curr[2]}.png`}
                />
            );
        return badges;
    }, []);

    return chatBadges.length > 0 ? [
        <span style={{ order: settings.store.discordProfileBadgesPosition }}>
            {chatBadges}
        </span>
    ] : [];
}

function discordNitroChatBadge(userPremiumType: number) {
    return userPremiumType > 0 ? [
        <span style={{ order: settings.store.discordNitroBadgePosition }}>
            <RoleIconComponent
                className={roleIconClassName}
                name={"Discord Nitro" + (userPremiumType === 3 ? " Basic" : userPremiumType === 1 ? " Classic" : "")}
                size={20}
                src={"https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png"}
            />
        </span>
    ] : [];
}

function ChatBadges({ author }) {
    const chatBadges = [
        ...settings.store.showVencordDonorBadges ? vencordDonorChatBadges(author.id) : [],
        ...settings.store.showVencordContributorBadges ? vencordContributorChatBadge(author.id) : [],
        ...settings.store.showDiscordProfileBadges ? discordProfileChatBadges(author.flags || author.publicFlags) : [],
        ...settings.store.showDiscordNitroBadges ? discordNitroChatBadge(author.premiumType) : []
    ];

    return chatBadges.length > 0 ?
        <span style={{ display: "inline-flex", verticalAlign: "top" }}>
            {chatBadges}
        </span>
        : null;
}

const settings = definePluginSettings({
    showVencordDonorBadges: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Vencord donor badges in chat.",
        default: true
    },
    VencordDonorBadgesPosition: {
        type: OptionType.NUMBER,
        description: "The position of the Vencord Donor badges.",
        default: 0
    },
    showVencordContributorBadges: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Vencord contributor badges in chat.",
        default: true
    },
    vencordContributorBadgePosition: {
        type: OptionType.NUMBER,
        description: "The position of the Vencord Contributor badge.",
        default: 1
    },
    showDiscordProfileBadges: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Discord profile badges in chat.",
        default: true
    },
    discordProfileBadgesPosition: {
        type: OptionType.NUMBER,
        description: "The position of the Discord profile badges.",
        default: 2
    },
    showDiscordNitroBadges: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Discord Nitro badges in chat.",
        default: true
    },
    discordNitroBadgePosition: {
        type: OptionType.NUMBER,
        description: "The position of the Discord Nitro badge.",
        default: 3
    }
});

export default definePlugin({
    name: "ShowBadgesInChat",
    authors: [Devs.Shalev, Devs.fres, Devs.ryan, Devs.KrystalSkull],
    description: "Shows profile badges in chat. That includes built in Discord Badges. Also shows Vencord Contributor Badges and all Donor badges (more sources of badges to most likely come soon)",
    dependencies: ["MessageDecorationsAPI"],
    patches: [
        {
            find: "Messages.ROLE_ICON_ALT_TEXT",
            replacement: {
                match: /function \i\(\i\){.*?\)}\)}/,
                replace: "$self.RoleIconComponent=$&;$&",
            }
        }
    ],
    settings,
    set RoleIconComponent(c: any) {
        RoleIconComponent = c;
    },
    start: () => {
        roleIconClassName = findByProps("roleIcon", "separator").roleIcon;
        addDecoration("vc-show-badges-in-chat", props => <ChatBadges author={props.message?.author} />);
    },
    stop: () => {
        removeDecoration("vc-show-badges-in-chat");
    }
});
