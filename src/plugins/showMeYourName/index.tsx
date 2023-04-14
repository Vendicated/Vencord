/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Sofia Lima
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

import "./styles.css";

import { definePluginSettings } from "@api/settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

interface UsernameProps {
    username: string;
    nickname: string;
    prefix: string; // aka the `@` mention prefix in replies
    isReply: boolean;
}

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "How to display usernames and nicks",
        options: [
            { label: "Username then nickname", value: "user-nick", default: true },
            { label: "Nickname then username", value: "nick-user" },
            { label: "Username only", value: "user" },
        ],
    },
    inReplies: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Also apply functionality to reply previews",
    },
});

export default definePlugin({
    name: "ShowMeYourName",
    description: "Display usernames next to nicks, or no nicks at all",
    authors: [Devs.dzshn],
    patches: [
        {
            find: ".withMentionPrefix",
            replacement: {
                match: /(?<=(\i)=(\i).message,.{32,512},\i={className.{16,128},children:)(\i)\+(\i)/,
                replace: "$self.renderUsername({username:$1.author.username,nickname:$4,prefix:$3,isReply:$2.isRepliedMessage})"
            }
        },
    ],
    settings,

    renderUsername: ({ prefix, username, nickname, isReply: isReply }: UsernameProps) => {
        if (username === nickname || isReply && !settings.store.inReplies)
            return prefix + nickname;
        if (settings.store.mode === "user-nick")
            return <>{prefix}{nickname} <span className="vc-smyn-suffix">{username}</span></>;
        if (settings.store.mode === "nick-user")
            return <>{prefix}{username} <span className="vc-smyn-suffix">{nickname}</span></>;
        return prefix + username;
    },
});
