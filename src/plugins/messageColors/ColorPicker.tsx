/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import { DataStore } from "@api/index";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { useForceUpdater } from "@utils/react";
import { findComponentByCodeLazy, findExportedComponentLazy } from "@webpack";
import { Button, Popout, React, useState } from "@webpack/common";

import { COLOR_PICKER_DATA_KEY, savedColors } from "./constants";

interface ColorPickerProps {
    color: number | null;
    showEyeDropper?: boolean;
    suggestedColors?: string[];
    onChange(value: number | null): void;
}

interface ColorPickerWithSwatchesProps {
    defaultColor: number;
    colors: number[];
    value: number;
    disabled?: boolean;
    onChange(value: number | null): void;
    renderDefaultButton?: () => React.ReactNode;
    renderCustomButton?: () => React.ReactNode;
}

const ColorPicker = findComponentByCodeLazy<ColorPickerProps>(".Messages.USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR", ".BACKGROUND_PRIMARY)");

const ColorPickerWithSwatches = findExportedComponentLazy<ColorPickerWithSwatchesProps>("ColorPicker", "CustomColorPicker");
// const ColorPickerWithSwatches = LazyComponentWebpack<ColorPickerWithSwatchesProps>(() =>
//     find(filters.byProps("ColorPicker", "CustomColorPicker"), { isIndirect: true })?.ColorPicker ||
//     findComponentByCode("presets,", "customColor:")
// );



export function EyeDropperIcon() {
    return (
        <svg x="0" y="0" aria-hidden="true" role="img" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="m16.25 2.25-2 2-.63-.63a3 3 0 0 0-4.24 0l-.85.85c-.3.3-.3.77 0 1.06l9.94 9.94c.3.3.77.3 1.06 0l.85-.85a3 3 0 0 0 0-4.24l-.63-.63 2-2a3.89 3.89 0 1 0-5.5-5.5ZM9.3 9.7a1 1 0 0 1 1.4 0l3.6 3.6a1 1 0 0 1 0 1.4l-4.84 4.84a5 5 0 0 1-2.7 1.39c-.47.08-.86.42-1.1.83a2.5 2.5 0 1 1-3.42-3.42c.41-.24.75-.63.83-1.1a5 5 0 0 1 1.4-2.7L9.28 9.7Z" ></path></svg>
    );
}

function ColorPickerPopout() {
    const [value, setValue] = useState(0);
    const forceUpdate = useForceUpdater();

    const onChange = (v: number) => {
        setValue(v);
    };

    return (
        <div className="vc-chat-color-picker">
            <ColorPickerWithSwatches
                defaultColor={0}
                colors={savedColors}
                onChange={onChange}
                value={value}
                renderDefaultButton={() => null}
                renderCustomButton={() => (
                    <ColorPicker
                        color={value}
                        onChange={onChange}
                        showEyeDropper={true}
                    />
                )}
            />

            <Button onClick={() => {
                const hex = "#" +
                    (value & 0x00FFFFFF).toString(16).padStart(6, "0");
                insertTextIntoChatInputBox(hex);
                const index = savedColors.findIndex(v => value === v);

                if (index !== -1) {
                    savedColors.splice(index, 1);
                } else {
                    savedColors.pop();
                }

                savedColors.unshift(value);
                DataStore.set(COLOR_PICKER_DATA_KEY, savedColors);
                forceUpdate();
            }}>Paste</Button>
        </div>
    );
}


export function ColorPickerChatButton() {
    const [show, setShow] = useState(false);

    return (
        <Popout
            renderPopout={ColorPickerPopout}
            animation={Popout.Animation.FADE}
            position="top"
            shouldShow={show}
            onRequestClose={() => setShow(false)}>
            {(_, { isShown }) => (
                <ChatBarButton
                    tooltip={isShown ? "Close color picker" : "Open color picker"}
                    onClick={() => setShow(p => !p)}>
                    <EyeDropperIcon />
                </ChatBarButton>
            )}
        </Popout>
    );
}
