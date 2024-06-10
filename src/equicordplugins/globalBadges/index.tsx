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

import { addBadge, BadgePosition, ProfileBadge, removeBadge } from "@api/Badges";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, EquicordDevs } from "@utils/constants";
import { ModalContent, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { Forms, React, Tooltip, UserStore } from "@webpack/common";
import { User } from "discord-types/general";

type CustomBadge = string | {
    name: string;
    badge: string;
    custom?: boolean;
};

interface BadgeCache {
    badges: { [mod: string]: CustomBadge[]; };
    expires: number;
}

let badgeImages;

// const API_URL = "https://clientmodbadges-api.herokuapp.com/";
const API_URL = "https://globalbadges.suncord.rest/";

const cache = new Map<string, BadgeCache>();
const EXPIRES = 1000 * 60 * 15;

const fetchBadges = (id: string): BadgeCache["badges"] | undefined => {
    const cachedValue = cache.get(id);
    if (!cache.has(id) || (cachedValue && cachedValue.expires < Date.now())) {
        fetch(`${API_URL}users/${id}`)
            .then(res => res.json() as Promise<BadgeCache["badges"]>)
            .then(body => {
                cache.set(id, { badges: body, expires: Date.now() + EXPIRES });
                return body;
            });
    } else if (cachedValue) {
        return cachedValue.badges;
    }
};

const BadgeComponent = ({ name, img }: { name: string, img: string; }) => {
    return (
        <Tooltip text={name} >
            {(tooltipProps: any) => (
                <img
                    {...tooltipProps}
                    src={img}
                    style={{ width: "22px", height: "22px", transform: name.includes("Replugged") ? null : "scale(0.9)", margin: "0 1px" }}
                />
            )}
        </Tooltip>
    );
};

const GlobalBadges = ({ userId }: { userId: string; }) => {
    const [badges, setBadges] = React.useState<BadgeCache["badges"]>({});
    React.useEffect(() => setBadges(fetchBadges(userId) ?? {}), [userId]);

    if (!badges) return null;
    const globalBadges: JSX.Element[] = [];
    const badgeModal: JSX.Element[] = [];

    Object.keys(badges).forEach(mod => {
        if (mod.toLowerCase() === "vencord") return;
        if (mod.toLowerCase() === "equicord") return;
        if (mod.toLowerCase() === "suncord") return;
        badges[mod].forEach(badge => {
            if (typeof badge === "string") {
                const fullNames = { "hunter": "Bug Hunter", "early": "Early User" };
                badge = {
                    name: fullNames[badge as string] ? fullNames[badge as string] : badge,
                    badge: `${API_URL}badges/${mod}/${(badge as string).replace(mod, "").trim().split(" ")[0]}`
                };
            } else if (typeof badge === "object") badge.custom = true;
            if (!showCustom() && badge.custom) return;
            const cleanName = badge.name.replace(mod, "").trim();
            const prefix = showPrefix() ? mod : "";
            if (!badge.custom) badge.name = `${prefix} ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}`;
            globalBadges.push(<BadgeComponent name={badge.name} img={badge.badge} />);
            badgeModal.push(<BadgeModalComponent name={badge.name} img={badge.badge} />);
        });
    });
    badgeImages = badgeModal;

    return (
        <div
            className="vc-global-badges"
            style={{ alignItems: "center", display: "flex" }}
            onClick={_ => openBadgeModal(UserStore.getUser(userId))}
        >
            {globalBadges}
        </div>
    );
};

const Badge: ProfileBadge = {
    component: b => <GlobalBadges {...b} />,
    position: BadgePosition.START,
    shouldShow: userInfo => !!Object.keys(fetchBadges(userInfo.userId) ?? {}).length,
    key: "GlobalBadges"
};

const showPrefix = () => Vencord.Settings.plugins.GlobalBadges.showPrefix;
const showCustom = () => Vencord.Settings.plugins.GlobalBadges.showCustom;

export default definePlugin({
    name: "GlobalBadges",
    description: "Adds global badges from other client mods",
    authors: [Devs.HypedDomi, EquicordDevs.Wolfie],

    start: () => addBadge(Badge),
    stop: () => removeBadge(Badge),

    options: {
        showPrefix: {
            type: OptionType.BOOLEAN,
            description: "Shows the Mod as Prefix",
            default: true,
            restartNeeded: false
        },
        showCustom: {
            type: OptionType.BOOLEAN,
            description: "Show Custom Badges",
            default: true,
            restartNeeded: false
        }
    }
});

/*
Badge duping fix for modal lines below
L39 the value for everything below
L81 for not reusing globalbadges const
L100 for the size of the badges
L103 actual dupe fix
L109 is when clicking the badge open the modal
Everything below is related to the badge modal
*/
const cl = classNameFactory("vc-badges-modal-");

const BadgeModalComponent = ({ name, img }: { name: string, img: string; }) => {
    return (
        <Tooltip text={name} >
            {(tooltipProps: any) => (
                <img
                    {...tooltipProps}
                    src={img}
                    style={{ width: "50px", height: "50px", margin: "2px 2px" }}
                />
            )}
        </Tooltip>
    );
};

function BadgeModal({ user }: { user: User; }) {
    return (
        <>
            <div className={cl("header")}>
                <img
                    className={cl("avatar")}
                    src={user.getAvatarURL(void 0, 512, true)}
                    alt=""
                />
                <Forms.FormTitle tag="h2" className={cl("name")}>{user.username}</Forms.FormTitle>
            </div>
            {badgeImages.length ? (
                <Forms.FormText>
                    This person has {badgeImages.length} global badges.
                </Forms.FormText>
            ) : (
                <Forms.FormText>
                    This person has no global badges.
                </Forms.FormText>
            )}
            {!!badgeImages.length && (
                <div className={cl("badges")}>
                    {badgeImages}
                </div>
            )}
        </>
    );
}

function openBadgeModal(user: User) {
    openModal(modalprops =>
        <ModalRoot {...modalprops}>
            <ErrorBoundary>
                <ModalContent className={cl("root")}>
                    <BadgeModal user={user} />
                </ModalContent>
            </ErrorBoundary>
        </ModalRoot>
    );
}
