import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ScreenshareIcon } from "@components/Icons";
import { Menu, SelectedChannelStore } from "@webpack/common";

import { createStreamConfig, createWebcamConfig, getStreamKey, getWebcamKey } from "./constants";
import {
    closeVideoPopIn,
    createVideoPopIn,
    currentChannelId,
    openWindows
} from "./components/FloatingWindow";
import { StreamingStore } from "./stores";
import { Stream, StreamContextProps, UserContextProps } from "./types";

/**
 * Context menu patch for stream context - adds "Pop Out Stream" option.
 */
export const streamContextPatch: NavContextMenuPatchCallback = (children, { stream }: StreamContextProps) => {
    const key = getStreamKey(stream);
    const isOpen = openWindows.has(key);

    children.push(
        <Menu.MenuSeparator />,
        <Menu.MenuItem
            id="pop-out-stream"
            label={isOpen ? "Close Stream Popout" : "Pop Out Stream"}
            icon={ScreenshareIcon}
            action={(e: any) => {
                const doc = e?.view?.document || document;
                if (isOpen) {
                    closeVideoPopIn(key, stream.ownerId);
                } else {
                    createVideoPopIn(createStreamConfig(stream, doc));
                }
            }}
        />
    );
};

/**
 * Context menu patch for user context - adds stream and webcam popout options.
 */
export const userContextPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user) return;

    const channelId = currentChannelId || SelectedChannelStore.getVoiceChannelId() || "";

    // Check for stream first
    if (StreamingStore) {
        const stream = StreamingStore.getAnyStreamForUser(user.id);
        if (stream) {
            const key = getStreamKey(stream as Stream);
            const isOpen = openWindows.has(key);

            children.push(
                <Menu.MenuSeparator />,
                <Menu.MenuItem
                    id="pop-out-stream"
                    label={isOpen ? "Close Stream Popout" : "Pop Out Stream"}
                    icon={ScreenshareIcon}
                    action={(e: any) => {
                        const doc = e?.view?.document || document;
                        if (isOpen) {
                            closeVideoPopIn(key, (stream as Stream).ownerId);
                        } else {
                            createVideoPopIn(createStreamConfig(stream as Stream, doc));
                        }
                    }}
                />
            );
        }
    }

    // Always offer webcam popout option (for users in voice with camera)
    if (channelId) {
        const key = getWebcamKey(user.id, channelId);
        const isOpen = openWindows.has(key);

        children.push(
            <Menu.MenuSeparator />,
            <Menu.MenuItem
                id="pop-out-webcam"
                label={isOpen ? "Close Webcam Popout" : "Pop Out Webcam"}
                icon={ScreenshareIcon}
                action={(e: any) => {
                    const doc = e?.view?.document || document;
                    if (isOpen) {
                        closeVideoPopIn(key, user.id);
                    } else {
                        createVideoPopIn(createWebcamConfig(user.id, channelId, doc));
                    }
                }}
            />
        );
    }
};
