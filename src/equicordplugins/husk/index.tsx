/* eslint-disable simple-header/header */

/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 your mom lol
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

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, EmojiStore, RestAPI } from "@webpack/common";
import type { SVGProps } from "react";
// eslint-disable-next-line no-duplicate-imports
import { PropsWithChildren } from "react";

interface BaseIconProps extends IconProps {
    viewBox: string;
}

interface IconProps extends SVGProps<SVGSVGElement> {
    className?: string;
    height?: string | number;
    width?: string | number;
}

function Icon({ height = 24, width = 24, className, children, viewBox, ...svgProps }: PropsWithChildren<BaseIconProps>) {
    return (
        <svg
            className={classes(className, "vc-icon")}
            role="img"
            width={width}
            height={height}
            viewBox={viewBox}
            {...svgProps}
        >
            {children}
        </svg>
    );
}

export function Husk(props: IconProps) {
    return (
        <Icon
            {...props}
            className={classes(props.className, "vc-husk")}
            viewBox="0 0 24 24"
        >
            <path
                fill="currentColor"
                d="M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20M16.18,7.76L15.12,8.82L14.06,7.76L13,8.82L14.06,9.88L13,10.94L14.06,12L15.12,10.94L16.18,12L17.24,10.94L16.18,9.88L17.24,8.82L16.18,7.76M7.82,12L8.88,10.94L9.94,12L11,10.94L9.94,9.88L11,8.82L9.94,7.76L8.88,8.82L7.82,7.76L6.76,8.82L7.82,9.88L6.76,10.94L7.82,12M12,14C9.67,14 7.69,15.46 6.89,17.5H17.11C16.31,15.46 14.33,14 12,14Z"
            />
        </Icon>
    );
}

const settings = definePluginSettings({
    findInServer: {
        description: "Attempt to find emoji of same name in server before using ID in settings (useful if no nitro)",
        type: OptionType.BOOLEAN,
        default: true
    },
    emojiName: {
        description: "Emoji name (default (from Vencord Server): husk)",
        type: OptionType.STRING,
        default: "husk"
    },
    emojiID: {
        description: "Emoji ID (default (from Vencord Server): 1026532993923293184)",
        type: OptionType.BIGINT,
        default: 1026532993923293184n
    }
});

function getEmojiIdThatShouldBeUsed(guildId: string) {
    if (!settings.store.findInServer || guildId === "") return settings.store.emojiID;
    let id = "";
    EmojiStore.getGuildEmoji(guildId).forEach(emoji => {
        if (emoji.name === settings.store.emojiName) {
            id = emoji.id;
        }
    });
    return id !== "" ? id : settings.store.emojiID;
}

export default definePlugin({
    name: "Husk",
    description: "Adds Husk button (check settings to change used emoji)",
    authors: [Devs.nin0dev],
    settings,
    messagePopoverButton: {
        icon: Husk,
        render(msg) {
            return {
                label: "Husk",
                icon: Husk,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => {
                    const guildId = ChannelStore.getChannel(msg.channel_id).guild_id !== null ? ChannelStore.getChannel(msg.channel_id).guild_id : "";
                    RestAPI.put({
                        url: `/channels/${msg.channel_id}/messages/${msg.id}/reactions/${settings.store.emojiName}:${getEmojiIdThatShouldBeUsed(guildId)}/@me`
                    }
                    );
                }
            };
        },
    }
});
