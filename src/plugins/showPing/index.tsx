/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin from "@utils/types";
import { React } from "@webpack/common";

import { PingElement } from "./components/Ping";
import { settings } from "./settings";

import { findByPropsLazy } from "@webpack";

const classes = findByPropsLazy("voiceUsers", "channel");
const oldContainer = classes.container;

export default definePlugin({
    name: "ShowPing",
    description: "Displays your live ping.",
    authors: [{
        name: "nicola02nb",
        id: 257900031351193600n
    }],
    settings,
    patches: [
        {
            find: ".hoverableStatus),hoverText:",
            replacement: {
                match: /(children:\i}\):null,children:)(\(0,\i.jsx\)\(\i.Text,.+?\i\}\))/,
                replace: "$1[$2,$self.renderPing()]"
            }
        },
        {
            find: "\"quality\",\"largePing\"",
            replacement: {
                match: /(\(0,\i.jsx\)\(\i,\i\({className:\i\(\)\(\i.ping,{\[\i.largePing\]:\i}\)},i\)\))/,
                replace: " $self.renderContainer($1)"
            }
        }
    ],
    start: () => {
        classes.container += " vc-connection-container";
    },
    stop: () => {
        classes.container = oldContainer;
    },

    renderPing() {
        if (!settings.store.showNearbyConnectionStatus) return null;
        return <PingElement variant="text-sm/medium" />;
    },
    renderContainer(children: React.ReactNode) {
        if (!settings.store.showUnderConnectionIcon) return children;
        return <div className="pingContainer">
            {children}
            <PingElement variant="text-xxs/medium" parenthesis={false} color="var(--text-feedback-positive)" />
        </div>;
    }
});


