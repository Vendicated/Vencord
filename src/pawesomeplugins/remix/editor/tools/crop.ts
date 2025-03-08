/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { canvas, cropCanvas, render } from "../components/Canvas";
import { ToolDefinition } from "../components/Toolbar";
import { Mouse } from "../input";
import { dist, fillCircle } from "../utils/canvas";

export const bounds = {
    top: 0,
    left: 0,
    right: -1,
    bottom: -1,
};

export function resetBounds() {
    if (!canvas) return;

    bounds.top = 0;
    bounds.left = 0;
    bounds.right = canvas.width;
    bounds.bottom = canvas.height;

    CropTool.update();
}

export const CropTool: ToolDefinition = {
    dragging: "",

    onMouseMove() {
        if (!canvas) return;

        if (this.dragging !== "") {
            if (this.dragging.includes("left")) bounds.left = Mouse.x;
            if (this.dragging.includes("right")) bounds.right = Mouse.x;
            if (this.dragging.includes("top")) bounds.top = Mouse.y;
            if (this.dragging.includes("bottom")) bounds.bottom = Mouse.y;

            this.update();
            return;
        }

        if (dist(Mouse.x, Mouse.y, bounds.left, bounds.top) < 30) {
            if (Mouse.down) {
                bounds.left = Mouse.x;
                bounds.top = Mouse.y;
                this.dragging = "left top";
            } else {
                canvas.style.cursor = "nwse-resize";
            }
        }
        else if (dist(Mouse.x, Mouse.y, bounds.right, bounds.top) < 30) {
            if (Mouse.down) {
                bounds.right = Mouse.x;
                bounds.top = Mouse.y;
                this.dragging = "right top";
            } else {
                canvas.style.cursor = "nesw-resize";
            }
        }
        else if (dist(Mouse.x, Mouse.y, bounds.left, bounds.bottom) < 30) {
            if (Mouse.down) {
                bounds.left = Mouse.x;
                bounds.bottom = Mouse.y;
                this.dragging = "left bottom";
            } else {
                canvas.style.cursor = "nesw-resize";
            }
        }
        else if (dist(Mouse.x, Mouse.y, bounds.right, bounds.bottom) < 30) {
            if (Mouse.down) {
                bounds.right = Mouse.x;
                bounds.bottom = Mouse.y;
                this.dragging = "right bottom";
            } else {
                canvas.style.cursor = "nwse-resize";
            }
        } else {
            canvas.style.cursor = "default";
        }

        if (this.dragging !== "") this.update();
    },

    onMouseUp() {
        this.dragging = "";

        if (bounds.left > bounds.right) [bounds.left, bounds.right] = [bounds.right, bounds.left];
        if (bounds.top > bounds.bottom) [bounds.top, bounds.bottom] = [bounds.bottom, bounds.top];
    },

    update() {
        if (!canvas) return;

        cropCanvas.clearRect(0, 0, canvas.width, canvas.height);
        cropCanvas.fillStyle = "rgba(0, 0, 0, 0.75)";
        cropCanvas.fillRect(0, 0, canvas.width, canvas.height);

        cropCanvas.fillStyle = "rgba(0, 0, 0, 0.25)";
        cropCanvas.clearRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);
        cropCanvas.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);

        cropCanvas.fillStyle = "white";
        cropCanvas.strokeStyle = "white";
        cropCanvas.lineWidth = 3;

        cropCanvas.strokeRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);

        fillCircle(bounds.left, bounds.top, 10, cropCanvas);
        fillCircle(bounds.right, bounds.top, 10, cropCanvas);
        fillCircle(bounds.left, bounds.bottom, 10, cropCanvas);
        fillCircle(bounds.right, bounds.bottom, 10, cropCanvas);

        render();
    },

    onMouseMoveCallback: undefined,
    onMouseUpCallback: undefined,

    selected() {
        if (!canvas) return;

        if (bounds.right === -1) bounds.right = canvas.width;
        if (bounds.bottom === -1) bounds.bottom = canvas.height;

        this.update();

        this.onMouseMoveCallback = this.onMouseMove.bind(this);
        this.onMouseUpCallback = this.onMouseUp.bind(this);

        Mouse.event.on("move", this.onMouseMoveCallback);
        Mouse.event.on("up", this.onMouseUpCallback);
    },
    unselected() {
        if (!canvas) return;

        cropCanvas.clearRect(0, 0, canvas.width, canvas.height);

        cropCanvas.fillStyle = "rgba(0, 0, 0, 0.75)";
        cropCanvas.fillRect(0, 0, canvas.width, canvas.height);
        cropCanvas.clearRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top);

        render();

        Mouse.event.off("move", this.onMouseMoveCallback);
        Mouse.event.off("up", this.onMouseUpCallback);
    },
};
