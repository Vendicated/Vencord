/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ConfirmModalProps } from "@vencord/discord-types";
import { ConfirmModal, openModal } from "@webpack/common";

import { relaunch } from "./native";

/**
 * @param type - "relaunch" to restart the entire application, "reload" to only reload Discord (CTRL + R)
 * @param props - Properties for the confirmation modal, uses sensible defaults
 */
export function promptToRestart(
    type: "relaunch" | "reload",
    {
        title = "Restart Required",
        subtitle = "A restart is required to apply this change",
        confirmText = "Restart now",
        cancelText = "Later!",
        ...props
    }: Partial<ConfirmModalProps> = {}
) {
    const onConfirm = type === "relaunch"
        ? relaunch
        : () => location.reload();

    openModal(modalProps => (
        <ConfirmModal
            variant="primary"
            {...modalProps}
            {...props}

            title={title}
            subtitle={subtitle}
            confirmText={confirmText}
            cancelText={cancelText}
            onConfirm={onConfirm}
        />
    ));
}
