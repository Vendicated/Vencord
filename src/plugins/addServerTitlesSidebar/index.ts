/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2024 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import definePlugin, { OptionType } from "@utils/types";
import { enableStyle, disableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import { definePluginSettings } from "@api/Settings";
import pluginStyle from "./style.css?managed";

// The SVG icons for the toggle button.
const CHEVRON_LEFT_SVG = `<svg fill="currentColor" width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path></svg>`;
const CHEVRON_RIGHT_SVG = `<svg fill="currentColor" width="24" height="24" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path></svg>`;

// A reference to the toggle button so we can remove it on plugin stop.
let toggleButton: HTMLButtonElement | null = null;

// Persist the user's choice for the sidebar state.
const settings = definePluginSettings({
    expanded: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show expanded server titles in the sidebar.",
        onChange: updateSidebarState,
    },
});

/**
 * Updates the UI to reflect the current sidebar state (expanded or collapsed).
 * This function is the single source of truth for the visual state.
 * @param isExpanded Whether the sidebar should be in its expanded state.
 */
function updateSidebarState(isExpanded: boolean) {
    document.body.classList.toggle(
        "server-titles-sidebar-expanded",
        isExpanded
    );

    if (toggleButton) {
        toggleButton.innerHTML = isExpanded
            ? CHEVRON_LEFT_SVG
            : CHEVRON_RIGHT_SVG;
    }

    if (isExpanded) {
        // When expanding, run the script once to add titles to any existing items.
        addTitlesToItems();
    } else {
        // When collapsing, remove all titles to return to the default view.
        document
            .querySelectorAll(".server-name-text, .folder-name-text")
            .forEach((el) => el.remove());
    }
}

/**
 * Asynchronously waits for a specified element to appear in the DOM.
 * This is useful for scripts that need to interact with elements that are
 * loaded dynamically by the application.
 *
 * @param selector The CSS selector of the element to wait for.
 * @param timeout The maximum time in milliseconds to wait before rejecting the promise.
 * @returns A promise that resolves with the found element, or rejects if the timeout is reached.
 */
function waitForElement<T extends Element>(
    selector: string,
    timeout = 10000
): Promise<T> {
    return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
            const el = document.querySelector<T>(selector);
            if (el) {
                clearInterval(interval);
                resolve(el);
            }
        }, 100);

        setTimeout(() => {
            clearInterval(interval);
            reject(
                new Error(
                    `[addServerTitlesSidebar] Timed out waiting for element: ${selector}`
                )
            );
        }, timeout);
    });
}

/**
 * Finds all server and folder items in the sidebar and injects a title element
 * next to the icon. This function is designed to be idempotent; it will not
 * add a title if one already exists.
 */
function addTitlesToItems() {
    // If the sidebar is collapsed, do nothing.
    if (!settings.store.expanded) return;

    const serverListItems: NodeListOf<HTMLElement> = document.querySelectorAll(
        'ul[data-list-id="guildsnav"] [class*="listItem"]'
    );

    serverListItems.forEach((item) => {
        // Skip if a title has already been added to this item.
        if (item.querySelector(".server-name-text, .folder-name-text")) {
            return;
        }

        let name: string | null | undefined;
        let isFolder = false;
        let container: HTMLElement | null = null;

        // Folders and servers have a different HTML structure, so we must check for both.
        const folderHeader = item.querySelector<HTMLElement>(
            '[class*="folderHeader"]'
        );
        if (folderHeader) {
            isFolder = true;
            name = folderHeader.dataset.dndName;
            container = folderHeader;
        } else {
            const blobContainer = item.querySelector<HTMLElement>(
                '[class*="blobContainer"]'
            );
            if (blobContainer) {
                name = blobContainer.dataset.dndName;
                container = blobContainer;
            }
        }

        // If we couldn't find a name or a container, we can't proceed with this item.
        if (!name || !container) {
            return;
        }

        // Filter out special sidebar items like "Add a Server" that are not actual servers.
        if (
            name.includes("Add a Server") ||
            name.includes("Explore Discoverable Servers")
        ) {
            return;
        }

        // The name can sometimes contain extra information (e.g., "Server Name, 1 unread").
        // We only want the clean name.
        const cleanedName = name.split(",")[0].trim();

        const textEl = document.createElement("div");
        textEl.textContent = cleanedName;
        textEl.className = isFolder ? "folder-name-text" : "server-name-text";

        // Make the title clickable by finding the underlying link and simulating a click.
        textEl.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent the event from bubbling up and causing issues.
            const clickable =
                container.querySelector<HTMLElement>('[role="treeitem"]');
            clickable?.click();
        });

        // Forward the context menu (right-click) event to the original icon.
        textEl.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const clickable =
                container.querySelector<HTMLElement>('[role="treeitem"]');
            clickable?.dispatchEvent(
                new MouseEvent("contextmenu", {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: e.clientX,
                    clientY: e.clientY,
                })
            );
        });

        // Forward hover events to the original icon to trigger tooltips and pills.
        const clickable = item.querySelector<HTMLElement>('[role="treeitem"]');
        textEl.addEventListener("mouseenter", () =>
            clickable?.dispatchEvent(
                new MouseEvent("mouseenter", { bubbles: true })
            )
        );
        textEl.addEventListener("mouseleave", () =>
            clickable?.dispatchEvent(
                new MouseEvent("mouseleave", { bubbles: true })
            )
        );

        container.appendChild(textEl);
    });
}

// The MutationObserver watches for changes in the DOM, such as when servers
// are added, removed, or rearranged, and reruns our script to update the titles.
const observer = new MutationObserver(() => {
    // A small delay gives Discord time to finish its DOM updates before we query it.
    setTimeout(addTitlesToItems, 50);
});

export default definePlugin({
    name: "addServerTitlesSidebar",
    description:
        "Adds server and folder titles next to their icons in the sidebar, and widens it to fit them.",
    authors: [{ name: "NewsGuyTor" }],
    github_link: "https://github.com/NewsGuyTor/Vencord-addServerTitlesSidebar",
    settings,

    start() {
        enableStyle(pluginStyle);

        waitForElement('nav[aria-label="Servers sidebar"]')
            .then((guildsNav) => {
                toggleButton = document.createElement("button");
                toggleButton.className = "sts-toggle-button";
                toggleButton.onclick = () => {
                    settings.store.expanded = !settings.store.expanded;
                };
                guildsNav.appendChild(toggleButton);

                updateSidebarState(settings.store.expanded);

                addTitlesToItems();

                observer.observe(guildsNav, {
                    childList: true,
                    subtree: true,
                });
            })
            .catch((err) => {
                console.error("[addServerTitlesSidebar]", err);
            });
    },

    stop() {
        observer.disconnect();
        disableStyle(pluginStyle);

        toggleButton?.remove();
        toggleButton = null;
        document.body.classList.remove("server-titles-sidebar-expanded");

        document
            .querySelectorAll(".server-name-text, .folder-name-text")
            .forEach((el) => el.remove());
    },
});
