/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const images = {
    cross: "https://github.com/Equicord/Equibored/raw/main/icons/loginwithqr/cross.png",
    deviceImage: {
        success:
            "https://github.com/Equicord/Equibored/raw/main/icons/loginwithqr/success.png",
        notFound:
            "https://github.com/Equicord/Equibored/raw/main/icons/loginwithqr/not-found.png",
        loading:
            "https://github.com/Equicord/Equibored/raw/main/icons/loginwithqr/loaded.png",
    },
} as const;

export let unload: () => void;
export function preload() {
    const elements = new Array<HTMLElement>();

    // Normally, we'd use link:preload (or link:prefetch), but
    // Discord blocks third party prefetch domains and link:preload
    // throws a warning, so we'll just put the images in the head
    const browse = (dir: Record<string, any>) => {
        for (const entry of Object.values(dir)) {
            if (typeof entry === "string") {
                const img = new Image();
                img.setAttribute("data-purpose", "prefetch");
                img.setAttribute("data-added-by", "LoginWithQR");
                img.src = entry;
                document.head.appendChild(img);
                elements.push(img);
            } else if (typeof entry === "object") browse(entry);
        }
    };
    browse(images);

    unload = () => elements.forEach(element => element.remove());
}
