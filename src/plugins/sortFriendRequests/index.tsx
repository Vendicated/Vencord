/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { definePluginSettings, migratePluginSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { Flex } from "@components/Flex";
import { TooltipContainer } from "@components/TooltipContainer";
import { Devs, EquicordDevs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";
import { User } from "@vencord/discord-types";
import { DateUtils, RelationshipStore } from "@webpack/common";
import { PropsWithChildren } from "react";

const formatter = new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
});

const cl = classNameFactory("vc-sortFriends-");

function getSince(user: User) {
    return new Date(RelationshipStore.getSince(user.id));
}

const settings = definePluginSettings({
    showDates: {
        type: OptionType.BOOLEAN,
        description: "Show dates on friend requests",
        default: false,
        restartNeeded: true
    }
});

migratePluginSettings("SortFriends", "SortFriendRequests");
export default definePlugin({
    name: "SortFriends",
    authors: [Devs.Megu, EquicordDevs.CallMeGii],
    description: "Sorts friend requests by date of receipt",
    isModified: true,
    settings,

    patches: [
        {
            find: "getRelationshipCounts(){",
            replacement: {
                match: /\}\)\.sortBy\((.+?)\)\.value\(\)/,
                replace: "}).sortBy(row => $self.wrapSort(($1), row)).value()"
            }
        },
        {
            find: "peopleListItemRef",
            replacement: {
                predicate: () => settings.store.showDates,
                match: /(?<=children:.*user:(\i),.*subText:).+?(?=,hovered:\i,showAccountIdentifier)/,
                replace: "$self.makeSubtext($1, $&)"
            }
        },
        {
            find: "#{intl::FRIEND_REQUEST_CANCEL}",
            replacement: {
                predicate: () => settings.store.showDates,
                match: /(?<=children:\[)\(0,.{0,100}user:\i,hovered:\i.+?(?=,\(0)(?<=user:(\i).+?)/,
                replace: (children, user) => `$self.WrapperDateComponent({user:${user},children:${children}})`
            }
        }
    ],

    wrapSort(comparator: Function, row: any) {
        return row.type === 3 || row.type === 4
            ? -getSince(row.user)
            : comparator(row);
    },

    makeSubtext(user: User, origSubtext: any) {
        const since = getSince(user);
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

    WrapperDateComponent: ErrorBoundary.wrap(({ user, children }: PropsWithChildren<{ user: User; }>) => {
        const since = getSince(user);

        return <div className={cl("wrapper")}>
            {children}
            {!isNaN(since.getTime()) && (
                <TooltipContainer text={DateUtils.dateFormat(since, "LLLL")} tooltipClassName={cl("tooltip")}>
                    <BaseText size="xs" className={cl("date")}>{formatter.format(since)}</BaseText>
                </TooltipContainer>
            )}
        </div>;
    }, { noop: true })
});
