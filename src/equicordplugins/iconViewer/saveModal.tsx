/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalProps,
    ModalRoot,
    ModalSize,
    openModal
} from "@utils/modal";
import { Button, Forms, Select, TextInput, useCallback, useEffect, useState } from "@webpack/common";
import * as t from "@webpack/types";

import { ModalHeaderTitle } from "./subComponents";
import { convertComponentToHtml, cssColors, iconSizesInPx, saveIcon } from "./utils";

type IDivElement = React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;

export function NumericComponent({ onChange, value, className, style }: { onChange: (value: number) => void, value: number; className?: string; style?: React.CSSProperties; }) {
    const handleChange = (value: string) => {
        const newValue = Number(value);
        if (isNaN(newValue)) return;
        onChange(newValue);
    };

    return (
        <div className={className} style={style}>
            <TextInput
                type="number"
                pattern="-?[0-9]+"
                value={value}
                placeholder="Enter a number"
                onChange={handleChange}
            />
        </div>
    );
}

export function SelectComponent({ option, onChange, onError, className }: IDivElement & { option: any, onChange: (value: any) => void, onError: (msg: string | null) => void; className?: string; }) {
    const [state, setState] = useState(option.options?.find(o => o.default)?.value ?? null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => onError(error), [error]);

    const handleChange = (newValue: any) => {
        const isValid = option.isValid?.call({}, newValue) ?? true;
        if (!isValid) setError("Invalid input provided.");
        else {
            setError(null);
            setState(newValue);
            onChange(newValue);
        }
    };

    return (<div className={className}>
        <Select
            options={option.options}
            placeholder={"Select an option"}
            maxVisibleItems={5}
            closeOnSelect={true}
            select={handleChange}
            isSelected={v => v === state}
            serialize={v => String(v)}
        />
        {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}
    </div>);
}


function ModalComponent(props: { iconName: string, Icon: t.Icon; color: number; } & ModalProps) {
    const [color, SetColor] = useState((props.color ?? 187));
    const [iconSize, SetIconSize] = useState("lg");
    const [saveType, SetSaveType] = useState("png");
    const [customSize, SetCustomSize] = useState(32);
    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            if (e.key === "ArrowLeft") {
                SetColor(color + -1);
            } else if (e.key === "ArrowRight") {
                SetColor(color + 1);
            }
        }
    }, [color]);
    useEffect(() => {
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [onKeyDown]);
    const { iconName, Icon } = props;
    return (<ModalRoot {...props} size={ModalSize.MEDIUM} className="vc-ic-modals-root vc-ic-save-modal-root">
        <ModalHeader>
            <ModalHeaderTitle iconName={iconName} color={color} name="save" />
            <ModalCloseButton onClick={props.onClose} />
        </ModalHeader>
        <ModalContent>
            <div className="vc-save-modal">
                <div className="vc-icon-display-box vc-save-modal-icon-display-box" aria-label={cssColors[color]?.name} style={{ marginLeft: "0", marginTop: "0" }}>
                    <Icon className="vc-icon-modal-icon" color={cssColors[color].css} />
                </div>
                <div className="vc-save-options" style={{ marginTop: "0", marginLeft: "0" }}>
                    <SelectComponent className="vc-save-select-option-1"
                        option={{
                            options: [
                                { "label": "large", "value": "lg", "default": true },
                                { "label": "medium", "value": "md" },
                                { "label": "small", "value": "sm" },
                                { "label": "extra small", "value": "xs" },
                                { "label": "extra extra small", "value": "xxs" },
                                { "label": "custom", "value": "custom" }
                            ]
                        }} onChange={newValue => SetIconSize(newValue)} onError={() => { }} />
                    <NumericComponent style={{ visibility: iconSize === "custom" ? "visible" : "hidden" }} value={customSize} onChange={(value: number) => SetCustomSize(value)} />
                    <SelectComponent className="vc-save-select-option-2"
                        option={{
                            options: [
                                { "label": "png", "value": "image/png", "default": true },
                                { "label": "jpeg", "value": "image/jpeg" },
                                { "label": "gif", "value": "image/gif" },
                                { "label": "avif", "value": "image/avif" },
                                { "label": "webp", "value": "image/webp" },
                                { "label": "svg", "value": "image/svg+xml" },
                            ]
                        }} onChange={newValue => SetSaveType(newValue)} onError={() => { }} />
                </div>
            </div>
        </ModalContent>
        <ModalFooter className="vc-ic-modals-footer">
            <Button
                color={Button.Colors.BRAND}
                onClick={() => saveIcon(iconName,
                    saveType === "image/svg+xml" || document.querySelector(".vc-icon-modal-icon") == null ?
                        convertComponentToHtml(<Icon className="vc-icon-modal-icon" color={cssColors[color].css} />) :
                        document.querySelector(".vc-icon-modal-icon") as Element,
                    color, iconSizesInPx[iconSize] ?? customSize, saveType)}
            >
                Save
            </Button>
        </ModalFooter>
    </ModalRoot>);
}

export function openSaveModal(iconName: string, Icon: t.Icon, colorIndex: number) {
    openModal(props => <ModalComponent iconName={iconName} Icon={Icon} color={colorIndex} {...props} />);
}

