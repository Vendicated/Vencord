/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LazyComponent } from "@utils/react";
import { React } from "@webpack/common";

export const LoadingSpinner = LazyComponent(() => React.memo(() => {
    return (
        <div className={"vc-notes-searcher-modal-spinner-container"}>
            <span className={"vc-notes-searcher-modal-spinner"} />
        </div>
    );
}));
