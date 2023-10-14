/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* eslint-disable arrow-parens */

import * as DataStore from "@api/DataStore";
import { CloseIcon, SearchIcon } from "@components/Icons";
import { ModalContent, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { findByCode } from "@webpack";
import { Clipboard, Forms, Text, TextInput, Toasts, Tooltip, useState } from "@webpack/common";
import { Plugins } from "Vencord";

import { ColorwayCSS, fallbackColorways, LazySwatchLoaded } from "..";
import { Colorway } from "../types";
import extractAndRequireModuleIds from "../util/requireModule";
import { ColorPickerModal, ColorStealerModal } from "./colorPicker";
import CreatorModal from "./creatorModal";
import ColorwayInfoModal from "./infoModal";

interface ToolboxItem {
    title: string,
    onClick: () => void,
    id?: string,
    iconClassName?: string;
}

const ToolboxItems: ToolboxItem[] = [
    {
        title: "Settings",
        onClick: () => { },
        id: "colorways-toolbox_settings",
        iconClassName: "gear-wide-connected"
    },
    {
        title: "Color Picker",
        onClick: () => {
            if (LazySwatchLoaded === false) {
                extractAndRequireModuleIds(findByCode("Promise.all", "openModalLazy", "location_page"));
            }
            openModal(props => <ColorPickerModal modalProps={props} />);
        },
        id: "colorways-toolbox_colorpicker",
        iconClassName: "palette"
    },
    {
        title: "Copy Accent Color",
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--brand-experiment")));
            Toasts.show({ message: "Accent color copied to clipboard", id: "toolbox-accent-color-copied", type: 1 });
        },
        id: "colorways-toolbox_copy-accent",
        iconClassName: "copy"
    },
    {
        title: "Copy Primary Color",
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--background-primary")));
            Toasts.show({ message: "Primary color copied to clipboard", id: "toolbox-primary-color-copied", type: 1 });
        },
        id: "colorways-toolbox_copy-primary",
        iconClassName: "copy"
    },
    {
        title: "Copy Secondary Color",
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--background-secondary")));
            Toasts.show({ message: "Secondary color copied to clipboard", id: "toolbox-secondary-color-copied", type: 1 });
        },
        id: "colorways-toolbox_copy-secondary",
        iconClassName: "copy"
    },
    {
        title: "Copy Tertiary Color",
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--background-tertiary")));
            Toasts.show({ message: "Tertiary color copied to clipboard", id: "toolbox-tertiary-color-copied", type: 1 });
        },
        id: "colorways-toolbox_copy-tertiary",
        iconClassName: "copy"
    },
    {
        title: "Copy Other Colors",
        onClick: () => openModal(props => <ColorStealerModal modalProps={props} />),
        id: "colorways-toolbox_copy-other",
        iconClassName: "copy"
    }
];

export default function SelectorModal({ modalProps, colorwayProps, customColorwayProps, activeColorwayProps, visibleTabProps = "all" }: { modalProps: ModalProps; colorwayProps: Colorway[]; customColorwayProps: Colorway[]; activeColorwayProps: string; visibleTabProps?: string; }): JSX.Element | any {
    let results: Colorway[];
    const [currentColorway, setCurrentColorway] = useState<string>(activeColorwayProps);
    const [colorways, setColorways] = useState<Colorway[]>(colorwayProps);
    const [customColorways, setCustomColorways] = useState<Colorway[]>(customColorwayProps);
    const [searchBarVisibility, setSearchBarVisibility] = useState<boolean>(false);
    const [searchString, setSearchString] = useState<string>("");
    const [visibility, setVisibility] = useState<string>(visibleTabProps);
    let visibleColorwayArray: Colorway[];

    switch (visibility) {
        case "all":
            visibleColorwayArray = [...colorways, ...customColorways];
            break;
        case "official":
            visibleColorwayArray = [...colorways];
            break;
        case "custom":
            visibleColorwayArray = [...customColorways];
            break;
        default:
            visibleColorwayArray = [...colorways, ...customColorways];
            break;
    }

    function searchColorways(e: string) {
        results = [];
        colorwayProps.find((Colorway: Colorway) => {
            if (Colorway.name.toLowerCase().includes(e.toLowerCase())) {
                results.push(Colorway);
            }
        });
        setColorways(results);
        results = [];
        customColorwayProps.find((Colorway: Colorway) => {
            if (Colorway.name.toLowerCase().includes(e.toLowerCase())) {
                results.push(Colorway);
            }
        });
        setCustomColorways(results);
    }

    return (
        <ModalRoot {...modalProps} className="colorwaySelectorModal">
            <ModalContent className="colorwaySelectorModalContent">
                <div className="colorwaySelector-doublePillBar">
                    {searchBarVisibility === true ? (
                        <TextInput
                            inputClassName="colorwaySelector-searchInput"
                            className="colorwaySelector-search"
                            placeholder="Search for Colorways..."
                            value={searchString}
                            onChange={(e: string) => {
                                searchColorways(e);
                                setSearchString(e);
                            }}
                        />
                    ) : (
                        <div className="colorwaySelector-pillWrapper">
                            <div className={`colorwaySelector-pill${visibility === "all" ? " colorwaySelector-pill_selected" : " "}`} onClick={() => setVisibility("all")}>
                                All
                            </div>
                            <div className={`colorwaySelector-pill${visibility === "official" ? " colorwaySelector-pill_selected" : " "}`} onClick={() => setVisibility("official")}>
                                Official
                            </div>
                            <div className={`colorwaySelector-pill${visibility === "custom" ? " colorwaySelector-pill_selected" : " "}`} onClick={() => setVisibility("custom")}>
                                Custom
                            </div>
                            <div className="colorwaySelector-pillSeparator" />
                            <div className={`colorwaySelector-pill${visibility === "toolbox" ? " colorwaySelector-pill_selected" : " "}`} onClick={() => setVisibility("toolbox")}>
                                Toolbox
                            </div>
                            <div className={`colorwaySelector-pill${visibility === "info" ? " colorwaySelector-pill_selected" : " "}`} onClick={() => {
                                (() => {
                                    var colorwaysArr = new Array<Colorway>();
                                    DataStore.get("colorwaySourceFiles").then((colorwaySourceFiles) => {
                                        colorwaySourceFiles.forEach((colorwayList, i) => {
                                            fetch(colorwayList)
                                                .then((response) => response.json())
                                                .then((data) => {
                                                    if (!data) return;
                                                    if (!data.colorways?.length) return;
                                                    data.colorways.map((color: Colorway) => {
                                                        colorwaysArr.push(color);
                                                    });
                                                    if (i + 1 === colorwaySourceFiles.length) {
                                                        DataStore.get("customColorways").then((customColorways) => {
                                                            DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                                                setColorways(colorwaysArr);
                                                                setCustomColorways(customColorways);
                                                                setCurrentColorway(actveColorwayID);
                                                                setVisibility("info");
                                                            });
                                                        });
                                                    }
                                                })
                                                .catch((err) => {
                                                    console.log(err);
                                                    return null;
                                                });
                                        });
                                    });
                                })();
                            }}>
                                Info
                            </div>
                        </div>
                    )}
                    <div className="colorwaySelector-pillWrapper">
                        <Tooltip text="Refresh Colorways...">
                            {({ onMouseEnter, onMouseLeave }) => {
                                return (
                                    <div
                                        className="colorwaySelector-pill"
                                        id="colorway-refreshcolorway"
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={onMouseLeave}
                                        onClick={() => {
                                            var colorwaysArr = new Array<Colorway>();
                                            DataStore.get("colorwaySourceFiles").then((colorwaySourceFiles) => {
                                                colorwaySourceFiles.forEach((colorwayList, i) => {
                                                    fetch(colorwayList)
                                                        .then((response) => response.json())
                                                        .then((data) => {
                                                            if (!data) return;
                                                            if (!data.colorways?.length) return;
                                                            data.colorways.map((color: Colorway) => {
                                                                colorwaysArr.push(color);
                                                            });
                                                            if (i + 1 === colorwaySourceFiles.length) {
                                                                DataStore.get("customColorways").then((customColorways) => {
                                                                    DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                                                        setColorways(colorwaysArr);
                                                                        setCustomColorways(customColorways);
                                                                        setCurrentColorway(actveColorwayID);
                                                                    });
                                                                });
                                                            }
                                                        })
                                                        .catch((err) => {
                                                            console.log(err);
                                                            if (i + 1 === colorwaySourceFiles.length) {
                                                                DataStore.get("customColorways").then((customColorways) => {
                                                                    DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                                                        setColorways(fallbackColorways);
                                                                        setCustomColorways(customColorways);
                                                                        setCurrentColorway(actveColorwayID);
                                                                    });
                                                                });
                                                            }
                                                        });
                                                });
                                            });
                                        }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <g id="Frame_-_24px">
                                                <rect y="0" fill="none" width="24" height="24"></rect>
                                            </g>
                                            <g id="Filled_Icons">
                                                <g>
                                                    <path d="M6.351,6.351C7.824,4.871,9.828,4,12,4c4.411,0,8,3.589,8,8h2c0-5.515-4.486-10-10-10 C9.285,2,6.779,3.089,4.938,4.938L3,3v6h6L6.351,6.351z"></path>
                                                    <path d="M17.649,17.649C16.176,19.129,14.173,20,12,20c-4.411,0-8-3.589-8-8H2c0,5.515,4.486,10,10,10 c2.716,0,5.221-1.089,7.062-2.938L21,21v-6h-6L17.649,17.649z"></path>
                                                </g>
                                            </g>
                                        </svg>
                                    </div>
                                );
                            }}
                        </Tooltip>
                        <Tooltip text="Create Colorway...">
                            {({ onMouseEnter, onMouseLeave }) => {
                                return (
                                    <div
                                        className="colorwaySelector-pill"
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={onMouseLeave}
                                        onClick={() => {
                                            if (LazySwatchLoaded === false) {
                                                extractAndRequireModuleIds(findByCode("Promise.all", "openModalLazy", "location_page"));
                                            }
                                            openModal((props) => <CreatorModal modalProps={props} />);
                                        }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="14" height="14" viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M20 11.1111H12.8889V4H11.1111V11.1111H4V12.8889H11.1111V20H12.8889V12.8889H20V11.1111Z" />
                                        </svg>
                                    </div>
                                );
                            }}
                        </Tooltip>
                        {searchBarVisibility === false ? (
                            <Tooltip text="Search...">
                                {({ onMouseEnter, onMouseLeave }) => {
                                    return (
                                        <div className="colorwaySelector-pill" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={() => setSearchBarVisibility(true)}>
                                            <SearchIcon width={14} height={14} />
                                        </div>
                                    );
                                }}
                            </Tooltip>
                        ) : (
                            <Tooltip text="Close Search">
                                {({ onMouseEnter, onMouseLeave }) => {
                                    return (
                                        <div
                                            className="colorwaySelector-pill"
                                            onMouseEnter={onMouseEnter}
                                            onMouseLeave={onMouseLeave}
                                            onClick={() => {
                                                searchColorways("");
                                                setSearchString("");
                                                setSearchBarVisibility(false);
                                            }}>
                                            <CloseIcon width={14} height={14} />
                                        </div>
                                    );
                                }}
                            </Tooltip>
                        )}
                        <Tooltip text="Close">
                            {({ onMouseEnter, onMouseLeave }) => {
                                return (
                                    <div
                                        className="colorwaySelector-pill"
                                        id="colorwaySelector-pill_closeSelector"
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={onMouseLeave}
                                        onClick={() => {
                                            modalProps.onClose();
                                        }}>
                                        <CloseIcon width={14} height={14} />
                                    </div>
                                );
                            }}
                        </Tooltip>
                    </div>
                </div>
                <div className="ColorwaySelectorWrapper">
                    {visibleColorwayArray.length === 0 ? <>
                        <Forms.FormTitle style={{ marginBottom: 0, width: "100%", textAlign: "center" }}>No colorways...</Forms.FormTitle>
                    </> : <></>}
                    {["all", "official", "custom"].includes(visibility) ? visibleColorwayArray.map((color, ind) => {
                        var colors: Array<string> = color.colors || ["accent", "primary", "secondary", "tertiary"];
                        return (
                            <Tooltip text={color.name}>
                                {({ onMouseEnter, onMouseLeave }) => {
                                    return (
                                        <div className={`discordColorway${currentColorway === color.name ? " active" : ""}`} id={"colorway-" + color.name} data-last-official={ind + 1 === colorways.length} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                                            <div className="colorwayCheckIconContainer">
                                                <div className="colorwayCheckIcon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24">
                                                        <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M8.99991 16.17L4.82991 12L3.40991 13.41L8.99991 19L20.9999 7.00003L19.5899 5.59003L8.99991 16.17Z"></path>
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="colorwayInfoIconContainer" onClick={() => {
                                                openModal((props) => <ColorwayInfoModal modalProps={props} colorwayProps={color} discrimProps={customColorways.includes(color)} />);
                                            }}>
                                                <div className="colorwayInfoIcon">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                        <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div
                                                className="discordColorwayPreviewColorContainer"
                                                onClick={() => {
                                                    if (currentColorway === color.name) {
                                                        DataStore.set("actveColorwayID", null);
                                                        DataStore.set("actveColorway", null);
                                                        ColorwayCSS.remove();
                                                    } else {
                                                        DataStore.set("actveColorwayID", color.name);
                                                        DataStore.set("actveColorway", color.import);
                                                        ColorwayCSS.set(color.import);
                                                    }
                                                    DataStore.get("actveColorwayID").then((actveColorwayID: string) => setCurrentColorway(actveColorwayID));
                                                }}>
                                                {colors.map((colorItm) => { return <div className="discordColorwayPreviewColor" style={{ backgroundColor: color[colorItm] }} />; })}
                                            </div>
                                        </div>
                                    );
                                }}
                            </Tooltip>
                        );
                    }) : <></>}
                    {visibility === "info" ? <>
                        <div className="colorwaysSelector-infoRow">
                            <Forms.FormTitle style={{ marginBottom: 0 }}>
                                Plugin Name:
                            </Forms.FormTitle>
                            <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "14px" }}>Discord Colorways</Text>
                        </div>
                        <div className="colorwaysSelector-infoRow">
                            <Forms.FormTitle style={{ marginBottom: 0 }}>
                                Plugin Version:
                            </Forms.FormTitle>
                            <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "14px" }}>{(Plugins.plugins.DiscordColorways as any).pluginVersion} (Official) (Vencord)</Text>
                        </div>
                        <div className="colorwaysSelector-infoRow">
                            <Forms.FormTitle style={{ marginBottom: 0 }}>
                                Creator Version:
                            </Forms.FormTitle>
                            <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "14px" }}>{(Plugins.plugins.DiscordColorways as any).creatorVersion} (Stable)</Text>
                        </div>
                        <div className="colorwaysSelector-infoRow">
                            <Forms.FormTitle style={{ marginBottom: 0 }}>
                                Loaded Colorways:
                            </Forms.FormTitle>
                            <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontWeight: 500, fontSize: "14px" }}>{[...colorways, ...customColorways].length}</Text>
                        </div>
                    </> : <></>}
                    {visibility === "toolbox" ? <>
                        <div className="colorwayToolbox-list">
                            <div className="colorwayToolbox-itemList">
                                {ToolboxItems.map((toolboxItem: ToolboxItem, i: number) => {
                                    return <div id={toolboxItem.id || "colorways-toolbox_item-" + i} className="colorwayToolbox-listItem"><i onClick={toolboxItem.onClick} className={"bi bi-" + (toolboxItem.iconClassName || "question-circle")}></i><span className="colorwaysToolbox-label">{toolboxItem.title}</span></div>;
                                })}
                            </div>
                        </div>
                    </> : <></>}
                </div>
            </ModalContent >
        </ModalRoot >
    );
}
