/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 sadan
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { makeContextItem } from "./components";
import settings, { folderIconsData } from "./settings";
import { int2rgba } from "./util";
export interface folderProp {
    folderId: string;
    folderColor: number;
}
export default definePlugin({
    settings,
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
    shouldReplace(props: any): boolean{
        return !!((settings.store.folderIcons as folderIconsData)?.[props.folderNode.id]?.url);
    },
    replace(props: any){
        const folderSettings = (settings.store.folderIcons as folderIconsData);
        if(folderSettings && folderSettings[props.folderNode.id]){
            const data = folderSettings[props.folderNode.id];
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
                    <img src={data!.url} width={`${data!.size ?? 100}%`} height={`${data!.size ?? 100}%`}
                    />
                </div>
            );
        }
    }
});
