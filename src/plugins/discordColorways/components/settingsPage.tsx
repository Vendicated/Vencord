/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { CloseIcon } from "@components/Icons";
import { SettingsTab } from "@components/VencordSettings/shared";
import { ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import {
    Button,
    FluxDispatcher,
    Forms,
    Switch,
    Text,
    TextInput,
    useCallback,
    useEffect,
    useState
} from "@webpack/common";
import { FluxEvents } from "@webpack/types";
import { Plugins } from "Vencord";

import { fallbackColorways } from "../constants";
import { Colorway } from "../types";

export function SettingsPage() {
    const [colorways, setColorways] = useState<Colorway[]>([]);
    const [customColorways, setCustomColorways] = useState<Colorway[]>([]);
    const [colorwaySourceFiles, setColorwaySourceFiles] = useState<string[]>();
    const [colorsButtonVisibility, setColorsButtonVisibility] = useState<boolean>(false);
    const [colorsButtonPos, setColorsButtonPos] = useState<string>("bottom");
    const [onDemand, setOnDemand] = useState<boolean>(false);
    const [onDemandTinted, setOnDemandTinted] = useState<boolean>(false);
    const [isButtonThin, setIsButtonThin] = useState<boolean>(false);
    const [onDemandDiscordSat, setOnDemandDiscordSat] = useState<boolean>(false);

    async function loadUI() {
        const colorwaySourceFiles = await DataStore.get(
            "colorwaySourceFiles"
        );
        const responses: Response[] = await Promise.all(
            colorwaySourceFiles.map((url: string) =>
                fetch(url)
            )
        );
        const data = await Promise.all(
            responses.map((res: Response) =>
                res.json().catch(() => { return { colorways: [] }; })
            ));
        const colorways = data.flatMap(json => json.colorways);
        const [
            customColorways,
            colorwaySourceFiless,
            showColorwaysButton,
            colorwaysBtnPos,
            onDemandWays,
            onDemandWaysTintedText,
            useThinMenuButton,
            onDemandWaysDiscordSaturation
        ] = await DataStore.getMany([
            "customColorways",
            "colorwaySourceFiles",
            "showColorwaysButton",
            "colorwaysBtnPos",
            "onDemandWays",
            "onDemandWaysTintedText",
            "useThinMenuButton",
            "onDemandWaysDiscordSaturation"
        ]);
        setColorways(colorways || fallbackColorways);
        setCustomColorways(customColorways);
        setColorwaySourceFiles(colorwaySourceFiless);
        setColorsButtonVisibility(showColorwaysButton);
        setColorsButtonPos(colorwaysBtnPos);
        setOnDemand(onDemandWays);
        setOnDemandTinted(onDemandWaysTintedText);
        setIsButtonThin(useThinMenuButton);
        setOnDemandDiscordSat(onDemandWaysDiscordSaturation);
    }

    const cached_loadUI = useCallback(loadUI, []);

    useEffect(() => {
        cached_loadUI();
    }, []);

    return <SettingsTab title="Settings">
        <div className="colorwaysSettingsPage-wrapper">
            <Forms.FormTitle>
                Colorways Source Files:
            </Forms.FormTitle>
            <div className="colorwaysSettings-colorwaySources">
                <div className="colorwaysSettings-colorwaySourceActions">
                    <Button
                        className="colorwaysSettings-colorwaySourceAction"
                        innerClassName="colorwaysSettings-iconButtonInner"
                        size={Button.Sizes.SMALL}
                        color={Button.Colors.TRANSPARENT}
                        onClick={() => {
                            openModal(props => {
                                var colorwaySource = "";
                                return <ModalRoot {...props}>
                                    <ModalHeader>
                                        <Text variant="heading-lg/semibold" tag="h1">
                                            Add a source:
                                        </Text>
                                    </ModalHeader>
                                    <ModalContent>
                                        <TextInput
                                            placeholder="Enter a valid URL..."
                                            onChange={e => colorwaySource = e}
                                        />
                                    </ModalContent>
                                    <ModalFooter>
                                        <Button
                                            style={{ marginLeft: 8 }}
                                            color={Button.Colors.BRAND}
                                            size={Button.Sizes.MEDIUM}
                                            look={Button.Looks.FILLED}
                                            onClick={async () => {
                                                var sourcesArr: string[] = [];
                                                const colorwaySourceFilesArr = await DataStore.get("colorwaySourceFiles");
                                                colorwaySourceFilesArr.map((source: string) => sourcesArr.push(source));
                                                if (colorwaySource !== "https://raw.githubusercontent.com/DaBluLite/DiscordColorways/master/index.json") {
                                                    sourcesArr.push(colorwaySource);
                                                }
                                                DataStore.set("colorwaySourceFiles", sourcesArr);
                                                setColorwaySourceFiles(sourcesArr);
                                                props.onClose();
                                            }}
                                        >
                                            Finish
                                        </Button>
                                        <Button
                                            style={{ marginLeft: 8 }}
                                            color={Button.Colors.PRIMARY}
                                            size={Button.Sizes.MEDIUM}
                                            look={Button.Looks.FILLED}
                                            onClick={() => props.onClose()}
                                        >
                                            Cancel
                                        </Button>
                                    </ModalFooter>
                                </ModalRoot>;
                            });
                        }}>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden="true"
                            role="img"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M20 11.1111H12.8889V4H11.1111V11.1111H4V12.8889H11.1111V20H12.8889V12.8889H20V11.1111Z"
                            />
                        </svg>
                        Add a source...
                    </Button>
                </div>
                {colorwaySourceFiles?.map((colorwaySourceFile: string) => {
                    return <div className="colorwaysSettings-colorwaySource">
                        <Text className="colorwaysSettings-colorwaySourceLabel">
                            {colorwaySourceFile}
                        </Text>
                        {colorwaySourceFile !== "https://raw.githubusercontent.com/DaBluLite/DiscordColorways/master/index.json"
                            ? <Button
                                innerClassName="colorwaysSettings-iconButtonInner"
                                className="colorwaysSettings-iconButton"
                                size={Button.Sizes.ICON}
                                color={Button.Colors.TRANSPARENT}
                                onClick={async () => {
                                    var sourcesArr: string[] = [];
                                    const colorwaySourceFilesArr = await DataStore.get("colorwaySourceFiles");
                                    colorwaySourceFilesArr.map((source: string) => {
                                        if (source !== colorwaySourceFile) {
                                            sourcesArr.push(source);
                                        }
                                    });
                                    DataStore.set("colorwaySourceFiles", sourcesArr);
                                    setColorwaySourceFiles(sourcesArr);
                                }}
                            >
                                <CloseIcon />
                            </Button> : <></>}
                    </div>;
                })}
            </div>
            <div className="colorwaysSettingsPage-divider" />
            <Forms.FormTitle>
                Colorways Button:
            </Forms.FormTitle>
            <div className="colorwaysSettingsPage-settingsGroup">
                <div className="colorwaysSettingsPage-settingsRow" onClick={async () => {
                    setColorsButtonVisibility(!colorsButtonVisibility);
                    const showColorwaysButton = await DataStore.get("showColorwaysButton");
                    DataStore.set("showColorwaysButton", !showColorwaysButton);
                    FluxDispatcher.dispatch({
                        type: "COLORWAYS_UPDATE_BUTTON_VISIBILITY" as FluxEvents,
                        isVisible: !colorsButtonVisibility
                    });
                }}><label className="colorwaysSettings-label">Show Colorways button in Servers List</label>
                    <Switch style={{ marginBottom: 0 }} hideBorder value={colorsButtonVisibility} onChange={(e: boolean) => {
                        setColorsButtonVisibility(e);
                        DataStore.set("showColorwaysButton", e);
                        FluxDispatcher.dispatch({
                            type: "COLORWAYS_UPDATE_BUTTON_VISIBILITY" as FluxEvents,
                            isVisible: e
                        });
                    }} />
                </div>
                <div className="colorwaysSettingsPage-settingsRow" onClick={async () => {
                    setIsButtonThin(!isButtonThin);
                    const useThinMenuButton = await DataStore.get("useThinMenuButton");
                    DataStore.set("useThinMenuButton", !useThinMenuButton);
                    FluxDispatcher.dispatch({
                        type: "COLORWAYS_UPDATE_BUTTON_HEIGHT" as FluxEvents,
                        isTall: !isButtonThin
                    });
                }}><label className="colorwaysSettings-label">Use thin menu button</label>
                    <Switch style={{ marginBottom: 0 }} hideBorder value={isButtonThin} onChange={(e: boolean) => {
                        setIsButtonThin(e);
                        DataStore.set("useThinMenuButton", e);
                        FluxDispatcher.dispatch({
                            type: "COLORWAYS_UPDATE_BUTTON_HEIGHT" as FluxEvents,
                            isTall: e
                        });
                    }} />
                </div>
                {/*
                <div className="colorwaysSettingsPage-settingsRow">
                    <label className="colorwaysSettings-label">Colorways button position</label>
                    <Select options={[{
                        value: "bottom",
                        label: "Bottom"
                    },
                    {
                        value: "top",
                        label: "Top"
                    }]} select={value => {
                        setColorsButtonPos(value);
                        DataStore.set("colorwaysBtnPos", value);
                    }} isSelected={value => colorsButtonPos === value} serialize={String}/>
                </div>
                */}
            </div>
            <div className="colorwaysSettingsPage-divider" />
            <Forms.FormTitle>
                OnDemandWays:
            </Forms.FormTitle>
            <div className="colorwaysSettingsPage-settingsGroup">
                <div className="colorwaysSettingsPage-settingsRowWithDescription">
                    <div className="colorwaysSettingsPage-settingsRow" onClick={async () => {
                        setOnDemand(!onDemand);
                        const showColorwaysButton = await DataStore.get("onDemandWays");
                        DataStore.set("onDemandWays", !onDemand);
                    }}><label className="colorwaysSettings-label">Enable OnDemandWays</label>
                        <Switch style={{ marginBottom: 0 }} hideBorder value={onDemand} onChange={(e: boolean) => {
                            setOnDemand(e);
                            DataStore.set("onDemandWays", e);
                        }} />
                    </div>
                    <Forms.FormText type="DESCRIPTION" style={{ marginTop: 8 }}>Always utilise the latest of what Colorways has to offer. CSS is being directly generated on the device and gets applied in the place of the normal import/CSS given by the colorway.</Forms.FormText>
                </div>
                <div className="colorwaysSettingsPage-settingsRow" onClick={async () => {
                    setOnDemandTinted(!onDemandTinted);
                    DataStore.set("onDemandWaysTintedText", !onDemandTinted);
                }}><label className="colorwaysSettings-label">Use tinted text</label>
                    <Switch style={{ marginBottom: 0 }} hideBorder value={onDemandTinted} onChange={(e: boolean) => {
                        setOnDemandTinted(e);
                        DataStore.set("onDemandWaysTintedText", e);
                    }} />
                </div>
                <div className="colorwaysSettingsPage-settingsRow" onClick={async () => {
                    setOnDemandDiscordSat(!onDemandDiscordSat);
                    DataStore.set("onDemandWaysDiscordSaturation", !onDemandDiscordSat);
                }}><label className="colorwaysSettings-label">Use Discord's saturation</label>
                    <Switch style={{ marginBottom: 0 }} hideBorder value={onDemandDiscordSat} onChange={(e: boolean) => {
                        setOnDemandDiscordSat(e);
                        DataStore.set("onDemandWaysDiscordSaturation", e);
                    }} />
                </div>
            </div>
            <div className="colorwaysSettingsPage-divider" />
            <div className="colorwaysSettingsSelector-infoWrapper">
                <div className="colorwaysSelector-infoRow">
                    <Forms.FormTitle style={{ marginBottom: 0 }}>
                        Plugin Name:
                    </Forms.FormTitle>
                    <Text
                        variant="text-xs/normal"
                        style={{
                            color: "var(--text-muted)",
                            fontWeight: 500,
                            fontSize: "14px",
                        }}
                    >
                        Discord Colorways
                    </Text>
                </div>
                <div className="colorwaysSelector-infoRow">
                    <Forms.FormTitle style={{ marginBottom: 0 }}>
                        Plugin Version:
                    </Forms.FormTitle>
                    <Text
                        variant="text-xs/normal"
                        style={{
                            color: "var(--text-muted)",
                            fontWeight: 500,
                            fontSize: "14px",
                        }}
                    >
                        {
                            (
                                Plugins.plugins
                                    .DiscordColorways as any
                            ).pluginVersion
                        }
                    </Text>
                </div>
                <div className="colorwaysSelector-infoRow">
                    <Forms.FormTitle style={{ marginBottom: 0 }}>
                        Creator Version:
                    </Forms.FormTitle>
                    <Text
                        variant="text-xs/normal"
                        style={{
                            color: "var(--text-muted)",
                            fontWeight: 500,
                            fontSize: "14px",
                        }}
                    >
                        {
                            (
                                Plugins.plugins
                                    .DiscordColorways as any
                            ).creatorVersion
                        }{" "}
                        (Stable)
                    </Text>
                </div>
                <div className="colorwaysSelector-infoRow">
                    <Forms.FormTitle style={{ marginBottom: 0 }}>
                        Loaded Colorways:
                    </Forms.FormTitle>
                    <Text
                        variant="text-xs/normal"
                        style={{
                            color: "var(--text-muted)",
                            fontWeight: 500,
                            fontSize: "14px",
                        }}
                    >
                        {[...colorways, ...customColorways].length}
                    </Text>
                </div>
            </div>
        </div>
    </SettingsTab>;
}
