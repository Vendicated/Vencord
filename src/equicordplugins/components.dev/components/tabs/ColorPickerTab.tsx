/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ColorPicker, ColorPickerWithSwatches, ColorSwatch, CustomColorButton, DefaultColorButton, Paragraph, PresetColors, useState } from "..";
import { SectionWrapper } from "../SectionWrapper";

const DEFAULT_COLOR = 0x5865F2;

function intToHex(color: number): string {
    return "#" + color.toString(16).padStart(6, "0");
}

export default function ColorPickerTab() {
    const [basicColor, setBasicColor] = useState(DEFAULT_COLOR);
    const [suggestedColor, setSuggestedColor] = useState(0xE74C3C);
    const [swatchColor, setSwatchColor] = useState(0x3498DB);
    const [swatchSelected, setSwatchSelected] = useState(0x2ECC71);
    const [customSwatchColor, setCustomSwatchColor] = useState(0x9B59B6);
    const [defaultBtnColor, setDefaultBtnColor] = useState(DEFAULT_COLOR);
    const [customBtnColor, setCustomBtnColor] = useState(0xE91E63);

    return (
        <div className="vc-compfinder-section">
            <SectionWrapper title="Basic ColorPicker">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Click the swatch to open a full color picker popout. Selected: {intToHex(basicColor)}
                </Paragraph>
                <ColorPicker
                    color={basicColor}
                    onChange={setBasicColor}
                    showEyeDropper={false}
                />
            </SectionWrapper>

            <SectionWrapper title="With Eye Dropper">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Includes the eye dropper tool for picking colors from screen.
                </Paragraph>
                <ColorPicker
                    color={basicColor}
                    onChange={setBasicColor}
                    showEyeDropper={true}
                />
            </SectionWrapper>

            <SectionWrapper title="With Suggested Colors">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Popout shows suggested color swatches. Selected: {intToHex(suggestedColor)}
                </Paragraph>
                <ColorPicker
                    color={suggestedColor}
                    onChange={setSuggestedColor}
                    showEyeDropper={false}
                    suggestedColors={[
                        "#1ABC9C", "#2ECC71", "#3498DB", "#9B59B6", "#E91E63",
                        "#F1C40F", "#E67E22", "#E74C3C", "#95A5A6", "#607D8B",
                    ]}
                />
            </SectionWrapper>

            <SectionWrapper title="Disabled ColorPicker">
                <ColorPicker
                    color={0x5865F2}
                    onChange={() => { }}
                    disabled
                />
            </SectionWrapper>

            <SectionWrapper title="ColorSwatch - Basic">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Individual color swatch buttons. Click to select.
                </Paragraph>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {PresetColors.slice(0, 10).map(color => (
                        <ColorSwatch
                            key={color}
                            color={color}
                            isSelected={swatchSelected === color}
                            onClick={() => setSwatchSelected(color)}
                        />
                    ))}
                </div>
            </SectionWrapper>

            <SectionWrapper title="ColorSwatch - States">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Different swatch states: default, custom, selected, disabled, no color.
                </Paragraph>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                        <ColorSwatch color={0x5865F2} />
                        <Paragraph color="text-muted" style={{ fontSize: 10 }}>Normal</Paragraph>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <ColorSwatch color={0x5865F2} isSelected />
                        <Paragraph color="text-muted" style={{ fontSize: 10 }}>Selected</Paragraph>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <ColorSwatch color={0x5865F2} isDefault />
                        <Paragraph color="text-muted" style={{ fontSize: 10 }}>Default</Paragraph>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <ColorSwatch color={0x5865F2} isCustom />
                        <Paragraph color="text-muted" style={{ fontSize: 10 }}>Custom</Paragraph>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <ColorSwatch color={0x5865F2} disabled />
                        <Paragraph color="text-muted" style={{ fontSize: 10 }}>Disabled</Paragraph>
                    </div>
                    <div style={{ textAlign: "center" }}>
                        <ColorSwatch />
                        <Paragraph color="text-muted" style={{ fontSize: 10 }}>No Color</Paragraph>
                    </div>
                </div>
            </SectionWrapper>

            <SectionWrapper title="ColorSwatch - Gradient">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Gradient swatches with customizable angle.
                </Paragraph>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <ColorSwatch
                        isGradient
                        gradientStart={0xE91E63}
                        gradientEnd={0x9B59B6}
                        gradientDegrees={90}
                    />
                    <ColorSwatch
                        isGradient
                        gradientStart={0x3498DB}
                        gradientEnd={0x2ECC71}
                        gradientDegrees={135}
                    />
                    <ColorSwatch
                        isGradient
                        gradientStart={0xF1C40F}
                        gradientEnd={0xE74C3C}
                        gradientDegrees={180}
                    />
                </div>
            </SectionWrapper>

            <SectionWrapper title="DefaultColorButton">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    The "default" button used in ColorPickerWithSwatches. Shows checkmark when selected.
                </Paragraph>
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <DefaultColorButton
                        color={DEFAULT_COLOR}
                        value={defaultBtnColor}
                        onChange={setDefaultBtnColor}
                    />
                    <Paragraph color="text-muted">Selected: {defaultBtnColor === DEFAULT_COLOR ? "Yes" : "No"}</Paragraph>
                </div>
            </SectionWrapper>

            <SectionWrapper title="CustomColorButton">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    The "custom" button for custom color selection. Shows dropper icon.
                </Paragraph>
                <CustomColorButton
                    customColor={customBtnColor}
                    value={customBtnColor}
                    presets={[...PresetColors]}
                />
            </SectionWrapper>

            <SectionWrapper title="ColorPickerWithSwatches">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Full swatch grid with preset colors. Selected: {intToHex(swatchColor)}
                </Paragraph>
                <ColorPickerWithSwatches
                    defaultColor={DEFAULT_COLOR}
                    colors={[...PresetColors]}
                    value={swatchColor}
                    onChange={setSwatchColor}
                    renderDefaultButton={() => null}
                    renderCustomButton={() => null}
                />
            </SectionWrapper>

            <SectionWrapper title="With Default & Custom Buttons">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Full picker with default reset button and custom color picker. Selected: {intToHex(customSwatchColor)}
                </Paragraph>
                <ColorPickerWithSwatches
                    defaultColor={DEFAULT_COLOR}
                    customColor={customSwatchColor}
                    colors={[...PresetColors]}
                    value={customSwatchColor}
                    onChange={setCustomSwatchColor}
                    renderDefaultButton={props => (
                        <DefaultColorButton {...props} />
                    )}
                    renderCustomButton={props => (
                        <ColorPicker
                            color={props.customColor ?? DEFAULT_COLOR}
                            onChange={setCustomSwatchColor}
                            showEyeDropper={false}
                        />
                    )}
                />
            </SectionWrapper>

            <SectionWrapper title="Props">
                <Paragraph color="text-muted">
                    <strong>ColorPicker</strong> - Full color picker with popout
                </Paragraph>
                <Paragraph color="text-muted">• color: number - Current color as integer</Paragraph>
                <Paragraph color="text-muted">• onChange: (color: number) ={">"} void - Change callback</Paragraph>
                <Paragraph color="text-muted">• onClose?: () ={">"} void - Called when picker closes</Paragraph>
                <Paragraph color="text-muted">• suggestedColors?: string[] - Hex color strings for suggestions</Paragraph>
                <Paragraph color="text-muted">• disabled?: boolean - Disable interaction</Paragraph>
                <Paragraph color="text-muted">• label?: ReactNode - Optional label next to swatch</Paragraph>
                <Paragraph color="text-muted">• colorPickerMiddle?: ReactNode - Content in middle of popout</Paragraph>
                <Paragraph color="text-muted">• colorPickerFooter?: ReactNode - Content in footer of popout</Paragraph>
                <Paragraph color="text-muted">• showEyeDropper?: boolean - Show eye dropper tool</Paragraph>

                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>ColorSwatch</strong> - Individual color swatch button
                </Paragraph>
                <Paragraph color="text-muted">• color?: number - Color value (null for "no color")</Paragraph>
                <Paragraph color="text-muted">• isDefault?: boolean - Larger "default" style</Paragraph>
                <Paragraph color="text-muted">• isCustom?: boolean - Shows dropper icon</Paragraph>
                <Paragraph color="text-muted">• isSelected?: boolean - Shows checkmark</Paragraph>
                <Paragraph color="text-muted">• disabled?: boolean - Disable interaction</Paragraph>
                <Paragraph color="text-muted">• onClick?: (color) ={">"} void - Click callback</Paragraph>
                <Paragraph color="text-muted">• isGradient?: boolean - Gradient mode</Paragraph>
                <Paragraph color="text-muted">• gradientStart/End?: number - Gradient colors</Paragraph>
                <Paragraph color="text-muted">• gradientDegrees?: number - Gradient angle (default 180)</Paragraph>

                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>ColorPickerWithSwatches</strong> - Swatch grid with render props
                </Paragraph>
                <Paragraph color="text-muted">• defaultColor: number - Default/reset color</Paragraph>
                <Paragraph color="text-muted">• customColor?: number - Current custom color</Paragraph>
                <Paragraph color="text-muted">• colors: number[] - Array of preset colors</Paragraph>
                <Paragraph color="text-muted">• value: number - Selected color</Paragraph>
                <Paragraph color="text-muted">• onChange: (color: number) ={">"} void - Change callback</Paragraph>
                <Paragraph color="text-muted">• renderDefaultButton?: (props) ={">"} ReactNode</Paragraph>
                <Paragraph color="text-muted">• renderCustomButton?: (props) ={">"} ReactNode</Paragraph>
                <Paragraph color="text-muted">• isGradient?: boolean - Gradient mode</Paragraph>
                <Paragraph color="text-muted">• gradientDegrees?: number - Gradient angle</Paragraph>
                <Paragraph color="text-muted">• allowBlackCustomColor?: boolean - Allow #000000</Paragraph>

                <Paragraph color="text-muted" style={{ marginTop: 12 }}>
                    <strong>Color Conversion</strong>
                </Paragraph>
                <Paragraph color="text-muted">• Hex to int: parseInt(hex.replace("#", ""), 16)</Paragraph>
                <Paragraph color="text-muted">• Int to hex: "#" + color.toString(16).padStart(6, "0")</Paragraph>
            </SectionWrapper>
        </div>
    );
}
