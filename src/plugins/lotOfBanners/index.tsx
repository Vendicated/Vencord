/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UserProfileStore, UserStore } from "@webpack/common";;
import definePlugin from "@utils/types";
import { settings } from "./settings";

import "./index.css";
import { Devs } from "@utils/constants";

export default definePlugin({
    name: "LotsOfBanners",
    description: "Displays user banners (Nitro and USRBG) in more places!",
    authors: [Devs.ImBanana],
    settings,
    patches: [
        {
            // Add banner to member list
            find: '.Messages.GUILD_OWNER,',
            predicate: () => settings.store.memberList,
            replacement: [
                {
                    match: /((return null==)(.{1,2})\?.+{)(selected:.{1,2})/,
                    replace: "$1style:$self.memberListBannerHook($3),$4"
                }
            ]
        },
        {
            // Add banner to dm list
            find: '.Messages.SYSTEM_DM_ACTIVITY_TEXT',
            predicate: () => settings.store.dmList,
            replacement: [
                {
                    match: /(\.Interactive,{)(className:)/,
                    replace: "$1style:$self.dmHook(arguments[0]),$2"
                }
            ]
        },
        {
            // Add banner to voice background
            // from USRBG
            find: "\"data-selenium-video-tile\":",
            predicate: () => settings.store.voiceBanner,
            replacement: [
                {
                    match: /(function\((.{1,2})\,.{1,2}\){)/,
                    replace: "$1$2.style=$self.voiceBackgroundHook($2);"
                }
            ]
        }
    ],

    // from USRBG
    voiceBackgroundHook({ className, participantUserId }: any) {
        if (className.includes("tile_")) {
            const userBanner = this.getUserDisplayBanner(participantUserId);
            if (!userBanner) return {};

            return {
                backgroundImage: `url(${userBanner})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat"
            };
        }
    },

    dmHook(channelData: any) {
        if (!channelData.user) return {};
        const bannerURL = this.getUserDisplayBanner(channelData.user.id);
        if (!bannerURL) return {};

        return {
            "--lob-bg": `url("${bannerURL}")`,
        };
    },

    memberListBannerHook(userData: any) {
        const bannerURL = this.getUserDisplayBanner(userData.id);
        if (!bannerURL) return {};

        return {
            "--lob-bg": `url("${bannerURL}")`,
        };
    },

    bannerIdToURL(userId: string, bannerId: string): string {
        return `https://cdn.discordapp.com/banners/${userId}/${bannerId}.${bannerId.startsWith("a_") ? "gif" : "png"}`;
    },

    getUserDisplayBanner(userId: string): string | null {
        const currentUser = UserStore.getCurrentUser();
        const user: { banner: string; userId: string; } = UserProfileStore.getUserProfile(userId);

        // check for nitro banner if nitroFirst is enabled
        if (user && user.banner && settings.store.nitroFirst) {
            return this.bannerIdToURL(user.userId, user.banner);
        }

        // check for local banner if localBanner is enabled
        if (currentUser.id === userId && settings.store.localBanner && settings.store.localBannerURL) {
            return settings.store.localBannerURL as string;
        }

        // check if the USRBG plugin is enabled and has a banner
        if (Vencord.Plugins.isPluginEnabled("USRBG") && (Vencord.Plugins.plugins.USRBG as any).data[userId]) {
            return (Vencord.Plugins.plugins.USRBG as any).data[userId];
        }

        // default banner to use
        if (!user) return null;
        if (!user.banner) return null;
        return this.bannerIdToURL(user.userId, user.banner);
    }
});
