/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { definePluginSettings } from "@api/Settings";
import { Divider } from "@components/Divider";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { OptionType } from "@utils/types";
import { Alerts, Button, useState } from "@webpack/common";

import { DATA_COLLECTION_NAME, getCollections, refreshCacheCollection } from "./utils/collectionManager";
import { cl } from "./utils/misc";
import { downloadCollections, uploadGifCollections } from "./utils/settingsUtils";

export const SortingOptions = {
    NAME: 1,
    CREATION_DATE: 2,
    MODIFIED_DATE: 3,
} as const;

export const settings = definePluginSettings({
    itemPrefix: {
        description: "The prefix for gif items.",
        type: OptionType.STRING,
        default: "gc-item:",
        restartNeeded: true,
    },
    collectionPrefix: {
        description: "The prefix for collections.",
        type: OptionType.STRING,
        default: "gc:",
        restartNeeded: true,
    },
    onlyShowCollections: {
        description: "Only show collections in the GIF picker.",
        type: OptionType.BOOLEAN,
        default: false,
        restartNeeded: true,
    },
    stopWarnings: {
        description: "Skip deletion confirmation dialogs.",
        type: OptionType.BOOLEAN,
        default: false,
    },
    showCopyImageLink: {
        description: "Show copy image link option in context menus.",
        type: OptionType.BOOLEAN,
        default: false,
    },
    preventDuplicates: {
        description: "Prevent adding the same GIF to a collection multiple times.",
        type: OptionType.BOOLEAN,
        default: false,
    },
    defaultEmptyCollectionImage: {
        description: "The image shown when a collection has no images.",
        type: OptionType.STRING,
        default: "https://c.tenor.com/YEG33HsLEaIAAAAC/parksandrec-oops.gif",
    },
    collectionsSortType: {
        description: "The type of sorting for collections.",
        type: OptionType.NUMBER,
        default: SortingOptions.NAME,
        hidden: true,
    },
    collectionsSortOrder: {
        description: "The order of sorting for collections.",
        type: OptionType.STRING,
        default: "asc",
        hidden: true,
    },
    collectionsSort: {
        type: OptionType.COMPONENT,
        description: "Decide how to sort collections.",
        component: SortSettingsComponent,
    },
    importGifs: {
        type: OptionType.COMPONENT,
        description: "Import collections.",
        component: () =>
            <Button onClick={async () =>
                (await getCollections()).length ? Alerts.show({
                    title: "Are you sure?",
                    body: "Importing collections will overwrite your current collections.",
                    confirmText: "Import",
                    confirmColor: Button.Colors.RED,
                    cancelText: "Nevermind",
                    onConfirm: () => uploadGifCollections(),
                }) : uploadGifCollections()}>
                Import Collections
            </Button>,
    },
    exportGifs: {
        type: OptionType.COMPONENT,
        description: "Export collections.",
        component: () =>
            <Button onClick={downloadCollections}>
                Export Collections
            </Button>,
    },
    resetCollections: {
        type: OptionType.COMPONENT,
        description: "Reset collections.",
        component: () =>
            <Button onClick={() =>
                Alerts.show({
                    title: "Are you sure?",
                    body: "Resetting collections will remove all your collections.",
                    confirmText: "Reset",
                    confirmColor: Button.Colors.RED,
                    cancelText: "Nevermind",
                    onConfirm: async () => {
                        await DataStore.set(DATA_COLLECTION_NAME, []);
                        refreshCacheCollection();
                    },
                })}>
                Reset Collections
            </Button>,
    },
});

function RadioOption({ name, value, checked, onChange, label }: { name: string; value: string | number; checked: boolean; onChange: () => void; label: string; }) {
    return (
        <div className={cl("sort-option")}>
            <label className={cl("sort-label")}>
                <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className={cl("sort-input")} />
                {label}
            </label>
        </div>
    );
}

function SortSettingsComponent() {
    const [sortType, setSortType] = useState(settings.store.collectionsSortType ?? SortingOptions.NAME);
    const [sortOrder, setSortOrder] = useState(settings.store.collectionsSortOrder ?? "asc");

    const handleSortType = (value: number) => {
        setSortType(value);
        settings.store.collectionsSortType = value;
    };

    const handleSortOrder = (value: string) => {
        setSortOrder(value);
        settings.store.collectionsSortOrder = value;
    };

    return (
        <div className={cl("sort-container")}>
            <Heading className={cl("sort-title")}>Sort Collections</Heading>
            <Divider className={cl("sort-divider")} />
            <Paragraph className={cl("sort-description")}>Choose a sorting criteria for your collections</Paragraph>
            <Divider className={cl("sort-divider")} />
            <div className={cl("sort-section")}>
                <Paragraph className={cl("sort-section-title")}>Sort By</Paragraph>
                <RadioOption name="sortType" value={SortingOptions.NAME} checked={sortType === SortingOptions.NAME} onChange={() => handleSortType(SortingOptions.NAME)} label="Name" />
                <RadioOption name="sortType" value={SortingOptions.CREATION_DATE} checked={sortType === SortingOptions.CREATION_DATE} onChange={() => handleSortType(SortingOptions.CREATION_DATE)} label="Creation Date" />
                <RadioOption name="sortType" value={SortingOptions.MODIFIED_DATE} checked={sortType === SortingOptions.MODIFIED_DATE} onChange={() => handleSortType(SortingOptions.MODIFIED_DATE)} label="Modified Date" />
            </div>
            <Divider className={cl("sort-divider")} />
            <div className={cl("sort-section")}>
                <Paragraph className={cl("sort-section-title")}>Order</Paragraph>
                <RadioOption name="sortOrder" value="asc" checked={sortOrder === "asc"} onChange={() => handleSortOrder("asc")} label="Ascending" />
                <RadioOption name="sortOrder" value="desc" checked={sortOrder === "desc"} onChange={() => handleSortOrder("desc")} label="Descending" />
            </div>
        </div>
    );
}
