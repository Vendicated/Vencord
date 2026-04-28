/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { closeModal, openModal } from "@utils/modal";
import { findComponentByCodeLazy } from "@webpack";
import { React, useCallback, useEffect, useState } from "@webpack/common";

import { CustomStreamPreviewState } from "../state";
import { ScreenSharePreviewImageModal } from "./ScreenSharePreviewImageModal";
import { StreamPreviewChangeIcon } from "./StreamPreviewChangeIcon";


const PanelButton = findComponentByCodeLazy(".NONE,disabled:", ".PANEL_BUTTON");

export function SendCustomScreenSharePreviewImageButton() {
    const [isStreaming, setIsStreaming] = useState(() => {
        return CustomStreamPreviewState
            .getState()
            .isStreaming;
    });

    useEffect(() => {
        return CustomStreamPreviewState.subscribeToField(
            "isStreaming",
            setIsStreaming
        );
    }, []);

    const openScreenSharePreviewImageModal = useCallback(() => {
        const key = openModal(modalProps => (
            <ScreenSharePreviewImageModal
                modalProps={modalProps}
                close={() => closeModal(key)}
            />
        ));
    }, []);

    return (
        <ErrorBoundary noop>
            <PanelButton
                disabled={!isStreaming}
                tooltipText="Stream Preview Image"
                icon={StreamPreviewChangeIcon}
                onClick={openScreenSharePreviewImageModal}
            />
        </ErrorBoundary>
    );
}
