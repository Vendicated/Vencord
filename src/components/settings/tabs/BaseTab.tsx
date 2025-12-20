/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { handleComponentFailed } from "@components/handleComponentFailed";
import { ModalCloseButton, ModalContent, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { onlyOnce } from "@utils/onlyOnce";
import type { ComponentType, PropsWithChildren } from "react";

export function SettingsTab({ children }: PropsWithChildren) {
    return (
        <section className="vc-settings-tab">{children}</section>
    );
}

export const handleSettingsTabError = onlyOnce(handleComponentFailed);

export function wrapTab(component: ComponentType<any>, tab: string) {
    const wrapped = ErrorBoundary.wrap(component, {
        displayName: `${tab}SettingsTab`,
        message: `Failed to render the ${tab} tab. If this issue persists, try using the installer to reinstall!`,
        onError: handleSettingsTabError,
    });

    return wrapped;
}

export function openSettingsTabModal(Tab: ComponentType<any>) {
    try {
        openModal(wrapTab((modalProps: ModalProps) => (
            <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>
                <ModalContent className="vc-settings-modal">
                    <ModalCloseButton onClick={modalProps.onClose} className="vc-settings-modal-close" />
                    <Tab />
                </ModalContent>
            </ModalRoot>
        ), Tab.displayName || "Settings Tab"));
    } catch {
        handleSettingsTabError();
    }
}
