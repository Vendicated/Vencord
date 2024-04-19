/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { addAccessory, removeAccessory } from "@api/MessageAccessories";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { disableStyle, enableStyle } from "@api/Styles";
import { SwatchIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import {
    Button,
    Flex,
    Menu,
    PermissionsBits,
    PermissionStore,
    SelectedChannelStore,
    SettingsRouter,
} from "@webpack/common";

import { ColorPickerModal } from "./components/colorPicker";
import ColorwaysButton from "./components/colorwaysButton";
import CreatorModal from "./components/creatorModal";
import { ImportExportColorwaysPage } from "./components/settingsTabs/importExportPage";
import { OnDemandWaysPage } from "./components/settingsTabs/onDemandSettings";
import Selector from "./components/settingsTabs/selector";
import { SettingsPage } from "./components/settingsTabs/settingsPage";
import Spinner from "./components/spinner";
import { defaultColorwaySource } from "./constants";
import style from "./style.css?managed";
import { ColorPickerProps } from "./types";
import { getHex, stringToHex } from "./utils";

export let ColorPicker: React.FunctionComponent<ColorPickerProps> = () => {
    return <Spinner className="colorways-creator-module-warning" />;
};

(async function () {
    const [
        customColorways,
        colorwaySourcesFiles,
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

    if (!customColorways)
        DataStore.set("customColorways", []);

    if (!colorwaySourcesFiles)
        DataStore.set("colorwaySourceFiles", [defaultColorwaySource]);

    if (!showColorwaysButton)
        DataStore.set("showColorwaysButton", false);

    if (!onDemandWays)
        DataStore.set("onDemandWays", false);

    if (!onDemandWaysTintedText)
        DataStore.set("onDemandWaysTintedText", true);

    if (!useThinMenuButton)
        DataStore.set("useThinMenuButton", false);

    if (!onDemandWaysDiscordSaturation)
        DataStore.set("onDemandWaysDiscordSaturation", false);

    if (!onDemandWaysColorArray)
        DataStore.set("onDemandWaysColorArray", ["313338", "2b2d31", "1e1f22", "5865f2"]);

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

const ctxMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    if (props.channel.guild_id && !(PermissionStore.can(PermissionsBits.SEND_MESSAGES, props.channel))) return;
    children.push(
        <Menu.MenuItem
            id="colorways-send-id"
            label={<Flex flexDirection="row" style={{ alignItems: "center", gap: 8 }}>
                <SwatchIcon width={16} height={16} style={{ scale: "0.8" }} />
                Share Colorway ID
            </Flex>}
            action={() => {
                const colorwayIDArray = `#${getHex(getComputedStyle(document.body).getPropertyValue("--brand-experiment")).split("#")[1]},#${getHex(getComputedStyle(document.body).getPropertyValue("--background-primary")).split("#")[1]},#${getHex(getComputedStyle(document.body).getPropertyValue("--background-secondary")).split("#")[1]},#${getHex(getComputedStyle(document.body).getPropertyValue("--background-tertiary")).split("#")[1]}`;
                const colorwayID = stringToHex(colorwayIDArray);
                const channelId = SelectedChannelStore.getChannelId();
                sendMessage(channelId, { content: `\`colorway:${colorwayID}\`` });
            }}
        />
    );
};

export default definePlugin({
    name: "DiscordColorways",
    description:
        "A plugin that offers easy access to simple color schemes/themes for Discord, also known as Colorways",
    authors: [Devs.DaBluLite, Devs.ImLvna],
    dependencies: ["ServerListAPI", "MessageAccessoriesAPI"],
    pluginVersion: "5.5.0",
    creatorVersion: "1.18",
    toolboxActions: {
        "Change Colorway": () => SettingsRouter.open("ColorwaysSettings"),
        "Open Colorway Creator": () => openModal(props => <ColorPickerModal modalProps={props} />),
        "Open Color Stealer": () => openModal(props => <ColorPickerModal modalProps={props} />),
    },
    patches: [
        // Credits to Kyuuhachi for the BetterSettings plugin patches
        {
            find: "this.renderArtisanalHack()",
            replacement: [
                {
                    match: /createPromise:\(\)=>([^:}]*?),webpackId:"\d+",name:(?!="CollectiblesShop")"[^"]+"/g,
                    replace: "$&,_:$1",
                    predicate: () => true
                }
            ]
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

    customSections: [] as ((SectionTypes: Record<string, unknown>) => any)[],

    makeSettingsCategories(SectionTypes: Record<string, unknown>) {
        return [
            {
                section: SectionTypes.HEADER,
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
                label: "Settings",
                element: SettingsPage,
                className: "dc-colorway-settings"
            },
            {
                section: "ColorwaysOnDemand",
                label: "On Demand",
                element: OnDemandWaysPage,
                className: "dc-colorway-ondemand"
            },
            {
                section: "ColorwaysImportExport",
                label: "Backup/Restore",
                element: ImportExportColorwaysPage,
                className: "dc-colorway-import-export"
            },
            ...this.customSections.map(func => func(SectionTypes)),
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
                }} size={Button.Sizes.SMALL}>Add this Colorway...</Button>;
            return null;
        });
        addContextMenuPatch("channel-attach", ctxMenuPatch);
    },
    stop() {
        removeServerListElement(ServerListRenderPosition.In, this.ColorwaysButton);

        disableStyle(style);
        ColorwayCSS.remove();
        removeAccessory("colorways-btn");
        removeContextMenuPatch("channel-attach", ctxMenuPatch);
    },
});
