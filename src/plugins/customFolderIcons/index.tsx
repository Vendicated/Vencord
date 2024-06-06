/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { DataStore } from "@api/index";
import { Devs } from "@utils/constants";
import { closeModal, ModalContent, ModalHeader, ModalRoot, openModalLazy } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Menu, TextInput } from "@webpack/common";
const DATA_STORE_NAME = "CFI_DATA";
enum ICON_TYPE {
    PNG,
    SVG
}
interface folderIcon{
    type: ICON_TYPE,
    url: string
}
interface config {
    [key: string]: folderIcon
}
let d: config;
export default definePlugin({
    start: async ()=>{
        d = await DataStore.get(DATA_STORE_NAME) || {} as config;
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
                match: /(return.{0,80}expandedFolderIconWrapper.*,)\(0,..jsxs\)\(.*]}\)/,
                replace: "$1$self.test(e)"
            }
        }
    ],
    contextMenus: {
        "guild-context": (c, a) => {
            if(!("folderId" in a)) return;
            c.push(makeContextItem(a.folderId));
        }
    },
    commands: [
        {
            name: "test",
            description: "test command for some wack shit",
            execute: async () => {
                console.log("asd");
            }
        }
    ],
    test(e){
        console.log(e);
        if(d && e.folderNode.id in d){
            switch(d[e.folderNode.id].type){
                case ICON_TYPE.PNG:
                    return (
                        <img src={d[e.folderNode.id].url} width={"100%"} height={"100%"} />
                    );
                case ICON_TYPE.SVG:
                    return null;
            }
        }
        // TODO: when using the default set the color properly
        return(
            <div className="customFolderDefaultIcon">
                <svg
                    aria-hidden="true"
                    role="img"
                    fill="white"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                >
                    <path
                        d="M2 5a3 3 0 0 1 3-3h3.93a2 2 0 0 1 1.66.9L12 5h7a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5Z"/>
                </svg>
            </div>
        );
    }
});
const setFolderUrl = async (id: string, url: string) => {
    console.log(id, url);
    DataStore.get<config>(DATA_STORE_NAME).then(v => {
        if(v){
            v[id] = {
                type: ICON_TYPE.PNG,
                url: url
            };
            DataStore.set(DATA_STORE_NAME, v).then(() => { d = v; }).catch(e => {
                handleUpdateError(e);
            });
        }else{
            v = {};
            v[id] = {
                type: ICON_TYPE.PNG,
                url: url
            };
            DataStore.set(DATA_STORE_NAME, v).then(() => { d = v; }).catch(e => {
                handleUpdateError(e);
            });
        }
    }
    )
        .catch(e => {
            handleUpdateError(e);
        });
};
function ImageModal(a: { folderId: string }){
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
                setFolderUrl(a.folderId, v);
                closeModal("custom-folder-icon");
            }}
            >
                Set With Url
            </Button>
        </>
    );
}
function makeContextItem(id: string) {
    return (
        <Menu.MenuItem
            id="custom-folder-icons"
            key="custom-folder-icons"
            label="Change Icon"
            action={() => {
                console.log("menu clicked");
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
                                <ImageModal folderId={id}/>
                            </ModalContent>
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
    throw e;
}
