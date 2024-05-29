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
import { useEffect, UserProfileStore, useState, useStateFromStores } from "@webpack/common";
import { User } from "discord-types/general";

import style from "./index.css";
import { useAwaiter } from "@utils/react";

const settings = definePluginSettings({
    animate: {
        description: "Animate banners",
        type: OptionType.BOOLEAN,
        default: false
    },
});

const discordQueue = new Queue();
const usrbgQueue = new Queue();


const useFetchMemberProfile = (userId: string): string => {
    const profile = useStateFromStores([UserProfileStore], () => UserProfileStore.getUserProfile(userId));

    const usrbgUrl = (Vencord.Plugins.plugins.USRBG as any)?.getImageUrl(userId);

    useEffect(() => {
        if (usrbgUrl) return;
        let cancel = false;

        discordQueue.push(() => {
            if (cancel) return Promise.resolve(void 0);
            return fetchUserProfile(userId).finally(async () => {
                await new Promise<void>(resolve => setTimeout(resolve, 1000));
            });
        });

        return () => { cancel = true; };
    }, []);

    if (usrbgUrl) return usrbgUrl;

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
        const url = useFetchMemberProfile(user.id);

        const [shouldShow] = useAwaiter(async () => {
            // This will get re-run when the url changes
            if (!url || url === "") return false;
            if (!settings.store.animate) {
                // Discord cdn can return both png and gif, useFetchMemberProfile gives it respectively
                if (url!.includes("cdn.discordapp.com")) return true;

                // HEAD request to check if the image is a png
                return await new Promise(async (resolve) => {
                    usrbgQueue.push(() => fetch(url!.replace(".gif", ".png"), { method: "HEAD" }).then(async res => {
                        console.log(res);
                        await new Promise<void>(resolve => setTimeout(resolve, 1000));
                        resolve(res.ok && res.headers.get("content-type")?.startsWith("image/png"));
                        return;
                    }));
                });
            }
            return true;
        }, { fallbackValue: false, deps: [url] });

        if (!shouldShow) return null;
        return (
            <img src={url} className="vc-banners-everywhere-memberlist"></img>
        );
    }, { noop: true }),




});
