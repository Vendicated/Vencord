import definePlugin from "@utils/types";

let observer: MutationObserver | null = null;
const patchedVideos = new WeakSet<HTMLVideoElement>();

function patchVideo(video: HTMLVideoElement) {
    if (patchedVideos.has(video)) return;
    patchedVideos.add(video);

    video.preload = "auto";
    try {
        Object.defineProperty(video, "preload", {
            get: () => "auto",
            set: () => {},
            configurable: true,
        });
    } catch {}
    
    video.setAttribute("preload", "auto");

    const attrObserver = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type === "attributes" && m.attributeName === "preload" && video.getAttribute("preload") !== "auto") {
                video.setAttribute("preload", "auto");
            }
        }
    });
    attrObserver.observe(video, { attributes: true, attributeFilter: ["preload"] });

    if (video.src) {
        try {
            const url = new URL(video.src);
            if (url.hostname === "media.discordapp.net" && url.pathname.startsWith("/attachments/")) {
                url.hostname = "cdn.discordapp.com";
                if (video.src !== url.href) {
                    video.src = url.href;
                }
            }
        } catch {}
    }
    
    const srcObserver = new MutationObserver(mutations => {
        for (const m of mutations) {
            if (m.type === "attributes" && m.attributeName === "src") {
                const currentSrc = video.getAttribute("src");
                if (currentSrc) {
                    try {
                        const url = new URL(currentSrc, window.location.origin);
                        if (url.hostname === "media.discordapp.net" && url.pathname.startsWith("/attachments/")) {
                            url.hostname = "cdn.discordapp.com";
                            video.setAttribute("src", url.href);
                        }
                    } catch {}
                }
            }
        }
    });
    srcObserver.observe(video, { attributes: true, attributeFilter: ["src"] });

    video.addEventListener("loadedmetadata", () => {
        if (video.src) {
            try {
                const url = new URL(video.src, window.location.origin);
                const isDiscordCDN = url.hostname.endsWith("discordapp.net") || 
                                     url.hostname.endsWith("discordapp.com") || 
                                     url.hostname.endsWith("discord.com");
                                     
                if (!isDiscordCDN && video.duration && isFinite(video.duration) && video.duration > 0) {
                    const savedTime = video.currentTime;
                    video.currentTime = Math.max(video.duration - 0.01, 0);
                    video.currentTime = savedTime;
                }
            } catch {}
        }
    }, { once: true });

    video.addEventListener("waiting", () => {
        if (video.buffered.length > 0) {
            const currentTime = video.currentTime;
            for (let i = 0; i < video.buffered.length; i++) {
                const start = video.buffered.start(i);
                const end = video.buffered.end(i);
                if (currentTime < start && start - currentTime < 0.5) {
                    video.currentTime = start;
                    video.play().catch(() => { });
                    return;
                }
                if (currentTime >= start && currentTime < end && end - currentTime > 0.1) {
                    video.play().catch(() => { });
                    return;
                }
            }
        }
    });

    video.addEventListener("pause", () => {
        if (video.readyState < 3 && !video.ended) {
            video.load();
            video.preload = "auto";
            video.setAttribute("preload", "auto");
        }
    });
}

function scanAndPatch(root: Node) {
    if (root instanceof HTMLVideoElement) {
        patchVideo(root);
    }
    if (root instanceof HTMLElement) {
        root.querySelectorAll<HTMLVideoElement>("video").forEach(patchVideo);
    }
}

export default definePlugin({
    name: "FixVideoBuffering",
    description: "Reduces video buffering in Discord by forcing aggressive preloading, expanding buffers, and auto-recovering from playback stalls.",
    authors: [
        {
            name: "sfdb",
            id: 870276689912012810n,
        },
    ],

    start() {
        document.querySelectorAll<HTMLVideoElement>("video").forEach(patchVideo);

        const originalCreateElement = document.createElement;
        document.createElement = function(tagName: string, options?: ElementCreationOptions) {
            const el = originalCreateElement.call(this, tagName, options);
            if (tagName.toLowerCase() === "video") {
                setTimeout(() => patchVideo(el as HTMLVideoElement), 0);
            }
            return el;
        };
        (this as any)._originalCreateElement = originalCreateElement;

        observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    scanAndPatch(node);
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    },

    stop() {
        if ((this as any)._originalCreateElement) {
            document.createElement = (this as any)._originalCreateElement;
        }
        observer?.disconnect();
        observer = null;
    },
});
