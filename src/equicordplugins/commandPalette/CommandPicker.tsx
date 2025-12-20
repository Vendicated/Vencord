/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { classNameFactory } from "@utils/css";
import { ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React, TextInput, useCallback, useEffect, useMemo, useRef, useState } from "@webpack/common";

import { settings } from "./index";
import {
    type CommandEntry,
    getCategoryGroupLabel,
    getCategoryPath,
    getCategoryWeight,
    getCommandSearchText,
    getRecentRank,
    getRegistryVersion,
    listCommands,
    subscribeRegistry
} from "./registry";

type PickerItem =
    | { type: "section"; label: string; }
    | { type: "command"; command: CommandEntry; };

const isCommandItem = (item: PickerItem | undefined): item is { type: "command"; command: CommandEntry; } =>
    item?.type === "command";

const getFirstSelectableIndex = (items: PickerItem[]) =>
    items.findIndex(isCommandItem);

const getNextSelectableIndex = (start: number, direction: 1 | -1, items: PickerItem[]) => {
    if (items.length === 0) return -1;
    let index = start;
    for (let i = 0; i < items.length; i += 1) {
        index = (index + direction + items.length) % items.length;
        if (isCommandItem(items[index])) return index;
    }
    return getFirstSelectableIndex(items);
};

interface CommandPickerProps {
    allowMultiple?: boolean;
    initialQuery?: string;
    initialSelectedIds?: string[];
    filter?(command: CommandEntry): boolean;
    onSelect?(command: CommandEntry): void;
    onComplete?(commands: CommandEntry[], commandIds: string[]): void;
    onClose?(): void;
}

export function openCommandPicker(props: CommandPickerProps) {
    return openModal(modalProps => (
        <CommandPickerModal modalProps={modalProps} {...props} />
    ));
}

function CommandPickerModal({ modalProps, allowMultiple = false, initialQuery = "", initialSelectedIds = [], filter: filterPredicate, onSelect, onComplete, onClose }: CommandPickerProps & { modalProps: any; }) {
    const cl = classNameFactory("vc-command-palette-");
    const [query, setQuery] = useState(initialQuery);
    const [registryVersion, setRegistryVersion] = useState(() => getRegistryVersion());
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [visible, setVisible] = useState(false);
    const showTags = settings.store.showTags ?? true;
    const { visualStyle = "classic" } = settings.use(["visualStyle"]);
    const styleClass = visualStyle === "polished" ? "style-polished" : "style-classic";
    const normalizedInitialSelected = useMemo(() => Array.from(new Set(initialSelectedIds)), [initialSelectedIds]);
    const [pickedIds, setPickedIds] = useState<string[]>(() => normalizedInitialSelected);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const pickedIdsRef = useRef<string[]>([]);

    useEffect(() => subscribeRegistry(setRegistryVersion), []);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        pickedIdsRef.current = pickedIds;
    }, [pickedIds]);

    const commands = useMemo(() => listCommands(), [registryVersion]);
    const commandMap = useMemo(() => new Map(commands.map(entry => [entry.id, entry])), [commands]);
    const availableCommands = useMemo(() => {
        if (!filterPredicate) return commands;
        return commands.filter(filterPredicate);
    }, [commands, filterPredicate]);

    const trimmedQuery = query.trim();
    const lowerQuery = trimmedQuery.toLowerCase();

    const pickedSet = useMemo(() => new Set(pickedIds), [pickedIds]);

    const { items, hasCommands } = useMemo(() => {
        const sortByWeight = (a: CommandEntry, b: CommandEntry) => {
            const weightDiff = getCategoryWeight(b.categoryId) - getCategoryWeight(a.categoryId);
            if (weightDiff !== 0) return weightDiff;
            return a.label.localeCompare(b.label);
        };

        let entries: CommandEntry[];

        if (lowerQuery) {
            const scoreCommand = (entry: CommandEntry) => {
                let score = 0;
                const labelLower = entry.label.toLowerCase();

                if (labelLower === lowerQuery) score += 60;
                else if (labelLower.startsWith(lowerQuery)) score += 45;
                else if (labelLower.includes(lowerQuery)) score += 30;

                const labelTokens = labelLower.split(/[^a-z0-9]+/);
                if (labelTokens.includes(lowerQuery)) score += 20;

                if (entry.keywords && entry.keywords.length) {
                    const keywordMatches = entry.keywords
                        .map(keyword => keyword.toLowerCase())
                        .filter(Boolean);
                    if (keywordMatches.includes(lowerQuery)) score += 35;
                    else if (keywordMatches.some(keyword => keyword.includes(lowerQuery))) score += 15;
                }

                const descriptionLower = entry.description?.toLowerCase() ?? "";
                if (descriptionLower.includes(lowerQuery)) score += 10;

                if (entry.tags && entry.tags.length) {
                    const tagMatches = entry.tags.map(tag => tag.toLowerCase());
                    if (tagMatches.includes(lowerQuery)) score += 25;
                    else if (tagMatches.some(tag => tag.includes(lowerQuery))) score += 10;
                }

                if (score === 0) score = 5;

                score += getCategoryWeight(entry.categoryId);

                const recentRank = getRecentRank(entry.id);
                if (recentRank >= 0) {
                    score += Math.max(0, 30 - recentRank * 4);
                }

                return score;
            };

            const bestByGroup = new Map<string, { entry: CommandEntry; score: number; order: number; }>();
            let orderCounter = 0;

            for (const entry of availableCommands) {
                if (entry.hiddenInSearch) continue;
                const searchText = getCommandSearchText(entry.id);
                if (!searchText.includes(lowerQuery)) continue;

                const score = scoreCommand(entry);
                const groupKey = entry.searchGroup ?? entry.id;
                const existing = bestByGroup.get(groupKey);
                if (!existing || score > existing.score || (score === existing.score && orderCounter < existing.order)) {
                    bestByGroup.set(groupKey, { entry, score, order: orderCounter });
                }
                orderCounter += 1;
            }

            entries = Array.from(bestByGroup.values())
                .sort((a, b) => {
                    if (b.score !== a.score) return b.score - a.score;
                    return a.order - b.order;
                })
                .map(item => item.entry);
        } else {
            entries = [...availableCommands].sort(sortByWeight);
        }

        const grouped = new Map<string, CommandEntry[]>();
        const groupOrder: string[] = [];

        for (const entry of entries) {
            const label = getCategoryGroupLabel(entry.categoryId);
            if (!grouped.has(label)) {
                grouped.set(label, []);
                groupOrder.push(label);
            }
            grouped.get(label)!.push(entry);
        }

        const built: PickerItem[] = [];
        for (const label of groupOrder) {
            const groupEntries = grouped.get(label);
            if (!groupEntries || groupEntries.length === 0) continue;
            built.push({ type: "section", label });
            for (const entry of groupEntries) {
                built.push({ type: "command", command: entry });
            }
        }

        return { items: built, hasCommands: entries.length > 0 };
    }, [availableCommands, lowerQuery]);

    useEffect(() => {
        if (!hasCommands) {
            setSelectedIndex(-1);
            return;
        }

        setSelectedIndex(prev => {
            if (prev >= 0 && prev < items.length && isCommandItem(items[prev])) return prev;
            return getFirstSelectableIndex(items);
        });
    }, [items, hasCommands]);

    useEffect(() => {
        if (selectedIndex < 0) return;
        const node = itemRefs.current[selectedIndex];
        node?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex, items]);

    itemRefs.current = itemRefs.current.slice(0, items.length);

    const togglePicked = (command: CommandEntry) => {
        setPickedIds(prev => {
            const exists = prev.includes(command.id);
            if (exists) return prev.filter(id => id !== command.id);
            return [...prev, command.id];
        });
    };

    const handleSelect = (command: CommandEntry) => {
        if (allowMultiple) {
            togglePicked(command);
            return;
        }

        onSelect?.(command);
        modalProps.onClose?.();
    };

    const moveSelection = (direction: 1 | -1) => {
        if (!hasCommands) return;
        setSelectedIndex(prev => {
            const start = prev >= 0 && prev < items.length && isCommandItem(items[prev])
                ? prev
                : getFirstSelectableIndex(items);
            if (start < 0) return -1;
            return getNextSelectableIndex(start, direction, items);
        });
    };

    const flushSelection = useCallback(() => {
        if (!allowMultiple) return;
        const uniqueIds = Array.from(new Set(pickedIdsRef.current));
        const selectedCommands = uniqueIds
            .map(id => commandMap.get(id))
            .filter((entry): entry is CommandEntry => Boolean(entry));
        if (onComplete) onComplete(selectedCommands, uniqueIds);
        else selectedCommands.forEach(entry => onSelect?.(entry));
    }, [allowMultiple, commandMap, onComplete, onSelect]);

    useEffect(() => () => {
        if (allowMultiple) flushSelection();
        onClose?.();
    }, [allowMultiple, flushSelection, onClose]);

    const isEditableTarget = (target: EventTarget | null) => {
        if (!(target instanceof HTMLElement)) return false;
        return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA";
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!hasCommands) {
            if (event.key === "Escape") {
                event.preventDefault();
                modalProps.onClose?.();
            }
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            moveSelection(1);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            moveSelection(-1);
            return;
        }

        if (event.key === "Enter") {
            const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : undefined;
            if (allowMultiple) {
                if (isCommandItem(selectedItem)) {
                    event.preventDefault();
                    togglePicked(selectedItem.command);
                }
                return;
            }

            const fallback = items.find(isCommandItem);
            const target = isCommandItem(selectedItem) ? selectedItem.command : fallback?.command;
            if (target) {
                event.preventDefault();
                handleSelect(target);
            }
            return;
        }

        if (
            allowMultiple &&
            event.key === " " &&
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            !isEditableTarget(event.target)
        ) {
            const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : undefined;
            if (isCommandItem(selectedItem)) {
                event.preventDefault();
                togglePicked(selectedItem.command);
            }
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            modalProps.onClose?.();
        }
    };

    const headerText = allowMultiple ? "Add Commands" : "Choose Command";

    return (
        <ModalRoot
            {...modalProps}
            size={ModalSize.SMALL}
            className={cl("root", styleClass, visible && "root-visible")}
        >
            <div className={cl("container")} onKeyDown={handleKeyDown}>
                <div className={cl("header")}>{headerText}</div>
                <div
                    className={cl("search")}
                    onMouseDown={event => {
                        event.preventDefault();
                        event.currentTarget.querySelector("input")?.focus({ preventScroll: true });
                    }}
                >
                    <span className={cl("prompt")}>›</span>
                    <TextInput
                        autoFocus
                        value={query}
                        onChange={setQuery}
                        placeholder="Search commands"
                    />
                </div>
                <div className={cl("list")}>
                    {!hasCommands && (
                        <div className={cl("empty")}>No commands found</div>
                    )}
                    {items.map((item, index) => {
                        if (item.type === "section") {
                            itemRefs.current[index] = null;
                            return (
                                <div key={`section-${index}`} className={cl("section")}>
                                    {item.label}
                                </div>
                            );
                        }

                        const { command } = item;
                        const path = getCategoryPath(command.categoryId);
                        const categoryLabel = path
                            .filter(cat => cat.label && cat.id !== "quick-actions")
                            .map(cat => cat.label)
                            .join(" / ");

                        return (
                            <button
                                key={command.id}
                                type="button"
                                className={cl("item", {
                                    selected: index === selectedIndex,
                                    chosen: allowMultiple && pickedSet.has(command.id),
                                    danger: command.danger
                                })}
                                onClick={() => handleSelect(command)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                ref={element => {
                                    itemRefs.current[index] = element;
                                }}
                            >
                                <div className={cl("item-content")}>
                                    <div className={cl("text")}>
                                        <div className={cl("label")}>{command.label}</div>
                                        {command.description && (
                                            <div className={cl("description")}>{command.description}</div>
                                        )}
                                        {categoryLabel && (
                                            <div className={cl("meta")}>{categoryLabel}</div>
                                        )}
                                        {showTags && command.tags && command.tags.length > 0 && (
                                            <div className={cl("tags")}>
                                                {command.tags.map(tag => (
                                                    <span key={tag} className={cl("tag-chip")}>{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </ModalRoot>
    );
}
