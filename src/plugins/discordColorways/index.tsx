/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { addContextMenuPatch, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { disableStyle, enableStyle } from "@api/Styles";
import { SwatchIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Flex, Menu, PermissionsBits, PermissionStore, SelectedChannelStore, Text } from "@webpack/common";

import ColorwaysButton from "./components/colorwaysButton";
import SelectorModal from "./components/selectorModal";
import style from "./style.css?managed";
import { Colorway } from "./types";

export let ColorPicker: React.ComponentType<any> = () => <Text variant="heading-md/semibold" tag="h2" className="colorways-creator-module-warning">Module is loading, please wait...</Text>;

export let LazySwatchLoaded = false;

DataStore.get("colorwaySourceFiles").then(e => { if (!e) DataStore.set("colorwaySourceFiles", ["https://raw.githubusercontent.com/DaBluLite/DiscordColorways/master/index.json"]); });
DataStore.get("customColorways").then(e => { if (!e) DataStore.set("customColorways", []); });

export const ColorwayCSS = {
    get: () => document.getElementById("activeColorwayCSS")?.textContent || "",
    set: (e: string) => {
        if (!document.getElementById("activeColorwayCSS")) {
            var activeColorwayCSS: HTMLStyleElement = document.createElement("style");
            activeColorwayCSS.id = "activeColorwayCSS";
            activeColorwayCSS.textContent = e;
            document.head.append(activeColorwayCSS);
        } else document.getElementById("activeColorwayCSS")!.textContent = e;
    },
    remove: () => document.getElementById("activeColorwayCSS")!.remove()
};


const ctxMenuPatch: NavContextMenuPatchCallback = (children, props) => () => {
    if (props.channel.guild_id && !(PermissionStore.can(PermissionsBits.SEND_MESSAGES, props.channel))) return;
    children.push(
        <Menu.MenuItem
            id="colorways-send-id"
            label={
                <>
                    <Flex flexDirection="row" style={{ alignItems: "center", gap: 8 }}>
                        <SwatchIcon style={{ scale: "0.8" }} />
                        Share Colorway via ID
                    </Flex>
                </>
            }
            action={() => {
                function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
                const stringToHex = (str: string) => {
                    let hex = "";
                    for (let i = 0; i < str.length; i++) {
                        const charCode = str.charCodeAt(i);
                        const hexValue = charCode.toString(16);
                        hex += hexValue.padStart(2, "0");
                    }
                    return hex;
                };
                const colorwayIDArray = `#${getHex(getComputedStyle(document.body).getPropertyValue("--brand-experiment")).split("#")[1]},#${getHex(getComputedStyle(document.body).getPropertyValue("--background-primary")).split("#")[1]},#${getHex(getComputedStyle(document.body).getPropertyValue("--background-secondary")).split("#")[1]},#${getHex(getComputedStyle(document.body).getPropertyValue("--background-tertiary")).split("#")[1]}`;
                const colorwayID = stringToHex(colorwayIDArray);
                const channelId = SelectedChannelStore.getChannelId();
                sendMessage(channelId, { content: `\`colorway:${colorwayID}\`` });
            }}
        />
    );
};

export const fallbackColorways = [
    {
        "name": "Keyboard Purple",
        "original": false,
        "accent": "hsl(235 85.6% 64.7%)",
        "primary": "#222456",
        "secondary": "#1c1f48",
        "tertiary": "#080d1d",
        "import": "@import url(//dablulite.github.io/DiscordColorways/KeyboardPurple/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Eclipse",
        "original": false,
        "accent": "hsl(87 85.6% 64.7%)",
        "primary": "#000000",
        "secondary": "#181818",
        "tertiary": "#0a0a0a",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Eclipse/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Cyan",
        "original": false,
        "accent": "#009f88",
        "primary": "#202226",
        "secondary": "#1c1e21",
        "tertiary": "#141517",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Cyan/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Spotify",
        "original": false,
        "accent": "hsl(141 76% 48%)",
        "primary": "#121212",
        "secondary": "#090909",
        "tertiary": "#090909",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Spotify/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Bright n' Blue",
        "original": true,
        "accent": "hsl(234, 68%, 33%)",
        "primary": "#394aae",
        "secondary": "#29379d",
        "tertiary": "#1b278d",
        "import": "@import url(//dablulite.github.io/DiscordColorways/BrightBlue/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Still Young",
        "original": true,
        "accent": "hsl(58 85.6% 89%)",
        "primary": "#443a31",
        "secondary": "#7c3d3e",
        "tertiary": "#207578",
        "import": "@import url(//dablulite.github.io/DiscordColorways/StillYoung/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Sea",
        "original": true,
        "accent": "hsl(184, 100%, 50%)",
        "primary": "#07353b",
        "secondary": "#0b5e60",
        "tertiary": "#08201d",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Sea/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Lava",
        "original": true,
        "accent": "hsl(4, 80.4%, 32%)",
        "primary": "#401b17",
        "secondary": "#351917",
        "tertiary": "#230b0b",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Lava/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Solid Pink",
        "original": true,
        "accent": "hsl(340, 55.2%, 56.3%)",
        "primary": "#1e151c",
        "secondary": "#21181f",
        "tertiary": "#291e27",
        "import": "@import url(//dablulite.github.io/DiscordColorways/SolidPink/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Sand",
        "original": true,
        "accent": "hsl(41, 31%, 45%)",
        "primary": "#7f6c43",
        "secondary": "#665b33",
        "tertiary": "#5c5733",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Sand/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "AMOLED",
        "original": true,
        "accent": "hsl(235 85.6% 64.7%)",
        "primary": "#000000",
        "secondary": "#000000",
        "tertiary": "#000000",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Amoled/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Zorin",
        "original": false,
        "accent": "hsl(200, 89%, 86%)",
        "primary": "#171d20",
        "secondary": "#171d20",
        "tertiary": "#1e2529",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Zorin/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Desaturated",
        "original": false,
        "accent": "hsl(227, 58%, 65%)",
        "primary": "#35383d",
        "secondary": "#2c2f34",
        "tertiary": "#1e1f24",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Desaturated/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Crimson",
        "original": false,
        "accent": "hsl(0, 100%, 50%)",
        "primary": "#050000",
        "secondary": "#0a0000",
        "tertiary": "#0f0000",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Crimson/import.css);",
        "author": "Riddim_GLiTCH",
        "authorID": "801089753038061669"
    },
    {
        "name": "Jupiter",
        "original": true,
        "accent": "#ffd89b",
        "primary": "#ffd89b",
        "secondary": "#19547b",
        "tertiary": "#1e1f22",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Jupiter/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594",
        "isGradient": true,
        "colors": ["accent", "primary", "secondary"]
    },
    {
        "name": "Neon Candy",
        "original": true,
        "accent": "#FC00FF",
        "primary": "#00DBDE",
        "secondary": "#00DBDE",
        "tertiary": "#00DBDE",
        "import": "@import url(//dablulite.github.io/DiscordColorways/NeonCandy/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594",
        "isGradient": true,
        "colors": ["accent", "primary"]
    },
    {
        "name": "Wildberry",
        "original": false,
        "accent": "#f40172",
        "primary": "#180029",
        "secondary": "#340057",
        "tertiary": "#4b007a",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Wildberry/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Facebook",
        "original": false,
        "accent": "#2375e1",
        "primary": "#18191a",
        "secondary": "#242526",
        "tertiary": "#3a3b3c",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Facebook/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Material You",
        "original": false,
        "accent": "#004977",
        "primary": "#1f1f1f",
        "secondary": "#28292a",
        "tertiary": "#2d2f31",
        "import": "@import url(//dablulite.github.io/DiscordColorways/MaterialYou/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "Discord Teal",
        "original": false,
        "accent": "#175f6d",
        "primary": "#313338",
        "secondary": "#2b2d31",
        "tertiary": "#1e1f22",
        "import": "@import url(//dablulite.github.io/css-snippets/DiscordTeal/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594",
        "colors": ["accent"]
    },
    {
        "name": "黄昏の花 (Twilight Blossom)",
        "original": true,
        "accent": "#e100ff",
        "primary": "#04000a",
        "secondary": "#0b0024",
        "tertiary": "#210042",
        "import": "@import url(//dablulite.github.io/DiscordColorways/TwilightBlossom/import.css);",
        "author": "Riddim_GLiTCH",
        "authorID": "801089753038061669"
    },
    {
        "name": "Chai",
        "original": true,
        "accent": "#59cd51",
        "primary": "#1c1e15",
        "secondary": "#1e2118",
        "tertiary": "#24291e",
        "import": "@import url(//dablulite.github.io/DiscordColorways/Chai/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    },
    {
        "name": "CS1.6",
        "original": false,
        "accent": "#929a8d",
        "primary": "#3f4738",
        "secondary": "#5b6c51",
        "tertiary": "#4d5945",
        "import": "@import url(//dablulite.github.io/DiscordColorways/CS16/import.css);",
        "author": "DaBluLite",
        "authorID": "582170007505731594"
    }
];

export default definePlugin({
    name: "DiscordColorways",
    description: "The definitive way to style Discord.",
    authors: [Devs.DaBluLite, Devs.ImLvna],
    dependencies: ["ServerListAPI"],
    pluginVersion: "5.2.0",
    creatorVersion: "1.15",
    toolboxActions: {
        "Open Toolbox": () => {
            var colorways: Colorway[] = [];
            DataStore.get("colorwaySourceFiles").then(
                colorwaySourceFiles => {
                    colorwaySourceFiles.forEach(
                        (colorwayList: string, i: number) => {
                            fetch(colorwayList)
                                .then(response => response.json())
                                .then((data: { colorways: Colorway[]; }) => {
                                    if (!data) return;
                                    if (!data.colorways?.length) return;
                                    data.colorways.map((color: Colorway) => colorways.push(color));
                                    if (++i === colorwaySourceFiles.length) {
                                        DataStore.get("customColorways").then(customColorways => DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                            openModal(props => <SelectorModal modalProps={props} colorwayProps={colorways} customColorwayProps={customColorways} activeColorwayProps={actveColorwayID} visibleTabProps="toolbox" />);
                                        }));
                                    }
                                })
                                .catch(err => {
                                    console.log(err);
                                    return null;
                                });
                        }
                    );
                }
            );
        }
    },
    patches: [
        {
            find: ".colorPickerFooter",
            replacement: {
                match: /function (\i).{0,200}\.colorPickerFooter/,
                replace: "$self.ColorPicker=$1;$&"
            }
        }
    ],
    set ColorPicker(e: any) {
        ColorPicker = e;
        LazySwatchLoaded = true;
    },
    start: () => {
        enableStyle(style);


        DataStore.get("actveColorway").then(activeColorway => {
            ColorwayCSS.set(activeColorway);
        });
        addContextMenuPatch("channel-attach", ctxMenuPatch);
        addServerListElement(ServerListRenderPosition.Above, () => <ColorwaysButton />);
    },
    stop: () => {
        disableStyle(style);
        removeServerListElement(ServerListRenderPosition.Above, () => <ColorwaysButton />);
        ColorwayCSS.remove();
        removeContextMenuPatch("channel-attach", ctxMenuPatch);
    }
});
