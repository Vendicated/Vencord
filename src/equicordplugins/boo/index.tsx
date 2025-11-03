/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { Tooltip, useEffect, useState } from "@webpack/common";

import { Boo, getBooCount, onBooCountChange } from "./Boo";
import { IconGhost } from "./IconGhost";

export const cl = classNameFactory("vc-boo-");



function BooIndicator() {
    const [count, setCount] = useState(getBooCount());

    useEffect(() => {
        const unsubscribe = onBooCountChange(setCount);
        return () => unsubscribe();
    }, []);

    return (
        <div id={cl("container")}>
            <Tooltip text={`${count} Ghosted Users`} position="right">
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        id={cl("container")}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        {count} <IconGhost fill="currentColor" />
                    </div>
                )}
            </Tooltip>
        </div>
    );
}

export default definePlugin({
    name: "Boo",
    description: "A cute ghost will appear if you don't answer their DMs",
    authors: [EquicordDevs.vei, Devs.sadan],

    patches: [
        {
            find: "interactiveSelected]",
            replacement: {
                match: /interactiveSelected.{0,50}children:\[/,
                replace: "$&$self.renderBoo(arguments[0]),"
            }
        },
    ],

    renderBoo(props: { channel: Channel; }) {
        return (
            <ErrorBoundary noop>
                <Boo {...props} />
            </ErrorBoundary>
        );
    },

    renderIndicator() {
        return (
            <ErrorBoundary noop>
                <BooIndicator />
            </ErrorBoundary>
        );
    },

    start() {
        addServerListElement(ServerListRenderPosition.Above, this.renderIndicator);
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.renderIndicator);
    },
});
