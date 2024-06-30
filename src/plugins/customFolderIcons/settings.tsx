/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 sadan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export interface folderIcon{
    url: string,
    size: number,
}
export type folderIconsData = Record<string, folderIcon | null>;

const settings = definePluginSettings({
    folderIcons: {
        type: OptionType.COMPONENT,
        hidden: true,
        description: "folder icon settings",
        component: () => <></>
    }
});
export default settings;
