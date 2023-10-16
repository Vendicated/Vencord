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
    Clipboard,
    Forms,
    Switch,
    Text,
    TextInput,
    Toasts,
    useCallback,
    useEffect,
    useState
} from "@webpack/common";
import { Plugins } from "Vencord";

import { fallbackColorways } from "../constants";
import { Colorway } from "../types";
import { ColorPickerModal, ColorStealerModal } from "./colorPicker";

interface ToolboxItem {
    title: string;
    onClick: () => void;
    id?: string;
    iconClassName?: string;
}

const ToolboxItems: ToolboxItem[] = [
    {
        title: "Color Picker",
        onClick: () => {
            openModal(props => <ColorPickerModal modalProps={props} />);
        },
        id: "colorways-toolbox_colorpicker",
        iconClassName: "palette",
    },
    {
        title: "Copy Accent Color",
        onClick: () => {
            function getHex(str: string): string {
                return Object.assign(
                    document.createElement("canvas").getContext("2d") as {},
                    { fillStyle: str }
                ).fillStyle;
            }
            Clipboard.copy(
                getHex(
                    getComputedStyle(document.body).getPropertyValue(
                        "--brand-experiment"
                    )
                )
            );
            Toasts.show({
                message: "Accent color copied to clipboard",
                id: "toolbox-accent-color-copied",
                type: 1,
            });
        },
        id: "colorways-toolbox_copy-accent",
        iconClassName: "copy",
    },
    {
        title: "Copy Primary Color",
        onClick: () => {
            function getHex(str: string): string {
                return Object.assign(
                    document.createElement("canvas").getContext("2d") as {},
                    { fillStyle: str }
                ).fillStyle;
            }
            Clipboard.copy(
                getHex(
                    getComputedStyle(document.body).getPropertyValue(
                        "--background-primary"
                    )
                )
            );
            Toasts.show({
                message: "Primary color copied to clipboard",
                id: "toolbox-primary-color-copied",
                type: 1,
            });
        },
        id: "colorways-toolbox_copy-primary",
        iconClassName: "copy",
    },
    {
        title: "Copy Secondary Color",
        onClick: () => {
            function getHex(str: string): string {
                return Object.assign(
                    document.createElement("canvas").getContext("2d") as {},
                    { fillStyle: str }
                ).fillStyle;
            }
            Clipboard.copy(
                getHex(
                    getComputedStyle(document.body).getPropertyValue(
                        "--background-secondary"
                    )
                )
            );
            Toasts.show({
                message: "Secondary color copied to clipboard",
                id: "toolbox-secondary-color-copied",
                type: 1,
            });
        },
        id: "colorways-toolbox_copy-secondary",
        iconClassName: "copy",
    },
    {
        title: "Copy Tertiary Color",
        onClick: () => {
            function getHex(str: string): string {
                return Object.assign(
                    document.createElement("canvas").getContext("2d") as {},
                    { fillStyle: str }
                ).fillStyle;
            }
            Clipboard.copy(
                getHex(
                    getComputedStyle(document.body).getPropertyValue(
                        "--background-tertiary"
                    )
                )
            );
            Toasts.show({
                message: "Tertiary color copied to clipboard",
                id: "toolbox-tertiary-color-copied",
                type: 1,
            });
        },
        id: "colorways-toolbox_copy-tertiary",
        iconClassName: "copy",
    },
    {
        title: "Copy Other Colors",
        onClick: () =>
            openModal(props => <ColorStealerModal modalProps={props} />),
        id: "colorways-toolbox_copy-other",
        iconClassName: "copy",
    },
];

export function SettingsPage() {
    const [colorways, setColorways] = useState<Colorway[]>([]);
    const [customColorways, setCustomColorways] = useState<Colorway[]>([]);
    const [colorwaySourceFiles, setColorwaySourceFiles] = useState<string[]>();
    const [colorsButtonVisibility, setColorsButtonVisibility] = useState<boolean>(false);

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
        const baseData = await DataStore.getMany([
            "customColorways",
            "colorwaySourceFiles",
            "showColorwaysButton"
        ]);
        setColorways(colorways || fallbackColorways);
        setCustomColorways(baseData[0]);
        setColorwaySourceFiles(baseData[1]);
        setColorsButtonVisibility(baseData[2]);
    }

    const cached_loadUI = useCallback(loadUI, [setColorways, setCustomColorways]);

    useEffect(() => {
        cached_loadUI();
    }, []);

    return <SettingsTab title="Settings & Tools">
        <div className="colorwaysSettingsPage-wrapper">
            <div className="colorwaysSettingsPage-settingsRow" onClick={async () => {
                setColorsButtonVisibility(!colorsButtonVisibility);
                const showColorwaysButton = await DataStore.get("showColorwaysButton");
                DataStore.set("showColorwaysButton", !showColorwaysButton);
            }}><label className="colorwaysSettings-label">Show Colorways button in Servers List</label>
                <Switch style={{ marginBottom: 0 }} hideBorder value={colorsButtonVisibility} onChange={(e: boolean) => {
                    setColorsButtonVisibility(e);
                    DataStore.set("showColorwaysButton", e);
                }}></Switch></div>
            <div className="colorwaysSettingsPage-divider" />
            <Forms.FormTitle>
                Colorways Source Files:
            </Forms.FormTitle>
            <div className="colorwaysSettings-colorwaySources">
                <div className="colorwaysSettings-colorwaySourceActions">
                    <Button className="colorwaysSettings-colorwaySourceAction" innerClassName="colorwaysSettings-iconButtonInner" size={Button.Sizes.SMALL} color={Button.Colors.TRANSPARENT} onClick={() => {
                        openModal(props => {
                            var colorwaySource = "";
                            return <ModalRoot {...props}>
                                <ModalHeader>
                                    <Text variant="heading-lg/semibold" tag="h1">
                                        Add a source:
                                    </Text>
                                </ModalHeader>
                                <ModalContent><TextInput placeholder="Enter a valid URL..." onChange={e => colorwaySource = e} /></ModalContent>
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
                        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="14" height="14" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M20 11.1111H12.8889V4H11.1111V11.1111H4V12.8889H11.1111V20H12.8889V12.8889H20V11.1111Z" />
                        </svg>
                        Add a source...
                    </Button>
                </div>
                {colorwaySourceFiles?.map((colorwaySourceFile: string) => {
                    return <div className="colorwaysSettings-colorwaySource">
                        <Text className="colorwaysSettings-colorwaySourceLabel">
                            {colorwaySourceFile}
                        </Text>
                        {colorwaySourceFile !== "https://raw.githubusercontent.com/DaBluLite/DiscordColorways/master/index.json" ? <Button innerClassName="colorwaysSettings-iconButtonInner" className="colorwaysSettings-iconButton" size={Button.Sizes.ICON} color={Button.Colors.TRANSPARENT} onClick={async () => {
                            var sourcesArr: string[] = [];
                            const colorwaySourceFilesArr = await DataStore.get("colorwaySourceFiles");
                            colorwaySourceFilesArr.map((source: string) => {
                                if (source !== colorwaySourceFile) {
                                    sourcesArr.push(source);
                                }
                            });
                            DataStore.set("colorwaySourceFiles", sourcesArr);
                            setColorwaySourceFiles(sourcesArr);
                        }}><CloseIcon /></Button> : <></>}
                    </div>;
                })}
            </div>
            <div className="colorwaysSettingsPage-divider" />
            <Forms.FormTitle>
                Tools:
            </Forms.FormTitle>
            <div className="colorwayToolbox-itemList">
                {ToolboxItems.map(
                    (
                        toolboxItem: ToolboxItem,
                        i: number
                    ) => {
                        return (
                            <div
                                id={
                                    toolboxItem.id ||
                                    "colorways-toolbox_item-" +
                                    i
                                }
                                className="colorwayToolbox-listItem"
                                onClick={
                                    toolboxItem.onClick
                                }
                            >
                                <i
                                    className={
                                        "bi bi-" +
                                        (toolboxItem.iconClassName ||
                                            "question-circle")
                                    }
                                ></i>
                                <span className="colorwaysToolbox-label">
                                    {toolboxItem.title}
                                </span>
                            </div>
                        );
                    }
                )}
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
                        }{" "}
                        (Official) (Vencord)
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
