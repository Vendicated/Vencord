/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    addContextMenuPatch,
    NavContextMenuPatchCallback,
    removeContextMenuPatch,
} from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import {
    addServerListElement,
    removeServerListElement,
    ServerListRenderPosition,
} from "@api/ServerList";
import { disableStyle, enableStyle } from "@api/Styles";
import { SwatchIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import {
    Flex,
    Menu,
    PermissionsBits,
    PermissionStore,
    SelectedChannelStore,
    Text,
} from "@webpack/common";

import ColorwaysButton from "./components/colorwaysButton";
import SelectorModal from "./components/selectorModal";
import style from "./style.css?managed";
import { canonicalizeHex, stringToHex } from "./utils";

export let LazySwatchLoaded = false;

interface ColorPickerProps {
    color: number;
    showEyeDropper: boolean;
    suggestedColors: string[];
    label: any;
    onChange(color: number): void;
}

export let ColorPicker: React.FunctionComponent<ColorPickerProps> = () => {
    return (
        <Text
            tag="h2"
            variant="heading-md/semibold"
            className="colorways-creator-module-warning"
        >
            Module is loading, please wait...
        </Text>
    );
};

// prettier-ignore
const defaultColorwaySource = "https://raw.githubusercontent.com/DaBluLite/DiscordColorways/master/index.json";

(async function () {
    const [customColorways, colorwaySourcesFiles] = await DataStore.getMany([
        "customColorways",
        "colorwaySourceFiles",
    ]);

    if (!customColorways) DataStore.set("customColorways", []);
    if (!colorwaySourcesFiles)
        DataStore.set("colorwaySourceFiles", [defaultColorwaySource]);
})();

export const ColorwayCSS = {
    get: () => document.getElementById("activeColorwayCSS")?.textContent || "",
    set: (e: string) => {
        if (!document.getElementById("activeColorwayCSS")) {
            var activeColorwayCSS: HTMLStyleElement =
                document.createElement("style");
            activeColorwayCSS.id = "activeColorwayCSS";
            activeColorwayCSS.textContent = e;
            document.head.append(activeColorwayCSS);
        } else document.getElementById("activeColorwayCSS")!.textContent = e;
    },
    remove: () => document.getElementById("activeColorwayCSS")!.remove(),
};

const ctxMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    if (
        props.channel.guild_id &&
        !PermissionStore.can(PermissionsBits.SEND_MESSAGES, props.channel)
    )
        return;
    children.push(
        <Menu.MenuItem
            id="colorways-send-id"
            label={
                <Flex
                    flexDirection="row"
                    style={{ alignItems: "center", gap: 8 }}
                >
                    <SwatchIcon />
                    Share Colorway via ID
                </Flex>
            }
            action={() => {
                const cs = getComputedStyle(document.body);

                const colorwayIDArray = [
                    "--brand-experiment",
                    "--background-primary",
                    "--background-secondary",
                    "--background-tertiary",
                ]
                    .map(p => canonicalizeHex(cs.getPropertyValue(p)))
                    .join(",");

                const colorwayID = stringToHex(colorwayIDArray);
                const channelId = SelectedChannelStore.getChannelId();
                sendMessage(channelId, {
                    content: `\`colorway:${colorwayID}\``,
                });
            }}
        />
    );
};

export default definePlugin({
    name: "DiscordColorways",
    description:
        "A plugin that offers easy access to simple color schemes/themes for Discord, also known as Colorways",
    authors: [Devs.DaBluLite, Devs.ImLvna],
    dependencies: ["ServerListAPI"],
    pluginVersion: "5.2.0",
    creatorVersion: "1.15",
    toolboxActions: {
        "Open Toolbox": () =>
            openModal(props => (
                <SelectorModal modalProps={props} visibleTabProps="toolbox" />
            )),
    },
    patches: [
        {
            find: ".colorPickerFooter",
            replacement: {
                match: /function (\i).{0,200}\.colorPickerFooter/,
                replace: "$self.ColorPicker=$1;$&",
            },
        },
    ],
    set ColorPicker(e) {
        ColorPicker = e;
        LazySwatchLoaded = true;
    },

    ColorwaysButton: () => <ColorwaysButton />,
    async start() {
        addContextMenuPatch("channel-attach", ctxMenuPatch);
        addServerListElement(ServerListRenderPosition.In, this.ColorwaysButton);

        enableStyle(style);
        ColorwayCSS.set((await DataStore.get("actveColorway")) || "");
    },
    stop() {
        removeContextMenuPatch("channel-attach", ctxMenuPatch);
        removeServerListElement(ServerListRenderPosition.In, this.ColorwaysButton);

        disableStyle(style);
        ColorwayCSS.remove();
    },
});
