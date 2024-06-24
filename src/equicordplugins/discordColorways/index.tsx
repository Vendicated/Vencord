/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { addAccessory, removeAccessory } from "@api/MessageAccessories";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { disableStyle, enableStyle } from "@api/Styles";
import { Flex } from "@components/Flex";
import { Devs, EquicordDevs } from "@utils/constants";
import { ModalProps, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { findByProps } from "@webpack";
import {
    Button,
    Clipboard,
    Forms,
    Heading,
    i18n,
    SettingsRouter,
    Toasts
} from "@webpack/common";
import { CSSProperties } from "react";
import { Plugins } from "Vencord";

import AutoColorwaySelector from "./components/AutoColorwaySelector";
import ColorPickerModal from "./components/ColorPicker";
import ColorwaysButton from "./components/ColorwaysButton";
import CreatorModal from "./components/CreatorModal";
import Selector from "./components/Selector";
import OnDemandWaysPage from "./components/SettingsTabs/OnDemandPage";
import SettingsPage from "./components/SettingsTabs/SettingsPage";
import SourceManager from "./components/SettingsTabs/SourceManager";
import Store from "./components/SettingsTabs/Store";
import Spinner from "./components/Spinner";
import { defaultColorwaySource } from "./constants";
import { generateCss, getAutoPresets } from "./css";
import style from "./style.css?managed";
import { ColorPickerProps, ColorwayObject } from "./types";
import { colorToHex, hexToString } from "./utils";

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
        onDemandWaysOsAccentColor,
        activeColorwayObject,
        selectorViewMode,
        showLabelsInSelectorGridView
    ] = await DataStore.getMany([
        "customColorways",
        "colorwaySourceFiles",
        "showColorwaysButton",
        "onDemandWays",
        "onDemandWaysTintedText",
        "useThinMenuButton",
        "onDemandWaysDiscordSaturation",
        "onDemandWaysOsAccentColor",
        "activeColorwayObject",
        "selectorViewMode",
        "showLabelsInSelectorGridView"
    ]);

    const defaults = [
        { name: "showColorwaysButton", value: showColorwaysButton, default: false },
        { name: "onDemandWays", value: onDemandWays, default: false },
        { name: "onDemandWaysTintedText", value: onDemandWaysTintedText, default: true },
        { name: "useThinMenuButton", value: useThinMenuButton, default: false },
        { name: "onDemandWaysDiscordSaturation", value: onDemandWaysDiscordSaturation, default: false },
        { name: "onDemandWaysOsAccentColor", value: onDemandWaysOsAccentColor, default: false },
        { name: "activeColorwayObject", value: activeColorwayObject, default: { id: null, css: null, sourceType: null, source: null } },
        { name: "selectorViewMode", value: selectorViewMode, default: "grid" },
        { name: "showLabelsInSelectorGridView", value: showLabelsInSelectorGridView, default: false }
    ];

    defaults.forEach(({ name, value, default: def }) => {
        if (!value) DataStore.set(name, def);
    });

    if (customColorways) {
        if (!customColorways[0].colorways) {
            DataStore.set("customColorways", [{ name: "Custom", colorways: customColorways }]);
        }
    } else {
        DataStore.set("customColorways", []);
    }

    if (colorwaySourceFiles) {
        if (typeof colorwaySourceFiles[0] === "string") {
            DataStore.set("colorwaySourceFiles", colorwaySourceFiles.map((sourceURL: string, i: number) => {
                return { name: sourceURL === defaultColorwaySource ? "Project Colorway" : `Source #${i}`, url: sourceURL };
            }));
        }
    } else {
        DataStore.set("colorwaySourceFiles", [{
            name: "Project Colorway",
            url: defaultColorwaySource
        }]);
    }

})();

export const ColorwayCSS = {
    get: () => document.getElementById("activeColorwayCSS")!.textContent || "",
    set: (e: string) => {
        if (!document.getElementById("activeColorwayCSS")) {
            document.head.append(Object.assign(document.createElement("style"), {
                id: "activeColorwayCSS",
                textContent: e
            }));
        } else document.getElementById("activeColorwayCSS")!.textContent = e;
    },
    remove: () => document.getElementById("activeColorwayCSS")!.remove(),
};

export const versionData = {
    pluginVersion: "5.7.1",
    creatorVersion: "1.20",
};

export default definePlugin({
    name: "DiscordColorways",
    description: "A plugin that offers easy access to simple color schemes/themes for Discord, also known as Colorways",
    authors: [EquicordDevs.DaBluLite, Devs.ImLvna],
    dependencies: ["ServerListAPI", "MessageAccessoriesAPI"],
    pluginVersion: versionData.pluginVersion,
    creatorVersion: versionData.creatorVersion,
    toolboxActions: {
        "Change Colorway": () => openModal(props => <Selector modalProps={props} />),
        "Open Colorway Creator": () => openModal(props => <CreatorModal modalProps={props} />),
        "Open Color Stealer": () => openModal(props => <ColorPickerModal modalProps={props} />),
        "Open Settings": () => SettingsRouter.open("ColorwaysSettings"),
        "Open On-Demand Settings": () => SettingsRouter.open("ColorwaysOnDemand"),
        "Manage Colorways...": () => SettingsRouter.open("ColorwaysManagement"),
        "Change Auto Colorway Preset": async () => {
            const [
                activeAutoPreset,
                activeColorwayObject
            ] = await DataStore.getMany([
                "activeAutoPreset",
                "activeColorwayObject"
            ]);
            openModal((props: ModalProps) => <AutoColorwaySelector autoColorwayId={activeAutoPreset} modalProps={props} onChange={autoPresetId => {
                if (activeColorwayObject.id === "Auto") {
                    const demandedColorway = getAutoPresets(colorToHex(getComputedStyle(document.body).getPropertyValue("--os-accent-color")))[autoPresetId].preset();
                    DataStore.set("activeColorwayObject", { id: "Auto", css: demandedColorway, sourceType: "online", source: null });
                    ColorwayCSS.set(demandedColorway);
                }
            }} />);
        }
    },
    patches: [
        // Credits to Kyuuhachi for the BetterSettings plugin patches
        {
            find: "this.renderArtisanalHack()",
            replacement: {
                match: /createPromise:\(\)=>([^:}]*?),webpackId:"?\d+"?,name:(?!="CollectiblesShop")"[^"]+"/g,
                replace: "$&,_:$1",
                predicate: () => true
            }

        },
        {
            find: "Messages.USER_SETTINGS_WITH_BUILD_OVERRIDE.format",
            replacement: {
                match: /(\i)\(this,"handleOpenSettingsContextMenu",.{0,100}?null!=\i&&.{0,100}?(await Promise\.all[^};]*?\)\)).*?,(?=\1\(this)/,
                replace: "$&(async ()=>$2)(),"
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
                match: /(?<=section:(.{0,50})\.DIVIDER\}\))([,;])(?=.{0,200}(\i)\.push.{0,100}label:(\i)\.header)/,
                replace: (_, sectionTypes, commaOrSemi, elements, element) => `${commaOrSemi} $self.addSettings(${elements}, ${element}, ${sectionTypes}) ${commaOrSemi}`
            }
        },
        {
            find: "Messages.USER_SETTINGS_ACTIONS_MENU_LABEL",
            replacement: {
                match: /(?<=function\((\i),\i\)\{)(?=let \i=Object.values\(\i.\i\).*?(\i\.\i)\.open\()/,
                replace: "$2.open($1);return;"
            }
        }
    ],

    set ColorPicker(e) {
        ColorPicker = e;
    },

    isRightSpot({ header, settings }: { header?: string; settings?: string[]; }) {
        const firstChild = settings?.[0];
        // lowest two elements... sanity backup
        if (firstChild === "LOGOUT" || firstChild === "SOCIAL_LINKS") return true;

        const settingsLocation = "belowNitro";

        if (!header) return;

        const names = {
            top: i18n.Messages.USER_SETTINGS,
            aboveNitro: i18n.Messages.BILLING_SETTINGS,
            belowNitro: i18n.Messages.APP_SETTINGS,
            aboveActivity: i18n.Messages.ACTIVITY_SETTINGS
        };
        return header === names[settingsLocation];
    },

    patchedSettings: new WeakSet(),

    addSettings(elements: any[], element: { header?: string; settings: string[]; }, sectionTypes: Record<string, unknown>) {
        if (this.patchedSettings.has(elements) || !this.isRightSpot(element)) return;

        this.patchedSettings.add(elements);

        elements.push(...this.makeSettingsCategories(sectionTypes));
    },

    makeSettingsCategories(SectionTypes: Record<string, unknown>) {
        const { headerText, header } = findByProps("headerText", "header", "separator");
        return [
            {
                section: SectionTypes.CUSTOM,
                label: "Discord Colorways",
                className: "vc-settings-header",
                element: () => <div className={header} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 10px"
                }}>
                    <Heading
                        variant="eyebrow"
                        className={headerText}
                        style={{
                            "text-wrap": "wrap",
                            color: "var(--channels-default)"
                        } as CSSProperties}
                    >
                        Discord Colorways
                    </Heading>
                    <Heading
                        variant="eyebrow"
                        className={headerText}
                        style={{
                            marginLeft: "auto",
                            color: "var(--channels-default)"
                        }}
                    >
                        v{(Plugins.plugins.DiscordColorways as any).pluginVersion}
                    </Heading>
                </div>
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
                section: "ColorwaysSourceManager",
                label: "Sources",
                element: SourceManager,
                className: "dc-colorway-sources-manager"
            },
            {
                section: "ColorwaysOnDemand",
                label: "On-Demand",
                element: OnDemandWaysPage,
                className: "dc-colorway-ondemand"
            },
            {
                section: "ColorwaysStore",
                label: "Store",
                element: Store,
                className: "dc-colorway-store"
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
        ColorwayCSS.set((await DataStore.get("activeColorwayObject") as ColorwayObject).css || "");

        addAccessory("colorways-btn", props => {
            if (String(props.message.content).match(/colorway:[0-9a-f]{0,100}/)) {
                return <Flex flexDirection="column">
                    {String(props.message.content).match(/colorway:[0-9a-f]{0,100}/g)?.map((colorID: string) => {
                        colorID = hexToString(colorID.split("colorway:")[1]);
                        return <div className="colorwayMessage">
                            <div className="discordColorwayPreviewColorContainer" style={{ width: "56px", height: "56px", marginRight: "16px" }}>
                                {(() => {
                                    if (colorID) {
                                        if (!colorID.includes(",")) {
                                            throw new Error("Invalid Colorway ID");
                                        } else {
                                            return colorID.split("|").filter(string => string.includes(",#"))[0].split(/,#/).map((color: string) => <div className="discordColorwayPreviewColor" style={{ backgroundColor: `#${colorToHex(color)}` }} />);
                                        }
                                    } else return null;
                                })()}
                            </div>
                            <div className="colorwayMessage-contents">
                                <Forms.FormTitle>Colorway{/n:([A-Za-z0-9]+( [A-Za-z0-9]+)+)/i.exec(colorID) ? `: ${/n:([A-Za-z0-9]+( [A-Za-z0-9]+)+)/i.exec(colorID)![1]}` : ""}</Forms.FormTitle>
                                <Flex>
                                    <Button
                                        onClick={() => openModal(modalProps => <CreatorModal
                                            modalProps={modalProps}
                                            colorwayID={colorID}
                                        />)}
                                        size={Button.Sizes.SMALL}
                                        color={Button.Colors.PRIMARY}
                                        look={Button.Looks.FILLED}
                                    >
                                        Add this Colorway...
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            Clipboard.copy(colorID);
                                            Toasts.show({
                                                message: "Copied Colorway ID Successfully",
                                                type: 1,
                                                id: "copy-colorway-id-notify",
                                            });
                                        }}
                                        size={Button.Sizes.SMALL}
                                        color={Button.Colors.PRIMARY}
                                        look={Button.Looks.FILLED}
                                    >
                                        Copy Colorway ID
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (!colorID.includes(",")) {
                                                throw new Error("Invalid Colorway ID");
                                            } else {
                                                colorID.split("|").forEach((prop: string) => {
                                                    if (prop.includes(",#")) {
                                                        DataStore.set("activeColorwayObject", {
                                                            id: "Temporary Colorway", css: generateCss(
                                                                colorToHex(prop.split(/,#/)[1]),
                                                                colorToHex(prop.split(/,#/)[2]),
                                                                colorToHex(prop.split(/,#/)[3]),
                                                                colorToHex(prop.split(/,#/)[0]),
                                                                true,
                                                                true,
                                                                32,
                                                                "Temporary Colorway"
                                                            ), sourceType: "temporary", source: null
                                                        });
                                                        ColorwayCSS.set(generateCss(
                                                            colorToHex(prop.split(/,#/)[1]),
                                                            colorToHex(prop.split(/,#/)[2]),
                                                            colorToHex(prop.split(/,#/)[3]),
                                                            colorToHex(prop.split(/,#/)[0]),
                                                            true,
                                                            true,
                                                            32,
                                                            "Temporary Colorway"
                                                        ));
                                                    }
                                                });
                                            }
                                        }}
                                        size={Button.Sizes.SMALL}
                                        color={Button.Colors.PRIMARY}
                                        look={Button.Looks.FILLED}
                                    >
                                        Apply temporarily
                                    </Button>
                                </Flex>
                            </div>
                        </div>;
                    })}
                </Flex>;
            } else {
                return null;
            }
        });
    },
    stop() {
        removeServerListElement(ServerListRenderPosition.In, this.ColorwaysButton);
        disableStyle(style);
        ColorwayCSS.remove();
        removeAccessory("colorways-btn");
    },
});
