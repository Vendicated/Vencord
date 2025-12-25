/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { set } from "@api/DataStore";
import { HeadingPrimary, HeadingSecondary } from "@components/Heading";
import { classNameFactory } from "@utils/css";
import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Button, ColorPicker, useState } from "@webpack/common";

import { colors, DATASTORE_KEY } from "./index";

const cl = classNameFactory("vc-customColors-");

export function SetColorModal({ id, modalProps }: { id: string, modalProps: ModalProps; }) {
    const initialColor = parseInt(colors[id], 16) || 372735;
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
        colors[id] = colorPickerColor.toString(16).padStart(6, "0");
        await set(DATASTORE_KEY, colors);
        modalProps.onClose();
    }

    async function deleteUserColor() {
        delete colors[id];
        await set(DATASTORE_KEY, colors);
        modalProps.onClose();
    }

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader className={cl("modal-header")}>
                <HeadingPrimary>
                    Custom Color
                </HeadingPrimary>
                <ModalCloseButton onClick={modalProps.onClose} />
            </ModalHeader>
            <ModalContent className={cl("modal-content")} onKeyDown={handleKey}>
                <section className={Margins.bottom16}>
                    <HeadingSecondary>
                        Pick a Color
                    </HeadingSecondary>
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
