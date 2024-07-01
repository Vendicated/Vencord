/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { canvas } from "./components/Canvas";
import { EventEmitter } from "./utils/eventEmitter";

export const Mouse = {
    x: 0,
    y: 0,
    down: false,
    dx: 0,
    dy: 0,
    prevX: 0,
    prevY: 0,
    event: new EventEmitter<MouseEvent>()
};

export function initInput() {
    if (!canvas) return;
    canvas.addEventListener("mousemove", e => {
        Mouse.prevX = Mouse.x;
        Mouse.prevY = Mouse.y;

        const rect = canvas!.getBoundingClientRect();
        const scaleX = canvas!.width / rect.width;
        const scaleY = canvas!.height / rect.height;

        Mouse.x = (e.clientX - rect.left) * scaleX;
        Mouse.y = (e.clientY - rect.top) * scaleY;

        Mouse.dx = Mouse.x - Mouse.prevX;
        Mouse.dy = Mouse.y - Mouse.prevY;

        Mouse.event.emit("move", e);
    });

    canvas.addEventListener("mousedown", e => {
        Mouse.down = true;

        Mouse.event.emit("down", e);
    });

    canvas.addEventListener("mouseup", e => {
        Mouse.down = false;

        Mouse.event.emit("up", e);
    });

    canvas.addEventListener("mouseleave", e => {
        Mouse.down = false;

        Mouse.event.emit("up", e);
    });
}
