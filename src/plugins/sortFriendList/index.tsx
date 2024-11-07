/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Flex } from "@components/Flex";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { RelationshipStore } from "@webpack/common";
import { User } from "discord-types/general";

const settings = definePluginSettings({
    showDates: {
        type: OptionType.BOOLEAN,
        description: "Show dates on friend list",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "SortFriendList",
    authors: [Devs.CallMeGii],
    description: "Sorts friends by date of addition",
    settings,

    patches: [{
            find: "getRelationshipCounts(){",
            replacement: {
                match: /\}\)\.sortBy\((.+?)\)\.value\(\)/,
                replace: "}).sortBy(row => $self.wrapSort(($1), row)).value()"
            }
        }, {
            find: "peopleListItemRef",
            replacement: {
                predicate: () => settings.store.showDates,
                match: /(?<=children:.*user:(\i),.*subText:).+?(?=,hovered:\i,showAccountIdentifier)/,
                replace: "$self.makeSubtext($1, $&)"
            }
        }        
    ],

    wrapSort(comparator: Function, row: any) {
        return row.type === 3 || row.type === 4
            ? -this.getSince(row.user)
            : comparator(row);
    },

    getSince(user: User) {
        return new Date(RelationshipStore.getSince(user.id));
    },

    makeSubtext(user: User, origSubtext: any) {
        const since = this.getSince(user);
        if (isNaN(since.getTime())) {
            return null;
        }
    
        return (
            <Flex
                flexDirection="column"
                style={{ gap: "0px", flexWrap: "wrap", lineHeight: "0.9rem" }}
            >
                <span>{origSubtext}</span>
                <span>
                    <div className="" style={{ display: "flex", alignItems: "center" }}>
                        <svg
                            aria-hidden="true"
                            role="img"
                            xmlns="http://www.w3.org/2000/svg"
                            width="8"
                            height="8"
                            fill="none"
                            viewBox="0 0 24 24"
                            style={{ marginRight: "4px", display: "inline-block" }}
                        >
                            <path
                                fill="var(--input-placeholder-text)"
                                fillRule="evenodd"
                                d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22Zm1-18a1 1 0 1 0-2 0v7c0 .27.1.52.3.7l3 3a1 1 0 0 0 1.4-1.4L13 11.58V5Z"
                                clipRule="evenodd"
                            ></path>
                        </svg>
                        <span>Added &mdash; {since.toDateString()}</span>
                    </div>
                </span>
            </Flex>
        );       
    },
});