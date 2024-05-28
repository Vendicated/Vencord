/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { PlusIcon } from "@components/Icons";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { findByProps } from "@webpack";
import { Button, Text, TextInput, useEffect, useState } from "@webpack/common";

import { Colorway } from "../types";
import { StoreNameModal } from "./SettingsTabs/SourceManager";

export default function ({ modalProps, colorways, onFinish }: { modalProps: ModalProps, colorways: Colorway[], onFinish: () => void; }) {
    const [offlineColorwayStores, setOfflineColorwayStores] = useState<{ name: string, colorways: Colorway[], id?: string; }[]>([]);
    const [storename, setStorename] = useState<string>();
    const [noStoreError, setNoStoreError] = useState<boolean>(false);
    const { radioBar, item: radioBarItem, itemFilled: radioBarItemFilled, radioPositionLeft } = findByProps("radioBar");
    useEffect(() => {
        (async () => {
            setOfflineColorwayStores(await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]);
        })();
    });
    return <ModalRoot {...modalProps}>
        <ModalHeader separator={false}>
            <Text variant="heading-lg/semibold" tag="h1">Select Offline Colorway Source</Text>
        </ModalHeader>
        <ModalContent>
            {noStoreError ? <Text variant="text-xs/normal" style={{ color: "var(--text-danger)" }}>Error: No store selected</Text> : <></>}
            {offlineColorwayStores.map(store => {
                return <div className={`${radioBarItem} ${radioBarItemFilled}`} aria-checked={storename === store.name}>
                    <div
                        className={`${radioBar} ${radioPositionLeft}`}
                        style={{ padding: "10px" }}
                        onClick={() => {
                            setStorename(store.name);
                        }}>
                        <svg aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20ZM12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="currentColor" />
                            {storename === store.name && <circle cx="12" cy="12" r="5" className="radioIconForeground-3wH3aU" fill="currentColor" />}
                        </svg>
                        <Text variant="eyebrow" tag="h5">{store.name}</Text>
                    </div>
                </div>;
            })}
            <div className={`${radioBarItem} ${radioBarItemFilled}`}>
                <div
                    className={`${radioBar} ${radioPositionLeft}`}
                    style={{ padding: "10px" }}
                    onClick={() => {
                        openModal(props => <StoreNameModal modalProps={props} conflicting={false} originalName="" onFinish={async e => {
                            await DataStore.set("customColorways", [...await DataStore.get("customColorways"), { name: e, colorways: [] }]);
                            setOfflineColorwayStores(await DataStore.get("customColorways") as { name: string, colorways: Colorway[]; }[]);
                        }} />);
                    }}>
                    <PlusIcon width={24} height={24} />
                    <Text variant="eyebrow" tag="h5">Create new store...</Text>
                </div>
            </div>
        </ModalContent>
        <ModalFooter>
            <Button
                style={{ marginLeft: 8 }}
                color={Button.Colors.BRAND_NEW}
                size={Button.Sizes.MEDIUM}
                onClick={async () => {
                    setNoStoreError(false);
                    if (!storename) {
                        setNoStoreError(true);
                    } else {
                        const oldStores: { name: string, colorways: Colorway[], id?: string; }[] | undefined = await DataStore.get("customColorways");
                        const storeToModify: { name: string, colorways: Colorway[], id?: string; } | undefined = (await DataStore.get("customColorways") as { name: string, colorways: Colorway[], id?: string; }[]).filter(source => source.name === storename)[0];
                        colorways.map((colorway, i) => {
                            if (storeToModify.colorways.map(colorway => colorway.name).includes(colorway.name)) {
                                openModal(props => <ModalRoot {...props}>
                                    <ModalHeader separator={false}>
                                        <Text variant="heading-lg/semibold" tag="h1">Duplicate Colorway</Text>
                                    </ModalHeader>
                                    <ModalContent>
                                        <Text>A colorway with the same name was found in this store, what do you want to do?</Text>
                                    </ModalContent>
                                    <ModalFooter>
                                        <Button
                                            style={{ marginLeft: 8 }}
                                            color={Button.Colors.BRAND}
                                            size={Button.Sizes.MEDIUM}
                                            look={Button.Looks.FILLED}
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
                                        </Button>
                                        <Button
                                            style={{ marginLeft: 8 }}
                                            color={Button.Colors.BRAND}
                                            size={Button.Sizes.MEDIUM}
                                            look={Button.Looks.FILLED}
                                            onClick={() => {
                                                function NewColorwayNameModal({ modalProps, onSelected }: { modalProps: ModalProps, onSelected: (e: string) => void; }) {
                                                    const [errorMsg, setErrorMsg] = useState<string>();
                                                    const [newColorwayName, setNewColorwayName] = useState("");
                                                    return <ModalRoot {...modalProps}>
                                                        <ModalHeader separator={false}>
                                                            <Text variant="heading-lg/semibold" tag="h1">Select new name</Text>
                                                        </ModalHeader>
                                                        <ModalContent>
                                                            <TextInput error={errorMsg} value={newColorwayName} onChange={e => setNewColorwayName(e)} placeholder="Enter valid colorway name" />
                                                        </ModalContent>
                                                        <ModalFooter>
                                                            <Button
                                                                style={{ marginLeft: 8 }}
                                                                color={Button.Colors.PRIMARY}
                                                                size={Button.Sizes.MEDIUM}
                                                                look={Button.Looks.OUTLINED}
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
                                                            </Button>
                                                            <Button
                                                                style={{ marginLeft: 8 }}
                                                                color={Button.Colors.PRIMARY}
                                                                size={Button.Sizes.MEDIUM}
                                                                look={Button.Looks.OUTLINED}
                                                                onClick={() => {
                                                                    if (i + 1 === colorways.length) {
                                                                        modalProps.onClose();
                                                                    }
                                                                }}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </ModalFooter>
                                                    </ModalRoot>;
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
                                        </Button>
                                        <Button
                                            style={{ marginLeft: 8 }}
                                            color={Button.Colors.PRIMARY}
                                            size={Button.Sizes.MEDIUM}
                                            look={Button.Looks.OUTLINED}
                                            onClick={() => {
                                                props.onClose();
                                            }}
                                        >
                                            Select different store
                                        </Button>
                                    </ModalFooter>
                                </ModalRoot>);
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
            </Button>
            <Button
                style={{ marginLeft: 8 }}
                color={Button.Colors.PRIMARY}
                size={Button.Sizes.MEDIUM}
                look={Button.Looks.OUTLINED}
                onClick={() => {
                    modalProps.onClose();
                }}
            >
                Cancel
            </Button>
        </ModalFooter>
    </ModalRoot>;
}
