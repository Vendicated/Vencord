/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { Paragraph } from "@components/Paragraph";
import { cl as settingCl, SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { GithubButton, WebsiteButton } from "@components/settings/tabs/plugins/PluginModalButtons";
import { Switch } from "@components/Switch";
import type { ThemeProperty, UserThemeHeader } from "@main/themes";
import { debounce } from "@shared/debounce";
import { classNameFactory } from "@utils/css";
import { RenderModalProps } from "@vencord/discord-types";
import { ColorPicker, Modal, openModal, Select, Slider, TextInput, useMemo, useRef, useState } from "@webpack/common";

const cl = classNameFactory("vc-settings-theme-");

const NUMERIC_SYNTAXES = ["<integer>", "<number>", "<length>", "<percentage>"];
/** Sliders with more steps than this only get a few evenly spaced labels */
const MAX_LABELED_STEPS = 12;
const AUTO_MARKER_COUNT = 5;

type InputKind = "toggle" | "select" | "url" | "color" | "slider" | "number" | "text";

function getInputKind(prop: ThemeProperty): InputKind {
    if (prop.options?.length) {
        return prop.checkbox && prop.options.length === 2 ? "toggle" : "select";
    }
    if (prop.checkbox || prop.syntax === "<boolean>") return "toggle";
    if (prop.file || prop.syntax === "<url>") return "url";
    if (prop.syntax === "<color>") return "color";
    if (NUMERIC_SYNTAXES.includes(prop.syntax)) {
        return prop.min != null && prop.max != null && prop.min < prop.max ? "slider" : "number";
    }
    return "text";
}

function getUnit(prop: ThemeProperty) {
    if (prop.unit != null) return prop.unit;

    // use the unit of the default value, e.g. 1.5rem
    const match = /^[+-]?[\d.]+(?:e[+-]?\d+)?([a-z%]+)$/i.exec(prop.initialValue.trim());
    if (match) return match[1];

    if (prop.syntax === "<length>") return "px";
    if (prop.syntax === "<percentage>") return "%";
    return "";
}

/** The value without its unit, as shown in number inputs */
function getNumberText(value: string) {
    const number = parseFloat(value);
    return Number.isFinite(number) ? String(number) : "";
}

function snap(value: number, min: number, step: number) {
    const decimals = (String(step).split(".")[1] ?? "").length;
    return Number((Math.round((value - min) / step) * step + min).toFixed(decimals));
}

function getStepCount(min: number, max: number, step: number) {
    // 1e-9 guards against float error, e.g. (0.3 - 0) / 0.1 = 2.9999...
    return Math.floor((max - min) / step + 1e-9) + 1;
}

let colorContext: CanvasRenderingContext2D | null = null;

/** Parses any css color (hex, named, oklch, ...) into a 0xRRGGBB number, or null if invalid */
function parseCssColor(value: string): number | null {
    if (!colorContext) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        colorContext = canvas.getContext("2d", { willReadFrequently: true });
        if (!colorContext) return null;
    }

    // Invalid values leave fillStyle untouched, so use a sentinel to detect them
    const sentinel = "#010203";
    colorContext.fillStyle = sentinel;
    colorContext.fillStyle = value;
    if (colorContext.fillStyle === sentinel && value.trim() !== sentinel) return null;

    colorContext.clearRect(0, 0, 1, 1);
    colorContext.fillRect(0, 0, 1, 1);
    const [r, g, b] = colorContext.getImageData(0, 0, 1, 1).data;
    return (r << 16) | (g << 8) | b;
}

function formatHexColor(color: number) {
    return `#${color.toString(16).padStart(6, "0")}`;
}

function unwrapUrl(value: string) {
    const match = /^\s*url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)\s*$/i.exec(value);
    return match ? match[1] ?? match[2] ?? match[3] : value;
}

function wrapUrl(url: string) {
    url = url.trim();
    return url ? `url("${url.replace(/["\\]/g, "\\$&")}")` : "";
}

interface PropertyInputProps {
    prop: ThemeProperty;
    value: string;
    onChange(value: string): void;
}

interface NumberTextInputProps {
    text: string;
    setText(text: string): void;
    placeholder?: string;
    /** Only called when the text is a valid number */
    onChange(number: number): void;
}

function NumberTextInput({ text, setText, placeholder, onChange }: NumberTextInputProps) {
    return (
        <TextInput
            type="number"
            placeholder={placeholder}
            value={text}
            onChange={newText => {
                setText(newText);

                const number = Number(newText);
                if (newText.trim() && Number.isFinite(number)) {
                    onChange(number);
                }
            }}
        />
    );
}

function NumberPropertyInput({ prop, value, onChange }: PropertyInputProps) {
    const [text, setText] = useState(() => getNumberText(value));

    return (
        <NumberTextInput
            text={text}
            setText={setText}
            placeholder="Enter a number"
            onChange={number => onChange(number + getUnit(prop))}
        />
    );
}

function SliderPropertyInput({ prop, value, onChange }: PropertyInputProps) {
    const min = prop.min!;
    const max = prop.max!;
    const step = prop.step && prop.step > 0 ? prop.step : prop.syntax === "<integer>" ? 1 : undefined;
    const unit = getUnit(prop);

    const round = (v: number) => (step ? snap(v, min, step) : Number(v.toFixed(2)));
    const format = (v: number) => round(v) + unit;

    const parsed = parseFloat(value);
    const initialValue = Number.isFinite(parsed) ? parsed : min;
    // Controlled so the grabber follows the text input and snaps to the steps while dragging
    const [current, setCurrent] = useState(initialValue);
    const [text, setText] = useState(() => getNumberText(value));

    function onSliderChange(v: number) {
        setCurrent(round(v));
        setText(String(round(v)));
    }

    // With few steps, label each one and stick to them. Otherwise only label a few evenly spaced values, as
    // stickToMarkers hides the value tooltip, and don't materialize the steps (a tiny step could mean millions)
    const stepCount = step ? getStepCount(min, max, step) : 0;
    const labelAll = stepCount > 0 && stepCount <= MAX_LABELED_STEPS;
    const last = step ? snap(min + (stepCount - 1) * step, min, step) : max;
    const markers = labelAll
        ? Array.from({ length: stepCount }, (_, i) => snap(min + i * step!, min, step!))
        : Array.from({ length: AUTO_MARKER_COUNT }, (_, i) => round(min + (last - min) * i / (AUTO_MARKER_COUNT - 1)));

    return (
        <div className={cl("slider-container")}>
            {/* Wrapped so the slider isn't a flex item, which misplaces its grabber */}
            <div className={cl("slider")}>
                <Slider
                    className={settingCl("slider")}
                    initialValue={initialValue}
                    value={current}
                    minValue={min}
                    maxValue={max}
                    markers={markers}
                    stickToMarkers={labelAll}
                    keyboardStep={step}
                    onMarkerRender={format}
                    asValueChanges={onSliderChange}
                    onValueChange={v => {
                        onSliderChange(v);
                        onChange(format(v));
                    }}
                    onValueRender={format}
                />
            </div>
            <div className={cl("slider-input")}>
                <NumberTextInput
                    text={text}
                    setText={setText}
                    onChange={number => {
                        setCurrent(number);
                        onChange(number + unit);
                    }}
                />
            </div>
        </div>
    );
}

function UrlPropertyInput({ value, onChange }: PropertyInputProps) {
    const [text, setText] = useState(() => unwrapUrl(value));

    return (
        <TextInput
            value={text}
            placeholder="https://example.com/image.png"
            maxLength={null}
            onChange={newText => {
                setText(newText);
                onChange(wrapUrl(newText));
            }}
        />
    );
}

function TextPropertyInput({ value, onChange }: PropertyInputProps) {
    const [text, setText] = useState(value);

    return (
        <TextInput
            value={text}
            placeholder="Enter a value"
            maxLength={null}
            onChange={newText => {
                setText(newText);
                onChange(newText);
            }}
        />
    );
}

function ColorPropertyInput({ value, onChange }: PropertyInputProps) {
    const [color, setColor] = useState(() => parseCssColor(value));
    // The text holds the raw value, so formats the picker can't represent (oklch, alpha, ...) still work
    const [text, setText] = useState(value);

    return (
        <div className={cl("color-container")}>
            <ColorPicker
                color={color}
                onChange={newColor => {
                    if (newColor == null) return;
                    setColor(newColor);
                    setText(formatHexColor(newColor));
                    onChange(formatHexColor(newColor));
                }}
                showEyeDropper={false}
            />
            <div className={cl("color-input")}>
                <TextInput
                    value={text}
                    placeholder="#rrggbb, rgb(), oklch()..."
                    maxLength={null}
                    onChange={newText => {
                        setText(newText);
                        const parsed = parseCssColor(newText);
                        if (parsed != null) setColor(parsed);
                        onChange(newText.trim());
                    }}
                />
            </div>
        </div>
    );
}

function PropertyInput(props: PropertyInputProps) {
    const { prop, value, onChange } = props;

    // Like the plugin modal, debounce inputs that fire rapidly (typing, dragging) so settings aren't written on every event
    const debouncedProps = { ...props, onChange: useMemo(() => debounce(onChange), []) };

    switch (getInputKind(prop)) {
        case "toggle": {
            const [on, off] = prop.options?.map(o => o.value) ?? ["true", "false"];
            return <Switch checked={value === on} onChange={checked => onChange(checked ? on : off)} />;
        }
        case "select":
            return (
                <Select
                    placeholder="Select an option"
                    options={prop.options!}
                    maxVisibleItems={5}
                    select={onChange}
                    isSelected={v => v === value}
                    serialize={String}
                    closeOnSelect
                />
            );
        case "slider":
            return <SliderPropertyInput {...debouncedProps} />;
        case "color":
            return <ColorPropertyInput {...debouncedProps} />;
        case "number":
            return <NumberPropertyInput {...debouncedProps} />;
        case "url":
            return <UrlPropertyInput {...debouncedProps} />;
        case "text":
            return <TextPropertyInput {...debouncedProps} />;
    }
}

interface ThemeSettingsModalProps extends RenderModalProps {
    theme: UserThemeHeader;
}

function ThemeSettingsModal({ theme, transitionState, onClose }: ThemeSettingsModalProps) {
    const settings = useSettings(["themeSettings.*"]);
    // Bumped on reset to remount inputs with internal state. The ref drops debounced writes still pending from before the reset
    const [generation, setGeneration] = useState(0);
    const currentGeneration = useRef(0);

    const values = settings.themeSettings[theme.fileName] ?? {};

    function setValue(name: string, value: string, fromGeneration: number) {
        if (fromGeneration !== currentGeneration.current) return;

        // Write through the proxy so change listeners fire. `(a[b] ??= {})[c] = v` would assign to the raw object
        const themeSettings = settings.themeSettings[theme.fileName];
        if (themeSettings) {
            themeSettings[name] = value;
        } else {
            settings.themeSettings[theme.fileName] = { [name]: value };
        }
    }

    function reset() {
        delete settings.themeSettings[theme.fileName];
        setGeneration(++currentGeneration.current);
    }

    return (
        <Modal
            transitionState={transitionState}
            onClose={onClose}
            size="lg"
            title={
                <div className="vc-plugin-modal-header">
                    <BaseText tag="h1" weight="semibold" size="lg">{theme.name}</BaseText>
                    <div className="vc-settings-modal-links">
                        {!!theme.website && (
                            <WebsiteButton
                                text="Visit website"
                                href={theme.website}
                            />
                        )}
                        {!!theme.source && (
                            <GithubButton
                                text="View source code"
                                href={theme.source}
                            />
                        )}
                    </div>
                </div>
            }
            subtitle={<Paragraph>{theme.description}</Paragraph>}
            actions={[{ text: "Reset to defaults", variant: "secondary", onClick: reset }]}
        >
            <div className="vc-settings-modal-content">
                <section>
                    <div key={generation} className="vc-plugins-settings">
                        {theme.properties.map(prop => {
                            const isToggle = getInputKind(prop) === "toggle";

                            return (
                                <ErrorBoundary noop key={prop.name}>
                                    <SettingsSection
                                        // label so clicking the text toggles the switch, like plugin settings
                                        tag={isToggle ? "label" : "div"}
                                        id={prop.name}
                                        name={prop.label}
                                        description={prop.note ?? ""}
                                        inlineSetting={isToggle}
                                    >
                                        <PropertyInput
                                            prop={prop}
                                            value={values[prop.name] ?? prop.initialValue}
                                            onChange={value => setValue(prop.name, value, generation)}
                                        />
                                    </SettingsSection>
                                </ErrorBoundary>
                            );
                        })}
                    </div>
                </section>
            </div>
        </Modal>
    );
}

export function openThemeSettingsModal(theme: UserThemeHeader) {
    openModal(modalProps => <ThemeSettingsModal {...modalProps} theme={theme} />);
}

