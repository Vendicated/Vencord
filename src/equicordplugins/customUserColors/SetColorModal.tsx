/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { set } from "@api/DataStore";
import { classNameFactory } from "@api/Styles";
import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { findComponentByCodeLazy } from "@webpack";
import { Button, Forms, useState } from "@webpack/common";

import { colors, DATASTORE_KEY } from "./index";

interface ColorPickerProps {
    color: number;
    showEyeDropper?: boolean;
    suggestedColors?: string[];
    onChange(value: number | null): void;
}
const ColorPicker = findComponentByCodeLazy<ColorPickerProps>("#{intl::USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR}", ".BACKGROUND_PRIMARY)");

const cl = classNameFactory("vc-customColors-");

export function SetColorModal({ userId, modalProps }: { userId: string, modalProps: ModalProps; }) {
    const initialColor = parseInt(colors[userId], 16) || 372735;
    // color picker default to current color set for user (if null it's 0x05afff :3 )

    const [colorPickerColor, setColorPickerColor] = useState(initialColor);
    // hex color code as an int (NOT rgb 0-255)


    function setUserColor(color: number) {
        setColorPickerColor(color);
    }

    function handleKey(e: KeyboardEvent) {
        if (e.key === "Enter")
            saveUserColor();
    }

    async function saveUserColor() {
        colors[userId] = colorPickerColor.toString(16).padStart(6, "0");
        await set(DATASTORE_KEY, colors);
        modalProps.onClose();
    }

    async function deleteUserColor() {
        delete colors[userId];
        await set(DATASTORE_KEY, colors);
        modalProps.onClose();
    }

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2">
                    Custom Color
                </Forms.FormTitle>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent className={cl("modal-content")} onKeyDown={handleKey}>
                <section className={Margins.bottom16}>
                    <Forms.FormTitle tag="h3">
                        Pick a Color
                    </Forms.FormTitle>
                    <ColorPicker
                        color={colorPickerColor}
                        onChange={setUserColor}
                        showEyeDropper={false}
                    />
                </section>
            </ModalContent>

            <ModalFooter className={cl("modal-footer")}>
                <Button
                    color={Button.Colors.RED}
                    onClick={deleteUserColor}
                >
                    Delete Entry
                </Button>
                <Button
                    color={Button.Colors.BRAND}
                    onClick={saveUserColor}
                >
                    Save
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}
