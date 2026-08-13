/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as t from "@vencord/discord-types";
import { filters, findByCodeLazy, findExportedComponentLazy, mapMangledModuleLazy } from "@webpack";

export const Modal: t.Modal = findExportedComponentLazy("Modal");
export const ConfirmModal: t.ConfirmModal = findExportedComponentLazy("ConfirmModal");

// Modal key: "Media Viewer Modal"
export const openMediaModal: (props: t.MediaModalProps) => void = findByCodeLazy("hasMediaOptions", "shouldHideMediaOptions");

const ModalAPI: t.ModalAPI = mapMangledModuleLazy(".modalKey?", {
    openModalLazy: filters.byCode(".modalKey?"),
    openModal: filters.byCode(",instant:"),
    closeModal: filters.byCode(".onCloseCallback()"),
    closeAllModals: filters.byCode(".getState();for")
});

export const { openModalLazy, openModal, closeModal, closeAllModals } = ModalAPI;
