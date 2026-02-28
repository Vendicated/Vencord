/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

(async () => {
    const initSponsorBlock = async () => {
        const video = document.querySelector("video");
        const playerContainer = document.querySelector(".html5-video-player");
        const chaptersContainer = document.querySelector(".ytp-chapters-container") || document.querySelector(".ytp-progress-bar");

        if (!video || !playerContainer) {
            setTimeout(initSponsorBlock, 500);
            return;
        }

        const url = new URL(window.location.href);
        const videoId = url.pathname.includes("/embed/")
            ? url.pathname.split("/embed/")[1]?.split("?")[0]
            : url.searchParams.get("v");

        if (!videoId) return;

        const notice = document.createElement("div");
        Object.assign(notice.style, {
            position: "absolute", bottom: "80px", left: "50%",
            transform: "translateX(-50%)", background: "rgba(20, 20, 20, 0.95)",
            color: "white", padding: "10px 20px", borderRadius: "8px",
            zIndex: "2147483647", opacity: "0", transition: "opacity 0.3s",
            pointerEvents: "none", display: "flex", alignItems: "center", gap: "15px",
            fontSize: "14px", fontFamily: "Roboto, Arial, sans-serif"
        });

        const undoBtn = document.createElement("button");
        undoBtn.textContent = "UNDO";
        Object.assign(undoBtn.style, {
            background: "#3ea6ff", color: "black", border: "none",
            padding: "5px 12px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold"
        });

        notice.append("Sponsor Skipped", undoBtn);
        playerContainer.appendChild(notice);

        const drawMarkers = segments => {
            if (!chaptersContainer) return;
            document.querySelectorAll(".sb-marker").forEach(m => m.remove());

            segments.forEach(seg => {
                const [start, end] = seg.segment;
                const left = (start / video.duration) * 100;
                const width = ((end - start) / video.duration) * 100;

                const marker = document.createElement("div");
                marker.className = "sb-marker";
                Object.assign(marker.style, {
                    position: "absolute", left: left + "%", width: width + "%",
                    height: "100%", background: "rgba(0, 212, 0, 0.7)",
                    zIndex: "10", pointerEvents: "none"
                });
                chaptersContainer.appendChild(marker);
            });
        };

        let lastSkipStart = 0;
        const ignoredSegments = new Set();

        undoBtn.onclick = e => {
            e.stopPropagation();
            ignoredSegments.add(lastSkipStart.toString());
            video.currentTime = lastSkipStart;
            notice.style.opacity = "0";
            notice.style.pointerEvents = "none";
        };

        const categories = ["sponsor", "intro", "outro", "interaction", "selfpromo"];
        const apiUrl = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&${categories.map(c => "category=" + c).join("&")}`;

        try {
            const resp = await fetch(apiUrl);
            if (!resp.ok) return;
            const segments = await resp.json();

            const refresh = () => drawMarkers(segments);
            if (video.duration) refresh();
            video.addEventListener("loadedmetadata", refresh);
            window.addEventListener("resize", refresh);

            video.addEventListener("timeupdate", () => {
                const now = video.currentTime;
                for (const seg of segments) {
                    const [start, end] = seg.segment;
                    if (now >= start && now < end && !ignoredSegments.has(start.toString())) {
                        lastSkipStart = start;
                        video.currentTime = end;

                        notice.style.opacity = "1";
                        notice.style.pointerEvents = "auto";
                        setTimeout(() => {
                            notice.style.opacity = "0";
                            notice.style.pointerEvents = "none";
                        }, 5000);
                        break;
                    }
                }
            });


        } catch (e) {

        }
    };

    initSponsorBlock();
})();
