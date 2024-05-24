/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Forms, React, TextInput, useState } from "@webpack/common";
import { DataStore } from "@api/index";

const DATASTORE_IDS_KEY = "RPCEditor_ActivityIds";

function Input({ initialValue, onChange, placeholder }: {
    placeholder: string;
    initialValue: string;
    onChange(value: string): void;
}) {
    const [value, setValue] = useState(initialValue);
    return (
        <TextInput
            placeholder={placeholder}
            value={value}
            onChange={setValue}
            spellCheck={false}
        />
    );
}

export const settings = definePluginSettings({
    idsToEdit: {
        type: OptionType.COMPONENT,
        description: "",
        component: async () => {
            return (
                <>
                    <Forms.FormTitle style={{ marginBottom: "0px" }}>Comma separated list of activity IDs/names to
                        edit</Forms.FormTitle>
                    <Input placeholder={"886685857560539176, YouTube"}
                        initialValue={DataStore.get(DATASTORE_IDS_KEY) ?? ""} onChange={e => explode()}/>
                </>
            );
        }
    }
});

function explode() {

}

export default definePlugin({
    name: "RPCEditor",
    description: "Allows editing the type or content of any Rich Presence. (Configure in settings)",
    authors: [Devs.nin0dev],
    patches: [
        {
            find: "LocalActivityStore",
            replacement: {
                match: /LOCAL_ACTIVITY_UPDATE:function\((\i)\)\{/,
                replace: "$&$self.patchActivity($1.activity);",
            }
        }
    ],
    settings,
    patchActivity(activity: any) {
        // not finished, this'll change all activities to listening :husk:
        console.log(activity);
        activity.type = 2;
        activity.assets.large_text = null; // bomb premid image text
    },
});
