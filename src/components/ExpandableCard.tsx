/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./ExpandableCard.css";

import { classes } from "@utils/misc";
import { Clickable, React, useState } from "@webpack/common";
import { PropsWithChildren } from "react";

import { Card } from "./Card";
import { DownArrow, RightArrow } from "./Icons";

export type ExpandableSectionProps = PropsWithChildren<{
    renderContent: () => React.ReactNode;
    className?: string;
    initialExpanded?: boolean;
    expanded?: boolean;
    onExpandedChange?: (expanded: boolean) => void;
}>;

/**
 * A card component that can expand and collapse to show/hide content. The header (props.children) is always visible, and the content (props.renderContent) is only visible when expanded.
 */
export function ExpandableSection({ children, renderContent, className, initialExpanded = false, expanded: controlledExpanded, onExpandedChange }: ExpandableSectionProps) {
    const [localExpanded, setLocalExpanded] = useState(initialExpanded);
    const expanded = controlledExpanded ?? localExpanded;
    const contentId = React.useId();

    const Icon = expanded ? DownArrow : RightArrow;

    return (
        <Card data-expanded={expanded} className={classes("vc-expandable-card", className)}>
            <Clickable
                className="vc-expandable-card-header"
                aria-expanded={expanded}
                aria-controls={contentId}
                onClick={() => {
                    if (controlledExpanded === undefined) setLocalExpanded(!expanded);
                    onExpandedChange?.(!expanded);
                }}
            >
                {children}
                <Icon className="vc-expandable-card-icon" />
            </Clickable>

            <div id={contentId} className="vc-expandable-card-content" hidden={!expanded}>
                {expanded ? renderContent() : null}
            </div>
        </Card>
    );
}
