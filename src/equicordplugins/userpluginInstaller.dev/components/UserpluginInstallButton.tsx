/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 nin0
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Alerts, ChannelStore, useEffect, useState } from "@webpack/common";

import userpluginInstaller, { Native, OpenSettingsModule, settings } from "..";
import { CLONE_LINK_REGEX, showInstallFinishedAlert, WHITELISTED_SHARE_CHANNELS } from "../misc/constants";

export default function UserpluginInstallButton({ props }: any) {
    const [plugins, setPlugins] = useState<{
        directory?: string;
    }[]>([]);
    useEffect(() => {
        const { plugins } = userpluginInstaller;

        setPlugins(plugins.value());
        const cid = plugins.registerCallback(value => setPlugins(plugins.value()));
        return () => plugins.deregisterCallback(cid);
    });
    const { message } = props;
    if (![...WHITELISTED_SHARE_CHANNELS, ...(settings.store.allowlistedChannels || "").split(",")].includes(ChannelStore.getChannel(message.channel_id).parent_id) && !WHITELISTED_SHARE_CHANNELS.includes(message.channel_id))
        return;
    const gitLink = (props.message.content as string).match(CLONE_LINK_REGEX);
    if (!gitLink) return;
    const idpl = gitLink.includes("plugins.nin0.dev") ? 1 : 0;
    const installed = plugins.map(p => p.directory).includes(gitLink[[3, 6][idpl]]);
    return <>
        <div style={{ display: "flex" }}>
            <Button style={{
                marginTop: "5px"
            }}
                variant={installed ? "secondary" : "primary"}
                onClick={async () => {
                    if (installed) return void OpenSettingsModule.openUserSettings("vencord_userplugins_panel");
                    try {
                        const { name, native } = JSON.parse(await Native.initPluginInstall(gitLink[0], gitLink[[1, 4][idpl]], gitLink[[2, 5][idpl]], gitLink[[3, 6][idpl]]));
                        showInstallFinishedAlert(name, native);
                    }
                    catch (e: any) {
                        if (e.toString().includes("silentStop")) return;
                        Alerts.show({
                            title: "Install error",
                            body: e.toString()
                        });
                    }
                }}>
                {installed ? "Manage plugins" : "Install plugin"}
            </Button>
        </div>
    </>;
}
