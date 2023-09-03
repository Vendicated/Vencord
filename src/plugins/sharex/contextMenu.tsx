import {
    addContextMenuPatch,
    findGroupChildrenByChildId,
    NavContextMenuPatchCallback,
    removeContextMenuPatch,
} from "@api/ContextMenu";
import { Flex, Menu, Toasts } from "@webpack/common";
import { ReactElement } from "react";
import { Settings } from "Vencord";
import { upload } from "./index";
import { getExtension, showToast } from "./utils";

/**
 * Create the context menu.
 */
export function createContextMenu() {
    addContextMenuPatch("message", MessageContextMenu);
}

/**
 * Cleanup the context menu.
 */
export function cleanupContextMenu() {
    removeContextMenuPatch("message", MessageContextMenu);
}

const MessageContextMenu: NavContextMenuPatchCallback = (children: Array<ReactElement | null>, props: any) => () => {
    const { itemHref, itemSrc } = props;
    const settings = Settings.plugins.ShareX; // The plugin settings
    const mediaSrc: string | undefined = itemHref ?? itemSrc; // The src of the media
    if (!mediaSrc) {
        return;
    }
    const extension: string | undefined = getExtension(mediaSrc); // The extension of the media
    if (!mediaSrc || !extension || !settings.supportedExtensions.split(",").includes(extension)) {
        return;
    }
    const container: Array<ReactElement | null> | null = findGroupChildrenByChildId("copy-link", children); // Get the copy link container
    if (!container) {
        return;
    }
    const id: number = container.findIndex((c) => c?.props?.id === "message-copy-link");

    // Append our menu item
    container.splice(id, 0, <>
        <Menu.MenuItem
            id="sharex"
            label={
                <Flex style={{ alignItems: "center", gap: "0.5em" }}>
                    <img
                        style={{ borderRadius: "50%" }}
                        aria-hidden="true"
                        width={16}
                        height={16}
                        src="https://cdn.rainnny.club/Giqu2R4HfMQM.png"
                    />
                    Upload to ShareX
                </Flex>
            }
            action={async () => {
                showToast(Toasts.Type.MESSAGE, "Uploading..."); // Inform the user that we're uploading
                try {
                    const uploadedUrl: string = await upload(mediaSrc, extension); // Upload the media

                    // Inform of the successful upload
                    showToast(Toasts.Type.SUCCESS, `Uploaded, copied to clipboard!${settings.showUrlAfterUpload ? ` ${uploadedUrl}` : ""}`);
                } catch (err: any) {
                    showToast(Toasts.Type.FAILURE, err.message);
                    throw err;
                }
            }}
        />
    </>);
};
