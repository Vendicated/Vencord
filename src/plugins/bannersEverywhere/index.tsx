/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { fetchUserProfile } from "@utils/discord";
import { Queue } from "@utils/Queue";
import definePlugin, { OptionType } from "@utils/types";
import { useEffect, UserProfileStore, useStateFromStores } from "@webpack/common";
import { User } from "discord-types/general";

import style from "./index.css";

const settings = definePluginSettings({
    animate: {
        description: "Animate banners",
        type: OptionType.BOOLEAN,
        default: false
    },
});

const queue = new Queue();


const useFetchMemberProfile = (userId: string): string => {
    const profile = useStateFromStores([UserProfileStore], () => UserProfileStore.getUserProfile(userId));

    useEffect(() => {
        let cancel = false;

        queue.push(() => {
            if (cancel) return Promise.resolve(void 0);
            return fetchUserProfile(userId).finally(async () => {
                await new Promise<void>(resolve => setTimeout(resolve, 1000));
            });
        });

        return () => { cancel = true; };
    }, []);

    if (!profile?.banner) return "";
    const extension = settings.store.animate && profile.banner.startsWith("a_")
        ? ".gif"
        : ".png";
    return `https://cdn.discordapp.com/banners/${userId}/${profile.banner}${extension}`;
};
export default definePlugin({
    name: "BannersEverywhere",
    description: "Displays banners in the member list ",
    authors: [Devs.ImLvna, Devs.AutumnVN],
    settings,
    patches: [
        {
            find: ".Messages.GUILD_OWNER,",
            replacement:
            {
                // We add the banner as a property while we can still access the user id
                match: /verified:(\i).isVerifiedBot.*?name:null.*?(?=avatar:)/,
                replace: "$&banner:$self.memberListBanner({user: $1}),",
            },
        },
        {
            find: "role:\"listitem\",innerRef",
            replacement:
            {
                // We cant access the user id here, so we take the banner property we set earlier
                match: /let{avatar:\i.*?focusProps:\i.*?=(\i).*?children:\[/,
                replace: "$&$1.banner,"
            }
        }

    ],

    start() {
        enableStyle(style);
    },

    stop() {
        disableStyle(style);
    },

    memberListBanner: ErrorBoundary.wrap(({ user }: { user: User; }) => {
        let url: string | null = null;
        // usrbg api has no way of telling if the banner is animated or not
        // if the user doesnt want animated banners, just get rid of usrbg until there is a way to tell
        if (settings.store.animate && Vencord.Plugins.isPluginEnabled("USRBG")) {
            const USRBG = Vencord.Plugins.plugins.USRBG as unknown as typeof import("../usrbg/index").default;
            url = USRBG.getImageUrl(user.id);
        }
        if (!url) {
            url = useFetchMemberProfile(user.id);
        }
        if (url === "") return null;
        if (!settings.store.animate) url = url.replace(".gif", ".png");
        return (
            <img src={url} className="vc-banners-everywhere-memberlist"></img>
        );
    }, { noop: true }),




});
