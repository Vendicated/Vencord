/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addMessageDecoration, removeMessageDecoration } from "@api/MessageDecorations";
import { Devs } from "@utils/constants";
import { isPluginDev } from "@utils/misc";
import definePlugin from "@utils/types";
import { User } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import badges from "plugins/_api/badges";

import settings, { cl } from "./settings";

const roleIconClassName = findByPropsLazy("roleIcon", "separator").roleIcon;
const RoleIconComponent = findComponentByCodeLazy(
    "#{intl::ROLE_ICON_ALT_TEXT}"
);

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
    [18, "Moderator Programs Alumni", "fee1624003e2fee35cb398e125dc479b"],
]);

function ChatBadges({ author }: { author: User; }) {
    const profileBadges = discordBadges
        .filter(
            badge => (author.flags || author.publicFlags) & (1 << badge[0])
        )
        .map(badge => (
            <RoleIconComponent
                key={author.id}
                className={roleIconClassName}
                name={badge[1]}
                size={20}
                src={`https://cdn.discordapp.com/badge-icons/${badge[2]}.png`}
            />
        ));

    return (
        <span className={cl("badge-row")}>
            {settings.store.vencordDonor.isEnabled && (
                <span style={{ order: settings.store.vencordDonor.order }}>
                    {badges.getDonorBadges(author.id)?.map(badge => (
                        <RoleIconComponent
                            key={author.id}
                            className={roleIconClassName}
                            name={badge.description}
                            size={20}
                            src={badge.image}
                        />
                    ))}
                </span>
            )}
            {settings.store.vencordContributor.isEnabled &&
                isPluginDev(author.id) && (
                    <span
                        style={{
                            order: settings.store.vencordContributor.order,
                        }}
                    >
                        <RoleIconComponent
                            className={roleIconClassName}
                            name="Vencord Contributor"
                            size={20}
                            src={"https://cdn.discordapp.com/emojis/1092089799109775453.png"}
                        />
                    </span>
                )}
            {settings.store.discordProfile.isEnabled &&
                profileBadges.length > 0 && (
                    <span
                        style={{ order: settings.store.discordProfile.order }}
                    >
                        {profileBadges}
                    </span>
                )}
            {settings.store.discordNitro.isEnabled &&
                (author.premiumType ?? 0) > 0 && (
                    <span style={{ order: settings.store.discordNitro.order }}>
                        <RoleIconComponent
                            className={roleIconClassName}
                            name={
                                "Discord Nitro" +
                                (author.premiumType === 3
                                    ? " Basic"
                                    : author.premiumType === 1
                                        ? " Classic"
                                        : "")
                            }
                            size={20}
                            src={
                                "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png"
                            }
                        />
                    </span>
                )}
        </span>
    );
}

export default definePlugin({
    name: "ShowBadgesInChat",
    authors: [Devs.Inbestigator, Devs.KrystalSkull],
    description: "Shows the message author's badges beside their name in chat.",
    dependencies: ["MessageDecorationsAPI"],
    settings,
    start: () => {
        addMessageDecoration("vc-show-badges-in-chat", props =>
            props.message?.author && !props.compact ? (
                <ChatBadges author={props.message.author} />
            ) : null
        );
    },
    stop: () => {
        removeMessageDecoration("vc-show-badges-in-chat");
    },
});
