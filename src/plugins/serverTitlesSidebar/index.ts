import definePlugin from "@utils/types";
import { enableStyle, disableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import pluginStyle from "./style.css?managed";

/**
 * Waits for an element to appear in the DOM.
 * @param selector The CSS selector for the element.
 * @param timeout How long to wait before giving up.
 * @returns A promise that resolves with the element, or rejects on timeout.
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
            reject(new Error(`Timed out waiting for element: ${selector}`));
        }, timeout);
    });
}

// No import statement needed for Vencord!

// Define a unique ID for our style sheet
const STYLE_ID = "server-list-extender-style";

// The CSS to widen the server list and style the new text
const CSS = `
  /* Widen the server list panel */
  nav[aria-label="Servers"] {
    width: 240px !important;
    transition: width 0.2s ease-in-out;
  }

  /* Make sure the main app content moves over correctly */
  .base_a4d4d9 {
    transition: left 0.2s ease-in-out;
  }
  
  /* Make list items flexible to hold the icon and text */
  div[class*="listItem"] {
    display: flex;
    align-items: center;
  }

  /* Style for the injected server name text */
  .server-name-text {
    color: var(--header-primary);
    font-family: var(--font-primary);
    font-size: 15px;
    font-weight: 500;
    margin-left: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none; /* The text itself isn't interactive */
    flex-grow: 1;
  }
  
  /* Style for folder headers */
  .folder-name-text {
    color: var(--header-secondary);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    margin-left: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
    flex-grow: 1;
  }
`;

// This function finds all server/DM items and adds a name if it's missing
function addNamesToItems() {
    const serverListItems: NodeListOf<HTMLElement> = document.querySelectorAll(
        'ul[data-list-id="guildsnav"] [class*="listItem"]'
    );

    serverListItems.forEach((item) => {
        if (item.querySelector(".server-name-text, .folder-name-text")) {
            return;
        }

        let name: string | null | undefined;
        let isFolder = false;
        let container: HTMLElement | null = null;

        // Folders have a different structure from servers
        const folderHeader = item.querySelector<HTMLElement>(
            '[class*="folderHeader"]'
        );
        if (folderHeader) {
            isFolder = true;
            name = folderHeader.dataset.dndName;
            container = folderHeader;
        } else {
            // Regular server icon
            const blobContainer = item.querySelector<HTMLElement>(
                '[class*="blobContainer"]'
            );
            if (blobContainer) {
                name = blobContainer.dataset.dndName;
                container = blobContainer;
            }
        }

        if (!name || !container) {
            return;
        }

        // The 'Add a Server' and 'Explore' buttons are also listItems.
        // They don't have dnd-name but have aria-label on a child. Let's just filter by name.
        if (
            name.includes("Add a Server") ||
            name.includes("Explore Discoverable Servers")
        ) {
            return;
        }

        const cleanedName = name.split(",")[0].trim();

        const textEl = document.createElement("div");
        textEl.textContent = cleanedName;
        textEl.className = isFolder ? "folder-name-text" : "server-name-text";

        textEl.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent duplicate events
            const clickable =
                container.querySelector<HTMLElement>('[role="treeitem"]');
            clickable?.click();
        });

        container.appendChild(textEl);
    });
}

// Use a MutationObserver to detect when Discord adds/removes servers from the list
const observer = new MutationObserver(() => {
    // A small delay ensures the DOM is fully updated before we process it
    setTimeout(addNamesToItems, 50);
});

export default definePlugin({
    name: "Server Titles Sidebar",
    description: "Extends the server list to show server titles.",
    authors: [Devs.KBO],

    async start() {
        enableStyle(pluginStyle);

        try {
            const guildsNav = await waitForElement(
                'nav[aria-label="Servers sidebar"]'
            );

            // Run once on start
            addNamesToItems();
            // Observe for future changes
            observer.observe(guildsNav, {
                childList: true,
                subtree: true,
            });
        } catch (err) {
            console.error("[Server Titles Sidebar]", err);
        }
    },
    stop() {
        // Disconnect the observer to stop watching for changes
        observer.disconnect();

        // Remove our injected CSS
        disableStyle(pluginStyle);

        // Clean up any text elements we added
        document
            .querySelectorAll(".server-name-text, .folder-name-text")
            .forEach((el) => el.remove());
    },
});
