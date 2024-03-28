/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";

const settings = definePluginSettings({
    primaryLabel: {
        type: OptionType.SELECT,
        description: "What should be the primary display? (the text with the role color)",
        options: [
            { label: "Username", value: "user", default: true },
            { label: "Nickname", value: "nick" },
            { label: "ID", value: "id" },
            { label: "Display Name", value: "display" },
        ],
        restartNeeded: true
    },
    username: {
        type: OptionType.BOOLEAN,
        description: "If the username should be shown in brackets",
        default: true,
        restartNeeded: true
    },
    nickname: {
        type: OptionType.BOOLEAN,
        description: "If the nickname should be shown in brackets",
        default: true,
        restartNeeded: true
    },
    id: {
        type: OptionType.BOOLEAN,
        description: "If the ID should be shown in brackets",
        default: true,
        restartNeeded: true
    },
    DisplayName: {
        type: OptionType.BOOLEAN,
        description: "If the display name should be shown in brackets",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "ShowMeYourName",
    description: "Allows you to configure what is shown as a users username",
    authors: [Devs.Rini, Devs.TheKodeToad, Devs.Samwich],
    patches: [
        {
            find: ".useCanSeeRemixBadge)",
            replacement: {
                match: /(?<=onContextMenu:\i,children:).*?\}/,
                replace: "$self.renderUsername(arguments[0])}"
            }
        },
    ],
    settings,

    renderUsername: data => {
        try {
            const messageuser = UserStore.getUser(data.message.author.id) as any;
            let primaryLabel;

            const extraData: string[] = [];

            if(settings.store.username && settings.store.primaryLabel !== "user")
            {
                extraData.push(messageuser.username);
            }
            if(settings.store.nickname && settings.store.primaryLabel !== "nick" && data.author.nick !== messageuser.globalName)
            {
                extraData.push(data.author.nick);
            }

            if(settings.store.id && settings.store.primaryLabel !== "id")
            {
                extraData.push(messageuser.id);
            }

            if(settings.store.DisplayName && settings.store.primaryLabel !== "display")
            {
                extraData.push(messageuser.globalName);
            }
            // set the primary label to whatever the user set
            switch(settings.store.primaryLabel)
            {
                case "user":
                    primaryLabel = messageuser.username;
                    break;
                case "nick":
                    primaryLabel = data.author.nick;
                    break;
                case "id":
                    primaryLabel = messageuser.id;
                    break;
                case "display":
                    // @ts-ignore
                    primaryLabel = messageuser.globalName;
                    break;
            }
            // return the text with all the values
            return <>{primaryLabel}<span className="vc-smyn-suffix">{extraData.length ? ` (${extraData.join(", ")})` : ""}</span></>;

        } catch {
            return "oops";
        }
    },
});
