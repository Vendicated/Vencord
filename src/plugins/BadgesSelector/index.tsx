import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Menu, Toasts } from "@webpack/common";
import * as DataStore from "@api/DataStore";
const UserProfileStore = findStoreLazy("UserProfileStore");
const userBadgesMap = new Map<string, any[]>();

const removedBadgesMap = new Map<string, Set<string>>();

function getNitroSinceDate(months: number): string {
    const currentDate = new Date();
    const sinceDate = new Date(currentDate);
    sinceDate.setMonth(currentDate.getMonth() - months);
    const month = sinceDate.getMonth() + 1;
    const day = sinceDate.getDate();
    const year = sinceDate.getFullYear();
    return `${month}/${day}/${year.toString().slice(-2)}`;
}

function getBoostSinceDate(months: number): string {
    const currentDate = new Date();
    const sinceDate = new Date(currentDate);
    sinceDate.setMonth(currentDate.getMonth() - months);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[sinceDate.getMonth()]} ${sinceDate.getDate()}, ${sinceDate.getFullYear()}`;
}

const availableBadges = [
    {
        id: "staff",
        title: "Discord Staff",
        description: "Discord Staff",
        icon: "5e74e9b61934fc1f67c65515d1f7e60d",
        link: "https://discord.com/company"
    },
    {
        id: "premium",
        title: "Nitro Subscriber",
        description: "Subscriber since Dec 22, 2016",
        icon: "2ba85e8026a8614b640c2837bcdfe21b",
        link: "https://discord.com/settings/premium"
    },
    {
        id: "premium_tenure_1_month_v2",
        title: "Nitro Bronze (1 month)",
        description: `Subscriber since ${getNitroSinceDate(1)}`,
        icon: "4f33c4a9c64ce221936bd256c356f91f",
        link: "https://discord.com/nitro"
    },
    {
        id: "premium_tenure_3_month_v2",
        title: "Nitro Silver (3 months)",
        description: `Subscriber since ${getNitroSinceDate(3)}`,
        icon: "4514fab914bdbfb4ad2fa23df76121a6",
        link: "https://discord.com/nitro"
    },
    {
        id: "premium_tenure_6_month_v2",
        title: "Nitro Gold (6 months)",
        description: `Subscriber since ${getNitroSinceDate(6)}`,
        icon: "2895086c18d5531d499862e41d1155a6",
        link: "https://discord.com/nitro"
    },
    {
        id: "premium_tenure_12_month_v2",
        title: "Nitro Platinum (1 year)",
        description: `Subscriber since ${getNitroSinceDate(12)}`,
        icon: "0334688279c8359120922938dcb1d6f8",
        link: "https://discord.com/nitro"
    },
    {
        id: "premium_tenure_24_month_v2",
        title: "Nitro Diamond (2 years)",
        description: `Subscriber since ${getNitroSinceDate(24)}`,
        icon: "0d61871f72bb9a33a7ae568c1fb4f20a",
        link: "https://discord.com/nitro"
    },
    {
        id: "premium_tenure_36_month_v2",
        title: "Nitro Emerald (3 years)",
        description: `Subscriber since ${getNitroSinceDate(36)}`,
        icon: "11e2d339068b55d3a506cff34d3780f3",
        link: "https://discord.com/nitro"
    },
    {
        id: "premium_tenure_60_month_v2",
        title: "Nitro Ruby (5 years)",
        description: `Subscriber since ${getNitroSinceDate(60)}`,
        icon: "cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4",
        link: "https://discord.com/nitro"
    },
    {
        id: "premium_tenure_72_month_v2",
        title: "Nitro Opal (6+ years)",
        description: `Subscriber since ${getNitroSinceDate(72)}`,
        icon: "5b154df19c53dce2af92c9b61e6be5e2",
        link: "https://discord.com/nitro"
    },
    {
        id: "partner",
        title: "Partnered Server Owner",
        description: "Partnered Server Owner",
        icon: "3f9748e53446a137a052f3454e2de41e",
        link: "https://discord.com/partners"
    },
    {
        id: "certified_moderator",
        title: "Moderator Programs Alumni",
        description: "Moderator Programs Alumni",
        icon: "fee1624003e2fee35cb398e125dc479b",
        link: "https://discord.com/safety"
    },
    {
        id: "hypesquad",
        title: "HypeSquad Events",
        description: "HypeSquad Events",
        icon: "bf01d1073931f921909045f3a39fd264",
        link: "https://discord.com/hypesquad"
    },
    {
        id: "hypesquad_house_1",
        title: "HypeSquad Bravery",
        description: "HypeSquad Bravery",
        icon: "8a88d63823d8a71cd5e390baa45efa02",
        link: "https://discord.com/settings/hypesquad-online"
    },
    {
        id: "hypesquad_house_2",
        title: "HypeSquad Brilliance",
        description: "HypeSquad Brilliance",
        icon: "011940fd013da3f7fb926e4a1cd2e618",
        link: "https://discord.com/settings/hypesquad-online"
    },
    {
        id: "hypesquad_house_3",
        title: "HypeSquad Balance",
        description: "HypeSquad Balance",
        icon: "3aa41de486fa12454c3761e8e223442e",
        link: "https://discord.com/settings/hypesquad-online"
    },
    {
        id: "bug_hunter_level_1",
        title: "Discord Bug Hunter",
        description: "Discord Bug Hunter",
        icon: "2717692c7dca7289b35297368a940dd0",
        link: "https://support.discord.com/hc/en-us/articles/360046057772-Discord-Bugs"
    },
    {
        id: "bug_hunter_level_2",
        title: "Discord Bug Hunter Gold",
        description: "Discord Bug Hunter",
        icon: "848f79194d4be5ff5f81505cbd0ce1e6",
        link: "https://support.discord.com/hc/en-us/articles/360046057772-Discord-Bugs"
    },
    {
        id: "active_developer",
        title: "Active Developer",
        description: "Active Developer",
        icon: "6bdc42827a38498929a4920da12695d9",
        link: "https://support-dev.discord.com/hc/en-us/articles/10113997751447?ref=badge"
    },
    {
        id: "verified_developer",
        title: "Early Verified Bot Developer",
        description: "Early Verified Bot Developer",
        icon: "6df5892e0f35b051f8b61eace34f4967",
        link: "https://discord.com/developers"
    },
    {
        id: "early_supporter",
        title: "Early Supporter",
        description: "Early Supporter",
        icon: "7060786766c9c840eb3019e725d2b358",
        link: "https://discord.com/settings/premium"
    },
    {
        id: "guild_booster_lvl1",
        title: "Server Boost 1 Month",
        description: `Server boosting since ${getBoostSinceDate(1)}`,
        icon: "51040c70d4f20a921ad6674ff86fc95c",
        link: "https://discord.com/settings/premium"
    },
    {
        id: "guild_booster_lvl2",
        title: "Server Boost 2 Months",
        description: `Server boosting since ${getBoostSinceDate(2)}`,
        icon: "0e4080d1d333bc7ad29ef6528b6f2fb7",
        link: "https://discord.com/settings/premium"
    },
    {
        id: "guild_booster_lvl3",
        title: "Server Boost 3 Months",
        description: `Server boosting since ${getBoostSinceDate(3)}`,
        icon: "72bed924410c304dbe3d00a6e593ff59",
        link: "https://discord.com/settings/premium"
    },
    {
        id: "guild_booster_lvl4",
        title: "Server Boost 6 Months",
        description: `Server boosting since ${getBoostSinceDate(6)}`,
        icon: "df199d2050d3ed4ebf84d64ae83989f8",
        link: "https://discord.com/settings/premium"
    },
    {
        id: "guild_booster_lvl5",
        title: "Server Boost 9 Months",
        description: `Server boosting since ${getBoostSinceDate(9)}`,
        icon: "996b3e870e8a22ce519b3a50e6bdd52f",
        link: "https://discord.com/settings/premium"
    },
    {
        id: "guild_booster_lvl6",
        title: "Server Boost 12 Months",
        description: `Server boosting since ${getBoostSinceDate(12)}`,
        icon: "991c9f39ee33d7537d9f408c3e53141e",
        link: "https://discord.com/settings/premium"
    },
    {
        id: "guild_booster_lvl7",
        title: "Server Boost 15 Months",
        description: `Server boosting since ${getBoostSinceDate(15)}`,
        icon: "cb3ae83c15e970e8f3d410bc62cb8b99",
        link: "https://discord.com/settings/premium"
    },
    {
        id: "guild_booster_lvl8",
        title: "Server Boost 18 Months",
        description: `Server boosting since ${getBoostSinceDate(18)}`,
        icon: "7142225d31238f6387d9f09efaa02759",
        link: "https://discord.com/settings/premium"
    },
    {
        id: "guild_booster_lvl9",
        title: "Server Boost 24 Months",
        description: `Server boosting since ${getBoostSinceDate(24)}`,
        icon: "ec92202290b48d0879b7413d2dde3bab",
        link: "https://discord.com/settings/premium"
    },
    {
        id: "legacy_username",
        title: "Legacy Username",
        description: "Originally known as their old username",
        icon: "6de6d34650760ba5551a79732e98ed60",
        link: "https://discord.com"
    },
    {
        id: "quest_completed",
        title: "Quest Completer",
        description: "Completed a Quest",
        icon: "7d9ae358c8c5e118768335dbe68b4fb8",
        link: "https://discord.com/settings/inventory"
    },
    {
        id: "bot_commands",
        title: "Supports Commands",
        description: "Supports Commands",
        icon: "6f9e37f9029ff57aef81db857890005e",
        link: "https://discord.com/blog/welcome-to-the-new-era-of-discord-apps?ref=badge"
    },
    {
        id: "automod",
        title: "Uses AutoMod",
        description: "Uses automod",
        icon: "f2459b691ac7453ed6039bbcfaccbfcd",
        link: "https://discord.com"
    },
    {
        id: "application_guild_subscription",
        title: "Server Subscription",
        description: "Monetized server",
        icon: "d2010c413a8da2208b7e4311042a4b9d",
        link: "https://discord.com"
    },
    {
        id: "orb_profile_badge",
        title: "Orbs",
        description: "Collected the Orb Profile Badge",
        icon: "83d8a1eb09a8d64e59233eec5d4d5c2d",
        link: "https://discord.com"
    }
];

async function loadData() {
    const savedUserBadges = await DataStore.get("userBadges");
    if (savedUserBadges) {
        Object.entries(savedUserBadges).forEach(([userId, badges]) => {
            const updatedBadges = (badges as any[]).map(badge => {
                const freshBadge = availableBadges.find(b => b.id === badge.id);
                if (freshBadge && (badge.id.startsWith("premium_tenure_") || badge.id.startsWith("guild_booster_"))) {
                    return { ...badge, description: freshBadge.description };
                }
                return badge;
            });
            userBadgesMap.set(userId, updatedBadges);
        });
    }

    const savedRemovedBadges = await DataStore.get("removedBadges");
    if (savedRemovedBadges) {
        Object.entries(savedRemovedBadges).forEach(([userId, badgeIds]) => {
            removedBadgesMap.set(userId, new Set(badgeIds as string[]));
        });
    }
}

async function saveData() {
    const userBadgesObject = Object.fromEntries(userBadgesMap);
    await DataStore.set("userBadges", userBadgesObject);

    const removedBadgesObject = Object.fromEntries(
        Array.from(removedBadgesMap.entries()).map(([userId, badgeIds]) => [userId, Array.from(badgeIds)])
    );
    await DataStore.set("removedBadges", removedBadgesObject);
}

function addBadgesToUser(userId: string, badges: any[]) {
    const existingBadges = userBadgesMap.get(userId) || [];
    badges.forEach(badge => {
        const existingIndex = existingBadges.findIndex(b => b.id === badge.id);
        if (existingIndex === -1) {
            existingBadges.push(badge);
        }
    });
    userBadgesMap.set(userId, existingBadges);
    saveData();
}

function removeBadgeFromUser(userId: string, badgeId: string) {
    const existingBadges = userBadgesMap.get(userId) || [];
    const updatedBadges = existingBadges.filter(b => b.id !== badgeId);
    if (updatedBadges.length > 0) {
        userBadgesMap.set(userId, updatedBadges);
    } else {
        userBadgesMap.delete(userId);
    }
    saveData();
}

function getUserBadges(userId: string): any[] {
    return userBadgesMap.get(userId) || [];
}

function hideRealBadge(userId: string, badgeId: string) {
    if (!removedBadgesMap.has(userId)) {
        removedBadgesMap.set(userId, new Set());
    }
    removedBadgesMap.get(userId)!.add(badgeId);
    saveData();
}

function unhideRealBadge(userId: string, badgeId: string) {
    if (removedBadgesMap.has(userId)) {
        removedBadgesMap.get(userId)!.delete(badgeId);
        if (removedBadgesMap.get(userId)!.size === 0) {
            removedBadgesMap.delete(userId);
        }
        saveData();
    }
}

function isRealBadgeHidden(userId: string, badgeId: string): boolean {
    return removedBadgesMap.has(userId) && removedBadgesMap.get(userId)!.has(badgeId);
}

function toggleBadge(userId: string, badge: any, hasActualBadge: boolean) {
    const hasUserBadge = getUserBadges(userId).find(b => b.id === badge.id);
    const isHidden = isRealBadgeHidden(userId, badge.id);

    if (hasActualBadge) {
        if (isHidden) {
            unhideRealBadge(userId, badge.id);
            Toasts.show({
                message: `Restored ${badge.title}`,
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId()
            });
        } else {
            hideRealBadge(userId, badge.id);
            Toasts.show({
                message: `Removed ${badge.title}`,
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId()
            });
        }
    } else {
        if (hasUserBadge) {
            removeBadgeFromUser(userId, badge.id);
            Toasts.show({
                message: `Removed ${badge.title}`,
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId()
            });
        } else {
            addBadgesToUser(userId, [badge]);
            Toasts.show({
                message: `Added ${badge.title}`,
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId()
            });
        }
    }
}

function giveAllBadges(userId: string) {
    addBadgesToUser(userId, availableBadges);
    Toasts.show({
        message: "Added all badges",
        type: Toasts.Type.SUCCESS,
        id: Toasts.genId()
    });
}

function addUserBadge(userId: string) {
    const badgeId = prompt("Enter badge ID:");
    if (!badgeId) return;

    const description = prompt("Enter badge description:");
    if (!description) return;

    const icon = prompt("Enter badge icon hash:");
    if (!icon) return;

    const link = prompt("Enter badge link (optional):", "https://discord.com");

    const userBadge = {
        id: badgeId,
        description: description,
        icon: icon,
        link: link || "https://discord.com"
    };

    addBadgesToUser(userId, [userBadge]);
    Toasts.show({
        message: `Added badge: ${badgeId}`,
        type: Toasts.Type.SUCCESS,
        id: Toasts.genId()
    });
}

let originalGetUserProfile: any;

export default definePlugin({
    name: "شارات الدس",
    description: " شارات تنحط ف البروفايل ما يشوفها الا انت",
    authors: [{
        name: "rz30",
        id: 786315593963536415n
    }],

    async start() {
        await loadData();
        originalGetUserProfile = UserProfileStore.getUserProfile;

        UserProfileStore.getUserProfile = function (userId: string) {
            const userProfile = originalGetUserProfile.call(this, userId);
            if (!userProfile) return userProfile;

            let newBadges = [...(userProfile.badges || [])];

            if (removedBadgesMap.has(userId)) {
                const hiddenBadges = removedBadgesMap.get(userId)!;
                newBadges = newBadges.filter(b => !hiddenBadges.has(b.id));
            }

            if (userBadgesMap.has(userId)) {
                const userBadges = userBadgesMap.get(userId)!;
                userBadges.forEach(badgeObj => {
                    const { id, description, icon, link } = badgeObj;
                    const badgeIndex = newBadges.findIndex(b => b.id === id);
                    if (badgeIndex === -1) {
                        newBadges.push({ id, description, icon, link });
                    }
                });
            }

            newBadges.sort((a, b) => {
                const orderA = availableBadges.findIndex(badge => badge.id === a.id);
                const orderB = availableBadges.findIndex(badge => badge.id === b.id);

                const finalOrderA = orderA === -1 ? 9999 : orderA;
                const finalOrderB = orderB === -1 ? 9999 : orderB;

                return finalOrderA - finalOrderB;
            });

            return {
                ...userProfile,
                badges: newBadges
            };
        };
    },

    stop() {
        if (originalGetUserProfile) {
            UserProfileStore.getUserProfile = originalGetUserProfile;
        }
        userBadgesMap.clear();
        removedBadgesMap.clear();
    },

    contextMenus: {
        "user-context"(children, { user }) {
            if (!user) return;

            const currentUserBadges = getUserBadges(user.id);
            const userProfile = originalGetUserProfile ? originalGetUserProfile.call(UserProfileStore, user.id) : UserProfileStore.getUserProfile(user.id);
            const actualBadges = userProfile?.badges || [];

            children.push(
                <Menu.MenuItem
                    label="Add Badge"
                    key="add-custom-badge"
                    id="user-context-add-custom"
                    color="brand"
                    action={() => addUserBadge(user.id)}
                />,
                <Menu.MenuItem
                    label="Manage Badges"
                    key="custom-badges"
                    id="user-context-custom-badges"
                >
                    {availableBadges.map(badge => {
                        const hasUserBadge = currentUserBadges.find(b => b.id === badge.id);
                        const hasActualBadge = actualBadges.find(b => b.id === badge.id);
                        const isHidden = isRealBadgeHidden(user.id, badge.id);
                        const isChecked = !!hasUserBadge || (!!hasActualBadge && !isHidden);

                        return (
                            <Menu.MenuCheckboxItem
                                key={badge.id}
                                id={`badge-${badge.id}`}
                                label={
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <img
                                            src={`https://cdn.discordapp.com/badge-icons/${badge.icon}.png`}
                                            alt=""
                                            width="18"
                                            height="18"
                                            style={{
                                                borderRadius: "3px",
                                                imageRendering: "crisp-edges"
                                            }}
                                        />
                                        <span>{badge.title}</span>
                                    </div>
                                }
                                checked={isChecked}
                                action={() => toggleBadge(user.id, badge, !!hasActualBadge)}
                            />
                        );
                    })}
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        label="Give All Badges"
                        id="give-all-badges"
                        color="brand"
                        action={() => giveAllBadges(user.id)}
                    />
                    <Menu.MenuItem
                        label="Remove All Badges"
                        id="remove-all-badges"
                        color="danger"
                        action={() => {
                            actualBadges.forEach(badge => {
                                hideRealBadge(user.id, badge.id);
                            });
                            userBadgesMap.delete(user.id);

                            Toasts.show({
                                message: "Removed all badges",
                                type: Toasts.Type.SUCCESS,
                                id: Toasts.genId()
                            });
                        }}
                    />
                    <Menu.MenuItem
                        label="Reset to Original"
                        id="reset-badges"
                        color="default"
                        action={() => {
                            userBadgesMap.delete(user.id);
                            removedBadgesMap.delete(user.id);

                            Toasts.show({
                                message: "Reset badges to original state",
                                type: Toasts.Type.SUCCESS,
                                id: Toasts.genId()
                            });
                        }}
                    />
                </Menu.MenuItem>
            );
        }
    }
});
