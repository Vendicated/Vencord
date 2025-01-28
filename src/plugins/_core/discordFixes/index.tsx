/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { useEffect } from "@webpack/common";
import { PropsWithChildren } from "react";

const cl = classNameFactory("vc-discord-fixes-");

const fetchMemberSupplemental = findByCodeLazy('type:"FETCH_GUILD_MEMBER_SUPPLEMENTAL_SUCCESS"');

type UsernameWrapperProps = PropsWithChildren<Record<string, any> & {
    className?: string;
}>;

const UsernameWrapper = ErrorBoundary.wrap((props: UsernameWrapperProps) => {
    return <div {...props} className={classes(cl("username-wrapper"), props.className)} />;
}, { noop: true });

type MemberSupplementalCache = Record<string, number>;
let memberSupplementalCache = {};

function setMemberSupplementalCache(cache: MemberSupplementalCache) {
    memberSupplementalCache = cache;
}

function useFetchMemberSupplemental(guildId: string, userId: string) {
    useEffect(() => {
        // Set this member as unfetched in the member supplemental cache
        memberSupplementalCache[`${guildId}-${userId}`] ??= 1;
        fetchMemberSupplemental(guildId, [userId]);
    }, [guildId, userId]);
}

export default definePlugin({
    name: "DiscordFixes",
    description: "Fixes Discord issues required or not for Vencord plugins to work properly",
    authors: [Devs.Nuckyz],
    required: true,

    patches: [
        // Make username wrapper a div instead of a span, to align items to center easier with flex
        {
            find: '"Message Username"',
            replacement: {
                match: /"span"(?=,{id:)/,
                replace: "$self.UsernameWrapper"
            }
        },
        // Make MediaModal use the Discord media component instead of a simple "img" component,
        // if any of height or width exists and is not 0. Default behavior is to only use the component if both exist.
        {
            find: "SCALE_DOWN:",
            replacement: {
                match: /!\(null==(\i)\|\|0===\i\|\|null==(\i)\|\|0===\i\)/,
                replace: (_, width, height) => `!((null==${width}||0===${width})&&(null==${height}||0===${height}))`
            }
        },
        // Make buttons show up for your own activities
        {
            find: ".party?(0",
            all: true,
            replacement: {
                match: /\i\.id===\i\.id\?null:/,
                replace: ""
            }
        },
        // Fixes mod view depending on Members page being loaded to acquire the member highest role
        {
            find: "#{intl::GUILD_MEMBER_MOD_VIEW_PERMISSION_GRANTED_BY_ARIA_LABEL}),allowOverflow:",
            replacement: {
                match: /(role:)\i(?=,guildId.{0,100}role:(\i\[))/,
                replace: "$1$2arguments[0].member.highestRoleId]"
            }
        },
        // Fix mod view join method depending on loading the member in the Members page
        {
            find: ".MANUAL_MEMBER_VERIFICATION]:",
            replacement: {
                match: /useEffect\(.{0,50}\.requestMembersById\(.+?\[\i,\i\]\);(?<=userId:(\i),guildId:(\i).+?)/,
                replace: (m, userId, guildId) => `${m}$self.useFetchMemberSupplemental(${guildId},${userId});`
            }
        },
        // Fix member supplemental caching code and export cache object to use within the plugin code,
        // there is no other way around it besides patching again
        {
            find: ".MEMBER_SAFETY_SUPPLEMENTAL(",
            replacement: [
                {
                    match: /(let (\i)={};)(function \i\(\i,\i\){return \i\+)(\i})/,
                    replace: (_, rest1, cache, rest2, rest3) => `${rest1}$self.setMemberSupplementalCache(${cache});${rest2}"-"+${rest3}`
                }
            ]
        }
    ],

    UsernameWrapper,
    setMemberSupplementalCache,
    useFetchMemberSupplemental
});
