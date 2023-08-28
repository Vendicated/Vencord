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

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { Settings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, SettingsRouter, Text, TextInput, useState } from "@webpack/common";
import { CSSProperties } from "react";

import style from "./style.css?managed";

interface Colorway {
    name: string,
    import: string,
    accent: string,
    primary: string,
    secondary: string,
    tertiary: string,
    original: boolean,
    author: string,
    authorID: string,
    colors: string[],
    isGradient: boolean;
}

let ColorPicker: React.ComponentType<any> = () => <Text variant="heading-md/semibold" tag="h2" className="colorways-creator-module-warning">Module is lazyloaded, open Settings first</Text>;

const colorPresets = [
    "#313338", "#2b2d31", "#1e1f22", "#5865f2"
];

if (!Settings.plugins.DiscordColorways.colorwaySourceFiles) {
    Settings.plugins.DiscordColorways.colorwaySourceFiles = ["https://raw.githubusercontent.com/DaBluLite/DiscordColorways/master/index.json"];
}

let CreatorModalID: string;

const createElement = (type, props, ...children) => {
    if (typeof type === "function") return type({ ...props, children: [].concat() });

    const node = document.createElement(type || "div");

    for (const key of Object.keys(props)) {
        if (key.indexOf("on") === 0) node.addEventListener(key.slice(2).toLowerCase(), props[key]);
        else if (key === "children") {
            node.append(...(Array.isArray(props[key]) ? props[key] : [].concat(props[key])));
        } else if (key === "innertext") {
            node.textContent = props[key];
        } else {
            node.setAttribute(key === "className" ? "class" : key, props[key]);
        }
    }

    if (children.length) node.append(...children);

    return node;
};

const ColorwaysButton = () => (
    <div className="ColorwaySelectorBtnContainer">
        <div className="ColorwaySelectorBtn" onClick={() => {
            var colorways = new Array<Colorway>;
            Settings.plugins.DiscordColorways.colorwaySourceFiles.forEach((colorwayList, i) => {
                fetch(colorwayList)
                    .then(response => response.json())
                    .then(data => {
                        if (!data) return;
                        if (!data.colorways?.length) return;
                        data.colorways.map((color: Colorway) => {
                            colorways.push(color);
                        });
                        if (i + 1 === Settings.plugins.DiscordColorways.colorwaySourceFiles.length) {
                            SettingsRouter.open("Appearance");
                            openModal(props => <SelectorModal modalProps={props} colorwayProps={colorways} />);
                        }
                    })
                    .catch(err => {
                        console.log(err);
                        return null;
                    });
            });
        }}><div className="colorwaySelectorIcon"></div></div>
    </div >
);

function CreatorModal({ modalProps }: { modalProps: ModalProps; }) {
    var initialSwatchVars = { "--brand-500-hsl": "235 calc(var(--saturation-factor, 1)*85.6%) 64.7%", "--primary-600-hsl": "223 calc(var(--saturation-factor, 1)*6.7%) 20.6%", "--primary-630-hsl": "220 calc(var(--saturation-factor, 1)*6.5%) 18%", "--primary-700-hsl": "225 calc(var(--saturation-factor, 1)*6.3%) 12.5%" } as CSSProperties;
    const [accentColor, setAccentColor] = useState<string>("5865f2");
    const [primaryColor, setPrimaryColor] = useState<string>("313338");
    const [secondaryColor, setSecondaryColor] = useState<string>("2b2d31");
    const [tertiaryColor, setTertiaryColor] = useState<string>("1e1f22"); 3;
    return (
        <ModalRoot {...modalProps} className="colorwayCreator-modal">
            <ModalHeader><Text variant="heading-lg/semibold" tag="h1">Create Colorway</Text></ModalHeader>
            <ModalContent className="colorwayCreator-menuWrapper">
                <Text variant="eyebrow" tag="h2">Name:</Text>
                <TextInput placeholder="Give your Colorway a name"></TextInput>
                <Text variant="eyebrow" tag="h2">Colors:</Text>
                <div className="colorwayCreator-colorPreviews" style={initialSwatchVars}>
                    <ColorPicker
                        color={parseInt(primaryColor, 16)}
                        onChange={(color: number) => {
                            setPrimaryColor(color.toString(16));
                        }}
                        showEyeDropper={true}
                        suggestedColors={colorPresets}
                    />
                    <ColorPicker
                        color={parseInt(secondaryColor, 16)}
                        onChange={(color: number) => {
                            setSecondaryColor(color.toString(16));
                        }}
                        showEyeDropper={true}
                        suggestedColors={colorPresets}
                    />
                    <ColorPicker
                        color={parseInt(tertiaryColor, 16)}
                        onChange={(color: number) => {
                            setTertiaryColor(color.toString(16));
                        }}
                        showEyeDropper={true}
                        suggestedColors={colorPresets}
                    />
                    <ColorPicker
                        color={parseInt(accentColor, 16)}
                        onChange={(color: number) => {
                            setAccentColor(color.toString(16));
                        }}
                        showEyeDropper={true}
                        suggestedColors={colorPresets}
                    />
                </div>
            </ModalContent>
            <ModalFooter>
                <Button style={{ marginLeft: 8 }} color={Button.Colors.BRAND} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => { closeModal(CreatorModalID); }}>Finish</Button><Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED}>Copy Current Colors</Button><Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED}>Enter Colorway ID</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

function SelectorModal({ modalProps, colorwayProps }: { modalProps: ModalProps, colorwayProps: Colorway[]; }) {
    const [currentColorway, setCurrentColorway] = useState(Settings.plugins.DiscordColorways.activeColorwayID);
    const [colorways, setColorways] = useState<Colorway[]>(colorwayProps);
    return (
        <ModalRoot {...modalProps} className="colorwaySelectorModal">
            <ModalContent className="colorwaySelectorModalContent">
                <Text variant="eyebrow" tag="h2">Colorways</Text>
                <div className="ColorwaySelectorWrapper">
                    <div className="discordColorway" id="colorway-refreshcolorway" onClick={() => {
                        var colorwaysArr = new Array<Colorway>;
                        Settings.plugins.DiscordColorways.colorwaySourceFiles.forEach((colorwayList, i) => {
                            fetch(colorwayList)
                                .then(response => response.json())
                                .then(data => {
                                    if (!data) return;
                                    if (!data.colorways?.length) return;
                                    data.colorways.map((color: Colorway) => {
                                        colorwaysArr.push(color);
                                    });
                                    if (i + 1 === Settings.plugins.DiscordColorways.colorwaySourceFiles.length) {
                                        setColorways(colorwaysArr);
                                    }
                                })
                                .catch(err => {
                                    console.log(err);
                                    return null;
                                });
                        });
                    }}><div className="colorwayRefreshIcon"></div></div>
                    <div className="discordColorway" id="colorway-createcolorway" onClick={() => { CreatorModalID = openModal(props => <CreatorModal modalProps={props} />); }}><div className="colorwayCreateIcon">
                        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 11.1111H12.8889V4H11.1111V11.1111H4V12.8889H11.1111V20H12.8889V12.8889H20V11.1111Z" /></svg>
                    </div></div>
                    {colorways.map((color, ind) => {
                        var colors: Array<string> = color.colors || ["accent", "primary", "secondary", "tertiary"];
                        // eslint-disable-next-line no-unneeded-ternary
                        return <div className={`discordColorway${currentColorway === color.name ? " active" : ""}`} id={"colorway-" + color.name} data-last-official={ind + 1 === colorways.length ? true : false}>
                            <div className="colorwayCheckIconContainer">
                                <div className="colorwayCheckIcon">
                                    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M8.99991 16.17L4.82991 12L3.40991 13.41L8.99991 19L20.9999 7.00003L19.5899 5.59003L8.99991 16.17Z"></path></svg>
                                </div>
                            </div>
                            <div className="colorwayInfoIconContainer" onClick={() => { }}>
                                <div className="colorwayInfoIcon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" /></svg>
                                </div>
                            </div>
                            <div className="discordColorwayPreviewColorContainer" onClick={() => {
                                if (Settings.plugins.DiscordColorways.activeColorwayID === color.name) {
                                    Settings.plugins.DiscordColorways.activeColorwayID = null;
                                    Settings.plugins.DiscordColorways.activeColorway = null;
                                    if (document.getElementById("activeColorwayCSS")) {
                                        document.getElementById("activeColorwayCSS")!.remove();
                                    }
                                } else {
                                    Settings.plugins.DiscordColorways.activeColorwayID = color.name;
                                    Settings.plugins.DiscordColorways.activeColorway = color.import;
                                    document.getElementById("activeColorwayCSS") ?
                                        document.getElementById("activeColorwayCSS")!.textContent = color.import :
                                        document.head.append(createElement("style", { id: "activeColorwayCSS", innertext: color.import }));
                                }
                                setCurrentColorway(Settings.plugins.DiscordColorways.activeColorwayID);
                            }}>
                                {colors.map(colorItm => {
                                    return <div className="discordColorwayPreviewColor" style={{ backgroundColor: color[colorItm] }}></div>;
                                })}
                            </div>
                        </div>;
                    })}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

function SelectorUI({ colorwayProps }: { colorwayProps: Colorway[]; }) {
    const [currentColorway, setCurrentColorway] = useState(Settings.plugins.DiscordColorways.activeColorwayID);
    const [colorways, setColorways] = useState<Colorway[]>(colorwayProps);
    return (
        <div className="colorwaySelectorModalContent">
            <Text variant="eyebrow" tag="h2">Colorways</Text>
            <div className="ColorwaySelectorWrapper">
                <div className="discordColorway" id="colorway-refreshcolorway" onClick={() => {
                    var colorwaysArr = new Array<Colorway>;
                    Settings.plugins.DiscordColorways.colorwaySourceFiles.forEach((colorwayList, i) => {
                        fetch(colorwayList)
                            .then(response => response.json())
                            .then(data => {
                                if (!data) return;
                                if (!data.colorways?.length) return;
                                data.colorways.map((color: Colorway) => {
                                    colorwaysArr.push(color);
                                });
                                if (i + 1 === Settings.plugins.DiscordColorways.colorwaySourceFiles.length) {
                                    setColorways(colorwaysArr);
                                }
                            })
                            .catch(err => {
                                console.log(err);
                                return null;
                            });
                    });
                }}><div className="colorwayRefreshIcon"></div></div>
                <div className="discordColorway" id="colorway-createcolorway" onClick={() => { openModal(props => <CreatorModal modalProps={props} />); }}><div className="colorwayCreateIcon">
                    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 11.1111H12.8889V4H11.1111V11.1111H4V12.8889H11.1111V20H12.8889V12.8889H20V11.1111Z" /></svg>
                </div></div>
                {colorways.map((color, ind) => {
                    var colors: Array<string> = color.colors || ["accent", "primary", "secondary", "tertiary"];
                    // eslint-disable-next-line no-unneeded-ternary
                    return <div className={`discordColorway${currentColorway === color.name ? " active" : ""}`} id={"colorway-" + color.name} data-last-official={ind + 1 === colorways.length ? true : false}>
                        <div className="colorwayCheckIconContainer">
                            <div className="colorwayCheckIcon">
                                <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M8.99991 16.17L4.82991 12L3.40991 13.41L8.99991 19L20.9999 7.00003L19.5899 5.59003L8.99991 16.17Z"></path></svg>
                            </div>
                        </div>
                        <div className="colorwayInfoIconContainer" onClick={() => { }}>
                            <div className="colorwayInfoIcon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" /></svg>
                            </div>
                        </div>
                        <div className="discordColorwayPreviewColorContainer" onClick={() => {
                            if (Settings.plugins.DiscordColorways.activeColorwayID === color.name) {
                                Settings.plugins.DiscordColorways.activeColorwayID = null;
                                Settings.plugins.DiscordColorways.activeColorway = null;
                                if (document.getElementById("activeColorwayCSS")) {
                                    document.getElementById("activeColorwayCSS")!.remove();
                                }
                            } else {
                                Settings.plugins.DiscordColorways.activeColorwayID = color.name;
                                Settings.plugins.DiscordColorways.activeColorway = color.import;
                                document.getElementById("activeColorwayCSS") ?
                                    document.getElementById("activeColorwayCSS")!.textContent = color.import :
                                    document.head.append(createElement("style", { id: "activeColorwayCSS", innertext: color.import }));
                            }
                            setCurrentColorway(Settings.plugins.DiscordColorways.activeColorwayID);
                        }}>
                            {colors.map(colorItm => {
                                return <div className="discordColorwayPreviewColor" style={{ backgroundColor: color[colorItm] }}></div>;
                            })}
                        </div>
                    </div>;
                })}
            </div>
        </div>
    );
}

export default definePlugin({
    name: "DiscordColorways",
    description: "The definitive way to style Discord (Official Colorways only for now).",
    authors: [Devs.DaBluLite],
    dependencies: ["ServerListAPI"],
    patches: [
        {
            find: ".colorPickerFooter",
            replacement: {
                match: /function (\i).{0,200}\.colorPickerFooter/,
                replace: "$self.ColorPicker=$1;$&"
            }
        },
        {
            find: ".Basic",
            replacement: {
                match: /_e.Basic = function(e)/,
                replace: "$self.SelectorUI=$1;$&"
            }
        }
    ],
    set ColorPicker(e: any) {
        ColorPicker = e;
    },
    start: () => {
        enableStyle(style);
        addServerListElement(ServerListRenderPosition.Above, () => <ColorwaysButton />);

        document.getElementById("activeColorwayCSS") ?
            document.getElementById("activeColorwayCSS")!.textContent = Settings.plugins.DiscordColorways.activeColorway :
            document.head.append(createElement("style", { id: "activeColorwayCSS", innertext: Settings.plugins.DiscordColorways.activeColorway }));
    },
    stop: () => {
        disableStyle(style);
        removeServerListElement(ServerListRenderPosition.Above, () => <ColorwaysButton />);
        document.getElementById("activeColorwayCSS") ?
            document.getElementById("activeColorwayCSS")?.remove() :
            console.log("No Active Colorway.");
    }
});
