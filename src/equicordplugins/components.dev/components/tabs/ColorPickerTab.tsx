/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ColorPicker } from "@webpack/common";

import { ColorPickerWithSwatches, ColorSwatch, DefaultColorButton, Paragraph, PresetColors, useState } from "..";
import { DocPage, type PropDef } from "../DocPage";

const DEFAULT_COLOR = 0x5865F2;

function intToHex(color: number): string {
    return "#" + color.toString(16).padStart(6, "0");
}

const PICKER_PROPS: PropDef[] = [
    { name: "color", type: "number", required: true, description: "Current color as an integer (e.g. 0x5865F2)." },
    { name: "onChange", type: "(color: number) => void", required: true, description: "Called with the new color integer when changed." },
    { name: "onClose", type: "() => void", description: "Called when the picker popout closes." },
    { name: "suggestedColors", type: "string[]", description: "Array of hex color strings shown as suggestions in the popout." },
    { name: "disabled", type: "boolean", description: "Disables the color picker." },
    { name: "label", type: "ReactNode", description: "Optional label displayed next to the swatch." },
    { name: "colorPickerMiddle", type: "ReactNode", internal: true, description: "Content injected in the middle of the popout." },
    { name: "colorPickerFooter", type: "ReactNode", internal: true, description: "Content injected in the footer of the popout." },
    { name: "showEyeDropper", type: "boolean", description: "Shows the eye dropper tool in the popout." },
];

const SWATCH_PROPS: PropDef[] = [
    { name: "color", type: "number", description: "Color value. Omit for a \"no color\" state." },
    { name: "isDefault", type: "boolean", description: "Renders in the larger default button style." },
    { name: "isCustom", type: "boolean", description: "Shows a dropper icon overlay." },
    { name: "isSelected", type: "boolean", description: "Shows a checkmark overlay." },
    { name: "disabled", type: "boolean", description: "Disables the swatch." },
    { name: "onClick", type: "(color) => void", description: "Click handler receiving the color or gradient object." },
    { name: "isGradient", type: "boolean", description: "Enables gradient rendering mode." },
    { name: "gradientStart", type: "number", description: "Start color for gradients." },
    { name: "gradientEnd", type: "number", description: "End color for gradients." },
    { name: "gradientDegrees", type: "number", default: "180", description: "Angle in degrees for the gradient." },
    { name: "aria-label", type: "string", description: "Accessibility label." },
    { name: "style", type: "CSSProperties", description: "Inline styles." },
];

const SWATCHES_PROPS: PropDef[] = [
    { name: "defaultColor", type: "number", required: true, description: "Default/reset color value." },
    { name: "colors", type: "number[] | GradientColor[]", required: true, description: "Array of preset color values or gradient definitions." },
    { name: "value", type: "number", required: true, description: "Currently selected color." },
    { name: "onChange", type: "(color: number) => void", required: true, description: "Called when a color is selected." },
    { name: "customColor", type: "number", description: "Current custom color for the custom button." },
    { name: "secondaryValue", type: "number", description: "Secondary color value for gradient mode." },
    { name: "disabled", type: "boolean", description: "Disables all swatches." },
    { name: "renderDefaultButton", type: "(props) => ReactNode", description: "Render prop for the default/reset button." },
    { name: "renderCustomButton", type: "(props) => ReactNode", description: "Render prop for the custom color button." },
    { name: "isGradient", type: "boolean", description: "Enables gradient mode for all swatches." },
    { name: "gradientDegrees", type: "number", description: "Gradient angle for all swatches." },
    { name: "allowBlackCustomColor", type: "boolean", description: "Allows selecting pure black (#000000)." },
    { name: "className", type: "string", description: "Additional CSS class on the root." },
    { name: "colorContainerClassName", type: "string", description: "CSS class on the swatch grid container." },
];

function BasicPickerDemo() {
    const [color, setColor] = useState<number | null>(DEFAULT_COLOR);

    return (
        <>
            <Paragraph color="text-muted" style={{ marginBottom: 8 }}>Selected: {color !== null ? intToHex(color) : DEFAULT_COLOR}</Paragraph>
            <ColorPicker color={color} onChange={setColor} showEyeDropper={false} />
        </>
    );
}

function EyeDropperDemo() {
    const [color, setColor] = useState<number | null>(DEFAULT_COLOR);

    return <ColorPicker color={color} onChange={setColor} showEyeDropper />;
}

function SuggestedDemo() {
    const [color, setColor] = useState<number | null>(0xE74C3C);

    return (
        <>
            <Paragraph color="text-muted" style={{ marginBottom: 8 }}>Selected: {color !== null ? intToHex(color) : 0xE74C3C}</Paragraph>            <ColorPicker
                color={color}
                onChange={setColor}
                showEyeDropper={false}
                suggestedColors={["#1ABC9C", "#2ECC71", "#3498DB", "#9B59B6", "#E91E63", "#F1C40F", "#E67E22", "#E74C3C"]}
            />
        </>
    );
}

function SwatchSelectDemo() {
    const [selected, setSelected] = useState(0x2ECC71);

    return (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PresetColors.slice(0, 10).map(color => (
                <ColorSwatch key={color} color={color} isSelected={selected === color} onClick={() => setSelected(color)} />
            ))}
        </div>
    );
}

function SwatchesGridDemo() {
    const [color, setColor] = useState(0x3498DB);

    return (
        <>
            <Paragraph color="text-muted" style={{ marginBottom: 8 }}>Selected: {intToHex(color)}</Paragraph>
            <ColorPickerWithSwatches
                defaultColor={DEFAULT_COLOR}
                colors={[...PresetColors]}
                value={color}
                onChange={setColor}
                renderDefaultButton={() => null}
                renderCustomButton={() => null}
            />
        </>
    );
}

function FullPickerDemo() {
    const [color, setColor] = useState<number | null>(0x9B59B6);

    return (
        <>
            <Paragraph color="text-muted" style={{ marginBottom: 8 }}>Selected: {color !== null ? intToHex(color) : 0x9B59B6}</Paragraph>
            <ColorPickerWithSwatches
                defaultColor={DEFAULT_COLOR}
                customColor={color !== null ? color : 0x9B59B6}
                colors={[...PresetColors]}
                value={color !== null ? color : 0x9B59B6}
                onChange={setColor}
                renderDefaultButton={props => <DefaultColorButton {...props} />}
                renderCustomButton={() => (
                    <ColorPicker color={color} onChange={setColor} showEyeDropper={false} />
                )}
            />
        </>
    );
}

export default function ColorPickerTab() {
    return (
        <DocPage
            componentName="ColorPicker"
            overview="Discord's color picker system includes a full-featured ColorPicker popout, individual ColorSwatch buttons, and a ColorPickerWithSwatches grid. Colors are represented as integers (e.g. 0x5865F2). Convert with parseInt(hex, 16) and color.toString(16)."
            notices={[
                { type: "info", children: 'Colors are represented as integers, not hex strings. Convert with parseInt(hex, 16) to get an integer and color.toString(16).padStart(6, "0") to get a hex string.' },
            ]}
            importPath={'import { ColorPicker, ColorPickerWithSwatches, ColorSwatch, DefaultColorButton, CustomColorButton } from "../components";'}
            sections={[
                {
                    title: "Basic ColorPicker",
                    description: "Click the swatch to open a full color picker popout.",
                    children: <BasicPickerDemo />,
                    code: "<ColorPicker color={color} onChange={setColor} showEyeDropper={false} />",
                    relevantProps: ["color", "onChange"],
                },
                {
                    title: "With Eye Dropper",
                    description: "Includes the eye dropper tool for picking colors from screen.",
                    children: <EyeDropperDemo />,
                    relevantProps: ["showEyeDropper"],
                },
                {
                    title: "With Suggested Colors",
                    description: "Shows suggested color swatches inside the popout.",
                    children: <SuggestedDemo />,
                    code: '<ColorPicker\n  color={color}\n  onChange={setColor}\n  suggestedColors={["#1ABC9C", "#2ECC71", "#3498DB"]}\n/>',
                    relevantProps: ["suggestedColors"],
                },
                {
                    title: "Disabled",
                    children: <ColorPicker color={0x5865F2} onChange={() => { }} disabled />,
                    relevantProps: ["disabled"],
                },
                {
                    title: "Color Swatches",
                    description: "Individual swatch buttons. Click to select.",
                    children: <SwatchSelectDemo />,
                    code: "<ColorSwatch color={0x5865F2} isSelected={selected === 0x5865F2} onClick={() => setSelected(0x5865F2)} />",
                },
                {
                    title: "Swatch States",
                    description: "Normal, selected, default, custom, disabled, and no-color states.",
                    children: (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            {([
                                ["Normal", {}],
                                ["Selected", { isSelected: true }],
                                ["Default", { isDefault: true }],
                                ["Custom", { isCustom: true }],
                                ["Disabled", { disabled: true }],
                            ] as const).map(([label, props]) => (
                                <div key={label} style={{ textAlign: "center" }}>
                                    <ColorSwatch color={0x5865F2} {...props} />
                                    <Paragraph color="text-muted" style={{ fontSize: 10 }}>{label}</Paragraph>
                                </div>
                            ))}
                            <div style={{ textAlign: "center" }}>
                                <ColorSwatch />
                                <Paragraph color="text-muted" style={{ fontSize: 10 }}>No Color</Paragraph>
                            </div>
                        </div>
                    ),
                    relevantProps: ["isSelected", "isDefault", "isCustom", "disabled"],
                },
                {
                    title: "Gradient Swatches",
                    description: "Gradient swatches with customizable angle.",
                    children: (
                        <div style={{ display: "flex", gap: 8 }}>
                            <ColorSwatch isGradient gradientStart={0xE91E63} gradientEnd={0x9B59B6} gradientDegrees={90} />
                            <ColorSwatch isGradient gradientStart={0x3498DB} gradientEnd={0x2ECC71} gradientDegrees={135} />
                            <ColorSwatch isGradient gradientStart={0xF1C40F} gradientEnd={0xE74C3C} gradientDegrees={180} />
                        </div>
                    ),
                    relevantProps: ["isGradient", "gradientStart", "gradientEnd", "gradientDegrees"],
                },
                {
                    title: "Swatch Grid",
                    description: "ColorPickerWithSwatches renders a grid of preset color swatches.",
                    children: <SwatchesGridDemo />,
                    code: "<ColorPickerWithSwatches\n  defaultColor={DEFAULT_COLOR}\n  colors={presetColors}\n  value={color}\n  onChange={setColor}\n  renderDefaultButton={() => null}\n  renderCustomButton={() => null}\n/>",
                },
                {
                    title: "Full Picker with Buttons",
                    description: "Swatch grid with default reset button and custom color picker using render props.",
                    children: <FullPickerDemo />,
                    relevantProps: ["renderDefaultButton", "renderCustomButton"],
                },
            ]}
            props={[
                { title: "ColorPicker", props: PICKER_PROPS },
                { title: "ColorSwatch", props: SWATCH_PROPS },
                { title: "ColorPickerWithSwatches", props: SWATCHES_PROPS },
            ]}
        />
    );
}
