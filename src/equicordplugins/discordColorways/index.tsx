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
import { Devs, EquicordDevs } from "@utils/constants";
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
import OnDemandWaysPage from "./components/SettingsTabs/OnDemandPage";
import SettingsPage from "./components/SettingsTabs/SettingsPage";
import SourceManager from "./components/SettingsTabs/SourceManager";
import Store from "./components/SettingsTabs/Store";
import Spinner from "./components/Spinner";
import { defaultColorwaySource } from "./constants";
import defaultsLoader from "./defaultsLoader";
import style from "./style.css?managed";
import discordTheme from "./theme.discord.css?managed";
import { ColorPickerProps, ColorwayObject } from "./types";
import { connect } from "./wsClient";

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

defaultsLoader();

export const PluginProps = {
    pluginVersion: "6.1.0",
    clientMod: "Vencord User Plugin",
    UIVersion: "2.0.0",
    creatorVersion: "1.20"
};

export default definePlugin({
    name: "DiscordColorways",
    description: "A plugin that offers easy access to simple color schemes/themes for Discord, also known as Colorways",
    authors: [EquicordDevs.DaBluLite, Devs.ImLvna],
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
        const customSettingsSections = (
            Vencord.Plugins.plugins.Settings as any as {
                customSections: ((ID: Record<string, unknown>) => any)[];
            }
        ).customSections;

        const ColorwaysSelector = () => ({
            section: "ColorwaysSelector",
            label: "Colorways Selector",
            element: () => <Selector hasTheme />,
            className: "dc-colorway-selector"
        });
        const ColorwaysSettings = () => ({
            section: "ColorwaysSettings",
            label: "Colorways Settings",
            element: () => <SettingsPage hasTheme />,
            className: "dc-colorway-settings"
        });
        const ColorwaysSourceManager = () => ({
            section: "ColorwaysSourceManager",
            label: "Colorways Sources",
            element: () => <SourceManager hasTheme />,
            className: "dc-colorway-sources-manager"
        });
        const ColorwaysOnDemand = () => ({
            section: "ColorwaysOnDemand",
            label: "Colorways On-Demand",
            element: () => <OnDemandWaysPage hasTheme />,
            className: "dc-colorway-ondemand"
        });
        const ColorwaysStore = () => ({
            section: "ColorwaysStore",
            label: "Colorways Store",
            element: () => <Store hasTheme />,
            className: "dc-colorway-store"
        });

        customSettingsSections.push(ColorwaysSelector, ColorwaysSettings, ColorwaysSourceManager, ColorwaysOnDemand, ColorwaysStore);

        addServerListElement(ServerListRenderPosition.Above, this.ColorwaysButton);

        connect();

        enableStyle(style);
        enableStyle(discordTheme);
        ColorwayCSS.set((await DataStore.get("activeColorwayObject") as ColorwayObject).css || "");

        if ((await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).map(i => i.url).includes("https://raw.githubusercontent.com/DaBluLite/ProjectColorway/master/index.json") || (!(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).map(i => i.url).includes("https://raw.githubusercontent.com/DaBluLite/ProjectColorway/master/index.json") && !(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).map(i => i.url).includes("https://raw.githubusercontent.com/ProjectColorway/ProjectColorway/master/index.json"))) {
            DataStore.set("colorwaySourceFiles", [{ name: "Project Colorway", url: defaultColorwaySource }, ...(await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[]).filter(i => i.name !== "Project Colorway")]);
            openModal(props => <PCSMigrationModal modalProps={props} />);
        }

        addAccessory("colorway-id-card", props => <ColorwayID props={props} />);
    },
    stop() {
        removeServerListElement(ServerListRenderPosition.Above, this.ColorwaysButton);
        disableStyle(style);
        disableStyle(discordTheme);
        ColorwayCSS.remove();
        removeAccessory("colorway-id-card");
        const customSettingsSections = (
            Vencord.Plugins.plugins.Settings as any as {
                customSections: ((ID: Record<string, unknown>) => any)[];
            }
        ).customSections;

        const i = customSettingsSections.findIndex(
            section => section({}).id === ("ColorwaysSelector" || "ColorwaysSettings" || "ColorwaysSourceManager" || "ColorwaysOnDemand" || "ColorwaysStore")
        );

        if (i !== -1) customSettingsSections.splice(i, 1);
    },
});
