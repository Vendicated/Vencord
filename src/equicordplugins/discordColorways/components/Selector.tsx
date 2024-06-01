/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* eslint-disable arrow-parens */

import * as DataStore from "@api/DataStore";
import { Flex } from "@components/Flex";
import { DeleteIcon, PlusIcon } from "@components/Icons";
import { SettingsTab } from "@components/VencordSettings/shared";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { findByProps, findByPropsLazy } from "@webpack";
import {
    Button,
    ButtonLooks,
    Clipboard,
    Forms,
    Menu,
    Popout,
    ScrollerThin,
    Select,
    SettingsRouter,
    Text,
    TextInput,
    Toasts,
    Tooltip,
    useEffect,
    useState
} from "@webpack/common";
import { ReactNode } from "react";

import { ColorwayCSS } from "..";
import { generateCss, getAutoPresets, gradientBase } from "../css";
import { Colorway, ColorwayObject, SortOptions, SourceObject } from "../types";
import { colorToHex, getHex, stringToHex } from "../utils";
import AutoColorwaySelector from "./AutoColorwaySelector";
import ColorPickerModal from "./ColorPicker";
import CreatorModal from "./CreatorModal";
import { CodeIcon, IDIcon, MoreIcon, PalleteIcon } from "./Icons";
import ColorwayInfoModal from "./InfoModal";

const { SelectionCircle } = findByPropsLazy("SelectionCircle");

function SelectorContainer({ children, isSettings, modalProps }: { children: ReactNode, isSettings?: boolean, modalProps: ModalProps; }) {
    if (!isSettings) {
        return <ModalRoot {...modalProps} className="colorwaySelectorModal">
            {children}
        </ModalRoot>;
    } else {
        return <SettingsTab title="Colors">
            <div className="colorwaysSettingsSelector-wrapper">
                {children}
            </div>
        </SettingsTab>;
    }
}

function SelectorHeader({ children, isSettings }: { children: ReactNode, isSettings?: boolean; }) {
    if (!isSettings) {
        return <ModalHeader separator={false}>
            {children}
        </ModalHeader>;
    } else {
        return <Flex style={{ gap: "0" }}>
            {children}
        </Flex>;
    }
}

function SelectorContent({ children, isSettings }: { children: ReactNode, isSettings?: boolean; }) {
    if (!isSettings) {
        return <ModalContent className="colorwaySelectorModalContent">{children}</ModalContent>;
    } else {
        return <>{children}</>;
    }
}

export default function ({
    modalProps,
    isSettings,
    settings = { selectorType: "normal" }
}: {
    modalProps: ModalProps,
    isSettings?: boolean,
    settings?: { selectorType: "preview" | "multiple-selection" | "normal", previewSource?: string, onSelected?: (colorways: Colorway[]) => void; };
}): JSX.Element | any {
    const [colorwayData, setColorwayData] = useState<SourceObject[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");
    const [sortBy, setSortBy] = useState<SortOptions>(SortOptions.NAME_AZ);
    const [activeColorwayObject, setActiveColorwayObject] = useState<ColorwayObject>({ id: null, css: null, sourceType: null, source: null });
    const [customColorwayData, setCustomColorwayData] = useState<SourceObject[]>([]);
    const [loaderHeight, setLoaderHeight] = useState<"2px" | "0px">("2px");
    const [visibleSources, setVisibleSources] = useState<string>("all");
    const [showReloadMenu, setShowReloadMenu] = useState<boolean>(false);
    const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
    const [showLabelsInSelectorGridView, setShowLabelsInSelectorGridView] = useState<boolean>(false);
    const [showSortingMenu, setShowSotringMenu] = useState<boolean>(false);
    const [selectedColorways, setSelectedColorways] = useState<Colorway[]>([]);
    const [errorCode, setErrorCode] = useState<number>(0);

    const { item: radioBarItem, itemFilled: radioBarItemFilled } = findByProps("radioBar");

    const filters = [
        {
            name: "All",
            id: "all",
            sources: [...colorwayData, ...customColorwayData]
        },
        ...colorwayData.map((source) => ({
            name: source.source,
            id: source.source.toLowerCase().replaceAll(" ", "-"),
            sources: [source]
        })),
        ...customColorwayData.map((source) => ({
            name: source.source,
            id: source.source.toLowerCase().replaceAll(" ", "-"),
            sources: [source]
        }))
    ];

    async function loadUI(force?: boolean) {
        setActiveColorwayObject(await DataStore.get("activeColorwayObject") as ColorwayObject);
        setViewMode(await DataStore.get("selectorViewMode") as "list" | "grid");
        setShowLabelsInSelectorGridView(await DataStore.get("showLabelsInSelectorGridView") as boolean);
        setLoaderHeight("0px");

        if (settings.previewSource) {

            const res: Response = await fetch(settings.previewSource);

            const dataPromise = res.json().then(data => data).catch(() => ({ colorways: [], errorCode: 1, errorMsg: "Colorway Source format is invalid" }));

            const data = await dataPromise;

            if (data.errorCode) {
                setErrorCode(data.errorCode);
            }

            const colorwayList: Colorway[] = data.css ? data.css.map(customStore => customStore.colorways).flat() : data.colorways;

            setColorwayData([{ colorways: colorwayList || [], source: res.url, type: "online" }] as { type: "online" | "offline" | "temporary", source: string, colorways: Colorway[]; }[]);

        } else {
            setCustomColorwayData((await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).map((colorSrc: { name: string, colorways: Colorway[], id?: string; }) => ({ type: "offline", source: colorSrc.name, colorways: colorSrc.colorways })));

            const onlineSources: { name: string, url: string; }[] = await DataStore.get("colorwaySourceFiles") as { name: string, url: string; }[];

            const responses: Response[] = await Promise.all(
                onlineSources.map((source) =>
                    fetch(source.url, force ? { cache: "no-store" } : {})
                )
            );

            setColorwayData(await Promise.all(
                responses
                    .map((res, i) => ({ response: res, name: onlineSources[i].name }))
                    .map((res: { response: Response, name: string; }) =>
                        res.response.json().then(dt => ({ colorways: dt.colorways as Colorway[], source: res.name, type: "online" })).catch(() => ({ colorways: [] as Colorway[], source: res.name, type: "online" }))
                    )) as { type: "online" | "offline" | "temporary", source: string, colorways: Colorway[]; }[]);
        }
    }

    useEffect(() => { loadUI(); }, [searchValue]);

    function ReloadPopout(onClose: () => void) {
        return (
            <Menu.Menu
                navId="dc-reload-menu"
                onClose={onClose}
            >
                <Menu.MenuItem
                    id="dc-force-reload"
                    label="Force Reload"
                    action={() => loadUI(true)}
                />
            </Menu.Menu>
        );
    }

    function SortingPopout(onClose: () => void) {
        return (
            <Menu.Menu
                navId="dc-selector-options-menu"
                onClose={onClose}
            >
                <Menu.MenuGroup label="View">
                    <Menu.MenuRadioItem
                        group="selector-viewMode"
                        id="selector-viewMode_grid"
                        label="Grid"
                        checked={viewMode === "grid"}
                        action={() => {
                            setViewMode("grid");
                            DataStore.set("selectorViewMode", "grid");
                        }}
                    />
                    <Menu.MenuRadioItem
                        group="selector-viewMode"
                        id="selector-viewMode_list"
                        label="List"
                        checked={viewMode === "list"}
                        action={() => {
                            setViewMode("list");
                            DataStore.set("selectorViewMode", "list");
                        }}
                    />
                </Menu.MenuGroup>
                <Menu.MenuGroup label="Sort By">
                    <Menu.MenuRadioItem
                        group="sort-colorways"
                        id="sort-colorways_name-az"
                        label="Name (A-Z)"
                        checked={sortBy === SortOptions.NAME_AZ}
                        action={() => setSortBy(SortOptions.NAME_AZ)}
                    />
                    <Menu.MenuRadioItem
                        group="sort-colorways"
                        id="sort-colorways_name-za"
                        label="Name (Z-A)"
                        checked={sortBy === SortOptions.NAME_ZA}
                        action={() => setSortBy(SortOptions.NAME_ZA)}
                    />
                    <Menu.MenuRadioItem
                        group="sort-colorways"
                        id="sort-colorways_source-az"
                        label="Source (A-Z)"
                        checked={sortBy === SortOptions.SOURCE_AZ}
                        action={() => setSortBy(SortOptions.SOURCE_AZ)}
                    />
                    <Menu.MenuRadioItem
                        group="sort-colorways"
                        id="sort-colorways_source-za"
                        label="Source (Z-A)"
                        checked={sortBy === SortOptions.SOURCE_ZA}
                        action={() => setSortBy(SortOptions.SOURCE_ZA)}
                    />
                </Menu.MenuGroup>
            </Menu.Menu>
        );
    }

    return (
        <SelectorContainer modalProps={modalProps} isSettings={isSettings}>
            <SelectorHeader isSettings={isSettings}>
                {settings.selectorType !== "preview" ? <>
                    <TextInput
                        className="colorwaySelector-search"
                        placeholder="Search for Colorways..."
                        value={searchValue}
                        onChange={setSearchValue}
                    />
                    <Tooltip text="Refresh Colorways...">
                        {({ onMouseEnter, onMouseLeave }) => <Popout
                            position="bottom"
                            align="right"
                            animation={Popout.Animation.NONE}
                            shouldShow={showReloadMenu}
                            onRequestClose={() => setShowReloadMenu(false)}
                            renderPopout={() => ReloadPopout(() => setShowReloadMenu(false))}
                        >
                            {(_, { isShown }) => <Button
                                innerClassName="colorwaysSettings-iconButtonInner"
                                size={Button.Sizes.ICON}
                                color={Button.Colors.PRIMARY}
                                look={Button.Looks.OUTLINED}
                                style={{ marginLeft: "8px" }}
                                id="colorway-refreshcolorway"
                                onMouseEnter={isShown ? () => { } : onMouseEnter}
                                onMouseLeave={isShown ? () => { } : onMouseLeave}
                                onClick={() => {
                                    setLoaderHeight("2px");
                                    loadUI().then(() => setLoaderHeight("0px"));
                                }}
                                onContextMenu={() => { onMouseLeave(); setShowReloadMenu(!showReloadMenu); }}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    x="0px"
                                    y="0px"
                                    width="20"
                                    height="20"
                                    style={{ padding: "6px", boxSizing: "content-box" }}
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <rect
                                        y="0"
                                        fill="none"
                                        width="24"
                                        height="24"
                                    />
                                    <path
                                        d="M6.351,6.351C7.824,4.871,9.828,4,12,4c4.411,0,8,3.589,8,8h2c0-5.515-4.486-10-10-10 C9.285,2,6.779,3.089,4.938,4.938L3,3v6h6L6.351,6.351z"
                                    />
                                    <path
                                        d="M17.649,17.649C16.176,19.129,14.173,20,12,20c-4.411,0-8-3.589-8-8H2c0,5.515,4.486,10,10,10 c2.716,0,5.221-1.089,7.062-2.938L21,21v-6h-6L17.649,17.649z"
                                    />
                                </svg>
                            </Button>}
                        </Popout>}
                    </Tooltip>
                    <Tooltip text="Create Colorway...">
                        {({ onMouseEnter, onMouseLeave }) => <Button
                            innerClassName="colorwaysSettings-iconButtonInner"
                            size={Button.Sizes.ICON}
                            color={Button.Colors.PRIMARY}
                            look={Button.Looks.OUTLINED}
                            style={{ marginLeft: "8px" }}
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            onClick={() => openModal((props) => <CreatorModal
                                modalProps={props}
                                loadUIProps={loadUI}
                            />)}
                        >
                            <PlusIcon width={20} height={20} style={{ padding: "6px", boxSizing: "content-box" }} />
                        </Button>}
                    </Tooltip>
                    <Tooltip text="Selector Options">
                        {({ onMouseEnter, onMouseLeave }) => <Popout
                            position="bottom"
                            align="right"
                            animation={Popout.Animation.NONE}
                            shouldShow={showSortingMenu}
                            onRequestClose={() => setShowSotringMenu(false)}
                            renderPopout={() => SortingPopout(() => setShowSotringMenu(false))}
                        >
                            {(_, { isShown }) => <Button
                                innerClassName="colorwaysSettings-iconButtonInner"
                                size={Button.Sizes.ICON}
                                color={Button.Colors.PRIMARY}
                                look={Button.Looks.OUTLINED}
                                style={{ marginLeft: "8px" }}
                                onMouseEnter={isShown ? () => { } : onMouseEnter}
                                onMouseLeave={isShown ? () => { } : onMouseLeave}
                                onClick={() => { onMouseLeave(); setShowSotringMenu(!showSortingMenu); }}
                            >
                                <MoreIcon width={20} height={20} style={{ padding: "6px", boxSizing: "content-box" }} />
                            </Button>}
                        </Popout>}
                    </Tooltip>
                    <Tooltip text="Open Color Stealer">
                        {({ onMouseEnter, onMouseLeave }) => <Button
                            innerClassName="colorwaysSettings-iconButtonInner"
                            size={Button.Sizes.ICON}
                            color={Button.Colors.PRIMARY}
                            look={Button.Looks.OUTLINED}
                            style={{ marginLeft: "8px" }}
                            id="colorway-opencolorstealer"
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            onClick={() => openModal((props) => <ColorPickerModal modalProps={props} />)}
                        >
                            <PalleteIcon width={20} height={20} style={{ padding: "6px", boxSizing: "content-box" }} />
                        </Button>}
                    </Tooltip>
                    {isSettings ? <Select
                        className={"colorwaySelector-sources " + ButtonLooks.OUTLINED + " colorwaySelector-sources_settings"}
                        look={1}
                        popoutClassName="colorwaySelector-sourceSelect"
                        options={filters.map(filter => ({ label: filter.name, value: (filter.id as string) }))}
                        select={value => setVisibleSources(value)}
                        isSelected={value => visibleSources === value}
                        serialize={String}
                        popoutPosition="bottom" /> : <></>}
                </> : <Text variant="heading-lg/semibold" tag="h1">
                    Preview...
                </Text>}
            </SelectorHeader>
            <SelectorContent isSettings={isSettings}>
                <div className="colorwaysLoader-barContainer"><div className="colorwaysLoader-bar" style={{ height: loaderHeight }} /></div>
                {settings.selectorType === "multiple-selection" && <Forms.FormTitle>Available</Forms.FormTitle>}
                <ScrollerThin style={{ maxHeight: settings.selectorType === "multiple-selection" ? "50%" : (isSettings ? "unset" : "450px") }} className={"ColorwaySelectorWrapper " + (viewMode === "grid" ? "ColorwaySelectorWrapper-grid" : "ColorwaySelectorWrapper-list") + (showLabelsInSelectorGridView ? " colorwaySelector-gridWithLabels" : "")}>
                    {(activeColorwayObject.sourceType === "temporary" && settings.selectorType === "normal" && settings.selectorType === "normal") && <Tooltip text="Temporary Colorway">
                        {({ onMouseEnter, onMouseLeave }) => <div
                            className={viewMode === "grid" ? "discordColorway" : `${radioBarItem} ${radioBarItemFilled} discordColorway-listItem`}
                            id="colorway-Temporary"
                            aria-checked={activeColorwayObject.id === "Auto" && activeColorwayObject.source === null}
                            onMouseEnter={viewMode === "grid" ? onMouseEnter : () => { }}
                            onMouseLeave={viewMode === "grid" ? onMouseLeave : () => { }}
                            onClick={async () => {
                                DataStore.set("activeColorwayObject", { id: null, css: null, sourceType: null, source: null });
                                setActiveColorwayObject({ id: null, css: null, sourceType: null, source: null });
                                ColorwayCSS.remove();
                            }}
                        >
                            {viewMode === "list" && <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                {activeColorwayObject.id === "Temporary Colorway" && activeColorwayObject.sourceType === "temporary" && <circle cx="12" cy="12" r="5" fill="currentColor" />}
                            </svg>}
                            <div className="discordColorwayPreviewColorContainer">
                                <div
                                    className="discordColorwayPreviewColor"
                                    style={{ backgroundColor: "var(--brand-500)" }} />
                                <div
                                    className="discordColorwayPreviewColor"
                                    style={{ backgroundColor: "var(--background-primary)" }} />
                                <div
                                    className="discordColorwayPreviewColor"
                                    style={{ backgroundColor: "var(--background-secondary)" }} />
                                <div
                                    className="discordColorwayPreviewColor"
                                    style={{ backgroundColor: "var(--background-tertiary)" }} />
                            </div>
                            <div className="colorwaySelectionCircle">
                                {(activeColorwayObject.id === "Temporary Colorway" && activeColorwayObject.sourceType === "temporary" && viewMode === "grid") && <SelectionCircle />}
                            </div>
                            {(showLabelsInSelectorGridView || viewMode === "list") && <Text className={"colorwayLabel" + ((showLabelsInSelectorGridView && viewMode === "grid") ? " labelInGrid" : "")}>Temporary Colorway</Text>}
                            {viewMode === "list" && <>
                                <Tooltip text="Add Colorway">
                                    {({ onMouseEnter, onMouseLeave }) => <Button
                                        innerClassName="colorwaysSettings-iconButtonInner"
                                        size={Button.Sizes.ICON}
                                        color={Button.Colors.PRIMARY}
                                        look={Button.Looks.OUTLINED}
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={onMouseLeave}
                                        onClick={async e => {
                                            e.stopPropagation();
                                            const colorwayID = stringToHex(`#${colorToHex(getHex(getComputedStyle(document.body).getPropertyValue("--brand-500")))},#${colorToHex(getHex(getComputedStyle(document.body).getPropertyValue("--background-primary")))},#${colorToHex(getHex(getComputedStyle(document.body).getPropertyValue("--background-secondary")))},#${colorToHex(getHex(getComputedStyle(document.body).getPropertyValue("--background-tertiary")))}`);
                                            openModal(props => <CreatorModal modalProps={props} colorwayID={colorwayID} loadUIProps={loadUI} />);
                                        }}
                                    >
                                        <PlusIcon width={20} height={20} />
                                    </Button>}
                                </Tooltip>
                            </>}
                        </div>}
                    </Tooltip>}
                    {getComputedStyle(document.body).getPropertyValue("--os-accent-color") && ["all", "official"].includes(visibleSources) && settings.selectorType === "normal" && "auto".includes(searchValue.toLowerCase()) ? <Tooltip text="Auto">
                        {({ onMouseEnter, onMouseLeave }) => <div
                            className={viewMode === "grid" ? "discordColorway" : `${radioBarItem} ${radioBarItemFilled} discordColorway-listItem`}
                            id="colorway-Auto"
                            aria-checked={activeColorwayObject.id === "Auto" && activeColorwayObject.source === null}
                            onMouseEnter={viewMode === "grid" ? onMouseEnter : () => { }}
                            onMouseLeave={viewMode === "grid" ? onMouseLeave : () => { }}
                            onClick={async () => {
                                const activeAutoPreset = await DataStore.get("activeAutoPreset");
                                if (activeColorwayObject.id === "Auto") {
                                    DataStore.set("activeColorwayObject", { id: null, css: null, sourceType: null, source: null });
                                    setActiveColorwayObject({ id: null, css: null, sourceType: null, source: null });
                                    ColorwayCSS.remove();
                                } else {
                                    if (!activeAutoPreset) {
                                        openModal((props: ModalProps) => <AutoColorwaySelector autoColorwayId="" modalProps={props} onChange={autoPresetId => {
                                            const demandedColorway = getAutoPresets(colorToHex(getComputedStyle(document.body).getPropertyValue("--os-accent-color")).slice(0, 6))[autoPresetId].preset();
                                            ColorwayCSS.set(demandedColorway);
                                            DataStore.set("activeColorwayObject", { id: "Auto", css: demandedColorway, sourceType: "online", source: null });
                                            setActiveColorwayObject({ id: "Auto", css: demandedColorway, sourceType: "online", source: null });
                                        }} />);
                                    } else {
                                        const autoColorway = getAutoPresets(colorToHex(getComputedStyle(document.body).getPropertyValue("--os-accent-color")).slice(0, 6))[activeAutoPreset].preset();
                                        DataStore.set("activeColorwayObject", { id: "Auto", css: autoColorway, sourceType: "online", source: null });
                                        setActiveColorwayObject({ id: "Auto", css: autoColorway, sourceType: "online", source: null });
                                        ColorwayCSS.set(autoColorway);
                                    }
                                }
                            }}
                        >
                            {viewMode === "list" && <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                {activeColorwayObject.id === "Auto" && activeColorwayObject.source === null && <circle cx="12" cy="12" r="5" fill="currentColor" />}
                            </svg>}
                            <div className="discordColorwayPreviewColorContainer" style={{ backgroundColor: "var(--os-accent-color)" }} />
                            <div className="colorwaySelectionCircle">
                                {(activeColorwayObject.id === "Auto" && activeColorwayObject.source === null && viewMode === "grid") && <SelectionCircle />}
                            </div>
                            {(showLabelsInSelectorGridView || viewMode === "list") && <Text className={"colorwayLabel" + ((showLabelsInSelectorGridView && viewMode === "grid") ? " labelInGrid" : "")}>Auto</Text>}
                            <div
                                className="colorwayInfoIconContainer"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    const activeAutoPreset = await DataStore.get("activeAutoPreset");
                                    openModal((props: ModalProps) => <AutoColorwaySelector autoColorwayId={activeAutoPreset} modalProps={props} onChange={autoPresetId => {
                                        if (activeColorwayObject.id === "Auto") {
                                            const demandedColorway = getAutoPresets(colorToHex(getComputedStyle(document.body).getPropertyValue("--os-accent-color")).slice(0, 6))[autoPresetId].preset();
                                            DataStore.set("activeColorwayObject", { id: "Auto", css: demandedColorway, sourceType: "online", source: null });
                                            setActiveColorwayObject({ id: "Auto", css: demandedColorway, sourceType: "online", source: null });
                                            ColorwayCSS.set(demandedColorway);
                                        }
                                    }} />);
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" style={{ margin: "4px" }} viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M 21.2856,9.6 H 24 v 4.8 H 21.2868 C 20.9976,15.5172 20.52,16.5576 19.878,17.4768 L 21.6,19.2 19.2,21.6 17.478,19.8768 c -0.9216,0.642 -1.9596,1.1208 -3.078,1.4088 V 24 H 9.6 V 21.2856 C 8.4828,20.9976 7.4436,20.5188 6.5232,19.8768 L 4.8,21.6 2.4,19.2 4.1232,17.4768 C 3.4812,16.5588 3.0024,15.5184 2.7144,14.4 H 0 V 9.6 H 2.7144 C 3.0024,8.4816 3.48,7.4424 4.1232,6.5232 L 2.4,4.8 4.8,2.4 6.5232,4.1232 C 7.4424,3.48 8.4816,3.0024 9.6,2.7144 V 0 h 4.8 v 2.7132 c 1.1184,0.2892 2.1564,0.7668 3.078,1.4088 l 1.722,-1.7232 2.4,2.4 -1.7232,1.7244 c 0.642,0.9192 1.1208,1.9596 1.4088,3.0768 z M 12,16.8 c 2.65092,0 4.8,-2.14908 4.8,-4.8 0,-2.650968 -2.14908,-4.8 -4.8,-4.8 -2.650968,0 -4.8,2.149032 -4.8,4.8 0,2.65092 2.149032,4.8 4.8,4.8 z" />
                                </svg>
                            </div>
                        </div>}
                    </Tooltip> : <></>}
                    {(!getComputedStyle(document.body).getPropertyValue("--os-accent-color") || !["all", "official"].includes(visibleSources)) && !filters.filter(filter => filter.id === visibleSources)[0].sources.map(source => source.colorways).flat().length ? <Forms.FormTitle
                        style={{
                            marginBottom: 0,
                            width: "100%",
                            textAlign: "center"
                        }}
                    >
                        No colorways...
                    </Forms.FormTitle> : <></>}
                    {errorCode !== 0 && <Forms.FormTitle
                        style={{
                            marginBottom: 0,
                            width: "100%",
                            textAlign: "center"
                        }}
                    >
                        {errorCode === 1 && "Error: Invalid Colorway Source Format. If this error persists, contact the source author to resolve the issue."}
                    </Forms.FormTitle>}
                    {filters.map(filter => filter.id).includes(visibleSources) && (
                        filters
                            .filter(filter => filter.id === visibleSources)[0].sources
                            .map(({ colorways, source, type }) => colorways.map((colorway: Colorway) => ({ ...colorway, sourceType: type, source: source, preset: colorway.preset || (colorway.isGradient ? "Gradient" : "Default") })))
                            .flat()
                            .sort((a, b) => {
                                switch (sortBy) {
                                    case SortOptions.NAME_AZ:
                                        return a.name.localeCompare(b.name);
                                    case SortOptions.NAME_ZA:
                                        return b.name.localeCompare(a.name);
                                    case SortOptions.SOURCE_AZ:
                                        return a.source.localeCompare(b.source);
                                    case SortOptions.SOURCE_ZA:
                                        return b.source.localeCompare(a.source);
                                    default:
                                        return a.name.localeCompare(b.name);
                                }
                            })
                            .map((color: Colorway) => {
                                const colors: string[] = color.colors || [
                                    "accent",
                                    "primary",
                                    "secondary",
                                    "tertiary",
                                ];
                                return (color.name.toLowerCase().includes(searchValue.toLowerCase()) ?
                                    <Tooltip text={color.name}>
                                        {({ onMouseEnter, onMouseLeave }) => {
                                            return (
                                                <div
                                                    className={viewMode === "grid" ? "discordColorway" : `${radioBarItem} ${radioBarItemFilled} discordColorway-listItem`}
                                                    id={"colorway-" + color.name}
                                                    onMouseEnter={viewMode === "grid" ? onMouseEnter : () => { }}
                                                    onMouseLeave={viewMode === "grid" ? onMouseLeave : () => { }}
                                                    aria-checked={activeColorwayObject.id === color.name && activeColorwayObject.source === color.source}
                                                    onClick={async () => {
                                                        if (settings.selectorType === "normal") {
                                                            const [
                                                                onDemandWays,
                                                                onDemandWaysTintedText,
                                                                onDemandWaysDiscordSaturation,
                                                                onDemandWaysOsAccentColor
                                                            ] = await DataStore.getMany([
                                                                "onDemandWays",
                                                                "onDemandWaysTintedText",
                                                                "onDemandWaysDiscordSaturation",
                                                                "onDemandWaysOsAccentColor"
                                                            ]);
                                                            if (activeColorwayObject.id === color.name && activeColorwayObject.source === color.source) {
                                                                DataStore.set("activeColorwayObject", { id: null, css: null, sourceType: null, source: null });
                                                                setActiveColorwayObject({ id: null, css: null, sourceType: null, source: null });
                                                                ColorwayCSS.remove();
                                                            } else {
                                                                if (onDemandWays) {
                                                                    const demandedColorway = !color.isGradient ? generateCss(
                                                                        colorToHex(color.primary),
                                                                        colorToHex(color.secondary),
                                                                        colorToHex(color.tertiary),
                                                                        colorToHex(onDemandWaysOsAccentColor ? getComputedStyle(document.body).getPropertyValue("--os-accent-color") : color.accent).slice(0, 6),
                                                                        onDemandWaysTintedText,
                                                                        onDemandWaysDiscordSaturation,
                                                                        undefined,
                                                                        color.name
                                                                    ) : gradientBase(colorToHex(onDemandWaysOsAccentColor ? getComputedStyle(document.body).getPropertyValue("--os-accent-color") : color.accent), onDemandWaysDiscordSaturation) + `:root:root {--custom-theme-background: linear-gradient(${color.linearGradient})}`;
                                                                    ColorwayCSS.set(demandedColorway);
                                                                    setActiveColorwayObject({ id: color.name, css: demandedColorway, sourceType: color.type, source: color.source });
                                                                    DataStore.set("activeColorwayObject", { id: color.name, css: demandedColorway, sourceType: color.type, source: color.source });
                                                                } else {
                                                                    ColorwayCSS.set(color["dc-import"]);
                                                                    setActiveColorwayObject({ id: color.name, css: color["dc-import"], sourceType: color.type, source: color.source });
                                                                    DataStore.set("activeColorwayObject", { id: color.name, css: color["dc-import"], sourceType: color.type, source: color.source });
                                                                }
                                                            }
                                                        }
                                                        if (settings.selectorType === "multiple-selection") {
                                                            setSelectedColorways([...selectedColorways, color]);
                                                        }
                                                    }}
                                                >
                                                    {(viewMode === "list" && settings.selectorType === "normal") && <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24">
                                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                                        {activeColorwayObject.id === color.name && activeColorwayObject.source === color.source && <circle cx="12" cy="12" r="5" className="radioIconForeground-3wH3aU" fill="currentColor" />}
                                                    </svg>}
                                                    <div className="discordColorwayPreviewColorContainer">
                                                        {!color.isGradient ? colors.map((colorItm) => <div
                                                            className="discordColorwayPreviewColor"
                                                            style={{
                                                                backgroundColor: color[colorItm],
                                                            }}
                                                        />) : <div
                                                            className="discordColorwayPreviewColor"
                                                            style={{
                                                                background: `linear-gradient(${color.linearGradient})`,
                                                            }}
                                                        />}
                                                    </div>
                                                    {settings.selectorType === "normal" && <div className="colorwaySelectionCircle">
                                                        {(activeColorwayObject.id === color.name && activeColorwayObject.source === color.source && viewMode === "grid") && <SelectionCircle />}
                                                    </div>}
                                                    {(showLabelsInSelectorGridView || viewMode === "list") && <Text className={"colorwayLabel" + ((showLabelsInSelectorGridView && viewMode === "grid") ? " labelInGrid" : "")}>{color.name}</Text>}
                                                    {settings.selectorType === "normal" && <div
                                                        className="colorwayInfoIconContainer"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            openModal((props) => <ColorwayInfoModal
                                                                modalProps={props}
                                                                colorway={color}
                                                                loadUIProps={loadUI}
                                                            />);
                                                        }}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="20"
                                                            height="20"
                                                            fill="currentColor"
                                                            viewBox="0 0 16 16"
                                                        >
                                                            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                                                        </svg>
                                                    </div>}
                                                    {viewMode === "list" && <>
                                                        <Tooltip text="Copy Colorway CSS">
                                                            {({ onMouseEnter, onMouseLeave }) => <Button
                                                                innerClassName="colorwaysSettings-iconButtonInner"
                                                                size={Button.Sizes.ICON}
                                                                color={Button.Colors.PRIMARY}
                                                                look={Button.Looks.OUTLINED}
                                                                onMouseEnter={onMouseEnter}
                                                                onMouseLeave={onMouseLeave}
                                                                onClick={async e => {
                                                                    e.stopPropagation();
                                                                    Clipboard.copy(color["dc-import"]);
                                                                    Toasts.show({
                                                                        message: "Copied Colorway CSS Successfully",
                                                                        type: 1,
                                                                        id: "copy-colorway-css-notify",
                                                                    });
                                                                }}
                                                            >
                                                                <CodeIcon width={20} height={20} />
                                                            </Button>}</Tooltip>
                                                        <Tooltip text="Copy Colorway ID">
                                                            {({ onMouseEnter, onMouseLeave }) => <Button
                                                                innerClassName="colorwaysSettings-iconButtonInner"
                                                                size={Button.Sizes.ICON}
                                                                color={Button.Colors.PRIMARY}
                                                                look={Button.Looks.OUTLINED}
                                                                onMouseEnter={onMouseEnter}
                                                                onMouseLeave={onMouseLeave}
                                                                onClick={async e => {
                                                                    e.stopPropagation();
                                                                    const colorwayIDArray = `${color.accent},${color.primary},${color.secondary},${color.tertiary}|n:${color.name}${color.preset ? `|p:${color.preset}` : ""}`;
                                                                    const colorwayID = stringToHex(colorwayIDArray);
                                                                    Clipboard.copy(colorwayID);
                                                                    Toasts.show({
                                                                        message: "Copied Colorway ID Successfully",
                                                                        type: 1,
                                                                        id: "copy-colorway-id-notify",
                                                                    });
                                                                }}
                                                            >
                                                                <IDIcon width={20} height={20} />
                                                            </Button>}
                                                        </Tooltip>
                                                        {(color.sourceType === "offline" && settings.selectorType !== "preview") && <Tooltip text="Delete Colorway">
                                                            {({ onMouseEnter, onMouseLeave }) => <Button
                                                                innerClassName="colorwaysSettings-iconButtonInner"
                                                                size={Button.Sizes.ICON}
                                                                color={Button.Colors.RED}
                                                                look={Button.Looks.OUTLINED}
                                                                onMouseEnter={onMouseEnter}
                                                                onMouseLeave={onMouseLeave}
                                                                onClick={async e => {
                                                                    e.stopPropagation();
                                                                    const oldStores = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).filter(sourcee => sourcee.name !== color.source);
                                                                    const storeToModify = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).filter(sourcee => sourcee.name === color.source)[0];
                                                                    const newStore = { name: storeToModify.name, colorways: storeToModify.colorways.filter(colorway => colorway.name !== color.name) };
                                                                    DataStore.set("customColorways", [...oldStores, newStore]);
                                                                    setCustomColorwayData([...oldStores, newStore].map((colorSrc: { name: string, colorways: Colorway[], id?: string; }) =>
                                                                        ({ type: "offline", source: colorSrc.name, colorways: colorSrc.colorways })));
                                                                    if ((await DataStore.get("activeColorwayObject")).id === color.name) {
                                                                        DataStore.set("activeColorwayObject", { id: null, css: null, sourceType: null, source: null });
                                                                        setActiveColorwayObject({ id: null, css: null, sourceType: null, source: null });
                                                                        ColorwayCSS.remove();
                                                                    }
                                                                }}
                                                            >
                                                                <DeleteIcon width={20} height={20} />
                                                            </Button>}
                                                        </Tooltip>}
                                                    </>}
                                                </div>
                                            );
                                        }}
                                    </Tooltip> : <></>
                                );
                            })
                    )}
                </ScrollerThin>
                {settings.selectorType === "multiple-selection" && <>
                    <Forms.FormTitle style={{ marginTop: "8px" }}>Selected</Forms.FormTitle>
                    <ScrollerThin style={{ maxHeight: "50%" }} className={"ColorwaySelectorWrapper " + (viewMode === "grid" ? "ColorwaySelectorWrapper-grid" : "ColorwaySelectorWrapper-list") + (showLabelsInSelectorGridView ? " colorwaySelector-gridWithLabels" : "")}>
                        {selectedColorways.map((color: Colorway, i: number) => {
                            const colors: string[] = color.colors || [
                                "accent",
                                "primary",
                                "secondary",
                                "tertiary",
                            ];
                            return <Tooltip text={color.name}>
                                {({ onMouseEnter, onMouseLeave }) => {
                                    return (
                                        <div
                                            className={viewMode === "grid" ? "discordColorway" : `${radioBarItem} ${radioBarItemFilled} discordColorway-listItem`}
                                            id={"colorway-" + color.name}
                                            onMouseEnter={viewMode === "grid" ? onMouseEnter : () => { }}
                                            onMouseLeave={viewMode === "grid" ? onMouseLeave : () => { }}
                                            aria-checked={activeColorwayObject.id === color.name && activeColorwayObject.source === color.source}
                                            onClick={() => setSelectedColorways(selectedColorways.filter((colorway, ii) => ii !== i))}
                                        >
                                            {viewMode === "list" && <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                                                {activeColorwayObject.id === color.name && activeColorwayObject.source === color.source && <circle cx="12" cy="12" r="5" className="radioIconForeground-3wH3aU" fill="currentColor" />}
                                            </svg>}
                                            <div className="discordColorwayPreviewColorContainer">
                                                {!color.isGradient ? colors.map((colorItm) => <div
                                                    className="discordColorwayPreviewColor"
                                                    style={{
                                                        backgroundColor: color[colorItm],
                                                    }}
                                                />) : <div
                                                    className="discordColorwayPreviewColor"
                                                    style={{
                                                        background: `linear-gradient(${color.linearGradient})`,
                                                    }}
                                                />}
                                            </div>
                                            <div className="colorwaySelectionCircle">
                                                {(activeColorwayObject.id === color.name && activeColorwayObject.source === color.source && viewMode === "grid") && <SelectionCircle />}
                                            </div>
                                            {(showLabelsInSelectorGridView || viewMode === "list") && <Text className={"colorwayLabel" + ((showLabelsInSelectorGridView && viewMode === "grid") ? " labelInGrid" : "")}>{color.name}</Text>}
                                            {viewMode === "list" && <>
                                                <Tooltip text="Copy Colorway CSS">
                                                    {({ onMouseEnter, onMouseLeave }) => <Button
                                                        innerClassName="colorwaysSettings-iconButtonInner"
                                                        size={Button.Sizes.ICON}
                                                        color={Button.Colors.PRIMARY}
                                                        look={Button.Looks.OUTLINED}
                                                        onMouseEnter={onMouseEnter}
                                                        onMouseLeave={onMouseLeave}
                                                        onClick={async e => {
                                                            e.stopPropagation();
                                                            Clipboard.copy(color["dc-import"]);
                                                            Toasts.show({
                                                                message: "Copied Colorway CSS Successfully",
                                                                type: 1,
                                                                id: "copy-colorway-css-notify",
                                                            });
                                                        }}
                                                    >
                                                        <CodeIcon width={20} height={20} />
                                                    </Button>}</Tooltip>
                                                <Tooltip text="Copy Colorway ID">
                                                    {({ onMouseEnter, onMouseLeave }) => <Button
                                                        innerClassName="colorwaysSettings-iconButtonInner"
                                                        size={Button.Sizes.ICON}
                                                        color={Button.Colors.PRIMARY}
                                                        look={Button.Looks.OUTLINED}
                                                        onMouseEnter={onMouseEnter}
                                                        onMouseLeave={onMouseLeave}
                                                        onClick={async e => {
                                                            e.stopPropagation();
                                                            const colorwayIDArray = `${color.accent},${color.primary},${color.secondary},${color.tertiary}|n:${color.name}${color.preset ? `|p:${color.preset}` : ""}`;
                                                            const colorwayID = stringToHex(colorwayIDArray);
                                                            Clipboard.copy(colorwayID);
                                                            Toasts.show({
                                                                message: "Copied Colorway ID Successfully",
                                                                type: 1,
                                                                id: "copy-colorway-id-notify",
                                                            });
                                                        }}
                                                    >
                                                        <IDIcon width={20} height={20} />
                                                    </Button>}
                                                </Tooltip>
                                            </>}
                                        </div>
                                    );
                                }}
                            </Tooltip>;
                        })}
                    </ScrollerThin>
                </>}
            </SelectorContent>
            {(!isSettings && settings.selectorType !== "preview") ? <ModalFooter>
                <Button
                    size={Button.Sizes.MEDIUM}
                    color={Button.Colors.PRIMARY}
                    look={Button.Looks.OUTLINED}
                    style={{ marginLeft: "8px" }}
                    onClick={() => {
                        SettingsRouter.open("ColorwaysSettings");
                        modalProps.onClose();
                    }}
                >
                    Settings
                </Button>
                <Button
                    size={Button.Sizes.MEDIUM}
                    color={Button.Colors.PRIMARY}
                    look={Button.Looks.OUTLINED}
                    onClick={() => modalProps.onClose()}
                >
                    Close
                </Button>
                <Select
                    className={"colorwaySelector-sources " + ButtonLooks.OUTLINED}
                    look={1}
                    popoutClassName="colorwaySelector-sourceSelect"
                    options={filters.map(filter => { return { label: filter.name, value: (filter.id as string) }; })}
                    select={value => setVisibleSources(value)}
                    isSelected={value => visibleSources === value}
                    serialize={String}
                    popoutPosition="top" />
            </ModalFooter> : <></>}
        </SelectorContainer >
    );
}
