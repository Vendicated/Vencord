/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const ColorwayCSS = {
    get: () => document.getElementById("activeColorwayCSS")!.textContent || "",
    set: (e: string) => {
        if (!document.getElementById("activeColorwayCSS")) {
            document.head.append(Object.assign(document.createElement("style"), {
                id: "activeColorwayCSS",
                textContent: e
            }));
        } else (document.getElementById("activeColorwayCSS") as any).textContent = e;
    },
    remove: () => document.getElementById("activeColorwayCSS")?.remove(),
};
