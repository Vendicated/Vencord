/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { getCurrentLabels,ICONS, PANEL_COUNT } from "./constants";
import { clearAllStyles as clearCSSHelper } from "./cssHelper";
import * as el from "./elements";
import * as m from "./modules";
import { getSettings, getShortcutSets,loadSettings, setSetting } from "./settings";
import * as styles from "./styles";

// ─── Runtime State ───

let toolbarElement: HTMLElement | null = null;
let dragging: HTMLElement | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
let controller: AbortController | null = null;
let observer: MutationObserver | null = null;
let collapsed: boolean[] = new Array(PANEL_COUNT).fill(false);
const keys: Set<string> = new Set();
let lastKeypress = Date.now();
let settingsButtonsHidden = false;
let messageInputButtonsHidden = false;
let toolbarButtonsHidden = false;
let toolbarFullHidden = false;

// ─── Helpers ───

function isNear(element: Element | null, distance: number, x: number, y: number): boolean {
    const box = element?.getBoundingClientRect();
    if (!box) return false;

    const top = box.top - distance;
    const left = box.left - distance;
    let right = box.right + distance;
    const bottom = box.bottom + distance;

    if (element?.classList?.contains(m.frame?.bar))
        right = window.innerWidth + distance;

    return x > left && x < right && y > top && y < bottom;
}

function getController(): AbortController {
    if (controller && !controller.signal.aborted) return controller;
    controller = new AbortController();
    return controller;
}

// ─── Toolbar ───

function createToolbarContainer(): void {
    toolbarElement?.remove();

    const toolbar = document.createElement("div");
    toolbar.className = "cui-toolbar";

    const toolbarParent = el.getToolbar();
    const inviteToolbar = el.getInviteToolbar();
    const searchBar = el.getSearchBar();

    try {
        if (inviteToolbar || searchBar) {
            toolbarParent?.insertBefore(
                toolbar,
                inviteToolbar ? inviteToolbar.nextElementSibling : searchBar
            );
        } else {
            const nodes = toolbarParent?.childNodes;
            if (nodes && nodes.length >= 2)
                toolbarParent?.insertBefore(toolbar, nodes[nodes.length - 2]);
            else
                toolbarParent?.appendChild(toolbar);
        }
    } catch {
        toolbarParent?.appendChild(toolbar);
    }

    toolbarElement = document.querySelector(".cui-toolbar");

    if (toolbarElement) {
        const s = getSettings();
        for (let i = 1; i <= s.buttonIndexes.length; i++) {
            for (let j = 0; j < s.buttonIndexes.length; j++) {
                if (i === s.buttonIndexes[j] && el.getAllPanels()[j])
                    createToolbarButton(j);
            }
        }
    }
}

function createToolbarButton(index: number): void {
    const s = getSettings();
    const labels = getCurrentLabels();
    const shortcutKeys = s.shortcutList[index]
        .map(e => (e.length === 1 ? e.toUpperCase() : e))
        .join("+");
    const text = `${labels[index]} (${shortcutKeys})`;

    const button = document.createElement("div");
    button.id = `cui-icon-${index}`;
    button.className = `${m.icons?.iconWrapper} ${m.icons?.clickable} ${s.buttonsActive[index] ? m.icons?.selected : ""}`;
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", text);
    button.setAttribute("tabindex", "0");
    button.title = text;
    button.innerHTML = `
        <svg x="0" y="0" class="${m.icons?.icon}" aria-hidden="false" role="img"
             xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            ${ICONS[index]}
        </svg>
    `;

    button.addEventListener("click", () => toggleButton(index));
    toolbarElement?.appendChild(button);
}

function toggleButton(index: number): void {
    const s = getSettings();
    styles.togglePanel(index);
    toolbarElement?.querySelector(`#cui-icon-${index}`)?.classList.toggle(m.icons?.selected);
    const newActive = [...s.buttonsActive];
    newActive[index] = !newActive[index];
    setSetting("buttonsActive", newActive);
}

// ─── Tick Functions ───

function tickExpandOnHover(x: number, y: number): void {
    const s = getSettings();
    if (!s.expandOnHover) return;

    const panels = el.getAllPanels();
    for (let i = 0; i < PANEL_COUNT; i++) {
        if (!s.collapseDisabledButtons && s.buttonIndexes[i] === 0) continue;
        if (!s.expandOnHoverEnabled[i]) continue;
        if (!(!s.buttonsActive[i])) continue;

        if (isNear(panels[i], s.expandOnHoverFudgeFactor, x, y)) {
            if (collapsed[i]) {
                if (s.floatingPanels && s.floatingEnabled[i] === "hover")
                    styles.floatPanel(i);
                styles.collapseElementDynamic(i, false, collapsed);
            }
        } else {
            if (!collapsed[i]) {
                if (el.getBiteSizePanel() || el.getRightClickMenu() ||
                    el.getForumPreviewTooltip() || el.getExpressionPicker()) {
                    styles.collapseElementDynamic(i, false, collapsed);
                } else {
                    styles.collapseElementDynamic(i, true, collapsed);
                }
            }
        }
    }
}

function tickCollapseSettings(x: number, y: number): void {
    const s = getSettings();
    if (!s.collapseSettings) return;

    if (isNear(el.getSettingsContainer(), s.buttonCollapseFudgeFactor, x, y)) {
        if (settingsButtonsHidden) { styles.showSettingsButtons(); settingsButtonsHidden = false; }
    } else {
        if (!settingsButtonsHidden) { styles.hideSettingsButtons(); settingsButtonsHidden = true; }
    }
}

function tickMessageInputCollapse(x: number, y: number): void {
    const s = getSettings();
    if (!s.messageInputCollapse) return;

    if (isNear(el.getMessageInputContainer(), s.buttonCollapseFudgeFactor, x, y)) {
        if (messageInputButtonsHidden) { styles.showMessageInputButtons(); messageInputButtonsHidden = false; }
    } else {
        if (!messageInputButtonsHidden) { styles.hideMessageInputButtons(); messageInputButtonsHidden = true; }
    }
}

function tickCollapseToolbar(x: number, y: number, full: boolean): void {
    const s = getSettings();
    if (!s.collapseToolbar) return;

    if (full) {
        if (isNear(el.getToolbar(), s.buttonCollapseFudgeFactor, x, y) &&
            !isNear(el.getForumPopout(), 0, x, y)) {
            if (toolbarFullHidden) { styles.showToolbarFull(); toolbarFullHidden = false; }
        } else {
            if (!toolbarFullHidden) { styles.hideToolbarFull(); toolbarFullHidden = true; }
        }
    } else {
        if (isNear(toolbarElement, s.buttonCollapseFudgeFactor, x, y) &&
            !isNear(el.getForumPopout(), 0, x, y)) {
            if (toolbarButtonsHidden) { styles.showToolbarButtons(); toolbarButtonsHidden = false; }
        } else {
            if (!toolbarButtonsHidden) { styles.hideToolbarButtons(); toolbarButtonsHidden = true; }
        }
    }
}

function tickKeyboardShortcuts(): void {
    const shortcuts = getShortcutSets();
    for (let i = 0; i < PANEL_COUNT; i++) {
        if (keys.size === shortcuts[i].size) {
            let match = true;
            for (const k of keys) {
                if (!shortcuts[i].has(k)) { match = false; break; }
            }
            if (match) toggleButton(i);
        }
    }
}

// ─── Event Listeners ───

function addListeners(): void {
    const ctrl = getController();
    const s = getSettings();

    document.body.addEventListener("mousedown", (e: MouseEvent) => { try {
        if (e.button === 0) {
            const target = e.target as HTMLElement;
            if (target.classList?.contains(m.sidebar?.sidebarList) ||
                target.classList?.contains(m.members?.members) ||
                target.classList?.contains(m.panel?.outer) ||
                target.classList?.contains(m.search?.searchResultsWrap) ||
                target.classList?.contains(m.popout?.chatLayerWrapper) ||
                target.classList?.contains(m.social?.nowPlayingColumn)) {
                target.style.setProperty("transition", "none", "important");
                dragging = target;
            }
            if (target.classList?.contains(m.sidebar?.sidebarList)) {
                document.documentElement.style.setProperty("--cui-channel-list-handle-transition", "none");
                (el.getUserArea() as HTMLElement)?.style.setProperty("transition", "none", "important");
            }
        }
    } catch {} }, { passive: true, signal: ctrl.signal });

    document.body.addEventListener("mouseup", (e: MouseEvent) => { try {
        const s = getSettings();

        if (e.button === 2) {
            // Right-click resets
            const target = e.target as HTMLElement;
            if (target.classList?.contains(m.sidebar?.sidebarList)) {
                setSetting("channelListWidth", s.defaultChannelListWidth);
                styles.updateVariables();
                setTimeout(() => target.style.removeProperty("transition"), s.transitionSpeed);
            }
            if (target.classList?.contains(m.members?.members)) {
                setSetting("membersListWidth", s.defaultMembersListWidth);
                styles.updateVariables();
                setTimeout(() => target.style.removeProperty("transition"), s.transitionSpeed);
            }
            if (target.classList?.contains(m.panel?.outer)) {
                setSetting("userProfileWidth", s.defaultUserProfileWidth);
                styles.updateVariables();
                setTimeout(() => target.style.removeProperty("transition"), s.transitionSpeed);
            }
            if (target.classList?.contains(m.search?.searchResultsWrap)) {
                setSetting("searchPanelWidth", s.defaultSearchPanelWidth);
                styles.updateVariables();
                setTimeout(() => target.style.removeProperty("transition"), s.transitionSpeed);
            }
            if (target.classList?.contains(m.social?.nowPlayingColumn)) {
                setSetting("activityPanelWidth", s.defaultActivityPanelWidth);
                styles.updateVariables();
                setTimeout(() => target.style.removeProperty("transition"), s.transitionSpeed);
            }
            if (target.classList?.contains(m.popout?.chatLayerWrapper)) {
                setSetting("forumPopoutWidth", s.defaultForumPopoutWidth);
                styles.updateVariables();
                setTimeout(() => target.style.removeProperty("transition"), s.transitionSpeed);
            }
        } else {
            // Left-click finish resize
            if (!dragging) return;
            const d = dragging;
            dragging = null;

            if (d.classList?.contains(m.sidebar?.sidebarList)) {
                setSetting("channelListWidth", parseInt(d.style.width) || s.defaultChannelListWidth);
                document.documentElement.style.removeProperty("--cui-channel-list-handle-offset");
                document.documentElement.style.removeProperty("--cui-channel-list-handle-transition");
            }
            if (d.classList?.contains(m.members?.members))
                setSetting("membersListWidth", parseInt(d.style.width) || s.defaultMembersListWidth);
            if (d.classList?.contains(m.panel?.outer))
                setSetting("userProfileWidth", parseInt(d.style.width) || s.defaultUserProfileWidth);
            if (d.classList?.contains(m.search?.searchResultsWrap))
                setSetting("searchPanelWidth", parseInt(d.style.width) || s.defaultSearchPanelWidth);
            if (d.classList?.contains(m.social?.nowPlayingColumn))
                setSetting("activityPanelWidth", parseInt(d.style.width) || s.defaultActivityPanelWidth);
            if (d.classList?.contains(m.popout?.chatLayerWrapper))
                setSetting("forumPopoutWidth", parseInt(d.style.width) || s.defaultForumPopoutWidth);

            d.style.removeProperty("width");
            d.style.removeProperty("max-width");
            d.style.removeProperty("min-width");
            styles.updateVariables();
            setTimeout(() => d.style.removeProperty("transition"), s.transitionSpeed);
        }

        setTimeout(() => tickExpandOnHover(e.clientX, e.clientY), s.transitionSpeed);
    } catch {} }, { passive: true, signal: ctrl.signal });

    document.body.addEventListener("mousemove", (e: MouseEvent) => { try {
        tickExpandOnHover(e.clientX, e.clientY);
        tickCollapseSettings(e.clientX, e.clientY);
        tickMessageInputCollapse(e.clientX, e.clientY);
        tickCollapseToolbar(e.clientX, e.clientY, s.collapseToolbar === "all");

        if (!dragging) return;

        const isLeftPanel = dragging.classList?.contains(m.sidebar?.sidebarList);
        let width = isLeftPanel
            ? e.clientX - dragging.getBoundingClientRect().left
            : dragging.getBoundingClientRect().right - e.clientX;

        width = Math.max(80, Math.min(width, window.innerWidth * 0.6));

        dragging.style.setProperty("width", `${width}px`, "important");
        dragging.style.setProperty("max-width", `${width}px`, "important");
        dragging.style.setProperty("min-width", `${width}px`, "important");

        if (isLeftPanel) {
            document.documentElement.style.setProperty("--cui-channel-list-handle-offset", `${width - 12}px`);
        }
    } catch {} }, { passive: true, signal: ctrl.signal });

    document.body.addEventListener("mouseleave", (e: MouseEvent) => { try {
        if (!isNear(el.getWindowBar(), s.expandOnHoverFudgeFactor, e.clientX, e.clientY))
            tickExpandOnHover(NaN, NaN);
    } catch {} }, { passive: true, signal: ctrl.signal });

    document.body.addEventListener("keydown", (e: KeyboardEvent) => {
        if (s.keyboardShortcuts) {
            if (Date.now() - lastKeypress > 1000) keys.clear();
            lastKeypress = Date.now();
            keys.add(e.key);
            tickKeyboardShortcuts();
        }
    }, { passive: true, signal: ctrl.signal });

    document.body.addEventListener("keyup", (e: KeyboardEvent) => {
        if (s.keyboardShortcuts) keys.delete(e.key);
    }, { passive: true, signal: ctrl.signal });
}

// ─── Observer ───

function createObserver(): MutationObserver {
    return new MutationObserver(mutationList => { try {
        for (const mutation of mutationList) {
            for (const node of mutation.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.nodeName === "ASIDE" ||
                    node.classList?.contains(m.search?.searchResultsWrap) ||
                    node.classList?.contains(m.popout?.chatLayerWrapper) ||
                    node.classList?.contains(m.calls?.wrapper)) {
                    partialReload();
                    return;
                }
            }
            for (const node of mutation.removedNodes) {
                if (!(node instanceof HTMLElement)) continue;
                if (node.nodeName === "ASIDE" ||
                    node.classList?.contains(m.search?.searchResultsWrap) ||
                    node.classList?.contains(m.popout?.chatLayerWrapper) ||
                    node.classList?.contains(m.calls?.wrapper)) {
                    partialReload();
                    return;
                }
                if (node.classList?.contains("layer_bc663c")) {
                    reload();
                    return;
                }
            }
        }
    } catch {} });
}

// ─── Lifecycle ───

function initialize(): void {
    try {
        styles.initAllStyles();
        createToolbarContainer();
    } catch (e) {
        console.error("[ModularCollapse] Error during initialization:", e);
    }
}

function terminate(): void {
    styles.clearAllStyles();
    clearCSSHelper();
    toolbarElement?.remove();
    toolbarElement = null;
}

function reload(): void {
    terminate();
    initialize();
}

function partialReload(): void {
    setTimeout(() => {
        toolbarElement?.remove();
        createToolbarContainer();
    }, 250);
}

// ─── Plugin Definition ───

export default definePlugin({
    name: "ModularCollapse",
    description: "A feature-rich plugin that reworks the Discord UI to be significantly more modular. Collapse, resize, and float UI panels.",
    authors: [
        Devs.programmer2514,
        Devs.Fantasttic,
    ],
    requiresRestart: false,

    start() {
        // Debug: check which modules loaded
        console.info("[ModularCollapse] Checking modules...");
        try { (globalThis as any).__modularCollapse_modules?.(); } catch { }

        loadSettings().then(() => {
            try {
                addListeners();

                observer = createObserver();
                observer.observe(document, {
                    childList: true,
                    subtree: true,
                    attributes: false,
                });

                interval = setInterval(() => {
                    const s = getSettings();
                    if (s.conditionalCollapse) {
                        for (let i = 0; i < PANEL_COUNT; i++) {
                            if (s.collapseConditionals[i]) {
                                try {

                                    if (eval(s.collapseConditionals[i])) {
                                        if (!collapsed[i]) styles.collapseElementDynamic(i, true, collapsed);
                                    } else {
                                        if (collapsed[i]) styles.collapseElementDynamic(i, false, collapsed);
                                    }
                                } catch { /* ignore invalid expressions */ }
                            }
                        }
                    }
                }, 250);

                initialize();
                console.info("[ModularCollapse] Enabled");
            } catch (e) {
                console.error("[ModularCollapse] Error during start:", e);
            }
        }).catch(e => console.error("[ModularCollapse] Error loading settings:", e));
    },

    stop() {
        controller?.abort();
        controller = null;

        if (interval) { clearInterval(interval); interval = null; }
        observer?.disconnect();
        observer = null;

        terminate();
        collapsed = new Array(PANEL_COUNT).fill(false);
        keys.clear();
        settingsButtonsHidden = false;
        messageInputButtonsHidden = false;
        toolbarButtonsHidden = false;
        toolbarFullHidden = false;

        console.info("[ModularCollapse] Disabled");
    },

    // Listen for channel/page switches via Flux dispatcher
    flux: {
        CHANNEL_SELECT() {
            createToolbarContainer();
        },
    },
});
