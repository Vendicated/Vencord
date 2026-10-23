/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { FormSwitch } from "@components/FormSwitch";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { filters, mapMangledModuleLazy } from "@webpack";
import { Constants, React, RestAPI, UserStore } from "@webpack/common";

// interfaces
interface Badge {
    id: string;
    name: string;
}

interface BadgeIdConverter {
    toBadgeId(numericId: number): string | undefined;
    toNumericId(badgeId: string): number | undefined;
}

// "/users/@me/badges" returns numeric id of badges (eg. 19, 14, 21), while we need their string id (eg. streaming, quest_completed, game_variety) to hide the badges
// finding (badge id to numeric id) and (numeric id to badge id) functions in discord chunks
const BadgeIdConverterModuleCode = ["staff_hidden", "staff_personal", "guild_booster_lvl1"];

const badgeIdConverterModule = mapMangledModuleLazy(
    BadgeIdConverterModuleCode,
    {
        toBadgeId: filters.byCode(/\i\.get\(\i\)\?\?\(0,\i\.\i\)\(\i\)/),
        toNumericId: filters.byCode(/\[\i\.toUpperCase\(\)\];return"number"==typeof/)
    }
) as Partial<BadgeIdConverter>;

// call the function, return undefined if running it causes an error
const tryCall = <T,>(fn: Function, arg: unknown): T | undefined => { try { return fn(arg) as T; } catch { return undefined; } };

// validate and return badge id converter functions
function findBadgeIdConverter(): BadgeIdConverter | null {
    try {
        const { toBadgeId, toNumericId } = badgeIdConverterModule;
        if (typeof toBadgeId !== "function" || typeof toNumericId !== "function") return null;

        return {
            toBadgeId(numericId) {
                const badgeId = tryCall<string>(toBadgeId, numericId);
                if (typeof badgeId !== "string" || !badgeId) return;
                if (tryCall<number>(toNumericId, badgeId) !== numericId) return;
                return badgeId;
            },
            toNumericId(badgeId) {
                const numericId = tryCall<unknown>(toNumericId, badgeId);
                return typeof numericId === "number" ? numericId : undefined;
            }
        };
    } catch { return null; }
}

// caching the functions found
let cachedBadgeIdConverter: BadgeIdConverter | null = null;
const getBadgeIdConverter = () => cachedBadgeIdConverter ??= findBadgeIdConverter();

// plugin settings
const settings = definePluginSettings({
    badgeVisibility: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, boolean>
    },
    badgeSettings: {
        type: OptionType.COMPONENT,
        component: BadgeSettings
    },
    badgeOverflowLimit: {
        description: "Enable Badge Overflow Limit",
        type: OptionType.BOOLEAN,
        default: false
    }
});

// render settings for all badges
function BadgeSettings() {
    const [badges, setBadges] = React.useState<Badge[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);
    const { badgeVisibility } = settings.use(["badgeVisibility"]);

    React.useEffect(() => {
        const badgeIdConverter = getBadgeIdConverter();
        if (badgeIdConverter == null) {
            console.error("Failed to find Discord's badge ID converter");
            setError(true);
            setLoading(false);
            return;
        }

        RestAPI.get(Constants.Endpoints.USER_BADGES("@me"))
            .then(({ body }) => {
                const data = body?.badges;
                if (Array.isArray(data)) {
                    const badgesById = new Map<string, Badge>();
                    for (const badge of data) {
                        if (typeof badge?.badge_id !== "number" || typeof badge?.name !== "string") continue;
                        const id = badgeIdConverter.toBadgeId(badge.badge_id);
                        if (id == null || badgesById.has(id)) continue;
                        badgesById.set(id, { id, name: badge.name });
                    }
                    setBadges([...badgesById.values()]);
                }
            })
            .catch(err => {
                console.error(`Failed to fetch badges: ${err}`);
                setError(true);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div>Loading badges...</div>;
    if (error) return <div>Failed to load badges. Check console.</div>;
    if (!badges.length) return <div>No badges found in API response.</div>;

    return (
        <div>
            {badges.map(badge => (
                <div
                    key={badge.id}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}
                >
                    <span>{`Show ${badge.name}`} Badge</span>
                    <FormSwitch
                        title={""}
                        value={badgeVisibility[badge.id] ?? true}
                        onChange={value => {
                            settings.store.badgeVisibility[badge.id] = value;
                        }}
                    />
                </div>
            ))}
        </div>
    );
}

export default definePlugin({
    name: "CustomizeMembersBadges",
    description: "Customize visibility of other member's badges.",
    authors: [Devs.f3tch],
    settings,
    patches: [
        // hide the new badges
        {
            find: "pendingBadgeDisplayOrder",
            replacement: {
                match: /if\(0===(\i)\.length&&!\i\)return null;/,
                replace: "$&if(!$self.isCurrentUserProfile(arguments[0]?.displayProfile?.userId))$1=$1.filter(e=>!$self.shouldHide(e.id));"
            }
        },
        // filtering badge when we press +n button on profile
        {
            find: "BadgeDirectorySeenStore",
            replacement: {
                match: /children:\s*(\i)\.map\(/,
                replace: "children:$1.filter(e=>$self.isCurrentUserProfile(arguments[0]?.contextMenuAPIArguments?.[0]?.displayedUserId)||!$self.shouldHide(e.badge_id)).map("
            }
        },
        // correct badge on the right side of the badge list modal after pressing +n
        {
            find: 'location:"BadgeDirectoryModal"',
            replacement: {
                match: /\i\.useState\(\i\?\?null\),\i=\(0,\i\.\i\)\(\[\i\.\i],\(\)=>null!=\i\?\i\.\i\.getBadges\(\i\)/,
                replace: "$&.filter(e=>$self.isCurrentUserProfile(arguments[0]?.targetUserId)||!$self.shouldHide(e.badge_id))"
            }
        },
        // update badge list component to setting changes
        {
            find: "UserProfileBadgeListRows",
            replacement: {
                match: /(\i)=\(0,\i\.\i\)\(\{location:"UserProfileBadgeListRows"\}\),/,
                replace: "$1=$self.settings.use(),"
            }
        },
        // remove badge row overflow limit causing "+1/+2/+3" button to appear (depending on the setting chosen)
        {
            find: "UserProfileBadgeListRows",
            replacement: {
                match: /let (\i)=(\i)&&!(\i),/,
                replace: "let $1=$2&&!$3&&$self.settings.store.badgeOverflowLimit,"
            }
        }
    ],
    shouldHide(badgeId: string | number) {
        const badgeIdConverter = getBadgeIdConverter();
        const numericId = typeof badgeId === "number" ? badgeId : badgeIdConverter?.toNumericId(badgeId);

        if (numericId == null) return settings.store.badgeVisibility[badgeId] === false;

        return Object.entries(settings.store.badgeVisibility).some(([id, visible]) => {
            if (visible !== false) return false;
            return id === String(badgeId) || badgeIdConverter?.toNumericId(id) === numericId;
        });
    },
    isCurrentUserProfile(userId?: string) {
        return userId === UserStore.getCurrentUser()?.id;
    }
});
