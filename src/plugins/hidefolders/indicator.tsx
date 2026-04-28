/*
 * زر أسفل قائمة السيرفرات
 */

import "./style.css";

import { classNameFactory } from "@utils/css";
import { Button, useStateFromStores } from "@webpack/common";
import {
    addServerListElement,
    removeServerListElement,
    ServerListRenderPosition,
} from "@api/ServerList";

import { HiddenFoldersStore } from "./store";
import { openHiddenFoldersModal } from "./modal";

const cl = classNameFactory("vc-hidefolders-");

function HiddenFoldersButton() {
    const hiddenFolders = useStateFromStores(
        [HiddenFoldersStore],
        () => HiddenFoldersStore.hiddenFolders,
        undefined,
        (old, newer) => old.size === newer.size
    );

    const count = Array.from(hiddenFolders).length;

    return (
        <div className={cl("button-wrapper")}>
            {count > 0 ? (
                <Button
                    className={cl("button")}
                    look={Button.Looks.FILLED}
                    size={Button.Sizes.MIN}
                    onClick={() => openHiddenFoldersModal()}
                >
                    {count} Hidden Folders
                </Button>
            ) : null}
        </div>
    );
}

export function addIndicator() {
    addServerListElement(ServerListRenderPosition.Below, HiddenFoldersButton);
}

export function removeIndicator() {
    removeServerListElement(ServerListRenderPosition.Below, HiddenFoldersButton);
}
