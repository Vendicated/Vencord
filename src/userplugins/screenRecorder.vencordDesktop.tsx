/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, removeContextMenuPatch } from "@api/ContextMenu";
import { ScreenshareIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { Menu, UploadHandler } from "@webpack/common";

const OptionClasses = findByPropsLazy("optionName", "optionIcon", "optionLabel");

let recoder: MediaRecorder;

export default definePlugin({
    name: "ScreenRecorder",
    description: "epic screen recorder lol",
    authors: [Devs.AutumnVN],
    contextMenus: {
        "channel-attach": startRecording
    }
});

function startRecording(children) {
    children.push(
        <Menu.MenuItem
            id="start-recording"
            label={
                <div className={OptionClasses.optionLabel}>
                    <ScreenshareIcon className={OptionClasses.optionIcon} height={24} width={24} />
                    <div className={OptionClasses.optionName}>Start Recording</div>
                </div>
            }
            action={async () => {
                const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: { frameRate: { ideal: 60 } } });
                recoder = new MediaRecorder(stream);
                recoder.start();
                removeContextMenuPatch("channel-attach", startRecording);
                addContextMenuPatch("channel-attach", stopRecording);
            }}
        />
    );
}

function stopRecording(children, props) {
    children.push(
        <Menu.MenuItem
            id="stop-recording"
            label={
                <div className={OptionClasses.optionLabel}>
                    <ScreenshareIcon className={OptionClasses.optionIcon} height={24} width={24} />
                    <div className={OptionClasses.optionName}>Stop Recording</div>
                </div>
            }
            action={() => {
                recoder.addEventListener("dataavailable", e => {
                    const file = new File([e.data], "watch if cute.webm", { type: "video/webm" });
                    UploadHandler.promptToUpload([file], props.channel, 0);
                });
                recoder.stop();
                removeContextMenuPatch("channel-attach", stopRecording);
                addContextMenuPatch("channel-attach", startRecording);
            }}
        />
    );
}
