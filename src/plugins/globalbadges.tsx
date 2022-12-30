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

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { React, Tooltip } from "@webpack/common";
import { User } from "discord-types/general";

interface CustomBadges {
    [key: string]: string[];
}

interface BadgeCache {
    badges: CustomBadges;
    expires: number;
}

const API_URL = "https://clientmodbadges-api.herokuapp.com";

const cache = new Map<string, BadgeCache>();
const EXPIRES = 1000 * 60 * 15;

const fetchBadges = (id: string, setBadges: Function) => {
    if (!cache.has(id) || cache.get(id)?.expires < Date.now()) {
        fetch(`${API_URL}/users/${id}`)
            .then(res => res.json() as Promise<CustomBadges>)
            .then(body => {
                cache.set(id, { badges: body, expires: Date.now() + EXPIRES });
                setBadges(body);
            });
    } else setBadges(cache.get(id)?.badges);
};

const Badge = ({ name, img }: { name: string, img: string; }) => {
    return (
        <Tooltip text={name} >
            {(tooltipProps: any) => (
                <img {...tooltipProps} src={img} style={{ width: "22px", height: "22px" }} />
            )}
        </Tooltip>
    );
};

const GlobalBadges = ({ user }: { user: User; }) => {
    const [badges, setBadges] = React.useState<CustomBadges>({});
    React.useEffect(() => fetchBadges(user.id, setBadges), [user.id]);

    if (!badges) return null;
    const globalBadges: JSX.Element[] = [];

    Object.keys(badges).forEach(mod => {
        if (mod.toLowerCase() === "vencord") return;
        badges[mod].forEach(badge => {
            const badgeImg = `${API_URL}/badges/${mod}/${badge.replace(mod, "").trim().split(" ")[0]}`;
            const _ = {
                "hunter": "Bug Hunter",
                "early": "Early User"
            };
            if (_[badge]) badge = _[badge];
            const cleanName = badge.replace(mod, "").trim();
            const badgeName = `${mod} ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}`;
            globalBadges.push(<Badge name={badgeName} img={badgeImg} />);
        });
    });

    return (
        <div className="vc-global-badges" style={{ alignItems: "center", display: "flex" }}>
            {globalBadges}
        </div>
    );
};

export default definePlugin({
    name: "GlobalBadges",
    description: "Adds global badges from other client mods",
    authors: [Devs.HypedDomi],

    patches: [
        {
            find: "Messages.PROFILE_USER_BADGES",
            replacement: {
                match: /(Messages\.PROFILE_USER_BADGES,role:"group",children:)(.+?\.key\)\}\)\))/,
                replace: "$1[Vencord.Plugins.plugins.GlobalBadges.renderGlobalBadges(e)].concat($2)"
            }
        }
    ],

    renderGlobalBadges: ({ user }: { user: User; }) => (
        <ErrorBoundary noop>
            <GlobalBadges user={user} />
        </ErrorBoundary>
    )
});
