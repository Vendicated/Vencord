/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs, EquicordDevs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

import { IconWithTooltip, LogIcon } from "./components/Icons";
import { openSoundBoardLog } from "./components/SoundBoardLog";
import settings from "./settings";
import { updateLoggedSounds } from "./store";
import styles from "./styles.css?managed";
import { getListeners } from "./utils";

const chatBarIcon: ChatBarButton = () => {
    return (
        <ChatBarButton tooltip="Open SoundBoard Log"
            onClick={openSoundBoardLog}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" className={"soundboardlogger-icon"} viewBox="1.134 10.59 87.732 68.821"><path fill="currentColor" d="M84.075 10.597 5.932 10.59a4.799 4.799 0 0 0-4.798 4.79v59.226a4.801 4.801 0 0 0 4.798 4.798l78.144.007a4.79 4.79 0 0 0 4.79-4.794V15.391a4.796 4.796 0 0 0-4.791-4.794zm-11.704 8.766c0-.283.229-.509.51-.509h7.105c.279 0 .501.226.501.509v7.102c0 .28-.222.509-.501.509h-7.105a.511.511 0 0 1-.51-.509v-7.102zm-63.968 0c0-.283.229-.509.509-.509h29.399c.28 0 .502.226.502.509v7.102c0 .28-.222.509-.502.509H8.912a.51.51 0 0 1-.509-.509v-7.102zm7.863 45.454a.727.727 0 0 1-.727.727H14.28v6.466c0 1-.822 1.821-1.829 1.821-.516 0-.97-.199-1.301-.53a1.829 1.829 0 0 1-.531-1.291v-6.466H9.51a.726.726 0 0 1-.727-.727v-6.854c0-.4.327-.727.727-.727h1.11V37.583c0-1.017.822-1.839 1.832-1.839.505 0 .96.211 1.291.542a1.8 1.8 0 0 1 .538 1.297v19.653h1.259c.4 0 .727.326.727.727v6.854zm11.02-13.204a.73.73 0 0 1-.727.728h-1.11v19.651a1.835 1.835 0 0 1-1.832 1.839c-.506 0-.96-.21-1.291-.541a1.8 1.8 0 0 1-.538-1.298V52.341H20.53a.73.73 0 0 1-.727-.728v-6.855c0-.403.327-.727.727-.727h1.259v-6.466a1.83 1.83 0 0 1 1.829-1.821c.516 0 .97.2 1.301.531.331.331.531.792.531 1.29v6.466h1.11c.4 0 .727.324.727.727v6.855zm11.268 13.204a.727.727 0 0 1-.727.727h-1.259v6.466c0 1-.821 1.821-1.829 1.821-.516 0-.97-.199-1.301-.53a1.828 1.828 0 0 1-.53-1.291v-6.466h-1.11a.726.726 0 0 1-.727-.727v-6.854c0-.4.327-.727.727-.727h1.11V37.583c0-1.017.821-1.839 1.832-1.839.505 0 .959.211 1.291.542a1.8 1.8 0 0 1 .538 1.297v19.653h1.259c.4 0 .727.326.727.727v6.854zm10.94-13.204a.73.73 0 0 1-.728.728h-1.11v19.651a1.835 1.835 0 0 1-1.832 1.839 1.82 1.82 0 0 1-1.29-.541 1.802 1.802 0 0 1-.539-1.298V52.341h-1.259a.73.73 0 0 1-.727-.728v-6.855c0-.403.327-.727.727-.727h1.259v-6.466c0-.999.822-1.821 1.829-1.821.516 0 .97.2 1.301.531.331.331.53.792.53 1.29v6.466h1.11c.4 0 .728.324.728.727v6.855zm8.703-32.25c0-.283.229-.509.508-.509h7.106c.279 0 .501.226.501.509v7.102c0 .28-.222.509-.501.509h-7.106a.51.51 0 0 1-.508-.509v-7.102zm4.176 53.927a4.083 4.083 0 0 1-4.082-4.082c0-2.25 1.828-4.078 4.082-4.078s4.078 1.828 4.078 4.078a4.08 4.08 0 0 1-4.078 4.082zm0-14.709a4.082 4.082 0 1 1 0-8.163 4.078 4.078 0 0 1 4.078 4.081 4.08 4.08 0 0 1-4.078 4.082zm0-14.713a4.082 4.082 0 0 1-4.082-4.081 4.08 4.08 0 0 1 8.16 0 4.079 4.079 0 0 1-4.078 4.081zM76.438 73.29a4.082 4.082 0 0 1-4.081-4.082 4.081 4.081 0 0 1 4.081-4.078 4.078 4.078 0 0 1 4.078 4.078 4.078 4.078 0 0 1-4.078 4.082zm0-14.709a4.081 4.081 0 0 1 0-8.163 4.078 4.078 0 0 1 4.078 4.081 4.08 4.08 0 0 1-4.078 4.082zm0-14.713a4.082 4.082 0 0 1-4.081-4.081 4.08 4.08 0 0 1 8.159 0 4.078 4.078 0 0 1-4.078 4.081z" /></svg>
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "SoundBoardLogger",
    authors: [
        EquicordDevs.Moxxie,
        EquicordDevs.fres,
        Devs.echo,
        EquicordDevs.thororen
    ],
    settings,
    patches: [
        {
            predicate: () => settings.store.IconLocation === "toolbar",
            find: ".iconBadge}):null",
            replacement: {
                match: /className:(\i).toolbar,children:(\i)/,
                replace: "className:$1.toolbar,children:$self.toolbarPatch($2)"
            }
        }
    ],
    description: "Logs all soundboards that are played in a voice chat and allows you to download them",
    start() {
        enableStyle(styles);
        FluxDispatcher.subscribe("VOICE_CHANNEL_EFFECT_SEND", async sound => {
            if (!sound?.soundId) return;
            await updateLoggedSounds(sound);
            getListeners().forEach(cb => cb());
        });
        if (settings.store.IconLocation === "chat") addChatBarButton("soundboardlogger-button", chatBarIcon);
    },
    stop() {
        disableStyle(styles);
        if (settings.store.IconLocation === "chat") removeChatBarButton("soundboardlogger-button");
    },
    toolbarPatch: obj => {
        if (!obj?.props?.children) return obj;
        obj.props.children = [<IconWithTooltip text="Open SoundBoard Log" icon={<LogIcon className="chatBarLogIcon" />} onClick={openSoundBoardLog} />, ...obj.props.children];
        return obj;
    }
});
