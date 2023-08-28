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

import * as DataStore from "@api/DataStore";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { Settings } from "@api/Settings";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, SettingsRouter, Text, TextInput, UserStore, useState } from "@webpack/common";
import { CSSProperties } from "react";

import style from "./style.css?managed";

interface Colorway {
    name: string,
    import: string,
    accent: string,
    primary: string,
    secondary: string,
    tertiary: string,
    original?: boolean,
    author: string,
    authorID: string,
    colors?: string[],
    isGradient?: boolean,
    hidden?: boolean;
}

let ColorPicker: React.ComponentType<any> = () => <Text variant="heading-md/semibold" tag="h2" className="colorways-creator-module-warning">Module is lazyloaded, open Settings first</Text>;

const placeholderColorway: Colorway = {
    name: "Colorway",
    import: "",
    accent: "",
    primary: "",
    secondary: "",
    tertiary: "",
    author: "",
    authorID: "",
    hidden: true
};

const colorPresets = [
    "#313338", "#2b2d31", "#1e1f22", "#5865f2"
];

let LazySwatchLoaded: boolean = false;

DataStore.get("colorwaySourceFiles").then(e => {
    if (!e) {
        DataStore.set("colorwaySourceFiles", ["https://raw.githubusercontent.com/DaBluLite/DiscordColorways/master/index.json"]);
    }
});

DataStore.get("customColorways").then(e => {
    if (!e) {
        DataStore.set("customColorways", []);
    }
});

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

function HexToHSL(H) {
    let r: any = 0, g: any = 0, b: any = 0;
    if (H.length === 4) {
        r = "0x" + H[1] + H[1];
        g = "0x" + H[2] + H[2];
        b = "0x" + H[3] + H[3];
    } else if (H.length === 7) {
        r = "0x" + H[1] + H[2];
        g = "0x" + H[3] + H[4];
        b = "0x" + H[5] + H[6];
    }
    r /= 255;
    g /= 255;
    b /= 255;
    var cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin, h = 0, s = 0, l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);

    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return [Math.round(h), Math.round(s), Math.round(l)];
}

const ColorwaysButton = () => (
    <div className="ColorwaySelectorBtnContainer">
        <div className="ColorwaySelectorBtn" onClick={() => {
            var colorways = new Array<Colorway>;
            DataStore.get("colorwaySourceFiles").then(colorwaySourceFiles => {
                colorwaySourceFiles.forEach((colorwayList, i) => {
                    fetch(colorwayList)
                        .then(response => response.json())
                        .then(data => {
                            if (!data) return;
                            if (!data.colorways?.length) return;
                            data.colorways.map((color: Colorway) => {
                                colorways.push(color);
                            });
                            if (i + 1 === colorwaySourceFiles.length) {
                                if (LazySwatchLoaded === false) {
                                    SettingsRouter.open("Appearance");
                                }
                                openModal(props => <SelectorModal modalProps={props} colorwayProps={colorways} />);
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            return null;
                        });
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
    const [tertiaryColor, setTertiaryColor] = useState<string>("1e1f22");
    const [colorwayName, setColorwayName] = useState<string>("");
    const [tintedText, setTintedText] = useState<boolean>(true);
    return (
        <ModalRoot {...modalProps} className="colorwayCreator-modal">
            <ModalHeader><Text variant="heading-lg/semibold" tag="h1">Create Colorway</Text></ModalHeader>
            <ModalContent className="colorwayCreator-menuWrapper">
                <Text variant="eyebrow" tag="h2">Name:</Text>
                <TextInput placeholder="Give your Colorway a name" value={colorwayName} onChange={setColorwayName}></TextInput>
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
                <Button style={{ marginLeft: 8 }} color={Button.Colors.BRAND} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                    const customColorwayCSS = `/*Automatically Generated - Colorway Creator V1.14*/
                    :root {
                        --brand-100-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 13))}%;
                        --brand-130-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 12))}%;
                        --brand-160-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 11))}%;
                        --brand-200-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 10))}%;
                        --brand-230-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 9))}%;
                        --brand-260-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 8))}%;
                        --brand-300-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 7))}%;
                        --brand-330-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 6))}%;
                        --brand-345-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 5))}%;
                        --brand-360-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 4))}%;
                        --brand-400-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 3))}%;
                        --brand-430-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 2))}%;
                        --brand-460-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] + 3.6)}%;
                        --brand-500-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${HexToHSL("#" + accentColor)[2]}%;
                        --brand-530-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] - 3.6)}%;
                        --brand-560-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 2))}%;
                        --brand-600-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 3))}%;
                        --brand-630-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 4))}%;
                        --brand-660-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 5))}%;
                        --brand-700-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 6))}%;
                        --brand-730-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 7))}%;
                        --brand-760-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 8))}%;
                        --brand-800-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 9))}%;
                        --brand-830-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 10))}%;
                        --brand-860-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 11))}%;
                        --brand-900-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 12))}%;
                        --primary-800-hsl: ${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + tertiaryColor)[1]}%) ${HexToHSL("#" + tertiaryColor)[2] + 10.8}%;
                        --primary-730-hsl: ${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + tertiaryColor)[1]}%) ${HexToHSL("#" + tertiaryColor)[2]}%;
                        --primary-700-hsl: ${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + tertiaryColor)[1]}%) ${HexToHSL("#" + tertiaryColor)[2]}%;
                        --primary-660-hsl: ${HexToHSL("#" + secondaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + secondaryColor)[1]}%) ${HexToHSL("#" + secondaryColor)[2] + 2.6}%;
                        --primary-645-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${HexToHSL("#" + primaryColor)[2] - 5}%;
                        --primary-630-hsl: ${HexToHSL("#" + secondaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + secondaryColor)[1]}%) ${HexToHSL("#" + secondaryColor)[2]}%;
                        --primary-600-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${HexToHSL("#" + primaryColor)[2]}%;
                        --primary-560-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${HexToHSL("#" + primaryColor)[2] + 3.6}%;
                        --primary-530-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${HexToHSL("#" + primaryColor)[2] + (3.6 * 2)}%;
                        --primary-500-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${HexToHSL("#" + primaryColor)[2] + (3.6 * 3)}%;${tintedText ? `\n    --primary-460-hsl: 0 calc(var(--saturation-factor, 1)*0%) 50%;
                        --primary-430: ${HexToHSL("#" + secondaryColor)[0] === 0 ? "gray" : ((HexToHSL("#" + secondaryColor)[2] < 80) ? "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 90%)" : "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 20%)")};
                        --primary-400: ${HexToHSL("#" + secondaryColor)[0] === 0 ? "gray" : ((HexToHSL("#" + secondaryColor)[2] < 80) ? "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 90%)" : "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 20%)")};
                        --primary-360: ${HexToHSL("#" + secondaryColor)[0] === 0 ? "gray" : ((HexToHSL("#" + secondaryColor)[2] < 80) ? "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 90%)" : "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 20%)")};` : ""}
                    }${(Math.round(HexToHSL("#" + primaryColor)[2]) > 80) ? `\n\n/*Primary*/
                    .theme-dark .container-2cd8Mz,
                    .theme-dark .body-16rSsp,
                    .theme-dark .toolbar-3_r2xA,
                    .theme-dark .container-89zvna,
                    .theme-dark .messageContent-2t3eCI,
                    .theme-dark .attachButtonPlus-3IYelE,
                    .theme-dark .username-h_Y3Us:not([style]),
                    .theme-dark .children-3xh0VB,
                    .theme-dark .buttonContainer-1502pf,
                    .theme-dark .listItem-3SmSlK,
                    .theme-dark .body-16rSsp .caret-1le2LN,
                    .theme-dark .body-16rSsp .titleWrapper-24Kyzc > h1,
                    .theme-dark .body-16rSsp .icon-2xnN2Y {
                        --white-500: black !important;
                        --interactive-normal: black !important;
                        --text-normal: black !important;
                        --text-muted: black !important;
                        --header-primary: black !important;
                        --header-secondary: black !important;
                    }

                    .theme-dark .contentRegionScroller-2_GT_N :not(.mtk1,.mtk2,.mtk3,.mtk4,.mtk5,.mtk6,.mtk7,.mtk8,.mtk9,.monaco-editor .line-numbers) {
                        --white-500: black !important;
                    }

                    .theme-dark .container-1um7CU,
                    .theme-dark .container-2IKOsH,
                    .theme-dark .header-3xB4vB {
                        background: transparent;
                    }

                    .theme-dark .container-ZMc96U {
                        --channel-icon: black;
                    }

                    .theme-dark .callContainer-HtHELf {
                        --white-500: ${(HexToHSL("#" + tertiaryColor)[2] > 80) ? "black" : "white"} !important;
                    }

                    .theme-dark .channelTextArea-1FufC0 {
                        --text-normal: ${(HexToHSL("#" + primaryColor)[2] + 3.6 > 80) ? "black" : "white"};
                    }

                    .theme-dark .placeholder-1rCBhr {
                        --channel-text-area-placeholder: ${(HexToHSL("#" + primaryColor)[2] + 3.6 > 80) ? "black" : "white"};
                        opacity: .6;
                    }

                    .theme-dark .colorwaySelectorIcon {
                        background-color: black;
                    }

                    .theme-dark .root-1CAIjD > .header-1ffhsl > h1 {
                        color: black;
                    }
                    /*End Primary*/`: ""}${(HexToHSL("#" + secondaryColor)[2] > 80) ? `\n\n/*Secondary*/
                    .theme-dark .wrapper-2RrXDg *,
                    .theme-dark .sidebar-1tnWFu *:not(.hasBanner-2IrYih *),
                    .theme-dark .members-3WRCEx *:not([style]),
                    .theme-dark .sidebarRegionScroller-FXiQOh *,
                    .theme-dark .header-1XpmZs,
                    .theme-dark .lookFilled-1H2Jvj.colorPrimary-2-Lusz {
                        --white-500: black !important;
                        --channels-default: black !important;
                        --channel-icon: black !important;
                        --interactive-normal: var(--white-500);
                        --interactive-hover: var(--white-500);
                        --interactive-active: var(--white-500);
                    }

                    .theme-dark .channelRow-4X_3fi {
                        background-color: var(--background-secondary);
                    }

                    .theme-dark .channelRow-4X_3fi * {
                        --channel-icon: black;
                    }

                    .theme-dark #app-mount .activity-2EQDZv {
                        --channels-default: var(--white-500) !important;
                    }

                    .theme-dark .nameTag-sc-gpq {
                        --header-primary: black !important;
                        --header-secondary: ${HexToHSL("#" + secondaryColor)[0] === 0 ? "gray" : ((HexToHSL("#" + secondaryColor)[2] < 80) ? "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 90%)" : "hsl(" + HexToHSL("#" + secondaryColor)[0] + ", calc(var(--saturation-factor, 1)*100%), 20%)")} !important;
                    }

                    .theme-dark .bannerVisible-Vkyg1I .headerContent-2SNbie {
                        color: #fff;
                    }

                    .theme-dark .embedFull-1HGV2S {
                        --text-normal: black;
                    }
                    /*End Secondary*/`: ""}${HexToHSL("#" + tertiaryColor)[2] > 80 ? `\n\n/*Tertiary*/
                    .theme-dark .winButton-3UMjdg,
                    .theme-dark .searchBar-2aylmZ *,
                    .theme-dark .wordmarkWindows-2dq6rw,
                    .theme-dark .searchBar-jGtisZ *,
                    .theme-dark .searchBarComponent-3N7dCG {
                        --white-500: black !important;
                    }

                    .theme-dark [style="background-color: var(--background-secondary);"] {
                        color: ${HexToHSL("#" + secondaryColor)[2] > 80 ? "black" : "white"};
                    }

                    .theme-dark .popout-TdhJ6Z > *,
                    .theme-dark .colorwayHeaderTitle {
                        --interactive-normal: black !important;
                        --header-secondary: black !important;
                    }

                    .theme-dark .tooltip-33Jwqe {
                        --text-normal: black !important;
                    }
                    /*End Tertiary*/`: ""}${HexToHSL("#" + accentColor)[2] > 80 ? `\n\n/*Accent*/
                    .selected-2r1Hvo *,
                    .selected-1Drb7Z *,
                    #app-mount .lookFilled-1H2Jvj.colorBrand-2M3O3N:not(.buttonColor-3bP3fX),
                    .colorDefault-2_rLdz.focused-3LIdPu,
                    .row-1qtctT:hover,
                    .colorwayInfoIcon,
                    .colorwayCheckIcon {
                        --white-500: black !important;
                    }

                    .ColorwaySelectorBtn:hover .colorwaySelectorIcon {
                        background-color: black !important;
                    }

                    :root {
                        --mention-foreground: black !important;
                    }
                    /*End Accent*/`: ""}`;
                    const customColorway: Colorway = {
                        name: colorwayName,
                        import: customColorwayCSS,
                        accent: "#" + accentColor,
                        primary: "#" + primaryColor,
                        secondary: "#" + secondaryColor,
                        tertiary: "#" + tertiaryColor,
                        author: UserStore.getCurrentUser().username,
                        authorID: UserStore.getCurrentUser().id
                    };
                    Settings.plugins.DiscordColorways.customColorways.push(customColorway);
                    closeModal(CreatorModalID);
                }}>Finish</Button><Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED}>Copy Current Colors</Button><Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED}>Enter Colorway ID</Button><Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => closeModal(CreatorModalID)}>Cancel</Button>
            </ModalFooter>
        </ModalRoot >
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
                        DataStore.get("colorwaySourceFiles").then(colorwaySourceFiles => {
                            colorwaySourceFiles.forEach((colorwayList, i) => {
                                fetch(colorwayList)
                                    .then(response => response.json())
                                    .then(data => {
                                        if (!data) return;
                                        if (!data.colorways?.length) return;
                                        data.colorways.map((color: Colorway) => {
                                            colorwaysArr.push(color);
                                        });
                                        if (i + 1 === colorwaySourceFiles.length) {
                                            setColorways(colorwaysArr);
                                        }
                                    })
                                    .catch(err => {
                                        console.log(err);
                                        return null;
                                    });
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
        }
    ],
    set ColorPicker(e: any) {
        ColorPicker = e;
        LazySwatchLoaded = true;
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
