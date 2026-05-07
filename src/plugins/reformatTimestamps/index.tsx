/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { useForceUpdater } from "@utils/react";
import definePlugin from "@utils/types";
import { findByCodeLazy, findLazy } from "@webpack";
import { Menu, moment, Popout, useEffect, useRef, useState } from "@webpack/common";

const TimeFormats = findLazy(m => m?.D && m?.F && m?.d && m?.t);
const getParsedTimestamp = findByCodeLazy("{timestamp:", ",format:");

export const TimestampPopout = ({ node, TimestampComponent, channelOptions }) => {
    const [currentNode, setNode] = useState(node);
    const formats = Object.keys(TimeFormats);
    const update = useForceUpdater();
    const targetRef = useRef<HTMLSpanElement>(null);

    const setTimestampFormat = format => {
        if (!currentNode) return;
        setNode(getParsedTimestamp(currentNode.timestamp, format));
    };

    useEffect(() => {
        if (!currentNode) return;
        const interval = setInterval(() => {
            moment.relativeTimeThreshold("ss", -1);
            update();
        }, 1000);

        return () => clearInterval(interval);
    }, [currentNode]);

    return (
        <Popout
            targetElementRef={targetRef}
            position="top"
            align="center"
            renderPopout={({ closePopout }) => {
                return (
                    <Menu.Menu
                        navId="timestamp-format"
                        onClose={closePopout}
                    >
                        <Menu.MenuGroup
                            label="Timestamp format"
                        >
                            {formats.map((format, i) => format === currentNode.format ? null : (
                                <Menu.MenuItem
                                    id={format}
                                    label={TimeFormats[format](currentNode.parsed)}
                                    key={i}
                                    action={() => {
                                        setTimestampFormat(format);
                                        closePopout();
                                    }}
                                />
                            ))}
                        </Menu.MenuGroup>
                    </Menu.Menu>
                );
            }}
        >
            {popoutProps =>
                <span {...popoutProps} style={{ cursor: "pointer" }} ref={targetRef}>
                    <TimestampComponent node={currentNode} key={channelOptions.key}/>
                </span>
            }
        </Popout>
    );
};

export default definePlugin({
    name: "ReformatTimestamps",
    description: "Click on a timestamp to change its format locally",
    authors: [Devs.Suffocate],

    patches: [
        {
            find: "style:{\"--totalCharacters\":",
            replacement: [
                {
                    match: /timestamp:\{react:.*?(\i\.\i),\{node.*?\.key\)},/,
                    replace: "timestamp:$self.renderTimestampPopout($1),"
                }
            ]
        },
    ],

    renderTimestampPopout: timestampComponent => {
        return {
            react: (node, t, channelOptions) => {
                return <TimestampPopout node={node} TimestampComponent={timestampComponent}
                                        channelOptions={channelOptions}/>;
            }
        };
    }
});
