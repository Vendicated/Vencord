/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { generateCss, pureGradientBase } from "../css";
import { Colorway, ModalProps } from "../types";
import { colorToHex, stringToHex, saveFile } from "../utils";
import SaveColorwayModal from "./SaveColorwayModal";
import ThemePreview from "./ThemePreview";
import { ColorwayCSS } from "../colorwaysAPI";
import { PluginProps, useState, UserStore, useStateFromStores, DataStore, useEffect, openModal, Toasts } from "..";

function RenameColorwayModal({ modalProps, ogName, onFinish, colorwayList }: { modalProps: ModalProps, ogName: string, onFinish: (name: string) => void, colorwayList: Colorway[]; }) {
    const [error, setError] = useState<string>("");
    const [newName, setNewName] = useState<string>(ogName);
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);

    return <div className={`colorwaysModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
        <h2 className="colorwaysModalHeader">
            Rename Colorway...
        </h2>
        <div className="colorwaysModalContent">
            <input
                type="text"
                className="colorwayTextBox"
                value={newName}
                onInput={({ currentTarget: { value } }) => {
                    setNewName(value);
                }}
            />
        </div>
        <div className="colorwaysModalFooter">
            <button
                className="colorwaysPillButton colorwaysPillButton-onSurface"
                onClick={async () => {
                    if (!newName) {
                        return setError("Error: Please enter a valid name");
                    }
                    if (colorwayList.map(c => c.name).includes(newName)) {
                        return setError("Error: Name already exists");
                    }
                    onFinish(newName);
                    modalProps.onClose();
                }}
            >
                Finish
            </button>
            <button
                className="colorwaysPillButton"
                onClick={() => modalProps.onClose()}
            >
                Cancel
            </button>
        </div>
    </div>;
}

export default function ({
    modalProps,
    colorway,
    loadUIProps
}: {
    modalProps: ModalProps;
    colorway: Colorway;
    loadUIProps: () => Promise<void>;
}) {
    const colors: string[] = colorway.colors || [
        "accent",
        "primary",
        "secondary",
        "tertiary",
    ];
    const profile = useStateFromStores([UserStore], () => UserStore.getUser(colorway.authorID));
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);

    return <div className={`colorwaysModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
        <h2 className="colorwaysModalHeader">
            Colorway: {colorway.name}
        </h2>
        <div className="colorwaysModalContent">
            <div style={{ gap: "8px", width: "100%", display: "flex", flexDirection: "column" }}>
                <span className="colorwaysModalSectionHeader">Creator:</span>
                <div style={{ gap: ".5rem", display: "flex" }}>
                    {<img src={`https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.webp?size=32`} width={32} height={32} style={{
                        borderRadius: "32px"
                    }} />}
                    <span className="colorwaysModalSectionHeader" style={{ lineHeight: "32px" }} onClick={() => {
                        navigator.clipboard.writeText(profile.username);
                        Toasts.show({
                            message: "Copied Colorway Author Username Successfully",
                            type: 1,
                            id: "copy-colorway-author-username-notify",
                        });
                    }}>{colorway.author}</span>
                </div>
                <span className="colorwaysModalSectionHeader">Colors:</span>
                <div style={{ gap: "8px", display: "flex" }}>
                    {colors.map(color => <div className="colorwayInfo-colorSwatch" style={{ backgroundColor: colorway[color] }} />)}
                </div>
                <span className="colorwaysModalSectionHeader">Actions:</span>
                <div style={{ gap: "8px", flexDirection: "column", display: "flex" }}>
                    <button
                        className="colorwaysPillButton"
                        style={{ width: "100%" }}
                        onClick={() => {
                            const colorwayIDArray = `${colorway.accent},${colorway.primary},${colorway.secondary},${colorway.tertiary}|n:${colorway.name}${colorway.preset ? `|p:${colorway.preset}` : ""}`;
                            const colorwayID = stringToHex(colorwayIDArray);
                            navigator.clipboard.writeText(colorwayID);
                            Toasts.show({
                                message: "Copied Colorway ID Successfully",
                                type: 1,
                                id: "copy-colorway-id-notify",
                            });
                        }}
                    >
                        Copy Colorway ID
                    </button>
                    <button
                        className="colorwaysPillButton"
                        style={{ width: "100%" }}
                        onClick={() => {
                            if (colorway["dc-import"]) {
                                navigator.clipboard.writeText(colorway["dc-import"]);
                                Toasts.show({
                                    message: "Copied CSS to Clipboard",
                                    type: 1,
                                    id: "copy-colorway-css-notify",
                                });
                            } else {
                                Toasts.show({
                                    message: "Colorway did not provide CSS",
                                    type: 2,
                                    id: "copy-colorway-css-failed-notify",
                                });
                            }
                        }}
                    >
                        Copy CSS
                    </button>
                    {colorway.sourceType === "offline" && <button
                        className="colorwaysPillButton"
                        style={{ width: "100%" }}
                        onClick={async () => {
                            const offlineSources = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).map(o => o.colorways).filter(colorArr => colorArr.map(color => color.name).includes(colorway.name))[0];
                            openModal(props => <RenameColorwayModal ogName={colorway.name} colorwayList={offlineSources} modalProps={props} onFinish={async (newName: string) => {
                                const stores = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).map(source => {
                                    if (source.name === colorway.source) {
                                        return {
                                            name: source.name,
                                            colorways: [...source.colorways.filter(colorway => colorway.name !== colorway.name), {
                                                ...colorway,
                                                name: newName
                                            }]
                                        };
                                    } else return source;
                                });
                                DataStore.set("customColorways", stores);
                                if ((await DataStore.get("activeColorwayObject")).id === colorway.name) {
                                    DataStore.set("activeColorwayObject", { id: newName, css: colorway.name, sourceType: "offline", source: colorway.source });
                                }
                                modalProps.onClose();
                                loadUIProps();
                            }} />);
                        }}
                    >
                        Rename
                    </button>}
                    <button
                        className="colorwaysPillButton"
                        style={{ width: "100%" }}
                        onClick={() => {
                            if (colorway["dc-import"]) {
                                if (!colorway["dc-import"].includes("@name")) {
                                    saveFile(new File([`/**
                                        * @name ${colorway.name || "Colorway"}
                                        * @version ${PluginProps.creatorVersion}
                                        * @description Automatically generated Colorway.
                                        * @author ${UserStore.getCurrentUser().username}
                                        * @authorId ${UserStore.getCurrentUser().id}
                                        */
                                       ${colorway["dc-import"].replace((colorway["dc-import"].match(/\/\*.+\*\//) || [""])[0], "").replaceAll("url(//", "url(https://").replaceAll("url(\"//", "url(\"https://")}`], `${colorway.name.replaceAll(" ", "-").toLowerCase()}.theme.css`, { type: "text/plain" }));
                                } else {
                                    saveFile(new File([colorway["dc-import"]], `${colorway.name.replaceAll(" ", "-").toLowerCase()}.theme.css`, { type: "text/plain" }));
                                }
                            }
                        }}
                    >
                        Download CSS
                    </button>
                    <button
                        className="colorwaysPillButton"
                        style={{ width: "100%" }}
                        onClick={() => {
                            openModal((props: ModalProps) => <div className={`colorwaysPreview-modal ${props.transitionState == 2 ? "closing" : ""} ${props.transitionState == 4 ? "hidden" : ""}`}>
                                <style>
                                    {colorway.isGradient ? pureGradientBase + `.colorwaysPreview-modal,.colorwaysPreview-wrapper {--gradient-theme-bg: linear-gradient(${colorway.linearGradient})}` : ""}
                                </style>
                                <ThemePreview
                                    accent={colorway.accent}
                                    primary={colorway.primary}
                                    secondary={colorway.secondary}
                                    tertiary={colorway.tertiary}
                                    isModal
                                    modalProps={props}
                                />
                            </div>);
                        }}
                    >
                        Show preview
                    </button>
                    {colorway.sourceType === "offline" && <button
                        className="colorwaysPillButton"
                        style={{ width: "100%" }}
                        onClick={async () => {
                            const oldStores = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).filter(source => source.name !== colorway.source);
                            const storeToModify = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).filter(source => source.name === colorway.source)[0];
                            const newStore = { name: storeToModify.name, colorways: storeToModify.colorways.filter(colorway => colorway.name !== colorway.name) };
                            DataStore.set("customColorways", [...oldStores, newStore]);
                            if ((await DataStore.get("activeColorwayObject")).id === colorway.name) {
                                DataStore.set("activeColorwayObject", { id: null, css: null, sourceType: null, source: null });
                                ColorwayCSS.remove();
                            }
                            modalProps.onClose();
                            loadUIProps();
                        }}
                    >
                        Delete
                    </button>}
                </div>
            </div>
        </div>
    </div>;
}
