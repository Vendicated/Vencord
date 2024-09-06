/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore, FluxDispatcher, FluxEvents, ReactNode, Toasts } from "..";
import { openModal, useEffect, useState } from "../";
import { ColorwayCSS } from "../colorwaysAPI";
import { nullColorwayObj } from "../constants";
import { generateCss, getAutoPresets, getPreset, gradientBase, gradientPresetIds } from "../css";
import { Colorway, ColorwayObject, ModalProps, SortOptions, SourceObject } from "../types";
import { colorToHex, getHex, stringToHex } from "../utils";
import { hasManagerRole, requestManagerRole, sendColorway, updateRemoteSources, wsOpen } from "../wsClient";
import AutoColorwaySelector from "./AutoColorwaySelector";
import CreatorModal from "./CreatorModal";
import FiltersMenu from "./FiltersMenu";
import { DeleteIcon, IDIcon, PalleteIcon, PlusIcon } from "./Icons";
import InfoModal from "./InfoModal";
import ReloadButton from "./ReloadButton";
import SourcesMenu from "./SourcesMenu";
import UseRepainterThemeModal from "./UseRepainterThemeModal";

export default function ({
    settings = { selectorType: "normal" },
    hasTheme = false
}: {
    settings?: { selectorType: "preview" | "multiple-selection" | "normal", previewSource?: string, onSelected?: (colorways: Colorway[]) => void; };
    hasTheme?: boolean;
}) {
    const [colorwayData, setColorwayData] = useState<SourceObject[]>([]);
    const [searchValue, setSearchValue] = useState<string>("");
    const [sortBy, setSortBy] = useState<SortOptions>(SortOptions.NAME_AZ);
    const [activeColorwayObject, setActiveColorwayObject] = useState<ColorwayObject>(nullColorwayObj);
    const [customColorwayData, setCustomColorwayData] = useState<SourceObject[]>([]);
    const [loaderHeight, setLoaderHeight] = useState<"2px" | "0px">("2px");
    const [visibleSources, setVisibleSources] = useState<string>("all");
    const [selectedColorways, setSelectedColorways] = useState<Colorway[]>([]);
    const [errorCode, setErrorCode] = useState<number>(0);
    const [wsConnected, setWsConnected] = useState(wsOpen);
    const [theme, setTheme] = useState("discord");
    const [isManager, setManager] = useState<boolean>(hasManagerRole);

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();

        FluxDispatcher.subscribe("COLORWAYS_UPDATE_WS_CONNECTED" as FluxEvents, ({ isConnected }) => setWsConnected(isConnected));
        FluxDispatcher.subscribe("COLORWAYS_UPDATE_ACTIVE_COLORWAY" as FluxEvents, ({ active }) => setActiveColorwayObject(active));
        FluxDispatcher.subscribe("COLORWAYS_UPDATE_WS_MANAGER_ROLE" as FluxEvents, ({ isManager }) => setManager(isManager));

        return () => {
            FluxDispatcher.unsubscribe("COLORWAYS_UPDATE_WS_CONNECTED" as FluxEvents, ({ isConnected }) => setWsConnected(isConnected));
            FluxDispatcher.unsubscribe("COLORWAYS_UPDATE_ACTIVE_COLORWAY" as FluxEvents, ({ active }) => setActiveColorwayObject(active));
            FluxDispatcher.unsubscribe("COLORWAYS_UPDATE_WS_MANAGER_ROLE" as FluxEvents, ({ isManager }) => setManager(isManager));
        };
    }, [isManager]);

    const filters = [
        {
            name: "All",
            id: "all",
            sources: [...colorwayData, ...customColorwayData]
        },
        ...colorwayData.map(source => ({
            name: source.source,
            id: source.source.toLowerCase().replaceAll(" ", "-"),
            sources: [source]
        })),
        ...customColorwayData.map(source => ({
            name: source.source,
            id: source.source.toLowerCase().replaceAll(" ", "-"),
            sources: [source]
        }))
    ];

    async function loadUI(force?: boolean) {
        setActiveColorwayObject(await DataStore.get("activeColorwayObject") as ColorwayObject);
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
                onlineSources.map(source =>
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

    function Header({ children }: { children: ReactNode; }) {
        if (hasTheme) return <div className="colorwayModal-selectorHeader" data-theme={theme}>{children}</div>;
        else return <div className="colorwayModal-selectorHeader">{children}</div>;
    }

    function Container({ children }: { children: ReactNode; }) {
        if (hasTheme) return <div style={{ maxHeight: settings.selectorType === "multiple-selection" ? "50%" : "unset" }} className="ColorwaySelectorWrapper" data-theme={theme}>{children}</div>;
        else return <div style={{ maxHeight: settings.selectorType === "multiple-selection" ? "50%" : "unset" }} className="ColorwaySelectorWrapper">{children}</div>;
    }

    return <><Header>
        <input
            type="text"
            className="colorwayTextBox"
            placeholder="Search for Colorways..."
            value={searchValue}
            autoFocus
            onInput={({ currentTarget: { value } }) => setSearchValue(value)}
        />
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <ReloadButton onClick={() => {
                setLoaderHeight("2px");
                loadUI().then(() => setLoaderHeight("0px"));
            }} onForceReload={() => {
                setLoaderHeight("2px");
                loadUI(true).then(() => setLoaderHeight("0px"));
            }} />
            <button
                className="colorwaysPillButton"
                onClick={() => {
                    openModal(props => <CreatorModal
                        modalProps={props}
                        loadUIProps={loadUI}
                    />);
                }}
            >
                <PlusIcon width={14} height={14} style={{ boxSizing: "content-box" }} />
                Create
            </button>
            <button
                className="colorwaysPillButton"
                id="colorway-userepaintertheme"
                onClick={() => {
                    openModal(props => <UseRepainterThemeModal modalProps={props} onFinish={async ({ id, colors }) => {
                        const demandedColorway = generateCss({
                            primary: colors[7].replace("#", ""),
                            secondary: colors[11].replace("#", ""),
                            tertiary: colors[14].replace("#", ""),
                            accent: colors[16].replace("#", "")
                        });
                        ColorwayCSS.set(demandedColorway);
                        const newObj: ColorwayObject = {
                            id: id!,
                            css: demandedColorway,
                            sourceType: "temporary",
                            source: "Repainter",
                            colors: {
                                accent: colors![16],
                                primary: colors![2],
                                secondary: colors![5],
                                tertiary: colors![8]
                            }
                        };
                        DataStore.set("activeColorwayObject", newObj);
                        setActiveColorwayObject(newObj);
                    }} />);
                }}
            >
                <PalleteIcon width={14} height={14} style={{ boxSizing: "content-box" }} />
                Use Repainter theme
            </button>
            <FiltersMenu sort={sortBy} onSortChange={newSort => {
                setSortBy(newSort);
            }} />
            <SourcesMenu source={filters.filter(filter => filter.id == visibleSources)[0]} sources={filters} onSourceChange={sourceId => {
                setVisibleSources(sourceId);
            }} />
        </div>
    </Header>
        {(wsConnected && settings.selectorType == "normal" && !isManager) ? <div className="colorwaysManagerActive">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 16 16" style={{
                transform: "scaleX(1.4) scaleY(0.9)"
            }}>
                <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2m3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2" />
            </svg>
            A manager is controlling colors
            <button
                className="colorwaysPillButton"
                onClick={requestManagerRole}
            >
                Request Manager Role
            </button>
        </div> : <></>}
        <div className="colorwaysLoader-barContainer"><div className="colorwaysLoader-bar" style={{ height: loaderHeight }} /></div>
        <Container>
            {(activeColorwayObject.sourceType === "temporary" && settings.selectorType === "normal" && settings.selectorType === "normal") && <div
                className="discordColorway"
                id="colorway-Temporary"
                aria-checked={activeColorwayObject.id === "Auto" && activeColorwayObject.source === null}
                onClick={async () => {
                    DataStore.set("activeColorwayObject", nullColorwayObj);
                    setActiveColorwayObject(nullColorwayObj);
                    ColorwayCSS.remove();
                }}
            >
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
                <span className="colorwayLabel">Temporary Colorway</span>
                <button
                    className="colorwaysPillButton colorwaysPillButton-onSurface"
                    onClick={async e => {
                        e.stopPropagation();
                        openModal(props => <CreatorModal modalProps={props} colorwayID={`#${colorToHex(getHex(getComputedStyle(document.body).getPropertyValue("--brand-500")))},#${colorToHex(getHex(getComputedStyle(document.body).getPropertyValue("--primary-600")))},#${colorToHex(getHex(getComputedStyle(document.body).getPropertyValue("--primary-630")))},#${colorToHex(getHex(getComputedStyle(document.body).getPropertyValue("--primary-700")))}`} loadUIProps={loadUI} />);
                    }}
                >
                    <PlusIcon width={20} height={20} />
                </button>
            </div>}
            {getComputedStyle(document.body).getPropertyValue("--os-accent-color") && ["all", "official"].includes(visibleSources) && settings.selectorType === "normal" && "auto".includes(searchValue.toLowerCase()) ? <div
                className="discordColorway"
                id="colorway-Auto"
                aria-checked={activeColorwayObject.id === "Auto" && activeColorwayObject.source === null}
                onClick={async () => {
                    const activeAutoPreset = await DataStore.get("activeAutoPreset");
                    if (activeColorwayObject.id === "Auto") {
                        if (isManager) {
                            sendColorway(nullColorwayObj);
                        } else {
                            DataStore.set("activeColorwayObject", nullColorwayObj);
                            setActiveColorwayObject(nullColorwayObj);
                            ColorwayCSS.remove();
                        }
                    } else {
                        if (!activeAutoPreset) {
                            openModal((props: ModalProps) => <AutoColorwaySelector autoColorwayId="" modalProps={props} onChange={autoPresetId => {
                                const { colors } = getAutoPresets(colorToHex(getComputedStyle(document.body).getPropertyValue("--os-accent-color")).slice(0, 6))[autoPresetId];
                                const newObj: ColorwayObject = {
                                    id: "Auto",
                                    sourceType: "online",
                                    source: null,
                                    colors: colors
                                };
                                if (isManager) {
                                    sendColorway(newObj);
                                } else {
                                    ColorwayCSS.set(generateCss(
                                        colors,
                                        true,
                                        true,
                                        undefined,
                                        "Auto Colorway"
                                    ));
                                    DataStore.set("activeColorwayObject", newObj);
                                    setActiveColorwayObject(newObj);
                                }
                            }} />);
                        } else {
                            const { colors } = getAutoPresets(colorToHex(getComputedStyle(document.body).getPropertyValue("--os-accent-color")).slice(0, 6))[activeAutoPreset];
                            const newObj: ColorwayObject = {
                                id: "Auto",
                                sourceType: "online",
                                source: null,
                                colors: colors
                            };
                            if (isManager) {
                                sendColorway(newObj);
                            } else {
                                ColorwayCSS.set(generateCss(
                                    colors,
                                    true,
                                    true,
                                    undefined,
                                    "Auto Colorway"
                                ));
                                DataStore.set("activeColorwayObject", newObj);
                                setActiveColorwayObject(newObj);
                            }
                        }
                    }
                }}
            >
                <div className="discordColorwayPreviewColorContainer" style={{ backgroundColor: "var(--os-accent-color)" }} />
                <span className="colorwayLabel">Auto Colorway</span>
                <button
                    className="colorwaysPillButton colorwaysPillButton-onSurface"
                    onClick={async e => {
                        e.stopPropagation();
                        const activeAutoPreset = await DataStore.get("activeAutoPreset");
                        openModal((props: ModalProps) => <AutoColorwaySelector autoColorwayId={activeAutoPreset} modalProps={props} onChange={autoPresetId => {
                            if (activeColorwayObject.id === "Auto") {
                                const { colors } = getAutoPresets(colorToHex(getComputedStyle(document.body).getPropertyValue("--os-accent-color")).slice(0, 6))[activeAutoPreset];
                                const newObj: ColorwayObject = {
                                    id: "Auto",
                                    sourceType: "online",
                                    source: null,
                                    colors: colors
                                };
                                if (isManager) {
                                    sendColorway(newObj);
                                } else {
                                    DataStore.set("activeColorwayObject", newObj);
                                    setActiveColorwayObject(newObj);

                                    DataStore.get("colorwaysPreset").then((colorwaysPreset: string) => {
                                        if (colorwaysPreset == "default") {
                                            ColorwayCSS.set(generateCss(
                                                colors,
                                                true,
                                                true,
                                                undefined,
                                                newObj.id as string
                                            ));
                                        } else {
                                            if (gradientPresetIds.includes(colorwaysPreset)) {
                                                ColorwayCSS.set((getPreset(colors)[colorwaysPreset].preset as { full: string; }).full);
                                            } else {
                                                ColorwayCSS.set(getPreset(colors)[colorwaysPreset].preset as string);
                                            }
                                        }
                                    });
                                }
                            }
                        }} />);
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" style={{ margin: "4px" }} viewBox="0 0 24 24" fill="currentColor">
                        <path d="M 21.2856,9.6 H 24 v 4.8 H 21.2868 C 20.9976,15.5172 20.52,16.5576 19.878,17.4768 L 21.6,19.2 19.2,21.6 17.478,19.8768 c -0.9216,0.642 -1.9596,1.1208 -3.078,1.4088 V 24 H 9.6 V 21.2856 C 8.4828,20.9976 7.4436,20.5188 6.5232,19.8768 L 4.8,21.6 2.4,19.2 4.1232,17.4768 C 3.4812,16.5588 3.0024,15.5184 2.7144,14.4 H 0 V 9.6 H 2.7144 C 3.0024,8.4816 3.48,7.4424 4.1232,6.5232 L 2.4,4.8 4.8,2.4 6.5232,4.1232 C 7.4424,3.48 8.4816,3.0024 9.6,2.7144 V 0 h 4.8 v 2.7132 c 1.1184,0.2892 2.1564,0.7668 3.078,1.4088 l 1.722,-1.7232 2.4,2.4 -1.7232,1.7244 c 0.642,0.9192 1.1208,1.9596 1.4088,3.0768 z M 12,16.8 c 2.65092,0 4.8,-2.14908 4.8,-4.8 0,-2.650968 -2.14908,-4.8 -4.8,-4.8 -2.650968,0 -4.8,2.149032 -4.8,4.8 0,2.65092 2.149032,4.8 4.8,4.8 z" />
                    </svg>
                </button>
            </div> : <></>}
            {(!getComputedStyle(document.body).getPropertyValue("--os-accent-color") || !["all", "official"].includes(visibleSources)) && !filters.filter(filter => filter.id === visibleSources)[0].sources.map(source => source.colorways).flat().length ? <span style={{
                color: "#fff",
                margin: "auto",
                fontWeight: "bold",
                display: "flex",
                gap: "8px",
                alignItems: "center"
            }}>
                No colorways...
            </span> : <></>}
            {errorCode !== 0 && <span style={{
                color: "#fff",
                margin: "auto",
                fontWeight: "bold",
                display: "flex",
                gap: "8px",
                alignItems: "center"
            }}>
                {errorCode === 1 && "Error: Invalid Colorway Source Format. If this error persists, contact the source author to resolve the issue."}
            </span>}
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
                    .filter(({ name }) => name.toLowerCase().includes(searchValue.toLowerCase()))
                    .map((color: Colorway) => <div
                        className="discordColorway"
                        id={"colorway-" + color.name}
                        aria-checked={activeColorwayObject.id === color.name && activeColorwayObject.source === color.source}
                        onClick={async () => {
                            if (settings.selectorType === "normal") {
                                if (activeColorwayObject.id === color.name && activeColorwayObject.source === color.source) {
                                    if (isManager) {
                                        sendColorway(nullColorwayObj);
                                    } else {
                                        DataStore.set("activeColorwayObject", nullColorwayObj);
                                        setActiveColorwayObject(nullColorwayObj);
                                        ColorwayCSS.remove();
                                    }
                                } else {
                                    const newObj: ColorwayObject = {
                                        id: color.name,
                                        sourceType: color.type,
                                        source: color.source,
                                        colors: {}
                                    } as ColorwayObject;
                                    color.accent ? (newObj.colors.accent = "#" + colorToHex(color.accent)) : void 0;
                                    color.primary ? (newObj.colors.primary = "#" + colorToHex(color.primary)) : void 0;
                                    color.secondary ? (newObj.colors.secondary = "#" + colorToHex(color.secondary)) : void 0;
                                    color.tertiary ? (newObj.colors.tertiary = "#" + colorToHex(color.tertiary)) : void 0;

                                    if (color.linearGradient) newObj.linearGradient = color.linearGradient;
                                    if (isManager) sendColorway(newObj);
                                    else {
                                        setActiveColorwayObject(newObj);
                                        DataStore.set("activeColorwayObject", newObj);

                                        DataStore.get("colorwaysPreset").then((colorwaysPreset: string) => {
                                            if (colorwaysPreset == "default") {
                                                ColorwayCSS.set(generateCss(
                                                    newObj.colors,
                                                    true,
                                                    true,
                                                    undefined,
                                                    newObj.id as string
                                                ));
                                            } else {
                                                if (gradientPresetIds.includes(colorwaysPreset)) {
                                                    const css = Object.keys(newObj).includes("linearGradient")
                                                        ? gradientBase(colorToHex(newObj.colors.accent), true) + `:root:root {--custom-theme-background: linear-gradient(${newObj.linearGradient})}`
                                                        : (getPreset(newObj.colors)[colorwaysPreset].preset as { full: string; }).full;
                                                    ColorwayCSS.set(css);
                                                } else {
                                                    ColorwayCSS.set(getPreset(newObj.colors)[colorwaysPreset].preset as string);
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                            if (settings.selectorType === "multiple-selection") {
                                if (selectedColorways.includes(color)) {
                                    setSelectedColorways(selectedColorways.filter(c => c !== color));
                                } else {
                                    setSelectedColorways([...selectedColorways, color]);
                                }
                            }
                        }}
                    >
                        <div className="discordColorwayPreviewColorContainer">
                            {!color.isGradient ? Object.values({
                                accent: color.accent,
                                primary: color.primary,
                                secondary: color.secondary,
                                tertiary: color.tertiary
                            }).map(colorStr => <div
                                className="discordColorwayPreviewColor"
                                style={{
                                    backgroundColor: `#${colorToHex(colorStr)}`,
                                }}
                            />) : <div
                                className="discordColorwayPreviewColor"
                                style={{
                                    background: `linear-gradient(${color.linearGradient})`,
                                }}
                            />}
                        </div>
                        <span className="colorwayLabel">{color.name}</span>
                        {settings.selectorType === "normal" && <button
                            className="colorwaysPillButton colorwaysPillButton-onSurface"
                            onClick={e => {
                                e.stopPropagation();
                                openModal(props => <InfoModal
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
                        </button>}
                        <button
                            className="colorwaysPillButton colorwaysPillButton-onSurface"
                            onClick={async e => {
                                e.stopPropagation();
                                const colorwayIDArray = `${color.accent},${color.primary},${color.secondary},${color.tertiary}|n:${color.name}${color.preset ? `|p:${color.preset}` : ""}`;
                                const colorwayID = stringToHex(colorwayIDArray);
                                navigator.clipboard.writeText(colorwayID);
                                Toasts.show({
                                    message: "Copied Colorway ID Successfully",
                                    type: 1,
                                    id: "copy-colorway-id-notify",
                                });
                            }}
                        >
                            <IDIcon width={20} height={20} />
                        </button>
                        {(color.sourceType === "offline" && settings.selectorType !== "preview") && <button
                            className="colorwaysPillButton colorwaysPillButton-onSurface"
                            onClick={async e => {
                                e.stopPropagation();
                                const oldStores = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).filter(sourcee => sourcee.name !== color.source);
                                const storeToModify = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).filter(sourcee => sourcee.name === color.source)[0];
                                const newStore = { name: storeToModify.name, colorways: storeToModify.colorways.filter(colorway => colorway.name !== color.name) };
                                DataStore.set("customColorways", [...oldStores, newStore]);
                                setCustomColorwayData([...oldStores, newStore].map((colorSrc: { name: string, colorways: Colorway[], id?: string; }) =>
                                    ({ type: "offline", source: colorSrc.name, colorways: colorSrc.colorways })));
                                if ((await DataStore.get("activeColorwayObject")).id === color.name) {
                                    DataStore.set("activeColorwayObject", nullColorwayObj);
                                    setActiveColorwayObject(nullColorwayObj);
                                    ColorwayCSS.remove();
                                }
                                updateRemoteSources();
                            }}
                        >
                            <DeleteIcon width={20} height={20} />
                        </button>}
                    </div>)
            )}
        </Container>
    </>;
}
