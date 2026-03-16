/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import { useEffect, useRef } from "@webpack/common";

import type { PaletteSuggestion } from "../pages/types";

const cl = classNameFactory("vc-command-palette-");

interface PaletteDropdownProps {
    suggestions: PaletteSuggestion[];
    highlightedIndex: number;
    className?: string;
    showIcons?: boolean;
    onPick(suggestion: PaletteSuggestion): void;
    onHover(index: number): void;
}

export function PaletteDropdown({ suggestions, highlightedIndex, className, showIcons = true, onPick, onHover }: PaletteDropdownProps) {
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (highlightedIndex < 0) return;
        const list = listRef.current;
        if (!list) return;

        const selected = list.querySelector<HTMLElement>(`[data-index="${highlightedIndex}"]`);
        if (!selected) return;
        selected.scrollIntoView({ block: "nearest" });
    }, [highlightedIndex, suggestions.length]);

    if (suggestions.length === 0) return null;

    return (
        <div className={classes(cl("dropdown"), className)}>
            <div ref={listRef} className={cl("dropdown-list")}>
                {suggestions.map((suggestion, index) => {
                    const selected = index === highlightedIndex;
                    return (
                        <button
                            key={suggestion.id}
                            type="button"
                            tabIndex={-1}
                            data-index={index}
                            className={classes(cl("dropdown-item"), selected && cl("dropdown-item-selected"))}
                            onMouseDown={event => {
                                event.preventDefault();
                                onPick(suggestion);
                            }}
                            onClick={() => onPick(suggestion)}
                            onMouseEnter={() => onHover(index)}
                        >
                            {showIcons && (
                                <span className={cl("dropdown-icon")}>
                                    {suggestion.icon ? (
                                        <suggestion.icon size="16" />
                                    ) : suggestion.iconUrl ? (
                                        <img src={suggestion.iconUrl} alt="" />
                                    ) : (
                                        <span className={cl("dropdown-icon-fallback")}>
                                            {suggestion.kind === "channel"
                                                ? "#"
                                                : suggestion.kind === "guild"
                                                    ? "G"
                                                    : suggestion.kind === "user"
                                                        ? "@"
                                                        : "•"}
                                        </span>
                                    )}
                                </span>
                            )}
                            <span className={cl("dropdown-label")}>{suggestion.label}</span>
                            {suggestion.sublabel && (
                                <span className={cl("dropdown-sublabel")}>{suggestion.sublabel}</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
