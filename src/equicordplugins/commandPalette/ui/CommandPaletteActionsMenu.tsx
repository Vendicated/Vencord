/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CogWheel } from "@components/Icons";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import { TextInput, useCallback, useEffect, useMemo, useRef, useState } from "@webpack/common";
import type { KeyboardEvent } from "react";

import type { CommandActionIntent } from "../registry";

const cl = classNameFactory("vc-command-palette-");

export interface PaletteActionItem {
    id: string;
    label: string;
    shortcut: string;
    icon?: React.ComponentType<{ className?: string; size?: string; }>;
    intent: CommandActionIntent;
    disabled?: boolean;
}

interface CommandPaletteActionsMenuProps {
    actions: PaletteActionItem[];
    title?: string;
    onClose(): void;
    onAction(intent: CommandActionIntent): Promise<void> | void;
    isClosing?: boolean;
}

function parseShortcut(shortcut: string): string[] {
    if (!shortcut) return [];
    const tokens = shortcut
        .match(/Esc|Tab|Space|[⌘⌥⇧⌃↵←→↑↓]|[A-Za-z0-9]+/g) ?? [];

    if (!tokens.length) return [shortcut];

    return tokens.map(token => {
        if (token === "Esc" || token === "Tab" || token === "Space") return token;
        if (token.length === 1) return token.toUpperCase();
        return token.toUpperCase();
    });
}

export function CommandPaletteActionsMenu({ actions, title, onClose, onAction, isClosing }: CommandPaletteActionsMenuProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const actionRefs = useRef<Array<HTMLButtonElement | null>>([]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const handleAnimationEnd = () => {
        if (isClosing) {
            onClose();
        }
    };

    const filteredActions = useMemo(() => {
        if (!searchQuery.trim()) return actions;
        const query = searchQuery.toLowerCase();
        return actions.filter(action =>
            action.label.toLowerCase().includes(query)
        );
    }, [actions, searchQuery]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    useEffect(() => {
        searchInputRef.current?.focus();
    }, []);

    useEffect(() => {
        const element = actionRefs.current[selectedIndex];
        if (element) {
            element.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [selectedIndex]);

    const handleActionClick = useCallback((action: PaletteActionItem) => {
        if (action.disabled) return;
        void onAction(action.intent);
        onClose();
    }, [onAction, onClose]);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
            event.preventDefault();
            if (searchQuery) {
                setSearchQuery("");
            } else {
                onClose();
            }
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredActions.length);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            const action = filteredActions[selectedIndex];
            if (action) {
                handleActionClick(action);
            }
            return;
        }
    }, [filteredActions, selectedIndex, handleActionClick, onClose, searchQuery]);

    return (
        <div
            ref={containerRef}
            className={cl("actions-dropdown")}
            onKeyDown={handleKeyDown}
            onAnimationEnd={handleAnimationEnd}
            data-closing={isClosing}
            tabIndex={-1}
        >
            {title && (
                <div className={cl("actions-dropdown-header")}>
                    <span className={cl("actions-dropdown-title")}>{title}</span>
                </div>
            )}

            <div className={classes(cl("actions-dropdown-list"), cl("dropdown-list"))}>
                {filteredActions.length === 0 ? (
                    <div className={cl("actions-dropdown-empty")}>
                        No actions found
                    </div>
                ) : (
                    filteredActions.map((action, index) => {
                        const Icon = action.icon ?? CogWheel;
                        const isSelected = index === selectedIndex;
                        const shortcutKeys = parseShortcut(action.shortcut);

                        return (
                            <button
                                key={action.id}
                                ref={el => { actionRefs.current[index] = el; }}
                                type="button"
                                disabled={action.disabled}
                                className={classes(
                                    cl("action-dropdown-item"),
                                    cl("dropdown-item"),
                                    isSelected && cl("action-dropdown-item-selected"),
                                    isSelected && cl("dropdown-item-selected")
                                )}
                                onClick={() => handleActionClick(action)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className={classes(cl("action-dropdown-icon"), cl("dropdown-icon"))}>
                                    <Icon size="18" />
                                </div>
                                <span className={classes(cl("action-dropdown-label"), cl("dropdown-label"))}>{action.label}</span>
                                <div className={cl("action-dropdown-shortcuts")}>
                                    {shortcutKeys.map((key, keyIndex) => (
                                        <kbd key={keyIndex} className={cl("action-dropdown-key")}>
                                            {key}
                                        </kbd>
                                    ))}
                                </div>
                            </button>
                        );
                    })
                )}
            </div>

            <div className={cl("actions-dropdown-search")}>
                <TextInput
                    inputRef={searchInputRef}
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search for actions..."
                    className={cl("actions-search-input")}
                />
            </div>
        </div>
    );
}
