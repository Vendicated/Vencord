/*
 * Vencord, a Discord client mod
 * HideFolders button
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { HiddenFoldersStore } from "@equicordplugins/hideFolders/store";
import { classNameFactory } from "@utils/css";
import { Button, useStateFromStores } from "@webpack/common";

import { openHiddenFoldersModal } from "./HiddenFoldersMenu";

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

export default () => <HiddenFoldersButton />;
