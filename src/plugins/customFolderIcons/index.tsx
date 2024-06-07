/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { DataStore } from "@api/index";
import { Devs } from "@utils/constants";
import { closeModal, ModalContent, ModalHeader, ModalRoot, openModalLazy } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Menu, TextInput } from "@webpack/common";
const DATA_STORE_NAME = "CFI_DATA";
interface folderIcon{
    url: string,
}
interface folderMap {
    [key: string]: folderIcon | undefined
}
interface folderProp {
    folderId: string;
    folderColor: number;
}
let d: folderMap;
export default definePlugin({
    start: async ()=>{
        d = await DataStore.get(DATA_STORE_NAME) || {} as folderMap;
    },
    name: "_customFolderIcons",
    description: "customize folder icons with any png",
    authors: [
        Devs.sadan
    ],
    patches: [
        {
            find: ".expandedFolderIconWrapper",
            replacement: {
                match: /(return.{0,80}expandedFolderIconWrapper.*,)(\(0,..jsxs\)\(.*]}\))/,
                replace: "$1$self.shouldReplace(e)?$self.replace(e):$2"
            }
        }
    ],
    contextMenus: {
        "guild-context": (c, a: folderProp) => {
            if(!("folderId" in a)) return;
            c.push(makeContextItem(a));
        }
    },
    commands: [
        {
            name: "test",
            description: "test command for some wack shit",
            execute: async () => {
            }
        }
    ],
    shouldReplace(e: any){
        return d && e.folderNode.id in d && d[e.folderNode.id] && d[e.folderNode.id]?.url;
    },
    replace(e: any){
        if(d && d[e.folderNode.id]){
            return (
                <img src={d[e.folderNode.id]!.url} width={"100%"} height={"100%"}
                    style={{
                        backgroundColor: int2rgba(e.folderNode.color, .4)
                    }}
                />
            );
        }
    }
});
/**
    * @param i RGB value
    * @param a alpha bewteen zero and 1
    */
const int2rgba = (i: number, a: number = 1)=>{
    const b = i & 0xFF,
        g = (i & 0xFF00) >>> 8,
        r = (i & 0xFF0000) >>> 16;
    return `rgba(${[r,g,b].join(",")},${a})`;
};
const setFolderUrl = async (a: folderProp, url: string) => {
    DataStore.get<folderMap>(DATA_STORE_NAME).then(v => {
        v = v ?? {} as folderMap;
        v[a.folderId] = {
            url: url,
        };
        DataStore.set(DATA_STORE_NAME, v).then(() => { d = v; }).catch(e => {
            handleUpdateError(e);
        });
    }
    )
        .catch(e => {
            handleUpdateError(e);
        });
};

function ImageModal(folderData: folderProp){
    let v = "";
    return(
        <>
            <hr />
            <TextInput onChange={(val,n) => {
                v = val;
            }}
            placeholder="https://example.com/image.png"
            >
            </TextInput>
            <Button onClick={() => {
                setFolderUrl(folderData, v);
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
                    d = v;
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
