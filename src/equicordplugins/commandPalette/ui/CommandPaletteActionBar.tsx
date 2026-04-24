/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { EquicordIcon } from "@equicordplugins/discordDevBanner/components";
import { IS_MAC } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";

const cl = classNameFactory("vc-command-palette-");

interface CommandPaletteActionBarProps {
    selectedLabel?: string;
    onOpenActions?(): void;
    compact?: boolean;
    onExpand?(): void;
}

export function CommandPaletteActionBar({ selectedLabel, onOpenActions, compact, onExpand }: CommandPaletteActionBarProps) {
    const actionsShortcutLabel = IS_MAC ? "⌘L" : "Ctrl+L";

    if (compact) {
        return (
            <div className={cl("action-bar")}>
                <div className={classes(cl("action-bar-label"), cl("action-bar-logo"))}>
                    <EquicordIcon />
                </div>
                <button
                    type="button"
                    className={cl("action-bar-compact-btn")}
                    onClick={onExpand}
                >
                    <span className={cl("action-bar-actions-label")}>Show More</span>
                    <span>↓</span>
                </button>
            </div>
        );
    }

    return (
        <div className={cl("action-bar")}>
            <div className={cl("action-bar-label")}>
                {selectedLabel ? (
                    <span className={cl("row-subtitle")}>{selectedLabel}</span>
                ) : (
                    <span className={cl("action-bar-placeholder")}>No selection</span>
                )}
            </div>
            <button
                type="button"
                className={cl("action-bar-actions-button")}
                onClick={onOpenActions}
            >
                <span className={cl("action-bar-actions-label")}>Actions</span>
                <span className={cl("action-bar-key")}>{actionsShortcutLabel}</span>
            </button>
        </div>
    );
}
