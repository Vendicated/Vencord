/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DataStore } from "@api/index";
import { showNotification } from "@api/Notifications";
import { Devs } from "@utils/constants";
import { closeModal, ModalContent, ModalHeader, ModalRoot, openModalLazy } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Menu, Slider, TextInput, useState } from "@webpack/common";
import settings from "./settings";
const DATA_STORE_NAME = "CFI_DATA";
interface folderIcon{
    url: string,
    size: number,
}
interface folderStoredData {
    [key: string]: folderIcon | undefined
}
interface folderProp {
    folderId: string;
    folderColor: number;
}
let folderData: folderStoredData;
export default definePlugin({
    settings,
    start: async ()=>{
        folderData = await DataStore.get(DATA_STORE_NAME).catch(e => handleUpdateError(e)) || {} as folderStoredData;
    },
    name: "CustomFolderIcons",
    description: "Customize folder icons with any png",
    authors: [
        Devs.sadan
    ],
    patches: [
        {
            find: ".expandedFolderIconWrapper",
            replacement: {
                match: /(return.{0,80}expandedFolderIconWrapper.*,)(\(0,..jsxs\)\(.*]}\))/,
                replace: "$1$self.shouldReplace(arguments[0])?$self.replace(arguments[0]):$2"
            }
        }
    ],
    contextMenus: {
        "guild-context": (menuItems, props: folderProp) => {
            if(!("folderId" in props)) return;
            menuItems.push(makeContextItem(props));
        }
    },
    shouldReplace(props: any){
        return folderData
            && props.folderNode.id in folderData
            && folderData[props.folderNode.id]
            && folderData[props.folderNode.id]?.url;
    },
    replace(props: any){
        if(folderData && folderData[props.folderNode.id]){
            const data = folderData[props.folderNode.id];
            return (
                <div
                    style={{
                        backgroundColor: int2rgba(props.folderNode.color, .4),
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                        height: "100%"
                    }}
                >
                    <img src={data!.url} width={`${data!.size}%`} height={`${data!.size}%`}
                    />
                </div>
            );
        }
    }
});
/**
    * @param rgbVal RGB value
    * @param alpha alpha bewteen zero and 1
    */
function int2rgba(rgbVal: number, alpha: number = 1) {
    const b = rgbVal & 0xFF,
        g = (rgbVal & 0xFF00) >>> 8,
        r = (rgbVal & 0xFF0000) >>> 16;
    return `rgba(${[r, g, b].join(",")},${alpha})`;
}
async function setFolderUrl(props: folderProp, url: string, size: number) {
    DataStore.get<folderStoredData>(DATA_STORE_NAME).then(data => {
        data = data ?? {} as folderStoredData;
        data[props.folderId] = {
            url: url,
            size: size
        };
        DataStore.set(DATA_STORE_NAME, data).then(() => { folderData = data; }).catch(e => {
            handleUpdateError(e);
        });
    }
    )
        .catch(e => {
            handleUpdateError(e);
        });
}
function RenderPreview({ folderProps, url, size }: {folderProps: folderProp, url: string, size: number}){
    if (!url) return null;
    return(
        <div style={{
            width: "20vh",
            height: "20vh",
            borderRadius: "24px",
            backgroundColor: int2rgba(folderProps.folderColor, .4),
            display: "flex",
            justifyContent: "center",
            alignItems: "center"
        }}>
            <img src={url} width={`${size}%`} height={`${size}%`} style={{
                // borderRadius: "24px",
            }}/>
        </div>
    );
}
function ImageModal(folderProps: folderProp){
    const [data, setData]= useState("");
    const [size, setSize] = useState(100);
    return(
        <>
            <TextInput onChange={(val, n) => {
                setData(val);
            }}
            placeholder="https://example.com/image.png"
            >
            </TextInput>
            <RenderPreview folderProps={folderProps} url={data} size={size}/>
            {data && <>
                <div style= {{
                    color: "#FFF"
                }}>Change the size of the folder icon</div>
                <Slider
                    initialValue={100}
                    onValueChange={(v: number) => {
                        setSize(v);
                    }}
                    maxValue={200}
                    minValue={25}
                    markers={Array.apply(0, Array(176)).map((v, i) => i+25)}
                    stickToMarkers = {true}
                    keyboardStep={1}
                    renderMarker={() => null}
                />
            </>}
            <Button onClick={() => {
                setFolderUrl(folderProps, data, size);
                closeModal("custom-folder-icon");
            }}
            >
                Save
            </Button>
            <hr />
            <Button onClick={() => {
                DataStore.get(DATA_STORE_NAME).then(data => {
                    if(!data) return;
                    data[folderProps.folderId] = undefined;
                    DataStore.set(DATA_STORE_NAME, data).then(() => {
                        folderData = data;
                    }).catch(e => handleUpdateError(e));
                }).catch(e => handleUpdateError(e));
                closeModal("custom-folder-icon");
            }}>
                Unset
            </Button>
            <hr />
        </>
    );
}
function makeContextItem(a: folderProp) {
    return (
        <Menu.MenuItem
            id="custom-folder-icons"
            key="custom-folder-icons"
            label="Change Icon"
            action={() => {
                openModalLazy(async () => {
                    return props => (
                        <ModalRoot {...props}>
                            <ModalHeader >
                                <div style={{
                                    color: "white"
                                }}>
                            Set a New Icon.
                                </div>
                            </ModalHeader>
                            <ModalContent>
                                <ImageModal folderId={a.folderId} folderColor={a.folderColor}/>
                            </ModalContent>
                            <div style={{
                                color: "white",
                                margin: "2.5%",
                                marginTop: "1%"
                            }}>
                                You might have to hover the folder after setting in order for it to refresh.
                            </div>
                        </ModalRoot>
                    );
                },
                {
                    modalKey: "custom-folder-icon"
                });
            }}/>
    );
}
function handleUpdateError(e: any) {
    showNotification({
        title: "CustomFolderIcons: Error",
        body: "An error has occurred. Check the console for more info."
    });
    console.error(e);
}
