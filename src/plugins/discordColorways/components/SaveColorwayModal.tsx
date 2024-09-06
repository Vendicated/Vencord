/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PlusIcon } from "./Icons";

import { Colorway, ModalProps } from "../types";
import { StoreNameModal } from "./SettingsTabs/SourceManager";
import { DataStore, useState, useEffect, openModal } from "..";

export default function ({ modalProps, colorways, onFinish }: { modalProps: ModalProps, colorways: Colorway[], onFinish: () => void; }) {
    const [offlineColorwayStores, setOfflineColorwayStores] = useState<{ name: string, colorways: Colorway[], id?: string; }[]>([]);
    const [storename, setStorename] = useState<string>();
    const [noStoreError, setNoStoreError] = useState<boolean>(false);
    useEffect(() => {
        (async () => {
            setOfflineColorwayStores(await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]);
        })();
    });
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        load();
    }, []);
    return <div className={`colorwaysModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
        <h2 className="colorwaysModalHeader">
            Save to source:
        </h2>
        <div className="colorwaysModalContent">
            {noStoreError ? <span style={{ color: "var(--text-danger)" }}>Error: No store selected</span> : <></>}
            {offlineColorwayStores.map(store => <div
                className="discordColorway"
                style={{ padding: "10px" }}
                aria-checked={storename === store.name}
                onClick={() => {
                    setStorename(store.name);
                }}>
                <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                    {storename === store.name && <circle cx="12" cy="12" r="5" className="radioIconForeground-3wH3aU" fill="currentColor" />}
                </svg>
                <span className="colorwayLabel">{store.name}</span>
            </div>)}
            <div
                className="discordColorway"
                style={{ padding: "10px" }}
                onClick={() => {
                    openModal(props => <StoreNameModal modalProps={props} conflicting={false} originalName="" onFinish={async e => {
                        await DataStore.set("customColorways", [...await DataStore.get("customColorways"), { name: e, colorways: [] }]);
                        setOfflineColorwayStores(await DataStore.get("customColorways") as { name: string, colorways: Colorway[]; }[]);
                    }} />);
                }}>
                <PlusIcon width={24} height={24} />
                <span className="colorwayLabel">Create new store...</span>
            </div>
        </div>
        <div className="colorwaysModalFooter">
            <button
                className="colorwaysPillButton colorwaysPillButton-onSurface"
                onClick={async () => {
                    setNoStoreError(false);
                    if (!storename) {
                        setNoStoreError(true);
                    } else {
                        const oldStores: { name: string, colorways: Colorway[], id?: string; }[] | undefined = await DataStore.get("customColorways");
                        const storeToModify: { name: string, colorways: Colorway[], id?: string; } | undefined = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).filter(source => source.name === storename)[0];
                        colorways.map((colorway, i) => {
                            if (storeToModify.colorways.map(colorway => colorway.name).includes(colorway.name)) {
                                openModal(props => <div className={`colorwaysModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
                                    <h2 className="colorwaysModalHeader">
                                        Duplicate Colorway
                                    </h2>
                                    <div className="colorwaysModalContent">
                                        <span className="colorwaysModalSectionHeader">A colorway with the same name was found in this store, what do you want to do?</span>
                                    </div>
                                    <div className="colorwaysModalFooter">
                                        <button
                                            className="colorwaysPillButton colorwaysPillButton-onSurface"
                                            onClick={() => {
                                                const newStore = { name: storeToModify.name, colorways: [...storeToModify.colorways.filter(colorwayy => colorwayy.name !== colorway.name), colorway] };
                                                DataStore.set("customColorways", [...oldStores!.filter(source => source.name !== storename), newStore]);
                                                props.onClose();
                                                if (i + 1 === colorways.length) {
                                                    modalProps.onClose();
                                                    onFinish!();
                                                }
                                            }}
                                        >
                                            Override
                                        </button>
                                        <button
                                            className="colorwaysPillButton colorwaysPillButton-onSurface"
                                            onClick={() => {
                                                function NewColorwayNameModal({ modalProps, onSelected }: { modalProps: ModalProps, onSelected: (e: string) => void; }) {
                                                    const [errorMsg, setErrorMsg] = useState<string>();
                                                    const [newColorwayName, setNewColorwayName] = useState("");
                                                    return <div className={`colorwaysModal ${modalProps.transitionState == 2 ? "closing" : ""} ${modalProps.transitionState == 4 ? "hidden" : ""}`} data-theme={theme}>
                                                        <h2 className="colorwaysModalHeader">
                                                            Select new name
                                                        </h2>
                                                        <div className="colorwaysModalContent">
                                                            <input
                                                                type="text"
                                                                className="colorwayTextBox"
                                                                value={newColorwayName}
                                                                onInput={({ currentTarget: { value } }) => setNewColorwayName(value)}
                                                                placeholder="Enter valid colorway name" />
                                                        </div>
                                                        <div className="colorwaysModalFooter">
                                                            <button
                                                                className="colorwaysPillButton"
                                                                onClick={() => {
                                                                    setErrorMsg("");
                                                                    if (storeToModify!.colorways.map(colorway => colorway.name).includes(newColorwayName)) {
                                                                        setErrorMsg("Error: Name already exists");
                                                                    } else {
                                                                        onSelected(newColorwayName);
                                                                        if (i + 1 === colorways.length) {
                                                                            modalProps.onClose();
                                                                        }
                                                                    }
                                                                }}
                                                            >
                                                                Finish
                                                            </button>
                                                            <button
                                                                className="colorwaysPillButton"
                                                                onClick={() => {
                                                                    if (i + 1 === colorways.length) {
                                                                        modalProps.onClose();
                                                                    }
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>;
                                                }
                                                openModal(propss => <NewColorwayNameModal modalProps={propss} onSelected={e => {
                                                    const newStore = { name: storeToModify.name, colorways: [...storeToModify.colorways, { ...colorway, name: e }] };
                                                    DataStore.set("customColorways", [...oldStores!.filter(source => source.name !== storename), newStore]);
                                                    props.onClose();
                                                    if (i + 1 === colorways.length) {
                                                        modalProps.onClose();
                                                        onFinish!();
                                                    }
                                                }} />);
                                            }}
                                        >
                                            Rename
                                        </button>
                                        <button
                                            className="colorwaysPillButton"
                                            onClick={() => {
                                                props.onClose();
                                            }}
                                        >
                                            Select different store
                                        </button>
                                    </div>
                                </div>);
                            } else {
                                const newStore = { name: storeToModify.name, colorways: [...storeToModify.colorways, colorway] };
                                DataStore.set("customColorways", [...oldStores!.filter(source => source.name !== storename), newStore]);
                                if (i + 1 === colorways.length) {
                                    modalProps.onClose();
                                    onFinish();
                                }
                            }
                        });
                    }
                }}
            >
                Finish
            </button>
            <button
                className="colorwaysPillButton"
                onClick={() => {
                    modalProps.onClose();
                }}
            >
                Cancel
            </button>
        </div>
    </div>;
}
