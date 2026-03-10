/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
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
