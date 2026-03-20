/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../style.css";

import { IS_MAC } from "@utils/constants";
import { classNameFactory, classNameToSelector } from "@utils/css";
import { copyWithToast } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import { type ModalProps, ModalRoot, ModalSize } from "@utils/modal";
import { TextInput, Toasts, useEffect, useMemo, useRef, useState } from "@webpack/common";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { buildQueryResolution } from "../actions/executors";
import { resolveCalculatorQuery } from "../calculator";
import type { CalculatorViewMode } from "../calculator/types";
import { settings } from "../index";
import { getRecentCommandEntries } from "../providers/recentProvider";
import type { QueryActionCandidate } from "../query/types";
import {
    type CommandActionIntent,
    type CommandEntry,
    DEFAULT_CATEGORY_ID,
    executeCommandAction,
    getCategoryPath,
    getCategoryWeight,
    getCustomCommandById,
    getMentionCommandsSnapshot,
    getRecentRank,
    getRegistryVersion,
    isCommandPinned,
    listChildCategories,
    listCommands,
    markCommandAsRecent,
    PINNED_CATEGORY_ID,
    refreshAllContextProviders,
    resolveCommandActionIntentByActionKey,
    subscribePinned,
    subscribeRegistry,
    togglePinned
} from "../registry";
import { rankItems } from "../search/ranker";
import { dispatchPaletteActionIntent } from "./actions/dispatchPaletteActionIntent";
import { resolvePaletteActions } from "./actions/resolvePaletteActions";
import { CommandPaletteActionBar } from "./CommandPaletteActionBar";
import { CommandPaletteActionsMenu } from "./CommandPaletteActionsMenu";
import { CommandPaletteCalculatorCards } from "./CommandPaletteCalculatorCards";
import { CommandPaletteInput } from "./CommandPaletteInput";
import { CommandPaletteRow } from "./CommandPaletteRow";
import { getPalettePageSpec } from "./pages/registry";
import type { PalettePageRef, PalettePageRuntimeContext, PalettePageValuesState, PaletteSuggestion } from "./pages/types";
import { PaletteDropdown } from "./primitives/PaletteDropdown";
import { PaletteField } from "./primitives/PaletteField";
import { PalettePageShell } from "./primitives/PalettePageShell";
import { PalettePickerInput } from "./primitives/PalettePickerInput";
import type { CommandCandidate, PaletteCandidate } from "./types";

type NavigationLevel =
    | { type: "root"; }
    | { type: "category"; categoryId: string; parentLevels: NavigationLevel[]; };

interface PalettePageStackItem {
    ref: PalettePageRef;
    state: PalettePageValuesState;
    error: string | null;
}

const MENTIONS_CATEGORY_ID = "mentions-actions";
const RECENTS_CATEGORY_ID = "recent-actions";
let persistedCategoryId: string | null = null;
const SINGLE_SELECT_PROMPT_COMMAND_IDS = new Set([
    "command-palette-open-dm-query",
    "command-palette-navigate-to-query",
    "extension-holy-notes-delete-notebook-query",
    "extension-holy-notes-move-note-query",
    "extension-holy-notes-jump-note-query"
]);
const logger = new Logger("CommandPaletteModal");
const cl = classNameFactory("vc-command-palette-");
const cn = classNameFactory();
const promptActiveSelector = classNameToSelector(cl("prompt-active-input"));
const mainInputSelectorClass = classNameToSelector(cl("main-input"));
const pageSelector = classNameToSelector(cl("page"));
const promptChipFont = "500 17px \"gg sans\", \"Noto Sans\", \"Helvetica Neue\", Helvetica, Arial, sans-serif";
const queryPreviewFont = "400 20px \"gg sans\", \"Noto Sans\", \"Helvetica Neue\", Helvetica, Arial, sans-serif";
const promptChipWidthCache = new Map<string, number>();
const queryPreviewWidthCache = new Map<string, number>();
let promptChipCanvasContext: CanvasRenderingContext2D | null = null;
let queryPreviewCanvasContext: CanvasRenderingContext2D | null = null;

function hasPrimaryModifier(event: ReactKeyboardEvent<HTMLElement>): boolean {
    return IS_MAC ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
}

function getCommandBadge(command: CommandEntry, fallback: "Command" | "Recent" | "Pinned"): string {
    const defaultBadge = fallback === "Recent" ? "Command" : fallback;
    if (!command.id.startsWith("custom-")) return defaultBadge;

    const customCommand = getCustomCommandById(command.id);
    if (!customCommand) return defaultBadge;

    switch (customCommand.action.type) {
        case "command":
            return "Alias";
        case "url":
            return "Quicklink";
        case "macro":
            return "Sequence";
        case "settings":
            return "Settings";
        default:
            return defaultBadge;
    }
}

function asCommandCandidate(command: CommandEntry, pinned: boolean, badge: "Command" | "Recent" | "Pinned"): CommandCandidate {
    const path = getCategoryPath(command.categoryId)
        .filter(category => category.id !== DEFAULT_CATEGORY_ID)
        .map(category => category.label)
        .join(" / ");

    return {
        type: "command",
        id: `command-${command.id}`,
        command,
        subtitle: path || undefined,
        badge: getCommandBadge(command, badge),
        pinned,
        shortcut: command.shortcut ?? undefined,
        icon: command.icon
    };
}

function isSelectable(candidate: PaletteCandidate | undefined): candidate is CommandCandidate {
    return Boolean(candidate && candidate.type === "command");
}

function getSelectedLabel(item: PaletteCandidate | undefined): string | undefined {
    if (!isSelectable(item)) return undefined;
    return item.command.label;
}

function hasChildren(command: CommandEntry, allCommands: CommandEntry[]): boolean {
    const { drilldownCategoryId } = command;
    if (drilldownCategoryId) {
        if (listChildCategories(drilldownCategoryId).length > 0) return true;
        return allCommands.some(entry => entry.categoryId === drilldownCategoryId);
    }

    if (!command.categoryId) return false;
    const childCategories = listChildCategories(command.categoryId);
    if (childCategories.length > 0) return true;

    return allCommands.some(entry => entry.categoryId === command.categoryId && entry.id !== command.id);
}

function getDrilldownCategoryId(command: CommandEntry): string | null {
    if (command.drilldownCategoryId) return command.drilldownCategoryId;
    if (!command.categoryId) return null;
    return listChildCategories(command.categoryId)[0]?.id ?? null;
}

function getCategoryCommands(categoryId: string, allCommands: CommandEntry[]): CommandEntry[] {
    return allCommands.filter(command => command.categoryId === categoryId);
}

function pushNavigationLevel(current: NavigationLevel, categoryId: string): NavigationLevel {
    if (current.type === "category") {
        return {
            type: "category",
            categoryId,
            parentLevels: [...current.parentLevels, current]
        };
    }

    return {
        type: "category",
        categoryId,
        parentLevels: [{ type: "root" }]
    };
}

function scoreSuggestion(id: string, seed: number): number {
    let hash = seed;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
}

function getEnterActionKey(event: ReactKeyboardEvent<HTMLDivElement>): string {
    const keys: string[] = [];
    if (event.metaKey) keys.push("meta");
    if (event.altKey) keys.push("alt");
    if (event.ctrlKey) keys.push("ctrl");
    if (event.shiftKey) keys.push("shift");
    keys.push("enter");
    return keys.join("+");
}

function buildNavigationLevelForCategory(categoryId: string): NavigationLevel {
    const path = getCategoryPath(categoryId);
    if (path.length === 0) return { type: "root" };

    const chain = path.map(category => category.id);
    const parentLevels: NavigationLevel[] = [{ type: "root" }];
    for (const parentCategoryId of chain.slice(0, -1)) {
        parentLevels.push({
            type: "category",
            categoryId: parentCategoryId,
            parentLevels: [...parentLevels]
        });
    }

    return {
        type: "category",
        categoryId: chain[chain.length - 1],
        parentLevels
    };
}

function clearPersistedNavigation() {
    persistedCategoryId = null;
}

function measurePromptChipWidth(text: string): number {
    const cached = promptChipWidthCache.get(text);
    if (cached != null) return cached;

    if (typeof document === "undefined") return 196;

    if (!promptChipCanvasContext) {
        const canvas = document.createElement("canvas");
        promptChipCanvasContext = canvas.getContext("2d");
    }

    const context = promptChipCanvasContext;
    if (!context) return 196;
    context.font = promptChipFont;
    const textWidth = context.measureText(text).width;
    const chipHorizontalChromePx = 26;
    const width = Math.ceil(Math.max(132, Math.min(420, textWidth + chipHorizontalChromePx)));
    promptChipWidthCache.set(text, width);
    return width;
}

function measureQueryPreviewWidth(text: string): number {
    const cached = queryPreviewWidthCache.get(text);
    if (cached !== undefined) return cached;

    if (!queryPreviewCanvasContext) {
        const canvas = document.createElement("canvas");
        queryPreviewCanvasContext = canvas.getContext("2d");
    }

    const context = queryPreviewCanvasContext;
    if (!context) return 0;
    context.font = queryPreviewFont;
    const width = Math.ceil(context.measureText(text).width);
    queryPreviewWidthCache.set(text, width);
    return width;
}

function createInitialPageState(ref: PalettePageRef): PalettePageValuesState {
    const spec = getPalettePageSpec(ref.id);
    const initialValues = ref.initialData ?? {};
    const values: Record<string, string> = {};
    const selectedIds: Record<string, string | null> = {};

    for (const field of spec?.fields ?? []) {
        values[field.key] = initialValues[field.key] ?? "";
        selectedIds[field.key] = null;
    }

    return {
        values,
        selectedIds
    };
}

export function CommandPaletteModal({ modalProps, instanceKey }: { modalProps: ModalProps; instanceKey: number; }) {
    const {
        compactStartEnabled = true,
        closeAfterExecute = true
    } = settings.use();
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [keyboardSelectedKey, setKeyboardSelectedKey] = useState<string | null>(null);
    const [registryVersion, setRegistryVersion] = useState(() => getRegistryVersion());
    const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
    const [navigationLevel, setNavigationLevel] = useState<NavigationLevel>(() => {
        if (compactStartEnabled || !persistedCategoryId) return { type: "root" };
        return buildNavigationLevelForCategory(persistedCategoryId);
    });
    const [activePromptCommand, setActivePromptCommand] = useState<CommandEntry | null>(null);
    const [promptInputValue, setPromptInputValue] = useState("");
    const [selectedPromptCandidateId, setSelectedPromptCandidateId] = useState<string | null>(null);
    const [focusPromptInput, setFocusPromptInput] = useState(false);
    const [showPromptDropdown, setShowPromptDropdown] = useState(false);
    const [selectionSource, setSelectionSource] = useState<"keyboard" | "pointer">("keyboard");
    const [pageStack, setPageStack] = useState<PalettePageStackItem[]>([]);
    const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
    const [isActionsMenuClosing, setIsActionsMenuClosing] = useState(false);
    const [calculatorViewMode, setCalculatorViewMode] = useState<CalculatorViewMode>("result");
    const activePromptCommandIdRef = useRef<string | null>(null);
    const promptContainerRef = useRef<HTMLDivElement | null>(null);
    const mainInputRef = useRef<HTMLInputElement | null>(null);
    const promptInputRef = useRef<HTMLInputElement | null>(null);
    const suggestionSeedRef = useRef((Math.random() * 0xffffffff) >>> 0);
    const listRef = useRef<HTMLDivElement | null>(null);
    const closeReasonRef = useRef<"programmatic" | "explicit-root" | null>(null);
    const keyboardNavigationAtRef = useRef(0);
    const lastTrimmedQueryRef = useRef("");

    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

    useEffect(() => subscribeRegistry(setRegistryVersion), []);

    useEffect(() => subscribePinned(ids => setPinnedIds(new Set(ids))), []);

    useEffect(() => {
        setQuery("");
        setExpanded(false);
        setSelectedIndex(-1);
        setSelectedKey(null);
        setKeyboardSelectedKey(null);
        setActivePromptCommand(null);
        setPromptInputValue("");
        setSelectedPromptCandidateId(null);
        setFocusPromptInput(false);
        setShowPromptDropdown(false);
        setSelectionSource("keyboard");
        setPageStack([]);
        setIsActionsMenuOpen(false);
        setActivePageFieldKey(null);
        activePromptCommandIdRef.current = null;
        closeReasonRef.current = null;
        keyboardNavigationAtRef.current = 0;
        setNavigationLevel(() => {
            if (compactStartEnabled || !persistedCategoryId) return { type: "root" };
            return buildNavigationLevelForCategory(persistedCategoryId);
        });
    }, [compactStartEnabled, instanceKey]);

    useEffect(() => {
        return () => {
            if (closeReasonRef.current === "explicit-root") {
                clearPersistedNavigation();
                return;
            }

            if (closeReasonRef.current === "programmatic") {
                clearPersistedNavigation();
                return;
            }

            if (navigationLevel.type === "category") {
                persistedCategoryId = navigationLevel.categoryId;
                return;
            }

            clearPersistedNavigation();
        };
    }, [navigationLevel]);

    useEffect(() => {
        setIsActionsMenuOpen(false);
    }, [navigationLevel]);

    const trimmedQuery = query.trim();
    const compact = compactStartEnabled && trimmedQuery.length === 0 && !expanded && navigationLevel.type === "root" && pageStack.length === 0;

    const allCommands = useMemo(() => listCommands(), [registryVersion]);

    const currentCommands = useMemo(() => {
        if (navigationLevel.type === "root") return allCommands;
        if (navigationLevel.categoryId === PINNED_CATEGORY_ID) {
            return Array.from(pinnedIds)
                .map(id => allCommands.find(command => command.id === id) ?? null)
                .filter((command): command is CommandEntry => Boolean(command && !command.hiddenInSearch))
                .sort((left, right) => left.label.localeCompare(right.label));
        }
        if (navigationLevel.categoryId === RECENTS_CATEGORY_ID) {
            return getRecentCommandEntries(30);
        }
        if (navigationLevel.categoryId === MENTIONS_CATEGORY_ID) {
            const snapshot = getMentionCommandsSnapshot();
            if (snapshot.length > 0) return snapshot;
        }
        return getCategoryCommands(navigationLevel.categoryId, allCommands);
    }, [allCommands, navigationLevel, pinnedIds]);

    const includeHiddenInCurrentLevel = navigationLevel.type === "category";
    const searchableCommands = useMemo(
        () => currentCommands.filter(command => includeHiddenInCurrentLevel || !command.hiddenInSearch),
        [currentCommands, includeHiddenInCurrentLevel]
    );

    const rankedCommandCandidates = useMemo(() => {
        if (!trimmedQuery) {
            return searchableCommands.map(command => asCommandCandidate(command, pinnedIds.has(command.id), "Command"));
        }

        const ranked = rankItems(
            trimmedQuery,
            searchableCommands.map(entry => ({
                id: entry.id,
                label: entry.label,
                description: entry.description,
                keywords: entry.keywords,
                pinned: pinnedIds.has(entry.id),
                recentRank: getRecentRank(entry.id),
                categoryWeight: getCategoryWeight(entry.categoryId)
            })),
            { semantic: true }
        );

        return ranked
            .filter(item => item.score > 0)
            .slice(0, 40)
            .map(item => {
                const command = searchableCommands.find(entry => entry.id === item.item.id);
                if (!command) return null;
                return asCommandCandidate(command, pinnedIds.has(command.id), "Command");
            })
            .filter((entry): entry is CommandCandidate => Boolean(entry));
    }, [trimmedQuery, searchableCommands, pinnedIds]);

    const recentCandidates = useMemo(() => {
        return getRecentCommandEntries(5).map(command => asCommandCandidate(command, pinnedIds.has(command.id), "Recent"));
    }, [registryVersion, pinnedIds]);
    const pinnedCandidates = useMemo(() => {
        if (navigationLevel.type !== "root") return [];
        if (trimmedQuery.length > 0) return [];

        const pinnedItems: CommandCandidate[] = [];
        for (const id of pinnedIds) {
            const command = allCommands.find(entry => entry.id === id);
            if (!command || command.hiddenInSearch) continue;
            pinnedItems.push(asCommandCandidate(command, true, "Pinned"));
        }

        return pinnedItems.sort((left, right) => left.command.label.localeCompare(right.command.label));
    }, [allCommands, navigationLevel.type, pinnedIds, trimmedQuery.length]);

    const suggestedCandidates = useMemo(() => {
        if (navigationLevel.type !== "root") return [];
        if (trimmedQuery.length > 0) return [];

        const recentIds = new Set(recentCandidates.map(item => item.command.id));
        const pool = searchableCommands
            .filter(command => !recentIds.has(command.id))
            .map(command => asCommandCandidate(command, pinnedIds.has(command.id), "Command"));

        return pool
            .sort((left, right) => scoreSuggestion(left.command.id, suggestionSeedRef.current) - scoreSuggestion(right.command.id, suggestionSeedRef.current))
            .slice(0, 8);
    }, [navigationLevel.type, trimmedQuery, recentCandidates, searchableCommands, pinnedIds]);

    const items = useMemo(() => {
        const expandedItems: PaletteCandidate[] = [];

        if (navigationLevel.type === "category") {
            const path = getCategoryPath(navigationLevel.categoryId);
            const breadcrumb = path.map(category => category.label).join(" → ");
            expandedItems.push({ type: "section", id: "section-breadcrumb", label: breadcrumb });
        }

        if (!compact && navigationLevel.type === "root" && trimmedQuery.length === 0) {
            if (pinnedCandidates.length > 0) {
                expandedItems.push({ type: "section", id: "section-pinned", label: "Pinned" });
                expandedItems.push(...pinnedCandidates);
            }

            if (recentCandidates.length > 0) {
                expandedItems.push({ type: "section", id: "section-recent", label: "Recent" });
                expandedItems.push(...recentCandidates);
            }

            if (suggestedCandidates.length > 0) {
                expandedItems.push({ type: "section", id: "section-suggested", label: "Suggested" });
                expandedItems.push(...suggestedCandidates);
            }
        }

        if (rankedCommandCandidates.length > 0) {
            if (trimmedQuery.length > 0) {
                expandedItems.push({ type: "section", id: "section-results", label: "Results" });
            }
            if (navigationLevel.type === "root" && trimmedQuery.length === 0) {
                const seenCommandIds = new Set<string>();
                for (const item of expandedItems) {
                    if (item.type === "command") {
                        seenCommandIds.add(item.command.id);
                    }
                }
                expandedItems.push(...rankedCommandCandidates.filter(item => !seenCommandIds.has(item.command.id)));
            } else {
                expandedItems.push(...rankedCommandCandidates);
            }
        }

        return expandedItems;
    }, [compact, navigationLevel, pinnedCandidates, rankedCommandCandidates, recentCandidates, suggestedCandidates, trimmedQuery]);

    const emptyStateText = navigationLevel.type === "category" && navigationLevel.categoryId === MENTIONS_CATEGORY_ID
        ? "All caught up."
        : "No results.";
    const hasCommandItems = items.some(item => item.type === "command");

    const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : undefined;
    const currentSelectedCommand = isSelectable(selectedItem) ? selectedItem.command : null;
    const previewPromptCommand = !activePromptCommand && currentSelectedCommand?.queryTemplate
        ? currentSelectedCommand
        : null;
    const promptCommand = activePromptCommand ?? previewPromptCommand;
    const hasMainInputText = query.length > 0;
    const hasPromptInProgress = Boolean(activePromptCommand || promptInputValue.length > 0 || selectedPromptCandidateId);
    const shouldRenderPromptPreview = Boolean(promptCommand);
    const calculatorResult = useMemo(() => {
        if (!trimmedQuery) return null;
        if (activePromptCommand) return null;
        return resolveCalculatorQuery(trimmedQuery);
    }, [activePromptCommand, trimmedQuery]);
    const calculatorCanGraph = Boolean(calculatorResult?.graph?.series.length);

    useEffect(() => {
        if (!calculatorResult?.graph) {
            setCalculatorViewMode("result");
            return;
        }

        setCalculatorViewMode(calculatorResult.graph.defaultViewMode);
    }, [calculatorResult]);

    const queryCandidates = useMemo(() => {
        if (!activePromptCommand?.queryTemplate) return [];

        const fullQuery = `${activePromptCommand.queryTemplate}${promptInputValue}`.trim();
        const resolution = buildQueryResolution(fullQuery);
        if (resolution.type !== "candidates") return [];
        return resolution.candidates;
    }, [activePromptCommand, promptInputValue]);
    const selectedPromptCandidate = useMemo<QueryActionCandidate | null>(() => {
        if (!selectedPromptCandidateId) return null;
        return queryCandidates.find(candidate => candidate.id === selectedPromptCandidateId) ?? null;
    }, [queryCandidates, selectedPromptCandidateId]);
    const activePromptIsSingleSelect = Boolean(activePromptCommand?.id && SINGLE_SELECT_PROMPT_COMMAND_IDS.has(activePromptCommand.id));

    const selectedLabel = getSelectedLabel(selectedItem);
    const activePage = pageStack.length > 0 ? pageStack[pageStack.length - 1] : null;
    const activePageSpec = activePage ? getPalettePageSpec(activePage.ref.id) ?? null : null;
    const activePageState = activePage?.state ?? null;
    const isPageOpen = Boolean(activePageSpec && activePageState);

    const canDrillDown = !isPageOpen && isSelectable(selectedItem) && hasChildren(selectedItem.command, allCommands);
    const canGoBack = isPageOpen || navigationLevel.type !== "root";
    const selectedCommand = !isPageOpen && isSelectable(selectedItem) ? selectedItem.command : null;
    const selectedDrilldownCategoryId = selectedCommand ? getDrilldownCategoryId(selectedCommand) : null;
    const promptDropdownSuggestions = useMemo<PaletteSuggestion[]>(() => queryCandidates.map(candidate => ({
        id: candidate.id,
        label: candidate.label,
        iconUrl: candidate.iconUrl,
        kind: candidate.suggestionKind ?? "generic"
    })), [queryCandidates]);
    const shouldShowPromptDropdown = Boolean(activePromptCommand && showPromptDropdown && queryCandidates.length > 0);
    const promptSelectedSuggestionIndex = useMemo(() => {
        if (!selectedPromptCandidateId) return -1;
        return promptDropdownSuggestions.findIndex(candidate => candidate.id === selectedPromptCandidateId);
    }, [promptDropdownSuggestions, selectedPromptCandidateId]);
    const [activePageFieldKey, setActivePageFieldKey] = useState<string | null>(null);
    const activePageSuggestions = useMemo<PaletteSuggestion[]>(() => {
        if (!activePageSpec || !activePageState || !activePageFieldKey) return [];
        if (!activePageSpec.resolveSuggestions) return [];
        const value = activePageState.values[activePageFieldKey] ?? "";
        return activePageSpec.resolveSuggestions(activePageFieldKey, value, activePageState.values, activePageState.selectedIds);
    }, [activePageSpec, activePageState, activePageFieldKey]);

    const shouldShowPromptCommandLabel = Boolean(promptCommand && !hasMainInputText);
    const showPromptCommandPreview = Boolean(promptCommand && !hasMainInputText && !hasPromptInProgress);
    const mainInputPlaceholder = showPromptCommandPreview
        ? promptCommand?.label
        : undefined;
    const promptChipPlaceholderText = promptCommand?.queryPlaceholder ?? "Action";
    const promptChipWidthPx = useMemo(() => measurePromptChipWidth(promptChipPlaceholderText), [promptChipPlaceholderText]);
    const promptChipStyle = { width: `${promptChipWidthPx}px` };
    const queryPreviewPromptOffsetPx = useMemo(() => {
        if (!hasMainInputText || shouldShowPromptCommandLabel) return 0;
        const typedWidth = measureQueryPreviewWidth(query);
        return Math.min(typedWidth + 16, 520);
    }, [hasMainInputText, query, shouldShowPromptCommandLabel]);
    const queryPreviewPromptStyle = queryPreviewPromptOffsetPx > 0
        ? { marginLeft: `${queryPreviewPromptOffsetPx}px` }
        : undefined;

    useEffect(() => {
        if (!selectedPromptCandidateId) return;
        if (queryCandidates.some(candidate => candidate.id === selectedPromptCandidateId)) return;
        setSelectedPromptCandidateId(null);
    }, [queryCandidates, selectedPromptCandidateId]);

    useEffect(() => {
        if (compact) {
            setSelectedIndex(-1);
            setSelectedKey(null);
            return;
        }

        if (!hasCommandItems) {
            setSelectedIndex(-1);
            setSelectedKey(null);
            return;
        }

        const firstSelectable = items.findIndex(item => isSelectable(item));
        if (firstSelectable < 0) {
            setSelectedIndex(-1);
            setSelectedKey(null);
            return;
        }

        if (selectedKey) {
            const found = items.findIndex(item => isSelectable(item) && item.id === selectedKey);
            if (found >= 0) {
                setSelectedIndex(found);
                return;
            }
        }

        setSelectedIndex(firstSelectable);
        setSelectedKey(items[firstSelectable].id);
    }, [hasCommandItems, items, selectedKey, compact]);

    useEffect(() => {
        if (selectedIndex < 0) return;
        if (selectionSource !== "keyboard") return;
        const container = listRef.current;
        const node = itemRefs.current[selectedIndex];
        if (!container || !node) return;

        const containerRect = container.getBoundingClientRect();
        const nodeRect = node.getBoundingClientRect();

        if (nodeRect.bottom > containerRect.bottom) {
            container.scrollTop += nodeRect.bottom - containerRect.bottom;
            return;
        }

        if (nodeRect.top < containerRect.top) {
            container.scrollTop -= containerRect.top - nodeRect.top;
        }
    }, [selectedIndex, selectionSource]);

    useEffect(() => {
        const previous = lastTrimmedQueryRef.current;
        if (previous === trimmedQuery) return;
        lastTrimmedQueryRef.current = trimmedQuery;

        if (compact || isPageOpen) return;

        setSelectedIndex(-1);
        setSelectedKey(null);
        setKeyboardSelectedKey(null);

        if (listRef.current) {
            listRef.current.scrollTop = 0;
        }
    }, [compact, isPageOpen, trimmedQuery]);

    useEffect(() => {
        if (!focusPromptInput) return;

        requestAnimationFrame(() => {
            promptInputRef.current?.focus();
        });
        setFocusPromptInput(false);
    }, [focusPromptInput]);

    const focusSearchInput = () => {
        mainInputRef.current?.focus();
    };

    const clearPromptState = () => {
        setActivePromptCommand(null);
        setPromptInputValue("");
        setSelectedPromptCandidateId(null);
        setShowPromptDropdown(false);
        activePromptCommandIdRef.current = null;
    };

    const activatePromptCommand = (command: CommandEntry, shouldFocus: boolean) => {
        if (activePromptCommand?.id !== command.id) {
            setPromptInputValue("");
            setSelectedPromptCandidateId(null);
        }

        setActivePromptCommand(command);
        activePromptCommandIdRef.current = command.id;
        if (SINGLE_SELECT_PROMPT_COMMAND_IDS.has(command.id) && selectedPromptCandidateId) {
            setShowPromptDropdown(false);
        } else {
            setShowPromptDropdown(true);
        }
        if (shouldFocus) {
            setFocusPromptInput(true);
        }
    };

    const executePromptCandidate = async (run: () => Promise<boolean | void> | boolean | void, sourceCommandId?: string | null) => {
        const commandId = sourceCommandId ?? activePromptCommandIdRef.current ?? activePromptCommand?.id ?? null;
        let success = false;
        let shouldClose = true;

        try {
            const result = await run();
            if (result === false) {
                shouldClose = false;
                return;
            }
            success = true;
        } catch (error) {
            Toasts.show({
                message: "Unable to complete prompt action.",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId(),
                options: { position: Toasts.Position.BOTTOM }
            });
            logger.error("Prompt action failed", error);
        } finally {
            if (!success) return;
            if (commandId) {
                markCommandAsRecent(commandId);
            }
            if (!shouldClose) return;
            closePalette("programmatic");
        }
    };

    const copyCalculatorResult = async (mode: "formatted" | "raw" | "qa") => {
        if (!calculatorResult) return;

        const text = mode === "formatted"
            ? calculatorResult.displayAnswer
            : mode === "raw"
                ? calculatorResult.rawAnswer
                : `${calculatorResult.displayInput} = ${calculatorResult.displayAnswer}`;

        await copyWithToast(text, "Copied to clipboard.");
    };

    const pushPage = (ref: PalettePageRef) => {
        setPageStack(current => [
            ...current,
            {
                ref,
                state: createInitialPageState(ref),
                error: null
            }
        ]);
        clearPromptState();
        setActivePageFieldKey(null);
        setSelectedKey(null);
        setKeyboardSelectedKey(null);
        setQuery("");
        setExpanded(false);
    };

    const setActivePageValue = (fieldKey: string, value: string) => {
        setPageStack(current => {
            if (current.length === 0) return current;
            const next = [...current];
            const top = next[next.length - 1];
            next[next.length - 1] = {
                ...top,
                state: {
                    ...top.state,
                    values: {
                        ...top.state.values,
                        [fieldKey]: value
                    },
                    selectedIds: {
                        ...top.state.selectedIds,
                        [fieldKey]: null
                    }
                },
                error: null
            };
            return next;
        });
    };

    const setActivePageSelectedId = (fieldKey: string, id: string | null) => {
        setPageStack(current => {
            if (current.length === 0) return current;
            const next = [...current];
            const top = next[next.length - 1];
            next[next.length - 1] = {
                ...top,
                state: {
                    ...top.state,
                    selectedIds: {
                        ...top.state.selectedIds,
                        [fieldKey]: id
                    }
                },
                error: null
            };
            return next;
        });
    };

    const setActivePageError = (error: string | null) => {
        setPageStack(current => {
            if (current.length === 0) return current;
            const next = [...current];
            const top = next[next.length - 1];
            next[next.length - 1] = {
                ...top,
                error
            };
            return next;
        });
    };

    const buildActivePageContext = (): PalettePageRuntimeContext | null => {
        if (!activePageState) return null;
        return {
            values: activePageState.values,
            selectedIds: activePageState.selectedIds,
            setValue: setActivePageValue,
            setSelectedId: setActivePageSelectedId,
            showSuccess(message) {
                Toasts.show({
                    message,
                    type: Toasts.Type.SUCCESS,
                    id: Toasts.genId(),
                    options: { position: Toasts.Position.BOTTOM }
                });
            },
            showFailure(message) {
                Toasts.show({
                    message,
                    type: Toasts.Type.FAILURE,
                    id: Toasts.genId(),
                    options: { position: Toasts.Position.BOTTOM }
                });
            }
        };
    };

    const submitActivePage = async () => {
        if (!activePageSpec) return;
        const context = buildActivePageContext();
        if (!context) return;

        const validationError = activePageSpec.validate?.(context) ?? null;
        if (validationError) {
            setActivePageError(validationError);
            return;
        }

        try {
            await activePageSpec.submit(context);
            closePalette("programmatic");
        } catch (error) {
            const message = error instanceof Error && error.message
                ? error.message
                : "Unable to complete page action.";
            setActivePageError(message);
        }
    };

    const openDrilldownCategory = (categoryId: string): boolean => {
        refreshAllContextProviders();
        setNavigationLevel(current => pushNavigationLevel(current, categoryId));
        clearPromptState();
        setSelectedKey(null);
        setKeyboardSelectedKey(null);
        setQuery("");
        setExpanded(false);
        return true;
    };

    const openDrilldown = (command: CommandEntry): boolean => {
        if (command.drilldownCategoryId) {
            return openDrilldownCategory(command.drilldownCategoryId);
        }

        const { categoryId } = command;
        if (!categoryId) return false;

        const childCategories = listChildCategories(categoryId);
        if (childCategories.length > 0) {
            return openDrilldownCategory(childCategories[0].id);
        }

        return false;
    };

    const closePalette = (reason: "programmatic" | "explicit-root") => {
        closeReasonRef.current = reason;
        modalProps.onClose?.();
    };

    const executeItem = async (item: PaletteCandidate | undefined, actionKey: string = "primary") => {
        if (!isSelectable(item)) return;

        if (actionKey === "primary" && item.command.queryTemplate) {
            activatePromptCommand(item.command, true);
            return;
        }

        if (actionKey === "primary" && item.command.page) {
            markCommandAsRecent(item.command.id);
            pushPage(item.command.page);
            return;
        }

        if (actionKey === "primary" && openDrilldown(item.command)) {
            return;
        }

        const executed = await executeCommandAction(item.command, actionKey);
        if (!executed) return;

        if (item.command.closeAfterExecute ?? closeAfterExecute) {
            closePalette("programmatic");
        }
    };

    const handleTogglePin = async (commandId: string) => {
        const result = await togglePinned(commandId);
        if (result === null) {
            Toasts.show({
                message: "Unable to toggle pin for this command.",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId(),
                options: { position: Toasts.Position.BOTTOM }
            });
            return;
        }

        const command = selectedCommand;
        const label = command?.id === commandId ? command.label : "Command";

        Toasts.show({
            message: `${label} ${result ? "pinned" : "unpinned"}.`,
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
            options: { position: Toasts.Position.BOTTOM }
        });
    };

    const drillDown = () => {
        if (!isSelectable(selectedItem)) return;
        openDrilldown(selectedItem.command);
    };

    const goBack = () => {
        if (isPageOpen) {
            setPageStack(current => current.slice(0, -1));
            setActivePageFieldKey(null);
            return;
        }

        if (navigationLevel.type === "root") return;

        const { parentLevels } = navigationLevel;
        if (parentLevels.length === 0) {
            setNavigationLevel({ type: "root" });
        } else {
            setNavigationLevel(parentLevels[parentLevels.length - 1]);
        }

        clearPromptState();
        setSelectedKey(null);
        setKeyboardSelectedKey(null);
        setQuery("");
        setExpanded(false);
    };

    const updateSelection = (index: number, item: PaletteCandidate) => {
        if (!isSelectable(item)) return;

        keyboardNavigationAtRef.current = Date.now();
        setSelectionSource("keyboard");
        setSelectedIndex(index);
        setSelectedKey(item.id);
        setKeyboardSelectedKey(item.id);

        if (activePromptCommand) {
            clearPromptState();
        }
    };

    const updateSelectionFromPointer = (index: number, item: PaletteCandidate, force = false) => {
        if (!isSelectable(item)) return;
        if (!force && Date.now() - keyboardNavigationAtRef.current < 200) return;
        if (!force && activePromptCommand) return;

        setSelectionSource("pointer");
        setSelectedIndex(index);
        setSelectedKey(item.id);
        setKeyboardSelectedKey(item.id);
    };

    const ensureSelectionForActions = () => {
        if (isPageOpen) return true;
        if (isSelectable(selectedItem)) return true;

        const firstSelectable = items.findIndex(item => isSelectable(item));
        if (firstSelectable < 0) return false;

        const firstItem = items[firstSelectable];
        if (!isSelectable(firstItem)) return false;

        setSelectionSource("keyboard");
        setSelectedIndex(firstSelectable);
        setSelectedKey(firstItem.id);
        setKeyboardSelectedKey(firstItem.id);
        return true;
    };

    const moveSelection = (direction: 1 | -1) => {
        if (!hasCommandItems) return;

        let start = selectedIndex;
        if (start < 0 || !isSelectable(items[start])) {
            start = items.findIndex(item => isSelectable(item));
        }
        if (start < 0) return;

        let index = start;
        for (; ;) {
            const next = index + direction;
            if (next < 0 || next >= items.length) break;

            index = next;
            const candidate = items[index];
            if (!isSelectable(candidate)) continue;

            updateSelection(index, candidate);
            return;
        }
    };

    const goRoot = () => {
        setNavigationLevel({ type: "root" });
        clearPromptState();
        setSelectedKey(null);
        setQuery("");
        setExpanded(false);
    };

    const onKeyDown = async (event: ReactKeyboardEvent<HTMLDivElement>) => {
        const target = event.target as HTMLElement | null;
        const isPromptInputTarget = Boolean(
            target?.closest(promptActiveSelector)
            || (target && promptContainerRef.current?.contains(target))
        );
        const isMainInputTarget = Boolean(target?.closest(mainInputSelectorClass)) && !isPromptInputTarget;
        const isPageTarget = Boolean(target?.closest(pageSelector));

        if (event.key === "Escape" && hasPrimaryModifier(event) && !event.altKey && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            clearPersistedNavigation();
            goRoot();
            return;
        }

        if (event.key.toLowerCase() === "l" && hasPrimaryModifier(event) && !event.altKey && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            if (isActionsMenuOpen || isActionsMenuClosing) {
                setIsActionsMenuClosing(true);
            } else {
                if (!ensureSelectionForActions()) return;
                setIsActionsMenuOpen(true);
                setIsActionsMenuClosing(false);
            }
            return;
        }

        if (event.key.toLowerCase() === "p" && hasPrimaryModifier(event) && !event.altKey) {
            event.preventDefault();
            event.stopPropagation();

            if (event.shiftKey) {
                if (selectedCommand) {
                    await handleTogglePin(selectedCommand.id);
                }
                return;
            }

            openDrilldownCategory(PINNED_CATEGORY_ID);
            return;
        }

        if (event.key.toLowerCase() === "g" && hasPrimaryModifier(event) && !event.altKey && !event.shiftKey && calculatorCanGraph) {
            event.preventDefault();
            event.stopPropagation();
            setCalculatorViewMode(current => current === "graph" ? "result" : "graph");
            return;
        }

        if (isActionsMenuOpen && !isActionsMenuClosing) {
            return;
        }

        if (isPageOpen && isPageTarget) {
            if (event.key === "Enter" && hasPrimaryModifier(event) && !event.altKey && !event.shiftKey) {
                event.preventDefault();
                await submitActivePage();
                return;
            }

            if (event.key === "Enter") {
                return;
            }

            if (event.key !== "Escape") {
                return;
            }
        }

        if (!isPromptInputTarget && event.key === "Enter" && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey && activePromptCommand && selectedPromptCandidate) {
            event.preventDefault();
            await executePromptCandidate(selectedPromptCandidate.run, activePromptCommand.id ?? activePromptCommandIdRef.current);
            return;
        }

        if (!isPromptInputTarget && calculatorResult && event.key === "Enter") {
            event.preventDefault();
            if (hasPrimaryModifier(event) && event.shiftKey) {
                await copyCalculatorResult("qa");
                return;
            }

            if (hasPrimaryModifier(event)) {
                await copyCalculatorResult("raw");
                return;
            }

            if (!event.altKey && !event.ctrlKey) {
                await copyCalculatorResult("formatted");
                return;
            }
        }

        if (isPromptInputTarget && activePromptCommand) {
            if (!activePromptIsSingleSelect && selectedPromptCandidate && event.key === "Backspace" && promptInputValue.length === 0) {
                event.preventDefault();
                setSelectedPromptCandidateId(null);
                return;
            }

            if (event.key === "Tab" || event.key === "ArrowLeft") {
                event.preventDefault();
                focusSearchInput();
                return;
            }

            if (event.key === "ArrowDown") {
                event.preventDefault();
                if (promptDropdownSuggestions.length > 0) {
                    if (!showPromptDropdown) {
                        setShowPromptDropdown(true);
                    }
                    const baseIndex = showPromptDropdown && promptSelectedSuggestionIndex >= 0
                        ? promptSelectedSuggestionIndex
                        : -1;
                    const nextIndex = baseIndex < promptDropdownSuggestions.length - 1
                        ? baseIndex + 1
                        : promptDropdownSuggestions.length - 1;
                    const candidate = promptDropdownSuggestions[nextIndex];
                    if (candidate) {
                        setSelectedPromptCandidateId(candidate.id);
                    }
                    return;
                }
                setShowPromptDropdown(true);
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                if (promptDropdownSuggestions.length > 0) {
                    if (!showPromptDropdown) {
                        setShowPromptDropdown(true);
                    }
                    const baseIndex = showPromptDropdown && promptSelectedSuggestionIndex >= 0
                        ? promptSelectedSuggestionIndex
                        : 0;
                    const nextIndex = baseIndex > 0
                        ? baseIndex - 1
                        : 0;
                    const candidate = promptDropdownSuggestions[nextIndex];
                    if (candidate) {
                        setSelectedPromptCandidateId(candidate.id);
                    }
                    return;
                }
                setShowPromptDropdown(true);
                return;
            }

            if (event.key === "Enter") {
                event.preventDefault();
                if (showPromptDropdown && selectedPromptCandidate) {
                    await executePromptCandidate(selectedPromptCandidate.run, activePromptCommand?.id ?? activePromptCommandIdRef.current);
                    return;
                }
                const candidate = selectedPromptCandidate ?? queryCandidates[0];
                if (!candidate) return;

                await executePromptCandidate(candidate.run, activePromptCommand?.id ?? activePromptCommandIdRef.current);
                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                if (showPromptDropdown) {
                    setShowPromptDropdown(false);
                    return;
                }
                clearPromptState();
                return;
            }

            return;
        }

        if (isMainInputTarget && promptCommand && !isPageOpen && (event.key === "Tab" || event.key === "ArrowRight")) {
            event.preventDefault();
            activatePromptCommand(promptCommand, true);
            return;
        }

        if (isMainInputTarget && activePromptCommand && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setFocusPromptInput(true);
            return;
        }

        if (isMainInputTarget && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
            return;
        }

        if (isMainInputTarget && event.key === "ArrowDown") {
            event.preventDefault();
            if (compact) {
                setExpanded(true);
                return;
            }
            moveSelection(1);
            return;
        }

        if (isMainInputTarget && event.key === "ArrowUp") {
            event.preventDefault();
            if (compact) return;
            if (selectedIndex <= 0) {
                focusSearchInput();
                return;
            }
            moveSelection(-1);
            return;
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            if (canDrillDown) drillDown();
            return;
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            if (canGoBack) goBack();
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (compact) {
                setExpanded(true);
                return;
            }

            moveSelection(1);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            if (compact) return;

            if (selectedIndex <= 0 && trimmedQuery.length === 0 && navigationLevel.type === "root") {
                setExpanded(false);
                return;
            }

            moveSelection(-1);
            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();
            const actionKey = event.metaKey || event.altKey || event.ctrlKey || event.shiftKey
                ? getEnterActionKey(event)
                : "primary";
            if (actionKey === "primary") {
                await executeItem(selectedItem, actionKey);
                return;
            }

            if (!selectedCommand) return;

            const actionContext = {
                command: selectedCommand,
                drilldownCategoryId: selectedDrilldownCategoryId,
                isPageOpen: false,
                hasCalculatorResult: Boolean(calculatorResult),
                canGoBack
            };
            const intent = resolveCommandActionIntentByActionKey(selectedCommand, actionKey, actionContext);
            if (!intent) return;

            await dispatchPaletteActionIntent({
                intent,
                executePrimary: () => executeItem(selectedItem, "primary"),
                executeSecondary: async resolvedActionKey => {
                    const executed = await executeCommandAction(selectedCommand, resolvedActionKey, actionContext);
                    if (!executed) return;
                    if (selectedCommand.closeAfterExecute ?? closeAfterExecute) {
                        closePalette("programmatic");
                    }
                },
                togglePin: handleTogglePin,
                openPage: pushPage,
                openDrilldown: openDrilldownCategory,
                submitActivePage,
                goBack,
                setCalculatorViewMode,
                copyCalculatorResult
            });
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();

            if (activePromptCommand) {
                clearPromptState();
                return;
            }

            if (canGoBack) {
                goBack();
                return;
            }

            if (!compact && trimmedQuery.length > 0) {
                setQuery("");
                setExpanded(false);
                return;
            }

            if (!compact) {
                setExpanded(false);
                return;
            }

            closePalette("explicit-root");
        }
    };

    const paletteActions = useMemo(() => {
        return resolvePaletteActions({
            activePage: activePageSpec
                ? { id: activePageSpec.id, submitLabel: activePageSpec.submitLabel }
                : null,
            hasCalculatorResult: Boolean(calculatorResult),
            calculatorCanGraph,
            calculatorViewMode,
            selectedCommand,
            selectedCommandPinned: selectedCommand ? isCommandPinned(selectedCommand.id) : false,
            canGoBack,
            canDrillDown,
            drilldownCategoryId: selectedDrilldownCategoryId
        });
    }, [activePageSpec, calculatorCanGraph, calculatorResult, calculatorViewMode, selectedCommand, canGoBack, canDrillDown, selectedDrilldownCategoryId, pinnedIds]);

    const handleActionIntent = async (intent: CommandActionIntent) => {
        await dispatchPaletteActionIntent({
            intent,
            executePrimary: () => executeItem(selectedItem, "primary"),
            executeSecondary: actionKey => executeItem(selectedItem, actionKey),
            togglePin: handleTogglePin,
            openPage: pushPage,
            openDrilldown: openDrilldownCategory,
            submitActivePage,
            goBack,
            setCalculatorViewMode,
            copyCalculatorResult
        });
    };

    const activePageView = useMemo(() => {
        if (!activePageSpec || !activePageState) return null;
        const context = buildActivePageContext();
        if (!context) return null;

        return (
            <PalettePageShell title={activePageSpec.title} error={activePage?.error}>
                {activePageSpec.renderPage?.(context)}
                {activePageSpec.fields.map(field => {
                    const custom = activePageSpec.renderField?.(field, context);
                    if (custom) return <div key={field.key}>{custom}</div>;

                    const value = context.values[field.key] ?? "";
                    if (field.type === "picker") {
                        const suggestions = activePageFieldKey === field.key
                            ? activePageSuggestions.slice(0, field.suggestionLimit ?? activePageSuggestions.length)
                            : [];

                        return (
                            <PaletteField key={field.key} label={field.label}>
                                <PalettePickerInput
                                    value={value}
                                    suggestions={suggestions}
                                    placeholder={field.placeholder}
                                    onChange={next => {
                                        setActivePageFieldKey(field.key);
                                        context.setValue(field.key, next);
                                    }}
                                    onPick={suggestion => {
                                        setActivePageFieldKey(field.key);
                                        context.setValue(field.key, suggestion.label);
                                        context.setSelectedId(field.key, suggestion.id);
                                    }}
                                />
                            </PaletteField>
                        );
                    }

                    return (
                        <PaletteField key={field.key} label={field.label}>
                            <TextInput
                                className={cl("page-input")}
                                value={value}
                                onChange={next => context.setValue(field.key, next)}
                                onFocus={() => setActivePageFieldKey(field.key)}
                                placeholder={field.placeholder}
                            />
                        </PaletteField>
                    );
                })}
            </PalettePageShell>
        );
    }, [activePage, activePageFieldKey, activePageSpec, activePageState, activePageSuggestions]);

    return (
        <ModalRoot
            {...modalProps}
            className={cn("vc-command-palette", compact && cl("compact"))}
            size={compact ? ModalSize.SMALL : ModalSize.LARGE}
        >
            <div className={cl("shell")} onKeyDown={onKeyDown}>
                {!isPageOpen && (
                    <CommandPaletteInput
                        inputRef={mainInputRef}
                        autoFocus={!activePromptCommand}
                        value={query}
                        onChange={value => {
                            if (activePromptCommand && value.length > 0) {
                                clearPromptState();
                            }

                            const next = value.trim();
                            setQuery(value);

                            if (next.length > 0) {
                                setExpanded(true);
                            } else {
                                if (navigationLevel.type !== "root") {
                                    goBack();
                                    return;
                                }
                                setExpanded(false);
                            }
                        }}
                        placeholder={mainInputPlaceholder}
                        readOnly={false}
                    >
                        {shouldRenderPromptPreview && promptCommand && (
                            <div
                                ref={promptContainerRef}
                                className={classes(cl("query-preview"), !shouldShowPromptCommandLabel && cl("query-preview-without-label"))}
                            >
                                {shouldShowPromptCommandLabel && (
                                    <span className={cl("query-preview-command-label")}>{promptCommand.label}</span>
                                )}
                                <div className={cl("query-preview-prompt")} style={queryPreviewPromptStyle}>
                                    {activePromptCommand ? (
                                        <div
                                            className={classes(cl("query-prompt-capsule"), cl("query-prompt-capsule-active"))}
                                            style={promptChipStyle}
                                            onMouseDown={() => setShowPromptDropdown(true)}
                                        >
                                            <TextInput
                                                ref={promptInputRef}
                                                className={cl("prompt-active-input")}
                                                value={promptInputValue}
                                                onChange={value => {
                                                    setPromptInputValue(value);
                                                    setShowPromptDropdown(true);
                                                    if (selectedPromptCandidateId) {
                                                        setSelectedPromptCandidateId(null);
                                                    }
                                                }}
                                                placeholder={selectedPromptCandidate ? "" : (promptCommand.queryPlaceholder ?? "Action")}
                                                onFocus={() => setShowPromptDropdown(true)}
                                                onBlur={() => {
                                                    window.setTimeout(() => {
                                                        const active = document.activeElement;
                                                        if (promptContainerRef.current?.contains(active)) return;
                                                        setShowPromptDropdown(false);
                                                        if (selectedPromptCandidateId || promptInputValue.trim().length > 0) return;
                                                        clearPromptState();
                                                    }, 0);
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className={cl("query-prompt-capsule")}
                                            style={promptChipStyle}
                                            onMouseDown={event => event.preventDefault()}
                                            onClick={() => activatePromptCommand(promptCommand, true)}
                                        >
                                            <span className={cl("query-prompt-capsule-label")}>{promptCommand.queryPlaceholder ?? "Action"}</span>
                                        </button>
                                    )}
                                    {shouldShowPromptDropdown && (
                                        <PaletteDropdown
                                            className={cl("query-preview-dropdown")}
                                            suggestions={promptDropdownSuggestions}
                                            highlightedIndex={promptSelectedSuggestionIndex}
                                            onHover={index => {
                                                const candidate = promptDropdownSuggestions[index];
                                                if (!candidate) return;
                                                setSelectedPromptCandidateId(candidate.id);
                                            }}
                                            onPick={candidate => {
                                                setSelectedPromptCandidateId(candidate.id);
                                                if (activePromptIsSingleSelect) {
                                                    setPromptInputValue(candidate.label);
                                                } else {
                                                    setPromptInputValue("");
                                                }
                                                if (activePromptIsSingleSelect) {
                                                    setShowPromptDropdown(false);
                                                }
                                                setFocusPromptInput(true);
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </CommandPaletteInput>
                )}

                {!compact && !isPageOpen && calculatorResult && (
                    <CommandPaletteCalculatorCards result={calculatorResult} mode={calculatorViewMode} />
                )}

                {!compact && !isPageOpen && (
                    <div ref={listRef} className={cl("list")}>
                        {!hasCommandItems && <div className={cl("empty")}>{emptyStateText}</div>}
                        {items.map((item, index) => {
                            if (item.type === "section") {
                                itemRefs.current[index] = null;
                                return <CommandPaletteRow key={item.id} item={item} selected={false} onClick={() => undefined} onHover={() => undefined} />;
                            }

                            if (item.type !== "command") {
                                itemRefs.current[index] = null;
                                return null;
                            }

                            return (
                                <div key={item.id} ref={el => {
                                    itemRefs.current[index] = el?.querySelector("button") ?? null;
                                }}>
                                    <CommandPaletteRow
                                        item={item}
                                        selected={index === selectedIndex}
                                        onClick={() => {
                                            if (activePromptCommand && activePromptCommand.id !== item.command.id) {
                                                clearPromptState();
                                            }
                                            updateSelectionFromPointer(index, item, true);
                                        }}
                                        onDoubleClick={() => {
                                            void executeItem(item, "primary");
                                        }}
                                        onHover={() => {
                                            if (item.command.queryTemplate) return;
                                            updateSelectionFromPointer(index, item);
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                {!compact && isPageOpen && activePageView}

                {!compact && (isActionsMenuOpen || isActionsMenuClosing) && (
                    <CommandPaletteActionsMenu
                        actions={paletteActions}
                        title={activePageSpec?.title ?? selectedLabel ?? "Actions"}
                        onAction={handleActionIntent}
                        isClosing={isActionsMenuClosing}
                        onClose={() => {
                            setIsActionsMenuOpen(false);
                            setIsActionsMenuClosing(false);
                        }}
                    />
                )}

                {(
                    <CommandPaletteActionBar
                        selectedLabel={activePageSpec
                            ? activePageSpec.title
                            : (calculatorResult ? calculatorResult.displayAnswer : selectedLabel)}
                        onOpenActions={() => {
                            if (!ensureSelectionForActions()) return;
                            setIsActionsMenuOpen(true);
                            setIsActionsMenuClosing(false);
                        }}
                        compact={compact}
                        onExpand={() => setExpanded(true)}
                    />
                )}
            </div>
        </ModalRoot>
    );
}
