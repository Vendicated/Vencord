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
import { PropsWithChildren } from "react";

type UsernameWrapperProps = PropsWithChildren<Record<string, any> & {
    className?: string;
}>;

const cl = classNameFactory("vc-discord-fixes-");

const UsernameWrapper = ErrorBoundary.wrap((props: UsernameWrapperProps) => {
    return <div {...props} className={classes(cl("username-wrapper"), props.className)} />;
}, { noop: true });

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
        }
    ],

    UsernameWrapper
});
