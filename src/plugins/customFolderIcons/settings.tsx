/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { IPluginOptionComponentProps, OptionType } from "@utils/types";

const settings = definePluginSettings({
    folderIcons: {
        type: OptionType.COMPONENT,
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
