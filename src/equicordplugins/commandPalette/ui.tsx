/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { IS_LINUX, IS_MAC, IS_WINDOWS } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { closeAllModals, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React, TextInput, useCallback, useEffect, useMemo, useRef, useState } from "@webpack/common";
import type { CSSProperties } from "react";

import { settings } from "./index";
import {
    type CommandCategory,
    type CommandEntry,
    type CommandTagMeta,
    DEFAULT_CATEGORY_ID,
    executeCommand,
    getCategoryGroupLabel,
    getCategoryPath,
    getCategoryWeight,
    getCommandSearchText,
    getCommandTagIds,
    getRecentRank,
    getRegistryVersion,
    listAllTags,
    listChildCategories,
    listCommands,
    listCommandsByCategory,
    listCommandsInTree,
    normalizeTag,
    refreshAllContextProviders,
    subscribePinned,
    subscribeRegistry,
    togglePinned
} from "./registry";

const cl = classNameFactory("vc-command-palette-");

const DEFAULT_TAG_COLOR = {
    dot: "rgba(var(--brand-experiment-500-rgb, 88 101 242) / 100%)",
    glow: "rgba(var(--brand-experiment-500-rgb, 88 101 242) / 35%)"
};

const TAG_COLOR_MAP: Record<string, { dot: string; glow: string; }> = {
    danger: {
        dot: "var(--status-danger-background, #ed4245)",
        glow: "rgba(237, 66, 69, 0.4)"
    },
    warning: {
        dot: "var(--status-warning-background, #faa61a)",
        glow: "rgba(250, 166, 26, 0.4)"
    },
    custom: {
        dot: "rgba(186, 104, 200, 1)",
        glow: "rgba(186, 104, 200, 0.35)"
    },
    core: {
        dot: "rgba(78, 201, 176, 1)",
        glow: "rgba(78, 201, 176, 0.35)"
    },
    navigation: {
        dot: "rgba(59, 130, 246, 1)",
        glow: "rgba(59, 130, 246, 0.35)"
    },
    utility: {
        dot: "rgba(255, 140, 0, 1)",
        glow: "rgba(255, 140, 0, 0.35)"
    },
    developer: {
        dot: "rgba(147, 112, 219, 1)",
        glow: "rgba(147, 112, 219, 0.35)"
    },
    customization: {
        dot: "rgba(244, 114, 182, 1)",
        glow: "rgba(244, 114, 182, 0.35)"
    },
    plugins: {
        dot: "rgba(56, 189, 248, 1)",
        glow: "rgba(56, 189, 248, 0.35)"
    },
    session: {
        dot: "rgba(0, 200, 255, 1)",
        glow: "rgba(0, 200, 255, 0.35)"
    },
    context: {
        dot: "rgba(0, 168, 120, 1)",
        glow: "rgba(0, 168, 120, 0.35)"
    }
};

function getTagColors(tagSlug: string) {
    return TAG_COLOR_MAP[tagSlug] ?? DEFAULT_TAG_COLOR;
}

function getTagIndicatorStyle(tagSlug: string): CSSProperties {
    const entry = getTagColors(tagSlug);
    return {
        background: entry.dot,
        boxShadow: `0 0 0 2px ${entry.glow}`
    };
}

function getTagColorStyle(tagSlug: string): CSSProperties {
    const entry = getTagColors(tagSlug);
    return {
        "--tag-chip-color": entry.dot,
        "--tag-chip-glow": entry.glow
    } as CSSProperties;
}

type CommandItem = {
    type: "command";
    command: CommandEntry;
    pinned: boolean;
};

type PaletteItem =
    | { type: "category"; category: CommandCategory; }
    | { type: "section"; label: string; }
    | CommandItem;

export function CommandPalette({ modalProps }) {
    const [query, setQuery] = useState("");
    const [categoryStack, setCategoryStack] = useState<CommandCategory[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number>(-1);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [registryVersion, setRegistryVersion] = useState(() => getRegistryVersion());
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
    const [visible, setVisible] = useState(false);
    const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
    const { visualStyle = "classic" } = settings.use(["visualStyle"]);
    const styleClass = visualStyle === "polished" ? "style-polished" : "style-classic";

    const showTags = settings.store.showTags ?? true;
    const tagFilterEnabled = showTags && (settings.store.enableTagFilter ?? true);

    const listRef = useRef<HTMLDivElement | null>(null);
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const isSelectableItem = (item?: PaletteItem) => Boolean(item && item.type !== "section");

    const getFirstSelectableIndex = (list: PaletteItem[]) => {
        for (let i = 0; i < list.length; i += 1) {
            if (isSelectableItem(list[i])) return i;
        }
        return -1;
    };

    const getNextSelectableIndex = (start: number, direction: 1 | -1, list: PaletteItem[]) => {
        if (list.length === 0) return -1;
        if (!list.some(item => isSelectableItem(item))) return -1;
        let index = start;
        for (let i = 0; i < list.length; i += 1) {
            index = (index + direction + list.length) % list.length;
            if (isSelectableItem(list[index])) return index;
        }
        return getFirstSelectableIndex(list);
    };

    useEffect(() => {
        const unsubscribe = subscribePinned(ids => {
            setPinnedIds(new Set(ids));
        });
        return unsubscribe;
    }, []);

    useEffect(() => subscribeRegistry(setRegistryVersion), []);

    useEffect(() => {
        const frame = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    const allTags = useMemo<CommandTagMeta[]>(() => listAllTags(), [registryVersion]);

    useEffect(() => {
        const available = new Set(allTags.map(tag => tag.id));
        setActiveTagIds(prev => {
            if (available.size === 0) {
                return prev.length ? [] : prev;
            }
            const filtered = prev.filter(id => available.has(id));
            return filtered.length === prev.length ? prev : filtered;
        });
    }, [allTags]);

    const hotkeyTags = useMemo(() => allTags.slice(0, 9), [allTags]);
    const tagLabelMap = useMemo(() => new Map(allTags.map(tag => [tag.id, tag.label])), [allTags]);

    const activeTagSet = useMemo(() => new Set(activeTagIds), [activeTagIds]);
    const activeTagLabels = useMemo(
        () => activeTagIds
            .map(id => tagLabelMap.get(id) ?? id)
            .filter((label, index, arr) => arr.indexOf(label) === index),
        [activeTagIds, tagLabelMap]
    );

    const toggleTag = useCallback((tagId: string) => {
        setActiveTagIds(prev => {
            if (prev.includes(tagId)) {
                return prev.filter(id => id !== tagId);
            }
            return [...prev, tagId];
        });
    }, []);

    const trimmedQuery = query.trim();
    const isSearching = trimmedQuery.length > 0;
    const currentCategory = categoryStack[categoryStack.length - 1] ?? null;

    const allCommands = useMemo(() => listCommands(), [registryVersion]);
    const commandMap = useMemo(() => new Map(allCommands.map(entry => [entry.id, entry])), [allCommands]);

    const activeTagKey = useMemo(() => activeTagIds.slice().sort().join("|"), [activeTagIds]);

    useEffect(() => {
        refreshAllContextProviders();
    }, [activeTagKey, tagFilterEnabled]);

    const matchingCommandIds = useMemo(() => {
        if (!tagFilterEnabled || activeTagIds.length === 0) return null;
        const required = new Set(activeTagIds);
        const matches = new Set<string>();
        for (const entry of allCommands) {
            const tags = getCommandTagIds(entry.id);
            if (!tags.length) continue;
            let ok = true;
            for (const tagId of required) {
                if (!tags.includes(tagId)) {
                    ok = false;
                    break;
                }
            }
            if (ok) matches.add(entry.id);
        }
        return matches;
    }, [allCommands, tagFilterEnabled, activeTagKey]);

    const matchesActiveTags = useCallback((entry: CommandEntry) => {
        if (!tagFilterEnabled) return true;
        if (!matchingCommandIds) return true;
        return matchingCommandIds.has(entry.id);
    }, [tagFilterEnabled, matchingCommandIds]);

    const childCategories = useMemo(() => {
        const parentId = currentCategory?.id ?? null;
        const categories = listChildCategories(parentId);
        if (isSearching) return [];
        if (matchingCommandIds) {
            return categories.filter(category => {
                const entries = listCommandsInTree(category.id);
                return entries.some(entry => matchingCommandIds.has(entry.id));
            });
        }
        return categories;
    }, [isSearching, currentCategory, registryVersion, matchingCommandIds]);

    const pinnedCommands = useMemo(() => {
        if (pinnedIds.size === 0) return [];
        const ordered: CommandEntry[] = [];
        for (const id of pinnedIds) {
            const entry = commandMap.get(id);
            if (entry) ordered.push(entry);
        }
        return ordered;
    }, [pinnedIds, commandMap]);

    const pinnedForView = useMemo(() => {
        if (isSearching) return [];
        let base = pinnedCommands;
        if (currentCategory) {
            const inTree = new Set(listCommandsInTree(currentCategory.id).map(entry => entry.id));
            base = base.filter(entry => inTree.has(entry.id));
        }
        if (matchingCommandIds) {
            base = base.filter(entry => matchingCommandIds.has(entry.id));
        }
        return base;
    }, [pinnedCommands, currentCategory, isSearching, registryVersion, matchingCommandIds]);

    const visibleCommands = useMemo(() => {
        const lower = trimmedQuery.toLowerCase();

        const scoreCommand = (entry: CommandEntry, isPinned: boolean) => {
            const labelLower = entry.label.toLowerCase();
            let score = 0;

            if (labelLower === lower) score += 60;
            else if (labelLower.startsWith(lower)) score += 45;
            else if (labelLower.includes(lower)) score += 30;

            const labelTokens = labelLower.split(/[^a-z0-9]+/);
            if (labelTokens.includes(lower)) score += 20;

            if (entry.keywords && entry.keywords.length) {
                const keywordMatches = entry.keywords
                    .map(keyword => keyword.toLowerCase())
                    .filter(Boolean);
                if (keywordMatches.includes(lower)) score += 35;
                else if (keywordMatches.some(keyword => keyword.includes(lower))) score += 15;
            }

            const descriptionLower = entry.description?.toLowerCase() ?? "";
            if (descriptionLower.includes(lower)) score += 10;

            if (entry.tags && entry.tags.length) {
                const tagMatches = entry.tags.map(tag => tag.toLowerCase());
                if (tagMatches.includes(lower)) score += 25;
                else if (tagMatches.some(tag => tag.includes(lower))) score += 10;
            }

            if (score === 0) score = 5;

            score += getCategoryWeight(entry.categoryId);

            if (isPinned) score += 50;

            const recentRank = getRecentRank(entry.id);
            if (recentRank >= 0) {
                score += Math.max(0, 30 - recentRank * 4);
            }

            return score;
        };

        if (lower) {
            const source = currentCategory
                ? listCommandsInTree(currentCategory.id)
                : allCommands;

            let order = 0;
            const bestByGroup = new Map<string, { entry: CommandEntry; score: number; order: number; }>();

            for (const entry of source) {
                const isPinned = pinnedIds.has(entry.id);
                if (!isPinned && entry.hiddenInSearch) continue;
                if (!matchesActiveTags(entry)) continue;

                const searchText = getCommandSearchText(entry.id);
                if (!searchText.includes(lower)) continue;

                const score = scoreCommand(entry, isPinned);
                const groupKey = entry.searchGroup ?? entry.id;
                const existing = bestByGroup.get(groupKey);
                if (!existing || score > existing.score || (score === existing.score && order < existing.order)) {
                    bestByGroup.set(groupKey, { entry, score, order });
                }
                order += 1;
            }

            return Array.from(bestByGroup.values())
                .sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.order - b.order;
                })
                .map(item => item.entry);
        }

        const sortByPinned = (entries: CommandEntry[]) =>
            [...entries].sort((a, b) => {
                const pinnedA = pinnedIds.has(a.id) ? 1 : 0;
                const pinnedB = pinnedIds.has(b.id) ? 1 : 0;
                if (pinnedA !== pinnedB) return pinnedB - pinnedA;
                const dangerA = a.danger ? 1 : 0;
                const dangerB = b.danger ? 1 : 0;
                if (dangerA !== dangerB) return dangerA - dangerB;
                return a.label.localeCompare(b.label);
            });

        let base: CommandEntry[] = [];
        if (currentCategory && childCategories.length === 0) {
            base = listCommandsByCategory(currentCategory.id);
        } else if (!currentCategory && childCategories.length === 0) {
            base = listCommandsByCategory(DEFAULT_CATEGORY_ID);
        }

        if (matchingCommandIds) {
            base = base.filter(entry => matchingCommandIds.has(entry.id));
        }

        return sortByPinned(base);
    }, [
        trimmedQuery,
        currentCategory,
        childCategories,
        pinnedIds,
        registryVersion,
        allCommands,
        matchesActiveTags,
        matchingCommandIds
    ]);

    const items = useMemo<PaletteItem[]>(() => {
        if (isSearching) {
            const grouped = new Map<string, CommandItem[]>();
            const order: string[] = [];

            for (const entry of visibleCommands) {
                const label = getCategoryGroupLabel(entry.categoryId);
                if (!grouped.has(label)) {
                    grouped.set(label, []);
                    order.push(label);
                }
                grouped.get(label)!.push({
                    type: "command",
                    command: entry,
                    pinned: pinnedIds.has(entry.id)
                });
            }

            const result: PaletteItem[] = [];
            for (const label of order) {
                const commands = grouped.get(label);
                if (!commands || commands.length === 0) continue;
                result.push({ type: "section", label });
                result.push(...commands);
            }

            return result;
        }

        const pinnedItems: CommandItem[] = pinnedForView.map(command => ({
            type: "command",
            command,
            pinned: true
        }));

        const categoryItems: PaletteItem[] = childCategories.map(category => ({ type: "category", category }));

        const commandItems: CommandItem[] = visibleCommands
            .filter(entry => !pinnedIds.has(entry.id))
            .map(entry => ({ type: "command", command: entry, pinned: pinnedIds.has(entry.id) }));

        return [...pinnedItems, ...categoryItems, ...commandItems];
    }, [childCategories, visibleCommands, pinnedForView, pinnedIds, isSearching, showTags]);

    const getItemKey = useCallback((item: PaletteItem): string => {
        switch (item.type) {
            case "category":
                return `category:${item.category.id}`;
            case "section":
                return `section:${item.label}`;
            case "command":
                return `command:${item.command.id}`;
            default:
                return "unknown";
        }
    }, []);

    useEffect(() => {
        if (items.length === 0) {
            if (selectedIndex !== -1) setSelectedIndex(-1);
            if (selectedKey !== null) setSelectedKey(null);
            return;
        }

        if (selectedKey) {
            const targetIndex = items.findIndex(item => isSelectableItem(item) && getItemKey(item) === selectedKey);
            if (targetIndex !== -1) {
                if (targetIndex !== selectedIndex) setSelectedIndex(targetIndex);
                return;
            }
            if (selectedIndex !== -1) setSelectedIndex(-1);
            setSelectedKey(null);
            return;
        }

        if (selectedIndex >= items.length || (selectedIndex >= 0 && !isSelectableItem(items[selectedIndex]))) {
            if (selectedIndex !== -1) setSelectedIndex(-1);
        }
        if (selectedKey !== null) setSelectedKey(null);
    }, [items, selectedKey, selectedIndex, getItemKey]);

    useEffect(() => {
        if (trimmedQuery.length > 0) {
            const first = getFirstSelectableIndex(items);
            if (first !== selectedIndex) setSelectedIndex(first);
            const key = first >= 0 ? getItemKey(items[first]) : null;
            if (key !== selectedKey) setSelectedKey(key);
        }
    }, [trimmedQuery, items, selectedIndex, selectedKey, getItemKey]);

    useEffect(() => {
        if (selectedIndex < 0) return;
        const node = itemRefs.current[selectedIndex];
        if (node) node.scrollIntoView({ block: "nearest" });
    }, [selectedIndex, items]);

    const handleSelectCategory = (category: CommandCategory) => {
        setCategoryStack(stack => [...stack, category]);
        setSelectedIndex(-1);
        setSelectedKey(null);
    };

    const handleBack = () => {
        setCategoryStack(stack => stack.slice(0, -1));
        setSelectedIndex(-1);
        setSelectedKey(null);
    };

    const runCommand = async (entry: CommandEntry) => {
        closeAllModals();
        await executeCommand(entry);
    };

    const handleActivateItem = async (item: PaletteItem | undefined) => {
        if (!item || item.type === "section") return;
        if (item.type === "category") {
            handleSelectCategory(item.category);
        } else {
            await runCommand(item.command);
        }
    };

    itemRefs.current = itemRefs.current.slice(0, items.length);

    const breadcrumbLabel = categoryStack.map(cat => cat.label).join(" / ");
    const showBreadcrumb = !isSearching && categoryStack.length > 0;

    return (
        <ModalRoot {...modalProps} className={cl("root", styleClass, visible && "root-visible")}
            size={ModalSize.SMALL}
        >
            <div
                className={cl("container")}
                onKeyDown={async e => {
                    if (showTags && tagFilterEnabled && e.altKey && !e.ctrlKey && !e.metaKey) {
                        let digit = -1;
                        if (e.code?.startsWith("Digit")) {
                            digit = Number(e.code.slice(5));
                        } else if (/^[0-9]$/.test(e.key)) {
                            digit = Number(e.key);
                        }

                        if (digit >= 1 && digit <= hotkeyTags.length) {
                            e.preventDefault();
                            const target = hotkeyTags[digit - 1];
                            if (target) toggleTag(target.id);
                            return;
                        }

                        if (digit === 0) {
                            e.preventDefault();
                            setActiveTagIds(prev => (prev.length ? [] : prev));
                            return;
                        }
                    }
                    if (e.key === "ArrowDown" && items.length > 0) {
                        e.preventDefault();
                        const next = getNextSelectableIndex(selectedIndex, 1, items);
                        if (next !== -1) {
                            if (next !== selectedIndex) setSelectedIndex(next);
                            const key = getItemKey(items[next]);
                            if (key !== selectedKey) setSelectedKey(key);
                        }
                        return;
                    }

                    if (e.key === "ArrowUp" && items.length > 0) {
                        e.preventDefault();
                        const next = getNextSelectableIndex(selectedIndex, -1, items);
                        if (next !== -1) {
                            if (next !== selectedIndex) setSelectedIndex(next);
                            const key = getItemKey(items[next]);
                            if (key !== selectedKey) setSelectedKey(key);
                        }
                        return;
                    }

                    if (e.key === "ArrowLeft" && categoryStack.length > 0) {
                        e.preventDefault();
                        handleBack();
                        return;
                    }

                    if (e.key === "ArrowRight") {
                        const item = items[selectedIndex];
                        if (isSelectableItem(item)) {
                            e.preventDefault();
                            await handleActivateItem(item);
                        }
                        return;
                    }

                    if (e.key === "Enter") {
                        const fallback = visibleCommands[0]
                            ? ({ type: "command", command: visibleCommands[0], pinned: pinnedIds.has(visibleCommands[0].id) } satisfies CommandItem)
                            : undefined;
                        const item = items[selectedIndex] ?? fallback;
                        if (item && isSelectableItem(item)) {
                            e.preventDefault();
                            await handleActivateItem(item);
                        }
                    }
                }}
            >
                <div className={cl("header")}>
                    <div className={cl("header-top")}>
                        <span className={cl("title")}>Command Palette</span>
                        {showBreadcrumb && (
                            <div className={cl("header-trail")}
                                onMouseDown={e => e.preventDefault()}
                            >
                                <button
                                    className={cl("back")}
                                    onClick={handleBack}
                                    type="button"
                                >
                                    ‹
                                </button>
                                <span className={cl("header-trail-path")}>{breadcrumbLabel}</span>
                            </div>
                        )}
                    </div>
                    <div className={cl("search")}
                        onMouseDown={e => {
                            // prevent focus outline from showing on click
                            e.preventDefault();
                            e.currentTarget.querySelector("input")?.focus({ preventScroll: true });
                        }}
                    >
                        <span className={cl("prompt")}>›</span>
                        <TextInput
                            autoFocus
                            value={query}
                            onChange={value => setQuery(value)}
                            placeholder="Type a command"
                        />
                    </div>
                </div>
                {showTags && tagFilterEnabled && allTags.length > 0 && (
                    <div className={cl("tag-filter-wrapper")}
                        onMouseDown={e => e.preventDefault()}
                    >
                        <div className={cl("tag-filter")}
                        >
                            {allTags.map(tag => {
                                const isActive = activeTagSet.has(tag.id);
                                const hotkeyIndex = hotkeyTags.findIndex(h => h.id === tag.id);
                                const tagSlug = normalizeTag(tag.label ?? tag.id);
                                const colorStyle = getTagColorStyle(tagSlug || tag.id);
                                const indicatorStyle = getTagIndicatorStyle(tagSlug || tag.id);
                                const hotkeyPrefix = IS_MAC ? "⌥" : IS_WINDOWS ? "Alt" : IS_LINUX ? "Alt" : "Alt";
                                return (
                                    <button
                                        key={tag.id}
                                        className={cl("tag-button", { active: isActive })}
                                        onClick={() => toggleTag(tag.id)}
                                        type="button"
                                        style={colorStyle}
                                    >
                                        {isActive && <span className={cl("tag-indicator")} aria-hidden="true" style={indicatorStyle} />}
                                        <span className={cl("tag-label")}>{tag.label}</span>
                                        <span className={cl("tag-count")}>{tag.count}</span>
                                        {hotkeyIndex !== -1 && (
                                            <span className={cl("tag-hotkey")}>{`${hotkeyPrefix}+${hotkeyIndex + 1}`}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {activeTagLabels.length > 0 && (
                            <div className={cl("tag-status")}>
                                Filtering by {activeTagLabels.join(", ")}
                            </div>
                        )}
                    </div>
                )}
                <div className={cl("list")} ref={listRef}>
                    {items.length === 0 && (
                        <div className={cl("empty")}>No commands found</div>
                    )}
                    {items.map((item, index) => {
                        const isSelected = index === selectedIndex;

                        if (item.type === "section") {
                            itemRefs.current[index] = null;
                            return (
                                <div
                                    key={`section-${index}`}
                                    className={cl("section")}
                                >
                                    {item.label}
                                </div>
                            );
                        }

                        if (item.type === "category") {
                            return (
                                <button
                                    key={`category-${item.category.id}`}
                                    className={cl("item", "category", { selected: isSelected })}
                                    onClick={() => handleSelectCategory(item.category)}
                                    type="button"
                                    ref={el => {
                                        itemRefs.current[index] = el;
                                    }}
                                >
                                    <div className={cl("item-content")}>
                                        <div className={cl("text")}>
                                            <div className={cl("label")}>{item.category.label}</div>
                                            {item.category.description && (
                                                <div className={cl("description")}>{item.category.description}</div>
                                            )}
                                        </div>
                                        <span className={cl("category-indicator")}>›</span>
                                    </div>
                                </button>
                            );
                        }

                        const { command, pinned } = item;
                        const path = getCategoryPath(command.categoryId);
                        const pathLabel = path
                            .filter(cat => cat.id !== DEFAULT_CATEGORY_ID)
                            .map(cat => cat.label)
                            .join(" / ");
                        const metaParts: string[] = [];
                        if (command.shortcut) metaParts.push(command.shortcut);
                        if (pinned) metaParts.push("Pinned");
                        if (pathLabel) metaParts.push(pathLabel);
                        const metaText = metaParts.join(" · ");

                        return (
                            <button
                                key={command.id}
                                className={cl("item", { selected: isSelected, danger: command.danger, pinned })}
                                onClick={async () => {
                                    await runCommand(command);
                                }}
                                type="button"
                                ref={el => {
                                    itemRefs.current[index] = el;
                                }}
                            >
                                <div className={cl("item-content")}>
                                    <div className={cl("text")}>
                                        <div className={cl("label", command.danger && "label-danger")}>{command.label}</div>
                                        {command.description && (
                                            <div className={cl("description")}>{command.description}</div>
                                        )}
                                        {metaText && (
                                            <div className={cl("meta")}>{metaText}</div>
                                        )}
                                        {showTags && command.tags && command.tags.length > 0 && (
                                            <div className={cl("tags")}>
                                                {command.tags.map(tag => {
                                                    const slug = normalizeTag(tag) || tag;
                                                    const tagStyle = getTagColorStyle(slug);
                                                    return (
                                                        <span key={tag} className={cl("tag-chip")} style={tagStyle}>{tag}</span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <span
                                        className={cl("pin", pinned && "pin-active")}
                                        onClick={async e => {
                                            e.stopPropagation();
                                            await togglePinned(command.id);
                                            const key = getItemKey(item);
                                            if (key !== selectedKey) setSelectedKey(key);
                                        }}
                                        role="button"
                                        aria-label={pinned ? "Unpin command" : "Pin command"}
                                        title={pinned ? "Unpin command" : "Pin command"}
                                    >
                                        {pinned ? "★" : "☆"}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </ModalRoot>
    );
}

export function openCommandPalette() {
    openModal(modalProps => <CommandPalette modalProps={modalProps} />);
}
