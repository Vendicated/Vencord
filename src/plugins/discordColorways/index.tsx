/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import {
    addServerListElement,
    removeServerListElement,
    ServerListRenderPosition,
} from "@api/ServerList";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import {
    Text,
} from "@webpack/common";

import ColorwaysButton from "./components/colorwaysButton";
import Selector from "./components/selector";
import SelectorModal from "./components/selectorModal";
import { SettingsPage } from "./components/settingsPage";
import { defaultColorwaySource } from "./constants";
import style from "./style.css?managed";
import { ColorPickerProps } from "./types";

export let LazySwatchLoaded = false;

export let ColorPicker: React.FunctionComponent<ColorPickerProps> = () => {
    return (
        <Text
            tag="h2"
            variant="heading-md/semibold"
            className="colorways-creator-module-warning"
        >
            Module is loading, please wait...
        </Text>
    );
};

(async function () {
    const [customColorways, colorwaySourcesFiles, showColorwaysButton] = await DataStore.getMany([
        "customColorways",
        "colorwaySourceFiles",
        "showColorwaysButton"
    ]);

    if (!customColorways)
        DataStore.set("customColorways", []);

    if (!colorwaySourcesFiles)
        DataStore.set("colorwaySourceFiles", [defaultColorwaySource]);

    if (!showColorwaysButton)
        DataStore.set("showColorwaysButton", false);

})();

export const ColorwayCSS = {
    get: () => document.getElementById("activeColorwayCSS")?.textContent || "",
    set: (e: string) => {
        if (!document.getElementById("activeColorwayCSS")) {
            var activeColorwayCSS: HTMLStyleElement =
                document.createElement("style");
            activeColorwayCSS.id = "activeColorwayCSS";
            activeColorwayCSS.textContent = e;
            document.head.append(activeColorwayCSS);
        } else document.getElementById("activeColorwayCSS")!.textContent = e;
    },
    remove: () => document.getElementById("activeColorwayCSS")!.remove(),
};

export default definePlugin({
    name: "DiscordColorways",
    description:
        "A plugin that offers easy access to simple color schemes/themes for Discord, also known as Colorways",
    authors: [Devs.DaBluLite, Devs.ImLvna],
    dependencies: ["ServerListAPI"],
    pluginVersion: "5.2.0",
    creatorVersion: "1.15",
    toolboxActions: {
        "Open Toolbox": () =>
            openModal(props => (
                <SelectorModal modalProps={props} visibleTabProps="toolbox" />
            )),
    },
    patches: [
        {
            find: ".colorPickerFooter",
            replacement: {
                match: /function (\i).{0,200}\.colorPickerFooter/,
                replace: "$self.ColorPicker=$1;$&",
            },
        },
        {
            find: "Messages.ACTIVITY_SETTINGS",
            replacement: {
                match: /\{section:(\i)\.ID\.HEADER,\s*label:(\i)\.\i\.Messages\.APP_SETTINGS\}/,
                replace: "...$self.makeSettingsCategories($1),$&"
            }
        }
    ],
    set ColorPicker(e) {
        ColorPicker = e;
        LazySwatchLoaded = true;
    },

    customSections: [] as ((ID: Record<string, unknown>) => any)[],

    makeSettingsCategories({ ID }: { ID: Record<string, unknown>; }) {
        return [
            {
                section: ID.HEADER,
                label: "Discord Colorways",
                className: "vc-settings-header"
            },
            {
                section: "ColorwaysSelector",
                label: "Colors",
                element: Selector,
                className: "dc-colorway-selector"
            },
            {
                section: "ColorwaysSettings",
                label: "Settings & Tools",
                element: SettingsPage,
                className: "dc-colorway-settings"
            },
            ...this.customSections.map(func => func(ID)),
            {
                section: ID.DIVIDER
            }
        ].filter(Boolean);
    },

    ColorwaysButton: () => <ColorwaysButton />,

    async start() {
        addServerListElement(ServerListRenderPosition.In, this.ColorwaysButton);

        enableStyle(style);
        ColorwayCSS.set((await DataStore.get("actveColorway")) || "");
    },
    stop() {
        removeServerListElement(ServerListRenderPosition.In, this.ColorwaysButton);

        disableStyle(style);
        ColorwayCSS.remove();
    },
});
