/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createRoot } from "@webpack/common";
import type { Root } from "react-dom/client";

import { settings } from "./settings";
import { useToasts } from "./store";
import Toast from "./Toast";

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function Container() {
    const toasts = useToasts();
    const {
        position, duration, showReplyBar, closeOnReply,
        backgroundColor, usernameColor, textColor, accentColor
    } = settings.use([
        "position", "duration", "showReplyBar", "closeOnReply",
        "backgroundColor", "usernameColor", "textColor", "accentColor"
    ]);

    return (
        <div
            className={`vc-dmn-container vc-dmn-pos-${position}`}
            style={{
                ["--vc-dmn-bg" as any]: backgroundColor,
                ["--vc-dmn-user" as any]: usernameColor,
                ["--vc-dmn-text" as any]: textColor,
                ["--vc-dmn-accent" as any]: accentColor
            }}
        >
            {toasts.map(t => (
                <Toast
                    key={t.id}
                    id={t.id}
                    message={t.message}
                    channel={t.channel}
                    duration={duration}
                    showReplyBar={showReplyBar}
                    closeOnReply={closeOnReply}
                />
            ))}
        </div>
    );
}

export function mountNotifications() {
    if (root) return;
    container = document.createElement("div");
    container.id = "vc-dmn-root";
    document.body.append(container);
    root = createRoot(container);
    root.render(<Container />);
}

export function unmountNotifications() {
    root?.unmount();
    container?.remove();
    root = undefined;
    container = undefined;
}
