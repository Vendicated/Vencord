import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { BadgePosition, ProfileBadge } from "@api/Badges";
import { addBadge, removeBadge } from "@api/Badges";
import { UserStore } from "@webpack/common";

const getUserId = () => {
    const id = UserStore.getCurrentUser()?.id;
    if (!id) throw new Error("User not yet logged in");
    return id;
};

let userId: string;

let EquippedBadges = [] as Array<ProfileBadge>;

const BadgeTier = {
    1: "https://cdn.discordapp.com/badge-icons/51040c70d4f20a921ad6674ff86fc95c.png", // Tier 1 (1 month)
    2: "https://cdn.discordapp.com/badge-icons/0e4080d1d333bc7ad29ef6528b6f2fb7.png", // Tier 2 (2 months)
    3: "https://cdn.discordapp.com/badge-icons/72bed924410c304dbe3d00a6e593ff59.png", // Tier 3 (3 months)
    4: "https://cdn.discordapp.com/badge-icons/df199d2050d3ed4ebf84d64ae83989f8.png", // Tier 4 (6 months)
    5: "https://cdn.discordapp.com/badge-icons/996b3e870e8a22ce519b3a50e6bdd52f.png", // Tier 5 (9 months)
    6: "https://cdn.discordapp.com/badge-icons/991c9f39ee33d7537d9f408c3e53141e.png", // Tier 6 (12 months)
    7: "https://cdn.discordapp.com/badge-icons/cb3ae83c15e970e8f3d410bc62cb8b99.png", // Tier 7 (15 months)
    8: "https://cdn.discordapp.com/badge-icons/7142225d31238f6387d9f09efaa02759.png", // Tier 8 (18 months)
    9: "https://cdn.discordapp.com/badge-icons/ec92202290b48d0879b7413d2dde3bab.png", // Tier 9 (24 months)
};

const badgeData = {
    "Discord Staff": {
        image: "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png",
    },
    "HypeSquad Events": {
        image: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png",
    },
    "Moderator Programmes Alumni": {
        image: "https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png",
    },
    "Early Supporter": {
        image: "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png",
    },
    "Early Verified Bot Developer": {
        image: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png",
    },
    "Discord Bug Hunter Gold": {
        image: "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png",
    },
    "Discord Bug Hunter Green": {
        image: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png",
    },
    "Nitro Member": {
        image: "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png",
    },
    "Server Booster": {},
};

const badges = Object.entries(badgeData).reduce((acc, [description, data]) => {
    acc[description] = {
        description,
        shouldShow: ({ user }) => user.id === userId,
        position: BadgePosition.END,
        ...data,
    };
    return acc;
}, {} as Record<string, ProfileBadge>);

const badgeSettings = {
    discordStaffBadge: "Discord Staff",
    hypeSquadEventsBadge: "HypeSquad Events",
    moderatorProgrammesAlumniBadge: "Moderator Programmes Alumni",
    earlySupporterBadge: "Early Supporter",
    earlyVerifiedBotDeveloperBadge: "Early Verified Bot Developer",
    discordBugHunterGoldBadge: "Discord Bug Hunter Gold",
    discordBugHunterGreenBadge: "Discord Bug Hunter Green",
    nitroMemberBadge: "Nitro Member",
    boostingBadge: OptionType.NUMBER,
};

const settings = definePluginSettings(
    Object.entries(badgeSettings).reduce((acc, [setting, badge]) => {
        acc[setting] = {
            type: badge === OptionType.NUMBER ? OptionType.NUMBER : OptionType.BOOLEAN,
            description: `${badge} badge`,
            onChange: () => { updateBadges(badges[badge]); },
            default: badge === OptionType.NUMBER ? 0 : false,
        };
        return acc;
    }, {} as Record<string, any>)
);

export default definePlugin({
    name: "FakeBadges",
    description: "Add Discord badges to your profile.",
    authors: [Devs.ethan],
    settings,

    start() {
        userId = getUserId();
        addEnabledBadges();
    }
});

const addEnabledBadges = () => {
    Object.entries(badgeData).forEach(([badgeName, badgeInfo]) => {
        const sanitizedBadgeName = badgeName.replace(/\s+/g, '');
        const settingName = `${sanitizedBadgeName.charAt(0).toLowerCase()}${sanitizedBadgeName.slice(1)}Badge`;
        const isEnabled = settings.store[settingName] === true;

        if (isEnabled) {
            const badge: ProfileBadge = {
                description: badgeName,
                image: badgeData[badgeName].image,
                position: BadgePosition.END,
                shouldShow: ({ user }) => user.id === getUserId(),
            };

            EquippedBadges.push(badge);
            addBadge(badge);
        }
    });

    updateBoostingBadge();
};


const updateBadges = (badge: ProfileBadge) => {
    if (badge.description?.substring(0, 16) === "Server Boosting") {
        updateBoostingBadge();
        return;
    }

    if (EquippedBadges.includes(badge)) {
        EquippedBadges = EquippedBadges.filter(b => b !== badge);
        removeBadge(badge);
    } else {
        EquippedBadges.push(badge);
        addBadge(badge);
    }
};

const TierToMonths = {
    1: 1,
    2: 2,
    3: 3,
    4: 6,
    5: 9,
    6: 12,
    7: 15,
    8: 18,
    9: 24,
};

const updateBoostingBadge = () => {
    let value = settings.store.boostingBadge;

    if (value > 9) {
        settings.store.boostingBadge = 9;
        value = 9;
    } else if (value < 0) {
        settings.store.boostingBadge = 0;
        value = 0;
    }

    const boostingBadge = badges["Server Booster"];
    const existingBoostingBadge = EquippedBadges.find(b => b.description === "Server Booster");

    if (value !== 0) {
        const date = new Date();

        date.setDate(date.getDate());
        date.setMonth(date.getMonth() - TierToMonths[value]);

        const day = date.getDate();
        const month = date.toLocaleString("default", { month: "long" }).substring(0, 3);
        const year = date.getFullYear();

        boostingBadge.description = `Server Boosting since ${day} ${month} ${year}`;
        boostingBadge.image = BadgeTier[value];
        if (existingBoostingBadge) {
            EquippedBadges = EquippedBadges.filter(b => b !== existingBoostingBadge);
            removeBadge(existingBoostingBadge);
        }
        EquippedBadges.push(boostingBadge);
        addBadge(boostingBadge);
    } else if (existingBoostingBadge) {
        EquippedBadges = EquippedBadges.filter(b => b !== existingBoostingBadge);
        removeBadge(existingBoostingBadge);
    }
};