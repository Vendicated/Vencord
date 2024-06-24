/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";
import { Message, User } from "discord-types/general";

import { LocalTimestamp } from "./components";
import settings, { SettingsComponent } from "./settings";

export default definePlugin({
    name: "Timezones",
    description: "Set and display the local times of you and other users via TimezoneDB",
    authors: [Devs.rushii, Devs.Aria, Devs.mantikafasi, Devs.Arjix],

    settings,
    settingsAboutComponent: SettingsComponent,

    commands: [
        {
            name: "timezone",
            description: "Sends a link to a utility website that shows your current timezone identifier",
            execute: () => ({
                content: "[IANA Timezone ID](https://gh.lewisakura.moe/timezone/)",
            }),
        },
    ],

    patches: [
        // Based on Syncxv's vc-timezones user plugin //
        ...[".NITRO_BANNER,", "=!1,canUsePremiumCustomization:"].map(find => ({
            find,
            replacement: {
                match: /(?<=hasProfileEffect.+?)children:\[/,
                replace: "$&$self.renderProfileTimezone(arguments[0]),",
            },
        })),
        {
            find: "\"Message Username\"",
            replacement: {
                // thanks https://github.com/Syncxv/vc-timezones/pull/4
                match: /(?<=isVisibleOnlyOnHover.+?)id:.{1,11},timestamp.{1,50}}\),/,
                replace: "$&,$self.renderMessageTimezone(arguments[0]),",
            },
        },
    ],

    renderProfileTimezone: (props?: { user?: User; }) => {
        if (!settings.store.displayInProfile || !props?.user?.id) return null;

        return <LocalTimestamp
            userId={props.user.id}
            type="profile"
        />;
    },

    renderMessageTimezone: (props?: { message?: Message; }) => {
        if (!settings.store.displayInChat || !props?.message) return null;
        if (UserStore.getCurrentUser().id === props?.message?.id) return null;

        return <LocalTimestamp
            userId={props.message.author.id}
            timestamp={props.message.timestamp as unknown as Date}
            type="message"
        />;
    },
});
