import { CLASS_PREFIX } from "../constants";
import { getTitleBarHeight, getSidebarWidth } from "../utils/discordUI";

/**
 * Toggle Fake Fullscreen Mode for a video in the document.
 * Enlarges the first video element to cover the available screen area.
 */
export function toggleFakeFullscreen(doc: Document = document): void {
    // Find all videos in the document
    const videos = Array.from(doc.querySelectorAll("video")) as HTMLVideoElement[];

    if (videos.length === 0) {
        return;
    }

    // Always use video #0 - Discord's natural ordering
    const mainVideo = videos[0];

    // Find the container to maximize
    let container = mainVideo.parentElement;
    let depth = 0;
    let targetContainer = container;

    while (container && depth < 10) {
        if (container.classList.contains(`${CLASS_PREFIX}-native-fs`)) {
            targetContainer = container;
            break;
        }
        if (container.className.includes("tile") || container.className.includes("wrapper")) {
            targetContainer = container;
        }
        container = container.parentElement;
        depth++;
    }

    if (!targetContainer) targetContainer = mainVideo.parentElement;

    if (targetContainer) {
        const btn = doc.querySelector('[class*="-participantsButton"]') as HTMLElement;

        if (targetContainer.classList.contains(`${CLASS_PREFIX}-native-fs`)) {
            // Restore
            targetContainer.classList.remove(`${CLASS_PREFIX}-native-fs`);
            targetContainer.style.position = "";
            targetContainer.style.top = "";
            targetContainer.style.left = "";
            targetContainer.style.width = "";
            targetContainer.style.height = "";
            targetContainer.style.zIndex = "";
            targetContainer.style.backgroundColor = "";

            if (btn) btn.style.display = "";

            // Remove ESC handler
            if ((targetContainer as any)._fsEscHandler) {
                doc.removeEventListener("keydown", (targetContainer as any)._fsEscHandler);
                delete (targetContainer as any)._fsEscHandler;
            }
        } else {
            // Maximize
            const titleBarHeight = getTitleBarHeight(doc);
            const sidebarWidth = getSidebarWidth(doc);

            targetContainer.classList.add(`${CLASS_PREFIX}-native-fs`);
            targetContainer.style.setProperty("position", "fixed", "important");
            targetContainer.style.setProperty("top", `${titleBarHeight}px`, "important");
            targetContainer.style.setProperty("left", `${sidebarWidth}px`, "important");
            targetContainer.style.setProperty("width", `calc(100% - ${sidebarWidth}px)`, "important");
            targetContainer.style.setProperty("height", `calc(100% - ${titleBarHeight}px)`, "important");
            targetContainer.style.setProperty("z-index", "2147483647", "important");
            targetContainer.style.setProperty("background-color", "#000", "important");

            if (btn) btn.style.display = "none";

            // ESC key handler to exit fake fullscreen
            const escHandler = (e: KeyboardEvent) => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFakeFullscreen(doc);
                }
            };
            doc.addEventListener("keydown", escHandler);
            (targetContainer as any)._fsEscHandler = escHandler;
        }
    }
}
