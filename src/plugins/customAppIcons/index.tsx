/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { CodeBlock } from "@components/CodeBlock";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginSettingComponentDef } from "@utils/types";
import { Forms, React, TextArea } from "@webpack/common";

type Icon = {
    id: string,
    iconSource: string,
    isPremium: boolean,
    name: string,
};

const settings = definePluginSettings({
    icons: {
        description: "Icons to add",
        type: OptionType.COMPONENT,
        restartNeeded: true,
        // stickToMarkers: true,
        component: iconSettingsComponent
    }
});

function iconSettingsComponent(props: Parameters<PluginSettingComponentDef["component"]>[0]) {
    const [state, setState] = React.useState(settings.store.icons ?? "");

    function handleChange(newValue: string) {
        setState(newValue);
        props.setValue(newValue);
    }

    return <Forms.FormSection>
        <Forms.FormTitle>Icons</Forms.FormTitle>
        <Forms.FormText>The icons you want to add.</Forms.FormText>
        <CodeBlock lang="yaml" content={"# Config Format - New Lines are separators\nName: Url"} />
        <TextArea type="text" value={state} onChange={handleChange} />
    </Forms.FormSection>;
}

function getCustomIcons(_match: string, original: string) {
    var icons: Icon[] = [];
    const settingsIcons = settings.store.icons?.split("\n") as string[];

    let index = 0;
    for (const icon of settingsIcons) {
        const matched = /([^:]+):\s*(.+)/.exec(icon);
        if (!matched || matched.length < 3) continue;

        const name = matched[1].trim(),
            iconSource = matched[2].trim();

        const idName = name
            .toLowerCase()
            .replace(/\s/g, "_")
            .replace(/\W/g, "#");

        icons.push({
            id: `CustomAppIcon-${index}:${idName}`,
            iconSource,
            isPremium: false,
            name
        });

        index++;
    }

    const outIcons = icons.map(i => JSON.stringify(i)).join(",");

    return `[${original}${icons.length > 0 ? "," : ""}${outIcons}]`;
}

export default definePlugin({
    name: "CustomAppIcons",
    description: "Allows you to add your own app icons to the list.",
    settings,
    authors: [Devs.nakoyasha, Devs.SimplyData],
    patches: [
        {
            find: "APP_ICON_HOLO_WAVES}",
            replacement: {
                match: /\[({[^]*?})\]/,
                replace: getCustomIcons,
            }
        }
    ],
});
