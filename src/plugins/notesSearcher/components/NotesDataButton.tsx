/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LazyComponent } from "@utils/react";
import { filters, find } from "@webpack";

import { NotesDataIcon } from "./Icons";
import { openNotesDataModal } from "./NotesDataModal";

const HeaderBarIcon = LazyComponent(() => {
    const filter = filters.byCode(".HEADER_BAR_BADGE");
    return find(m => m.Icon && filter(m.Icon)).Icon;
});

export function OpenNotesDataButton() {
    return (
        <HeaderBarIcon
            className="vc-notes-searcher-toolbox-button"
            onClick={() => openNotesDataModal()}
            tooltip={"Open Notes Data"}
            icon={NotesDataIcon}
        />
    );
}
