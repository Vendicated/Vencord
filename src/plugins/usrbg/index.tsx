/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { LinkButton } from "@components/Button";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

const API_URL = "https://usrbg.is-hardly.online/users";
const EAGLECORD_INDEX_URL =
    "https://raw.githubusercontent.com/prodbyeagle/dotfiles/main/Vencord/eagleCord/usrbg.json";
const EAGLECORD_IMAGE_BASE =
    "https://raw.githubusercontent.com/prodbyeagle/dotfiles/refs/heads/main/Vencord/eagleCord/images/";

interface UsrbgApiReturn {
    endpoint: string;
    bucket: string;
    prefix: string;
    users: Record<string, string>;
}

type EagleCordBannerIndex = Record<string, string>;

const settings = definePluginSettings({
    nitroFirst: {
        description: "Banner to use if both Nitro and USRBG/EagleCord banners are present",
        type: OptionType.SELECT,
        options: [
            { label: "Nitro banner", value: true, default: true },
            { label: "USRBG/EagleCord banner", value: false },
        ]
    },
    voiceBackground: {
        description: "Use USRBG/EagleCord banners as voice chat backgrounds",
        type: OptionType.BOOLEAN,
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "USRBG",
    description: "Displays user banners from USRBG and EagleCord, allowing anyone to get a banner without Nitro",
    authors: [Devs.AutumnVN, Devs.katlyn, Devs.pylix, Devs.TheKodeToad, Devs.Eagle],
    settings,
    isEagleCord: true,
    patches: [
        {
            find: '.banner)==null?"COMPLETE"',
            replacement: {
                match: /(?<=void 0:)\i.getPreviewBanner\(\i,\i,\i\)/,
                replace: "$self.patchBannerUrl(arguments[0])||$&"
            }
        },
        {
            find: "\"data-selenium-video-tile\":",
            predicate: () => settings.store.voiceBackground,
            replacement: [
                {
                    match: /(?<=function\((\i),\i\)\{)(?=let.{20,40},style:)/,
                    replace: "$1.style=$self.getVoiceBackgroundStyles($1);"
                }
            ]
        },
        {
            find: '"VideoBackground-web"',
            predicate: () => settings.store.voiceBackground,
            replacement: {
                match: /backgroundColor:.{0,25},\{style:(?=\i\?)/,
                replace: "$&$self.userHasBackground(arguments[0]?.userId)?null:",
            }
        }
    ],

    data: null as UsrbgApiReturn | null,
    eagleData: null as EagleCordBannerIndex | null,

    settingsAboutComponent: () => (
        <LinkButton href="https://github.com/AutumnVN/usrbg#how-to-request-your-own-usrbg-banner" variant="primary">
            Get your own USRBG banner
        </LinkButton>
    ),

    /** Returns the banner URL for voice background or profile, unified */
    getResolvedBanner(userId?: string): string | null {
        if (!userId) return null;

        const usrbg = this.userHasBackground(userId) ? this.getImageUrl(userId) : null;
        const eagle = this.getEagleCordBannerUrl(userId);

        return settings.store.nitroFirst ? usrbg ?? eagle : eagle ?? usrbg;
    },

    getVoiceBackgroundStyles({ className, participantUserId }: any) {
        if (!settings.store.voiceBackground) return;
        if (!className.includes("tile_")) return;

        const url = this.getResolvedBanner(participantUserId);
        if (!url) return;

        return {
            backgroundImage: `url(${url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
        };
    },

    patchBannerUrl({ displayProfile }: any) {
        if (!displayProfile?.userId) return;

        // Respect Nitro banner if nitroFirst is enabled
        if (displayProfile.banner && settings.store.nitroFirst) return;

        return this.getResolvedBanner(displayProfile.userId);
    },

    userHasBackground(userId: string) {
        return !!this.data?.users[userId];
    },

    getEagleCordBannerUrl(userId: string): string | null {
        const file = this.eagleData?.[userId];
        if (!file) return null;

        return `${EAGLECORD_IMAGE_BASE}${file}`;
    },

    getImageUrl(userId: string): string | null {
        if (!this.userHasBackground(userId)) return null;

        const { endpoint, bucket, prefix, users: { [userId]: etag } } = this.data!;
        return `${endpoint}/${bucket}/${prefix}${userId}?${etag}`;
    },

    async start() {
        try {
            const [usrbgRes, eagleRes] = await Promise.all([
                fetch(API_URL),
                fetch(EAGLECORD_INDEX_URL),
            ]);

            if (usrbgRes.ok) {
                this.data = (await usrbgRes.json()) as UsrbgApiReturn;
            } else {
                console.error("[USRBG] Failed to fetch USRBG API:", usrbgRes.status);
            }

            if (eagleRes.ok) {
                this.eagleData = (await eagleRes.json()) as EagleCordBannerIndex;
            } else {
                console.error("[USRBG] Failed to fetch EagleCord index:", eagleRes.status);
            }
        } catch (err) {
            console.error("[USRBG] Network error while fetching banner data:", err);
        }
    }

});
