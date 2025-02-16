/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Switch } from "@components/Switch";
import { Button, Forms, Select, Slider, useEffect, useState } from "@webpack/common";

import { BrushTool } from "../tools/brush";
import { CropTool, resetBounds } from "../tools/crop";
import { EraseTool } from "../tools/eraser";
import { currentShape, setShape, setShapeFill, Shape, ShapeTool } from "../tools/shape";
import { brushCanvas, canvas, cropCanvas, render, shapeCanvas } from "./Canvas";
import { SettingColorComponent } from "./SettingColorComponent";

export type Tool = "none" | "brush" | "erase" | "crop" | "shape";

export type ToolDefinition = {
    selected: () => void;
    unselected: () => void;
    [key: string]: any;
};

export const tools: Record<Tool, ToolDefinition | undefined> = {
    none: undefined,
    brush: BrushTool,
    erase: EraseTool,
    crop: CropTool,
    shape: ShapeTool,
};

export let currentTool: Tool = "none";
export let currentColor = "#ff0000";
export let currentSize = 20;
export let currentFill = false;

function colorStringToHex(color: string): number {
    return parseInt(color.replace("#", ""), 16);
}

export const Toolbar = () => {
    const [tool, setTool] = useState<Tool>(currentTool);
    const [color, setColor] = useState(currentColor);
    const [size, setSize] = useState(currentSize);
    const [fill, setFill] = useState(currentFill);

    function changeTool(newTool: Tool) {
        const oldTool = tool;

        setTool(newTool);
        onChangeTool(oldTool, newTool);
    }

    function onChangeTool(old: Tool, newTool: Tool) {
        tools[old]?.unselected();
        tools[newTool]?.selected();
    }

    useEffect(() => {
        currentTool = tool;
        currentColor = color;
        currentSize = size;
        currentFill = fill;

        brushCanvas.fillStyle = color;
        shapeCanvas.fillStyle = color;

        brushCanvas.strokeStyle = color;
        shapeCanvas.strokeStyle = color;

        brushCanvas.lineWidth = size;
        shapeCanvas.lineWidth = size;

        brushCanvas.lineCap = "round";
        brushCanvas.lineJoin = "round";

        setShapeFill(currentFill);
    }, [tool, color, size, fill]);

    function clear() {
        if (!canvas) return;

        brushCanvas.clearRect(0, 0, canvas.width, canvas.height);
        shapeCanvas.clearRect(0, 0, canvas.width, canvas.height);
        resetBounds();
        if (tool !== "crop") cropCanvas.clearRect(0, 0, canvas.width, canvas.height);
        render();
    }

    return (
        <div className="vc-remix-toolbar">
            <div className="vc-remix-tools">
                <Button className={(tool === "brush" ? "tool-active" : "")} onClick={() => changeTool("brush")}>Brush</Button>
                <Button className={(tool === "erase" ? "tool-active" : "")} onClick={() => changeTool("erase")}>Erase</Button>
                <Button className={(tool === "crop" ? "tool-active" : "")} onClick={() => changeTool("crop")}>Crop</Button>
                <Button className={(tool === "shape" ? "tool-active" : "")} onClick={() => changeTool("shape")}>Shape</Button>
            </div>
            <div className="vc-remix-settings">
                <div className="vc-remix-setting-section">
                    {(tool === "brush" || tool === "shape") &&
                        <SettingColorComponent name="vc-remix-color-picker" onChange={setColor} color={colorStringToHex(color)} />
                    }

                    {(tool === "brush" || tool === "erase" || tool === "shape") &&
                        <Slider
                            minValue={1}
                            maxValue={500}
                            initialValue={size}
                            onValueChange={setSize}
                            markers={[1, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500]}
                            hideBubble
                        />
                    }
                </div>
                {(tool === "crop") && <Button onClick={resetBounds}>Reset</Button>}
                <div className="vc-remix-setting-section">
                    {(tool === "shape") && (<>
                        <Select
                            select={setShape}
                            isSelected={v => v === currentShape}
                            serialize={v => String(v)}
                            placeholder="Shape"
                            options={
                                ["Rectangle", "Ellipse", "Line", "Arrow"].map(v => ({
                                    label: v,
                                    value: v.toLowerCase() as Shape,
                                }))
                            }
                        />

                        <Forms.FormText className="vc-remix-setting-switch">Fill <Switch checked={fill} onChange={setFill} /></Forms.FormText>
                    </>)}
                </div>
            </div>
            <div className="vc-remix-misc">
                <Button onClick={clear}>Clear</Button>
            </div>
        </div>
    );
};
