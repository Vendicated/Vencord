/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classes } from "@utils/misc";
import { canonicalizeMatch } from "@utils/patches";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Button, Text, TooltipContainer } from "@webpack/common";
import { ReactNode } from "react";

const RoleButtonClasses = findByPropsLazy("button", "buttonInner", "icon", "banner");

interface SwitchProfileMenuItemProps {
    id: string;
    label: string;
    subtext: ReactNode;
    action(): void;
}

export default definePlugin({
    name: "SwitchProfileButton",
    description: "Moves the View Main/Server Profile button out of the overflow menu",
    authors: [Devs.Sqaaakoi],

    patches: [
        {
            find: '"view-main-profile"',
            replacement: [
                {
                    match: /(\(0,\i\.jsx\)\(.{0,30}viewProfileItem:)(.{0,850}?\}\))\}\)\]/,
                    replace: (_, overflowMenu, viewProfileItem) => `${viewProfileItem.replaceAll(canonicalizeMatch(/\(\i\.\i(,{id:"view-)/g), "($self.SwitchProfileButton$1")},${overflowMenu}null})]`
                }
            ]
        },
    ],

    SwitchProfileButton: ErrorBoundary.wrap((props: SwitchProfileMenuItemProps) => {
        return <TooltipContainer
            text={<>
                {props.label}
                <Text
                    color="text-muted"
                    variant="text-xs/medium"
                >{props.subtext}</Text>
            </>}
            aria-label={false}
        >
            <Button
                aria-label={props.label}
                onClick={props.action}
                look={Button.Looks.FILLED}
                size={Button.Sizes.NONE}
                color={RoleButtonClasses.bannerColor}
                className={classes(RoleButtonClasses.button, RoleButtonClasses.icon, RoleButtonClasses.banner)}
                innerClassName={classes(RoleButtonClasses.buttonInner, RoleButtonClasses.icon, RoleButtonClasses.banner)}
            >
                <svg aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.3 7.7a1 1 0 0 1 0-1.4l4-4a1 1 0 0 1 1.4 1.4L5.42 6H21a1 1 0 1 1 0 2H5.41l2.3 2.3a1 1 0 1 1-1.42 1.4l-4-4ZM17.7 21.7l4-4a1 1 0 0 0 0-1.4l-4-4a1 1 0 0 0-1.4 1.4l2.29 2.3H3a1 1 0 1 0 0 2h15.59l-2.3 2.3a1 1 0 0 0 1.42 1.4Z" />
                </svg>
            </Button>
        </TooltipContainer>;
    }, { noop: true })
});
