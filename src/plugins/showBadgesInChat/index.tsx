/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addDecoration, removeDecoration } from "@api/MessageDecorations";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { useEffect, useState } from "@webpack/common";

let BadgeComponent: React.ComponentType<any> = () => null;
let badgeClassName: string = "";

const dcBadges: [number, string, string][] = [
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
];
Object.freeze(dcBadges);

function getUserDCBadges(flags: number): [string, string][] {
    const userDCBadges: [string, string][] = [];
    for (let i: number = 0; i < dcBadges.length; i++)
        if (flags & (1 << dcBadges[i][0]))
            userDCBadges.push([dcBadges[i][1], dcBadges[i][2]]);
    return userDCBadges;
}

function Badges({ author }): JSX.Element | null {
    const [userDCBadges, setUserDCBadges] = useState<[string, string][]>([]);
    const [userVCBadges, setUserVCBadges] = useState<[string, string][]>([]);

    useEffect(() => {
        if (settings.store.showVencordDonorBadges) {
            fetch("https://gist.githubusercontent.com/Vendicated/51a3dd775f6920429ec6e9b735ca7f01/raw/badges.csv")
                .then((res: Response): Promise<string> => { return res.text(); })
                .then((data: string) => {
                    const donorBadges: string[][] = data.split("\n").map((s: string) => s.split(","));
                    const userBadges: [string, string][] = [];
                    for (let i: number = 0; i < donorBadges.length; i++)
                        if (donorBadges[i][0] === author.id)
                            userBadges.push([donorBadges[i][1], donorBadges[i][2]]);
                    setUserVCBadges(userBadges);
                })
                .catch(e => { console.error(e); });
        }
        if (settings.store.showDiscordProfileBadges)
            setUserDCBadges(getUserDCBadges(author.flags || author.publicFlags));
    }, []);

    return (
        <>
            {userVCBadges.map(badge =>
                <BadgeComponent
                    className={badgeClassName}
                    name={badge[0]}
                    size={20}
                    src={badge[1]}
                />
            )}
            {settings.store.showVencordContributorBadges && Object.entries(Devs).some(e => e[1].id.toString() === author.id) ?
                <BadgeComponent
                    className={badgeClassName}
                    name={"Vencord Contributor"}
                    size={20}
                    src={"https://cdn.discordapp.com/attachments/1033680203433660458/1092089947126780035/favicon.png"}
                /> : null
            }
            {userDCBadges.map(badge =>
                <BadgeComponent
                    className={badgeClassName}
                    name={badge[0]}
                    size={20}
                    src={"https://cdn.discordapp.com/badge-icons/" + badge[1] + ".png"}
                />
            )}
            {settings.store.showDiscordNitroBadges && author.premiumType ?
                <BadgeComponent
                    className={badgeClassName}
                    name={"Discord Nitro" + (author.premiumType === 3 ? " Basic" : author.premiumType === 1 ? " Classic" : "")}
                    size={20}
                    src={"https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png"}
                /> : null
            }
        </>
    );
}

const settings = definePluginSettings({
    showVencordDonorBadges: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Vencord donor badges in chat.",
        default: true,
        restartNeeded: true
    },
    showVencordContributorBadges: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Vencord contributor badges in chat.",
        default: true,
        restartNeeded: true
    },
    showDiscordProfileBadges: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Discord profile badges in chat.",
        default: true,
        restartNeeded: true
    },
    showDiscordNitroBadges: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Discord Nitro badges in chat.",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "ShowBadgesInChat",
    authors: [
        Devs.Shalev,
        Devs.fres,
        Devs.ryan
    ],
    description: "Shows profile badges in chat, Shoutout krystalskullofficial for the idea",
    dependencies: ["MessageDecorationsAPI"],
    patches: [
        {
            find: "Messages.ROLE_ICON_ALT_TEXT",
            replacement: {
                match: /function \i\(\i\){.*?\)}\)}/,
                replace: "$self.BadgeComponent=$&;$&",
            }
        }
    ],
    settings,
    set BadgeComponent(c: any) {
        BadgeComponent = c;
    },
    start: () => {
        badgeClassName = findByProps("roleIcon", "separator").roleIcon;
        addDecoration("vc-show-badges-in-chat", props => <Badges author={props.message?.author} />);
    },
    stop: () => {
        removeDecoration("vc-show-badges-in-chat");
    }
});
