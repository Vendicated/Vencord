/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addDecoration, removeDecoration } from "@api/MessageDecorations";
import { Devs } from "@utils/constants";
import { isPluginDev } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";

import badges from "../../plugins/_api/badges";
import settings from "./settings";

let RoleIconComponent: React.ComponentType<any> = () => null;
let roleIconClassName: string;

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

function CheckBadge({ badge, author }: { badge: string; author: any; }): JSX.Element | null {
    switch (badge) {
        case "VencordDonor":
            return (
                <span style={{ order: settings.store.VencordDonorPosition }}>
                    {badges.getDonorBadges(author.id)?.map((badge: any) => (
                        <RoleIconComponent
                            className={roleIconClassName}
                            name={badge.description}
                            size={20}
                            src={badge.image}
                        />
                    ))}
                </span>
            );
        case "VencordContributer":
            return isPluginDev(author.id) ? (
                <span style={{ order: settings.store.VencordContributorPosition }}>
                    <RoleIconComponent
                        className={roleIconClassName}
                        name={"Vencord/Equicord Contributor"}
                        size={20}
                        src={"https://i.imgur.com/OypoHrV.png"}
                    />
                </span>
            ) : null;
        case "DiscordProfile":
            const chatBadges = discordBadges
                .filter((badge: any) => (author.flags || author.publicFlags) & (1 << badge[0]))
                .map((badge: any) => (
                    <RoleIconComponent
                        className={roleIconClassName}
                        name={badge[1]}
                        size={20}
                        src={`https://cdn.discordapp.com/badge-icons/${badge[2]}.png`}
                    />
                ));
            return chatBadges.length > 0 ? (
                <span style={{ order: settings.store.DiscordProfilePosition }}>
                    {chatBadges}
                </span>
            ) : null;
        case "DiscordNitro":
            return author.premiumType > 0 ? (
                <span style={{ order: settings.store.DiscordNitroPosition }}>
                    <RoleIconComponent
                        className={roleIconClassName}
                        name={
                            "Discord Nitro" +
                            (author.premiumType === 3 ? " Basic" : author.premiumType === 1 ? " Classic" : "")
                        }
                        size={20}
                        src={"https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png"}
                    />
                </span>
            ) : null;
        default:
            return null;
    }
}

function ChatBadges({ author }: any) {
    return (
        <span style={{ display: "inline-flex", marginLeft: 2, verticalAlign: "top" }}>
            {settings.store.showVencordDonor && <CheckBadge badge={"VencordDonor"} author={author} />}
            {settings.store.showVencordContributor && <CheckBadge badge={"VencordContributer"} author={author} />}
            {settings.store.showDiscordProfile && <CheckBadge badge={"DiscordProfile"} author={author} />}
            {settings.store.showDiscordNitro && <CheckBadge badge={"DiscordNitro"} author={author} />}
        </span>
    );
}

export default definePlugin({
    name: "ShowBadgesInChat",
    authors: [Devs.Inbestigator, Devs.KrystalSkull],
    description: "Shows the message author's badges beside their name in chat.",
    dependencies: ["MessageDecorationsAPI"],
    patches: [
        {
            find: "Messages.ROLE_ICON_ALT_TEXT",
            replacement: {
                match: /function\s+\w+?\(\w+?\)\s*{let\s+\w+?,\s*{className:.+}\)}/,
                replace: "$self.RoleIconComponent=$&;$&",
            }
        }
    ],
    settings,
    set RoleIconComponent(component: any) {
        RoleIconComponent = component;
    },
    start: () => {
        roleIconClassName = findByPropsLazy("roleIcon", "separator").roleIcon;
        addDecoration("vc-show-badges-in-chat", props => <ChatBadges author={props.message?.author} />);
    },
    stop: () => {
        removeDecoration("vc-show-badges-in-chat");
    }
});
