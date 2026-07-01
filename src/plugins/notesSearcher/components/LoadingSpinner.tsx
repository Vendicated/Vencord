/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LazyComponent } from "@utils/react";
import { React } from "@webpack/common";

export const LoadingSpinner = LazyComponent(() => React.memo(() => {
    return (
        <div className={"vc-notes-searcher-modal-spinner-container"} style={{
            width: "56px",
            height: "56px",
            margin: "12px",
        }}>
            <span className={"vc-notes-searcher-modal-spinner"} style={{
                width: "56px",
                height: "56px",
                border: "5px solid #fff",
                borderRadius: "50%",
                display: "inline-block",
                boxSizing: "border-box",
                position: "relative",
                animation: "vc-notes-searcher-pulse 1s linear infinite",
            }} />
        </div>
    );
}));
