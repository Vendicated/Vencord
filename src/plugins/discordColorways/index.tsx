/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Plugin Imports
import * as $DataStore from "@api/DataStore";
import { addAccessory, removeAccessory } from "@api/MessageAccessories";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import {
    i18n,
    SettingsRouter
} from "@webpack/common";
import { FluxEvents as $FluxEvents } from "@webpack/types";
// Mod-specific imports
import {
    CSSProperties as $CSSProperties,
    ReactNode as $ReactNode
} from "react";

import { ColorwayCSS } from "./colorwaysAPI";
import ColorwayID from "./components/ColorwayID";
import ColorwaysButton from "./components/ColorwaysButton";
import CreatorModal from "./components/CreatorModal";
import PCSMigrationModal from "./components/PCSMigrationModal";
import Selector from "./components/Selector";
import SettingsPage from "./components/SettingsTabs/SettingsPage";
import SourceManager from "./components/SettingsTabs/SourceManager";
import Store from "./components/SettingsTabs/Store";
import Spinner from "./components/Spinner";
import { defaultColorwaySource } from "./constants";
import { generateCss, getPreset, gradientBase, gradientPresetIds } from "./css";
import defaultsLoader from "./defaultsLoader";
import style from "./style.css?managed";
import discordTheme from "./theme.discord.css?managed";
import { ColorPickerProps, ColorwayObject } from "./types";
import { colorToHex } from "./utils";
import { closeWS, connect } from "./wsClient";

export const DataStore = $DataStore;
export type ReactNode = $ReactNode;
export type CSSProperties = $CSSProperties;
export type FluxEvents = $FluxEvents;
export { closeModal, openModal } from "@utils/modal";
export {
    Clipboard,
    FluxDispatcher,
    i18n,
    ReactDOM,
    SettingsRouter,
    Slider,
    Toasts,
    useCallback,
    useEffect,
    useReducer,
    useRef,
    UserStore,
    useState,
    useStateFromStores
} from "@webpack/common";

export let ColorPicker: React.FunctionComponent<ColorPickerProps> = () => {
    return <Spinner className="colorways-creator-module-warning" />;
};

export const PluginProps = {
    pluginVersion: "6.5.0",
    clientMod: "Vencord",
    UIVersion: "2.1.0",
    CSSVersion: "1.21"
};

const mainDev = Devs.DaBluLite || {
    name: "DaBluLite",
    id: 582170007505731594n
};

export default definePlugin({
    name: "DiscordColorways",
    description:
        "A plugin that offers easy access to simple color schemes/themes for Discord, also known as Colorways",
    authors: [mainDev, Devs.ImLvna],
    dependencies: ["ServerListAPI", "MessageAccessoriesAPI"],
    pluginVersion: PluginProps.pluginVersion,
    toolboxActions: {
        "Open Colorway Creator": () => openModal(props => <CreatorModal modalProps={props} />),
        "Open Settings": () => SettingsRouter.open("ColorwaysSettings"),
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
                match: /\{section:(\i\.\i)\.HEADER,\s*label:(\i)\.\i\.Messages\.APP_SETTINGS/,
                replace: "...$self.makeSettingsCategories($1),$&"
            }
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
                match: /(?<=function\((\i),\i\)\{)(?=let \i=Object.values\(\i.UserSettingsSections\).*?(\i)\.default\.open\()/,
                replace: "$2.default.open($1);return;"
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
        return [
            {
                section: SectionTypes.HEADER,
                label: "Discord Colorways",
                className: "vc-settings-header"
            },
            {
                section: "ColorwaysSelector",
                label: "Colorways",
                element: () => <Selector hasTheme />,
                className: "dc-colorway-selector"
            },
            {
                section: "ColorwaysSettings",
                label: "Settings",
                element: () => <SettingsPage hasTheme />,
                className: "dc-colorway-settings"
            },
            {
                section: "ColorwaysSourceManager",
                label: "Sources",
                element: () => <SourceManager hasTheme />,
                className: "dc-colorway-sources-manager"
            },
            {
                section: "ColorwaysStore",
                label: "Discover",
                element: () => <Store hasTheme />,
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
        enableStyle(discordTheme);

        defaultsLoader();

        const [
            activeColorwayObject,
            colorwaysManagerAutoconnectPeriod,
            colorwaysManagerDoAutoconnect,
            colorwaySourceFiles,
            colorwaysPreset
        ] = await DataStore.getMany([
            "activeColorwayObject",
            "colorwaysManagerAutoconnectPeriod",
            "colorwaysManagerDoAutoconnect",
            "colorwaySourceFiles",
            "colorwaysPreset"
        ]);

        connect(colorwaysManagerDoAutoconnect as boolean, colorwaysManagerAutoconnectPeriod as number);

        const active: ColorwayObject = activeColorwayObject;

        if (active.id) {
            if (colorwaysPreset == "default") {
                ColorwayCSS.set(generateCss(
                    active.colors,
                    true,
                    true,
                    undefined,
                    active.id
                ));
            } else {
                if (gradientPresetIds.includes(colorwaysPreset)) {
                    const css = Object.keys(active).includes("linearGradient")
                        ? gradientBase(colorToHex(active.colors.accent), true) + `:root:root {--custom-theme-background: linear-gradient(${active.linearGradient})}`
                        : (getPreset(active.colors)[colorwaysPreset].preset as { full: string; }).full;
                    ColorwayCSS.set(css);
                } else {
                    ColorwayCSS.set(getPreset(active.colors)[colorwaysPreset].preset as string);
                }
            }
        }

        addAccessory("colorways-btn", props => <ColorwayID props={props} />);

        if ((colorwaySourceFiles as { name: string, url: string; }[]).map(i => i.url).includes("https://raw.githubusercontent.com/DaBluLite/ProjectColorway/master/index.json") || (!(colorwaySourceFiles as { name: string, url: string; }[]).map(i => i.url).includes("https://raw.githubusercontent.com/DaBluLite/ProjectColorway/master/index.json") && !(colorwaySourceFiles as { name: string, url: string; }[]).map(i => i.url).includes("https://raw.githubusercontent.com/ProjectColorway/ProjectColorway/master/index.json"))) {
            DataStore.set("colorwaySourceFiles", [{ name: "Project Colorway", url: defaultColorwaySource }, ...(colorwaySourceFiles as { name: string, url: string; }[]).filter(i => i.name !== "Project Colorway")]);
            openModal(props => <PCSMigrationModal modalProps={props} />);
        }
    },
    stop() {
        removeServerListElement(ServerListRenderPosition.In, this.ColorwaysButton);
        disableStyle(style);
        disableStyle(discordTheme);
        ColorwayCSS.remove();
        closeWS();
        removeAccessory("colorways-btn");
    },
});
