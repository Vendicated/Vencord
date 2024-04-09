/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType, PluginNative } from "@utils/types";
import { Button, Flex, Forms, TextInput, Toasts, useState } from "@webpack/common";

const Native = VencordNative.pluginHelpers.MediaDownloader as PluginNative<typeof import("./native")>;

function DirectoryPickerComponent(props: { setValue(v: any): void; }) {
    const [value, setValue] = useState(settings.store.directory);
    return (
        <>
            <Forms.FormTitle tag="h4">Download Directory</Forms.FormTitle>
            <Flex flexDirection="row" style={{ gap: "0.5em" }}>
                <Button
                    size={Button.Sizes.SMALL}
                    onClick={async () => {
                        const choice = await Native.selectMediaFolder();
                        switch (choice) {
                            case "cancelled":
                                return;
                            case "invalid":
                                Toasts.show({
                                    message:
                                        "Invalid save location.",
                                    id: Toasts.genId(),
                                    type: Toasts.Type.FAILURE
                                });
                                return;
                        }
                        props.setValue(choice);
                        setValue(choice);
                    }}
                >
                    Choose
                </Button>
                <TextInput placeholder="Media Save Directory" editable={false} value={value} style={{ flexGrow: 1, gap: "0.5em" }} />
            </Flex>
        </>
    );
}

export const settings = definePluginSettings({
    directory: {
        type: OptionType.COMPONENT,
        description: "Directory to save media files in",
        component: DirectoryPickerComponent
    },
    useProxy: {
        type: OptionType.BOOLEAN,
        description: "Download Discord's cached version (more secure, but may be compressed)",
        default: true
    },
    showInMessageHoverMenu: {
        type: OptionType.BOOLEAN,
        description: "Show 'download all' button in message hover menu",
        default: false
    },
    showInContextMenu: {
        type: OptionType.BOOLEAN,
        description: "Show 'Quick Download' button in context menu",
        default: true
    }
});
