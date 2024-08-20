/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Plugin Imports
import ColorwaysButton from "./components/ColorwaysButton";
import CreatorModal from "./components/CreatorModal";
import Selector from "./components/Selector";
import OnDemandWaysPage from "./components/SettingsTabs/OnDemandPage";
import SettingsPage from "./components/SettingsTabs/SettingsPage";
import SourceManager from "./components/SettingsTabs/SourceManager";
import Store from "./components/SettingsTabs/Store";
import Spinner from "./components/Spinner";
import { defaultColorwaySource } from "./constants";
import style from "./style.css?managed";
import discordTheme from "./theme.discord.css?managed";
import { ColorPickerProps, ColorwayObject } from "./types";

// Mod-specific imports

import {
    ReactNode as $ReactNode,
    CSSProperties as $CSSProperties
} from "react";
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
import ColorwayID from "./components/ColorwayID";
import { connect } from "./wsClient";
import { ColorwayCSS } from "./colorwaysAPI";
import { FluxEvents as $FluxEvents } from "@webpack/types";
import PCSMigrationModal from "./components/PCSMigrationModal";
import defaultsLoader from "./defaultsLoader";

export const DataStore = $DataStore;
export type ReactNode = $ReactNode;
export type CSSProperties = $CSSProperties;
export type FluxEvents = $FluxEvents;
export {
    useState,
    useEffect,
    useReducer,
    useStateFromStores,
    useCallback,
    useRef,
    UserStore,
    Clipboard,
    i18n,
    SettingsRouter,
    Toasts,
    FluxDispatcher,
    ReactDOM,
    Slider
} from "@webpack/common";
export { openModal, closeModal } from "@utils/modal";

export let ColorPicker: React.FunctionComponent<ColorPickerProps> = () => {
    return <Spinner className="colorways-creator-module-warning" />;
};

defaultsLoader();

export const PluginProps = {
    pluginVersion: "6.2.0",
    clientMod: "Vencord",
    UIVersion: "2.0.0",
    creatorVersion: "1.20"
};

export default definePlugin({
    name: "DiscordColorways",
    description:
        "A plugin that offers easy access to simple color schemes/themes for Discord, also known as Colorways",
    authors: [Devs.DaBluLite, Devs.ImLvna],
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
                section: "ColorwaysOnDemand",
                label: "On-Demand",
                element: () => <OnDemandWaysPage hasTheme />,
                className: "dc-colorway-ondemand"
            },
            {
                section: "ColorwaysStore",
                label: "Store",
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

        connect();

        enableStyle(style);
        enableStyle(discordTheme);
        ColorwayCSS.set((await DataStore.get("activeColorwayObject") as ColorwayObject).css || "");

        if ((await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).map(i => i.url).includes("https://raw.githubusercontent.com/DaBluLite/ProjectColorway/master/index.json") || (!(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).map(i => i.url).includes("https://raw.githubusercontent.com/DaBluLite/ProjectColorway/master/index.json") && !(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).map(i => i.url).includes("https://raw.githubusercontent.com/ProjectColorway/ProjectColorway/master/index.json"))) {
            DataStore.set("colorwaySourceFiles", [{ name: "Project Colorway", url: defaultColorwaySource }, ...(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).filter(i => i.name !== "Project Colorway")]);
            openModal(props => <PCSMigrationModal modalProps={props} />);
        }

        addAccessory("colorways-btn", props => <ColorwayID props={props} />);
    },
    stop() {
        removeServerListElement(ServerListRenderPosition.In, this.ColorwaysButton);
        disableStyle(style);
        disableStyle(discordTheme);
        ColorwayCSS.remove();
        removeAccessory("colorways-btn");
    },
});
