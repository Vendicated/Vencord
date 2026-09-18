/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 danyx64
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { ApplicationCommandInputType } from "@api/Commands";
import definePlugin from "@utils/types";
import { React } from "@webpack/common";

import { isBountiesRoute, openBountiesPage } from "./core";
import { BountiesNavItem, renderBountiesPage } from "./ui";

export default definePlugin({
    name: "DesktopBounties",
    description: "Adds mobile Quest Bounties to Discord desktop with a native-style page, watch progress, Orbs balance and reward claiming.",
    authors: [{
        name: "danyx64",
        id: 1533113566075424881n
    }],
    tags: ["Utility"],

    patches: [
        {
            // Add Bounties to the static Home shortcuts, directly before the DM section divider.
            find: '"dm-quick-launcher"===',
            replacement: {
                match: /(getDerivedStateFromProps\(\i\)\{let\{children:(\i),privateChannelIds:\i\}=\i;)/,
                replace: "$1$2=$self.addBountiesChild($2);"
            }
        },
        {
            // Reuse Discord's Quest Home route so Bounties behaves like a full page instead of a modal.
            find: "2026-06-orbs-holdout",
            replacement: {
                match: /return\s*(\i\s*\?\s*\(0,\i\.jsx\)\(\i,\{adCreativeIds:\i\}\)\s*:)/,
                replace: "return $self.shouldRenderBounties()?$self.renderBountiesPage():$1"
            }
        },
        {
            // The Bounties page intentionally reuses /quest-home. Prevent the native
            // Quests shortcut from also rendering as selected while our sub-route is active.
            find: "nitroHoverGradient",
            replacement: [
                {
                    match: /as:"div",selected:(\i),className:/,
                    replace: "as:\"div\",selected:$self.adjustHomeShortcutSelected(arguments[0].route,$1),className:"
                },
                {
                    match: /(className:\i\(\)\(\i,\i\.\i,\i\.\i,\{\[\i\.\i\]:)(\i)(\}\))/,
                    replace: "$1$self.adjustHomeShortcutSelected(arguments[0].route,$2)$3"
                }
            ]
        }
    ],

    shouldRenderBounties: isBountiesRoute,
    renderBountiesPage,

    adjustHomeShortcutSelected(route: string, selected: boolean) {
        return route === "/quest-home" && isBountiesRoute() ? false : selected;
    },

    addBountiesChild(children: any) {
        if (children == null) return children;

        const list = Array.isArray(children) ? children : React.Children.toArray(children);
        if (list.some((child: any) => child?.key === "vc-desktop-bounties-nav")) return list;

        // Insert before Discord's section divider so Bounties stays grouped with Friends/Nitro/Shop/Quests.
        const dividerIndex = list.findIndex((child: any) =>
            typeof child?.key === "string" && child.key.startsWith("section-divider")
        );
        const insertAt = dividerIndex >= 0 ? dividerIndex : list.length;

        return [
            ...list.slice(0, insertAt),
            <BountiesNavItem key="vc-desktop-bounties-nav" />,
            ...list.slice(insertAt)
        ];
    },

    commands: [{
        name: "bounties",
        description: "Open the Desktop Bounties page",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute() {
            openBountiesPage();
        }
    }]
});
