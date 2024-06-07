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
import { Button, Menu, TextInput } from "@webpack/common";
const DATA_STORE_NAME = "CFI_DATA";
interface folderIcon{
    url: string,
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
    start: async ()=>{
        folderData = await DataStore.get(DATA_STORE_NAME) || {} as folderStoredData;
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
            return (
                <img src={folderData[props.folderNode.id]!.url} width={"100%"} height={"100%"}
                    style={{
                        backgroundColor: int2rgba(props.folderNode.color, .4)
                    }}
                />
            );
        }
    }
});
/**
    * @param rgbVal RGB value
    * @param alpha alpha bewteen zero and 1
    */
const int2rgba = (rgbVal: number, alpha: number = 1)=>{
    const b = rgbVal & 0xFF,
        g = (rgbVal & 0xFF00) >>> 8,
        r = (rgbVal & 0xFF0000) >>> 16;
    return `rgba(${[r,g,b].join(",")},${alpha})`;
};
const setFolderUrl = async (props: folderProp, url: string) => {
    DataStore.get<folderStoredData>(DATA_STORE_NAME).then(data => {
        data = data ?? {} as folderStoredData;
        data[props.folderId] = {
            url: url,
        };
        DataStore.set(DATA_STORE_NAME, data).then(() => { folderData = data; }).catch(e => {
            handleUpdateError(e);
        });
    }
    )
        .catch(e => {
            handleUpdateError(e);
        });
};

function ImageModal(folderData: folderProp){
    let data = "";
    return(
        <>
            <hr />
            <TextInput onChange={(val, n) => {
                data = val;
            }}
            placeholder="https://example.com/image.png"
            >
            </TextInput>
            <Button onClick={() => {
                setFolderUrl(folderData, data);
                closeModal("custom-folder-icon");
            }}
            >
                Set With Url
            </Button>
            <hr />
            <Button onClick={() => {
                DataStore.get(DATA_STORE_NAME).then(v => {
                    if(!v) return;
                    v[folderData.folderId] = undefined;
                    folderData = v;
                });
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
