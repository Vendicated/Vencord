/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { React, RelationshipStore } from "@webpack/common";

const { Heading, Text } = findByPropsLazy("Heading", "Text");
const container = findByPropsLazy("memberSinceContainer");
const { getCreatedAtDate } = findByPropsLazy("getCreatedAtDate");
const clydeMoreInfo = findByPropsLazy("clydeMoreInfo");
const locale = findByPropsLazy("getLocale");
const lastSection = findByPropsLazy("lastSection");

export default definePlugin({
    name: "FriendsSince",
    description: "Shows when you became friends with someone in the user popout",
    authors: [Devs.Elvyra],
    patches: [
        {
            find: ".AnalyticsSections.USER_PROFILE}",
            replacement: {
                match: /\i.default,\{userId:(\i.id).{0,30}}\)/,
                replace: "$&,$self.friendsSince({ userId: $1 })"
            }
        },
        {
            find: ".UserPopoutUpsellSource.PROFILE_PANEL,",
            replacement: {
                match: /\i.default,\{userId:(\i)}\)/,
                replace: "$&,$self.friendsSince({ userId: $1 })"
            }
        }
    ],

    friendsSince: ErrorBoundary.wrap(({ userId }: { userId: string; }) => {
        const friendsSince = RelationshipStore.getSince(userId);
        if (!friendsSince) return null;

        return (
            <div className={lastSection.section}>
                <Heading variant="eyebrow" className={clydeMoreInfo.title}>
                    Friends Since
                </Heading>

                <div className={container.memberSinceContainer}>
                    <Text variant="text-sm/normal" className={clydeMoreInfo.body}>
                        {getCreatedAtDate(friendsSince, locale.getLocale())}
                    </Text>
                </div>
            </div>
        );
    }, { noop: true })
});

