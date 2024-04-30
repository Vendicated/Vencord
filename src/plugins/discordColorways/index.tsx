/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { addAccessory, removeAccessory } from "@api/MessageAccessories";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import {
    Button,
    Forms,
    SettingsRouter,
} from "@webpack/common";
import { Plugins } from "Vencord";

import ColorPickerModal from "./components/ColorPicker";
import ColorwaysButton from "./components/ColorwaysButton";
import CreatorModal from "./components/CreatorModal";
import Selector from "./components/Selector";
import ManageColorwaysPage from "./components/SettingsTabs/ManageColorwaysPage";
import OnDemandWaysPage from "./components/SettingsTabs/OnDemandPage";
import SettingsPage from "./components/SettingsTabs/SettingsPage";
import Spinner from "./components/Spinner";
import { defaultColorwaySource } from "./constants";
import style from "./style.css?managed";
import { ColorPickerProps } from "./types";

export let ColorPicker: React.FunctionComponent<ColorPickerProps> = () => {
    return <Spinner className="colorways-creator-module-warning" />;
};

(async function () {
    const [
        customColorways,
        colorwaySourceFiles,
        showColorwaysButton,
        onDemandWays,
        onDemandWaysTintedText,
        useThinMenuButton,
        onDemandWaysDiscordSaturation,
        onDemandWaysColorArray
    ] = await DataStore.getMany([
        "customColorways",
        "colorwaySourceFiles",
        "showColorwaysButton",
        "onDemandWays",
        "onDemandWaysTintedText",
        "useThinMenuButton",
        "onDemandWaysDiscordSaturation",
        "onDemandWaysColorArray"
    ]);

    const defaults = [
        { name: "customColorways", checkedValue: customColorways, defaults: [] },
        { name: "colorwaySourceFiles", checkedValue: colorwaySourceFiles, defaults: [defaultColorwaySource] },
        { name: "showColorwaysButton", checkedValue: showColorwaysButton, defaults: false },
        { name: "onDemandWays", checkedValue: onDemandWays, defaults: false },
        { name: "onDemandWaysTintedText", checkedValue: onDemandWaysTintedText, defaults: true },
        { name: "useThinMenuButton", checkedValue: useThinMenuButton, defaults: false },
        { name: "onDemandWaysDiscordSaturation", checkedValue: onDemandWaysDiscordSaturation, defaults: false },
        { name: "onDemandWaysColorArray", checkedValue: onDemandWaysColorArray, defaults: ["313338", "2b2d31", "1e1f22", "5865f2"] }
    ];

    defaults.forEach(({ name, checkedValue, defaults }) => {
        if (!checkedValue) DataStore.set(name, defaults);
    });

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
    dependencies: ["ServerListAPI", "MessageAccessoriesAPI"],
    pluginVersion: "5.6.7",
    creatorVersion: "1.19.5",
    toolboxActions: {
        "Change Colorway": () => openModal(props => <Selector modalProps={props} />),
        "Open Colorway Creator": () => openModal(props => <CreatorModal modalProps={props} />),
        "Open Color Stealer": () => openModal(props => <ColorPickerModal modalProps={props} />),
        "Open Settings": () => SettingsRouter.open("ColorwaysSettings"),
        "Open On-Demand Settings": () => SettingsRouter.open("ColorwaysOnDemand"),
        "Manage Colorways...": () => SettingsRouter.open("ColorwaysManagement"),
    },
    patches: [
        // Credits to Kyuuhachi for the BetterSettings plugin patches
        {
            find: "this.renderArtisanalHack()",
            replacement: {
                match: /createPromise:\(\)=>([^:}]*?),webpackId:"\d+",name:(?!="CollectiblesShop")"[^"]+"/g,
                replace: "$&,_:$1",
                predicate: () => true
            }

        },
        {
            find: "Messages.USER_SETTINGS_WITH_BUILD_OVERRIDE.format",
            replacement: {
                match: /(?<=(\i)\(this,"handleOpenSettingsContextMenu",.{0,100}?openContextMenuLazy.{0,100}?(await Promise\.all[^};]*?\)\)).*?,)(?=\1\(this)/,
                replace: "(async ()=>$2)(),"
            },
            predicate: () => true
        },
        {
            find: "colorPickerFooter:",
            replacement: {
                match: /function (\i).{0,200}colorPickerFooter:/,
                replace: "$self.ColorPicker=$1;$&",
            },
        },
        {
            find: "Messages.ACTIVITY_SETTINGS",
            replacement: {
                match: /\{section:(\i\.\i)\.HEADER,\s*label:(\i)\.\i\.Messages\.APP_SETTINGS\}/,
                replace: "...$self.makeSettingsCategories($1),$&"
            }
        }
    ],
    set ColorPicker(e) {
        ColorPicker = e;
    },

    makeSettingsCategories(SectionTypes: Record<string, unknown>) {
        return [
            {
                section: SectionTypes.CUSTOM,
                label: "Discord Colorways",
                className: "vc-settings-header",
                element: () => <Forms.FormTitle style={{
                    marginBottom: 0,
                    padding: "6px 10px",
                    color: "var(--channels-default)",
                    display: "flex",
                    justifyContent: "space-between"
                }}>
                    Discord Colorways
                    <Forms.FormTitle style={{
                        marginBottom: 0,
                        color: "var(--channels-default)",
                        marginLeft: "auto"
                    }}>v{(Plugins.plugins.DiscordColorways as any).pluginVersion}</Forms.FormTitle>
                </Forms.FormTitle>
            },
            {
                section: "ColorwaysSelector",
                label: "Colorways",
                element: () => <Selector isSettings modalProps={{ onClose: () => new Promise(() => true), transitionState: 1 }} />,
                className: "dc-colorway-selector"
            },
            {
                section: "ColorwaysSettings",
                label: "Settings",
                element: SettingsPage,
                className: "dc-colorway-settings"
            },
            {
                section: "ColorwaysOnDemand",
                label: "On-Demand",
                element: OnDemandWaysPage,
                className: "dc-colorway-ondemand"
            },
            {
                section: "ColorwaysManagement",
                label: "Manage...",
                element: ManageColorwaysPage,
                className: "dc-colorway-management"
            },
            {
                section: SectionTypes.DIVIDER
            }
        ].filter(Boolean);
    },

    ColorwaysButton: () => <ColorwaysButton />,

    async start() {
        addServerListElement(ServerListRenderPosition.In, this.ColorwaysButton);

        enableStyle(style);
        ColorwayCSS.set((await DataStore.get("actveColorway")) || "");

        addAccessory("colorways-btn", props => {
            if (String(props.message.content).match(/colorway:[0-9a-f]{0,71}/))
                return <Button onClick={() => {
                    openModal(propss => (
                        <CreatorModal
                            modalProps={propss}
                            colorwayID={String(props.message.content).match(/colorway:[0-9a-f]{0,71}/)![0]}
                        />
                    ));
                }} size={Button.Sizes.SMALL} color={Button.Colors.PRIMARY}>Add this Colorway...</Button>;
            return null;
        });
    },
    stop() {
        removeServerListElement(ServerListRenderPosition.In, this.ColorwaysButton);

        disableStyle(style);
        ColorwayCSS.remove();
        removeAccessory("colorways-btn");
    },
});
