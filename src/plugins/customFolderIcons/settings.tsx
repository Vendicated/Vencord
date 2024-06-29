/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { IPluginOptionComponentProps, OptionType } from "@utils/types";

export interface folderIcon{
    url: string,
    size: number,
}
export type folderIconsData = Record<string, folderIcon | null>;

const settings = definePluginSettings({
    folderIcons: {
        type: OptionType.COMPONENT,
        hidden: true,
        description: "guh",
        component: props => <>
            <FolderIconsSettings
                setValue={props.setValue}
                setError={props.setError}
                option={props.option}
            />
        </>
    }
});
export default settings;
function FolderIconsSettings(props: IPluginOptionComponentProps): JSX.Element {
    return <></>;
}
