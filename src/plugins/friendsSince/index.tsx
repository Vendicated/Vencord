/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React, RelationshipStore } from "@webpack/common";
import { Guild, GuildMember } from "discord-types/general";

const { Heading, Text } = findByPropsLazy("Heading");
const { memberSinceContainer } = findByPropsLazy("memberSinceContainer");
const { getCreatedAtDate } = findByPropsLazy("getCreatedAtDate");

interface UserPopoutData {
    userId: string,
    headingClassName: string,
    textClassName: string,
    guild?: Guild,
    guildMember?: GuildMember,
}

export default definePlugin({
    name: "FriendsSince",
    description: "Show when you became friends with someone in the user popout",
    authors: [Devs.Elvyra],
    patches: [
        {
            find: ".USER_PROFILE_MEMBER_SINCE",
            replacement: [{
                match: /let.{50,100}=(\i),(\i).{500,1000}\)}\)]}\)]}\)/,
                replace: "$&,$self.friendsSince($1,$2)"
            }]
        }
    ],

    friendsSince (data: UserPopoutData, locale: string) {
        const { userId, headingClassName, textClassName } = data;
        const friendsSince = RelationshipStore.getSince(userId);
        if (!friendsSince) return;

        return <React.Fragment>
            <div style={{ height: ".65em" }}/>
            <Heading variant="eyebrow" className={headingClassName}>
                Friends Since
            </Heading>
            <div className={memberSinceContainer}>
                <Text variant="text-sm/normal" className={textClassName}>
                    {getCreatedAtDate(friendsSince, locale)}
                </Text>
            </div>
        </React.Fragment>;

    }
});

