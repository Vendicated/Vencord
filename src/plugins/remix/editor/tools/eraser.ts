/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { brushCanvas, render } from "../components/Canvas";
import { currentSize, ToolDefinition } from "../components/Toolbar";
import { Mouse } from "../input";

export const EraseTool: ToolDefinition = {
    onMouseMove() {
        if (!Mouse.down) return;

        brushCanvas.lineCap = "round";
        brushCanvas.lineJoin = "round";
        brushCanvas.lineWidth = currentSize;

        brushCanvas.globalCompositeOperation = "destination-out";

        brushCanvas.beginPath();
        brushCanvas.moveTo(Mouse.prevX, Mouse.prevY);
        brushCanvas.lineTo(Mouse.x, Mouse.y);
        brushCanvas.stroke();

        brushCanvas.globalCompositeOperation = "source-over";

        render();
    },
    selected() {
        Mouse.event.on("move", this.onMouseMove);
    },
    unselected() {
        Mouse.event.off("move", this.onMouseMove);
    },
};
