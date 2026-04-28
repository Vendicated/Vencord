/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./index.css";

import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { React, useRef, useState } from "@webpack/common";

/** Use the exact same header icon component  */
const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

/** Body class & style to hide the left Channels sidebar (matches hashed prefix) */
const BODY_TOGGLE = "hm-hide-sidebar";

/* ----------------------------- Header Icon ----------------------------- */

function ToggleGuildAndChannelListIcon() {
    const buttonRef = useRef<HTMLDivElement | null>(null);
    const [hidden, setHidden] = useState(document.body.classList.contains(BODY_TOGGLE));


    const onClick = () => {
        document.body.classList.toggle(BODY_TOGGLE);
        setHidden(document.body.classList.contains(BODY_TOGGLE));
    };

    const refresh = () => setHidden(document.body.classList.contains(BODY_TOGGLE));

    const tooltip = hidden ? "Show Guilds and Channels" : "Hide Guilds and Channels";

    return (
        <HeaderBarIcon
            ref={buttonRef as any}
            className="vc-toggle-guild-and-channel-btn"
            onClick={onClick}
            onMouseEnter={refresh}
            onFocus={refresh}
            tooltip={tooltip}
            selected={hidden}
            icon={() => (
                <svg fill="currentColor" viewBox="0 0 24 24" width={24} height={24} className="vc-toggle-guild-and-channel-icon">
                    <circle cx="5" cy="6" r="1.6" />
                    <rect x="9" y="5" width="11" height="2" rx="1" />
                    <circle cx="5" cy="12" r="1.6" />
                    <rect x="9" y="11" width="11" height="2" rx="1" />
                    <circle cx="5" cy="18" r="1.6" />
                    <rect x="9" y="17" width="11" height="2" rx="1" />
                </svg>
            )}
        />
    );
}

function ToggleGuildAndChannelListFragmentWrapper({ children }: { children: React.ReactNode[]; }) {
    return <>
        <ErrorBoundary noop key="vc-toggle-guild-and-channel">
            <ToggleGuildAndChannelListIcon />
        </ErrorBoundary>
        {...children}
    </>;
}


export default definePlugin({
    name: "ToggleGuildAndChannelList",
    description: "Adds a channel header icon to toggle the left Channels and Guild sidebars.",
    authors: [],

    patches: [
        {
            find: ".controlButtonWrapper,",
            replacement: {
                match: /(?<=toolbar:function\(.{0,100}\()\i.Fragment,/,
                replace: "$self.ToggleGuildAndChannelListFragmentWrapper,"
            }
        }
    ],

    ToggleGuildAndChannelListFragmentWrapper: ErrorBoundary.wrap(ToggleGuildAndChannelListFragmentWrapper, {
        fallback: () => <span style={{ color: "red" }}>ToggleGuildAndChannelList failed to render</span>
    }),

    start() {
    },

    stop() {
    }
});
