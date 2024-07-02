/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LazyComponent } from "@utils/react";
import { findExportedComponentLazy } from "@webpack";
import { React } from "@webpack/common";

import { NotesDataIcon } from "./Icons";
import { openNotesDataModal } from "./NotesDataModal";

const HeaderBarIcon = findExportedComponentLazy("Icon", "Divider");

export const OpenNotesDataButton = LazyComponent(() => React.memo(() => {
    return (
        <HeaderBarIcon
            className="vc-notes-searcher-toolbox-button"
            onClick={() => openNotesDataModal()}
            tooltip={"Open Notes Data"}
            icon={NotesDataIcon}
        />
    );
}));
