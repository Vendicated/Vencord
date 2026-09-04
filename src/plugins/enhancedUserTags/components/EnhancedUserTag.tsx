/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Tooltip } from "@webpack/common";

import { TagDetails } from "../tag";
import { HalfedCrownIcon } from "./Icons";

export default function EnhancedUserTag(tagDetails: TagDetails & {
    style: React.CSSProperties;
}) {
    // only original discord tags have no text
    // and them already have `span` wrapper with styles so no need to wrap into extra one
    if (!tagDetails.text)
        return <tagDetails.icon />;

    // for custom official tag
    if (tagDetails.gap)
        tagDetails.style.gap = "4px";

    return <Tooltip
        text={tagDetails.text}
        // @ts-ignore
        tooltipStyle={{
            // to fit largest text of tooltip `Thread Creator | Moderator (Timeout Members,`
            maxWidth: "350px",
            whiteSpace: "pre-line",
        } as React.CSSProperties}
    >
        {({ onMouseEnter, onMouseLeave }) => (
            <span
                style={tagDetails.style}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
            >
                <tagDetails.icon />
                {
                    tagDetails.halfGold ? <HalfedCrownIcon /> : null
                }
            </span>
        )}
    </Tooltip>;
}
