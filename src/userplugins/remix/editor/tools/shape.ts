/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { brushCanvas, render, shapeCanvas } from "../components/Canvas";
import { ToolDefinition } from "../components/Toolbar";
import { Mouse } from "../input";
import { line } from "../utils/canvas";

export type Shape = "rectangle" | "ellipse" | "line" | "arrow";

export let currentShape: Shape = "rectangle";

export function setShape(shape: Shape) {
    currentShape = shape;
}

export let shapeFill = false;

export function setShapeFill(fill: boolean) {
    shapeFill = fill;
}

export const ShapeTool: ToolDefinition = {
    draggingFrom: { x: 0, y: 0 },
    isDragging: false,

    onMouseMove() {
        if (!Mouse.down) return;

        if (!this.isDragging) {
            this.draggingFrom.x = Mouse.x;
            this.draggingFrom.y = Mouse.y;
            this.isDragging = true;
        }

        shapeCanvas.clearRect(0, 0, shapeCanvas.canvas.width, shapeCanvas.canvas.height);
        this.draw();
    },

    onMouseUp() {
        if (!this.isDragging) return;

        shapeCanvas.clearRect(0, 0, shapeCanvas.canvas.width, shapeCanvas.canvas.height);
        this.draw(brushCanvas);
        this.isDragging = false;
    },

    onMouseMoveListener: null,
    onMouseUpListener: null,

    draw(canvas = shapeCanvas) {
        canvas.lineCap = "butt";
        canvas.lineJoin = "miter";

        switch (currentShape) {
            case "rectangle":
                if (shapeFill) canvas.fillRect(this.draggingFrom.x, this.draggingFrom.y, Mouse.x - this.draggingFrom.x, Mouse.y - this.draggingFrom.y);
                else canvas.strokeRect(this.draggingFrom.x, this.draggingFrom.y, Mouse.x - this.draggingFrom.x, Mouse.y - this.draggingFrom.y);
                break;
            case "ellipse":
                const width = Mouse.x - this.draggingFrom.x;
                const height = Mouse.y - this.draggingFrom.y;
                const centerX = this.draggingFrom.x + width / 2;
                const centerY = this.draggingFrom.y + height / 2;
                const radiusX = Math.abs(width / 2);
                const radiusY = Math.abs(height / 2);
                canvas.beginPath();
                canvas.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
                if (shapeFill) canvas.fill();
                else canvas.stroke();
                break;
            case "line":
                line(this.draggingFrom.x, this.draggingFrom.y, Mouse.x, Mouse.y, canvas);
                break;
            case "arrow":
                line(this.draggingFrom.x, this.draggingFrom.y, Mouse.x, Mouse.y, canvas);
                // draw arrowhead (thanks copilot :3)
                const angle = Math.atan2(Mouse.y - this.draggingFrom.y, Mouse.x - this.draggingFrom.x);
                const arrowLength = 10;
                canvas.beginPath();
                canvas.moveTo(Mouse.x, Mouse.y);
                canvas.lineTo(Mouse.x - arrowLength * Math.cos(angle - Math.PI / 6), Mouse.y - arrowLength * Math.sin(angle - Math.PI / 6));
                canvas.lineTo(Mouse.x - arrowLength * Math.cos(angle + Math.PI / 6), Mouse.y - arrowLength * Math.sin(angle + Math.PI / 6));
                canvas.closePath();
                if (shapeFill) canvas.fill();
                else canvas.stroke();
                break;
        }

        render();
    },

    selected() {
        this.onMouseMoveListener = this.onMouseMove.bind(this);
        this.onMouseUpListener = this.onMouseUp.bind(this);

        Mouse.event.on("move", this.onMouseMoveListener);
        Mouse.event.on("up", this.onMouseUpListener);
    },
    unselected() {
        shapeCanvas.clearRect(0, 0, shapeCanvas.canvas.width, shapeCanvas.canvas.height);

        Mouse.event.off("move", this.onMouseMoveListener);
        Mouse.event.off("up", this.onMouseUpListener);
    },
};
