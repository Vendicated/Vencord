/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, ModalCloseButton, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Text, useState } from "@webpack/common";

interface ColorPickerModalProps {
    modalProps: ModalProps;
    ColorPicker: any;
    onClose: () => void;
    onSubmit: (v: number) => void;
    initialColor: number;
    suggestedColors: Array<string>;
}

export function ColorPickerModal({ modalProps, ColorPicker, onClose, onSubmit, initialColor = 0, suggestedColors = [] }: ColorPickerModalProps): JSX.Element {
    const [color, setColor] = useState(initialColor);

    return (
        <ModalRoot {...modalProps} size={ModalSize.DYNAMIC}>
            <style>{"[class*=root_] [class*=customColorPicker__]{border:none!important;box-shadow:none!important}"}</style>
            <ModalHeader>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%"
                    }}
                >
                    <Text style={{ color: "var(--header-primary)", fontSize: "20px", fontWeight: "600" }}>
                        {"Color Picker"}
                    </Text>
                    <ModalCloseButton onClick={onClose} />
                </div>
            </ModalHeader>
            <ColorPicker
                value={color}
                showEyeDropper={true}
                suggestedColors={suggestedColors}
                onChange={(e: number) => { setColor(e); }}
            />
            <ModalFooter>
                <Button
                    color={Button.Colors.PRIMARY}
                    size={Button.Sizes.MEDIUM}
                    onClick={() => { onSubmit(color); }}
                >
                    {"Apply"}
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openColorPickerModal(ColorPicker: any, onSubmit: (v: number) => void, initialColor: number = 0, suggestedColors: Array<string> = []): void {
    const key = openModal(modalProps =>
        <ColorPickerModal
            modalProps={modalProps}
            ColorPicker={ColorPicker}
            onClose={() => { closeModal(key); }}
            onSubmit={onSubmit}
            initialColor={initialColor}
            suggestedColors={suggestedColors}
        />
    );
}
