/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { closeModal, openModal } from "@utils/modal";

import { CommandPaletteModal } from "./ui/CommandPaletteModal";

let modalSerial = 0;
let activeModalKey: string | null = null;

export function openCommandPalette() {
    if (activeModalKey) {
        closeModal(activeModalKey);
        activeModalKey = null;
        return;
    }

    modalSerial += 1;
    const modalKey = `equicord-command-palette-${modalSerial}`;
    activeModalKey = openModal(
        modalProps => <CommandPaletteModal modalProps={modalProps} instanceKey={modalSerial} />,
        {
            modalKey,
            onCloseCallback: () => {
                if (activeModalKey === modalKey) {
                    activeModalKey = null;
                }
            }
        }
    );
}
