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
import { MessageAccessories } from "@api/index";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import { openUserProfile } from "@utils/discord";
import { closeModal, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Button, Clipboard, Forms, SettingsRouter, Switch, Text, TextInput, Toasts, Tooltip, UserStore, useState } from "@webpack/common";
import { CSSProperties } from "react";

import style from "./style.css?managed";
export interface Colorway {
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

let ColorPicker: React.ComponentType<any> = () => <Text variant="heading-md/semibold" tag="h2" className="colorways-creator-module-warning">Module is lazyloaded, open Settings first</Text>, ListItem: React.ComponentType<any> = () => <Text variant="heading-md/semibold" tag="h2" className="colorways-creator-module-warning">Module is lazyloaded, open Settings first</Text>, LazySwatchLoaded: boolean = false;
DataStore.get("colorwaySourceFiles").then(e => { if (!e) DataStore.set("colorwaySourceFiles", ["https://raw.githubusercontent.com/DaBluLite/DiscordColorways/master/index.json"]); });
DataStore.get("customColorways").then(e => { if (!e) DataStore.set("customColorways", []); });

export const ColorwayCSS = {
    get: () => {
        return document.getElementById("activeColorwayCSS")?.textContent || "";
    },
    set: (e: string) => {
        if (!document.getElementById("activeColorwayCSS")) {
            var activeColorwayCSS = document.createElement("style");
            activeColorwayCSS.id = "activeColorwayCSS";
            activeColorwayCSS.textContent = e;
            document.head.append(activeColorwayCSS);
        } else {
            document.getElementById("activeColorwayCSS")!.textContent = e;
        }
    },
    remove: () => {
        document.getElementById("activeColorwayCSS")!.remove();
    }
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

function ColorwaysButton({ listItemClass = "ColorwaySelectorBtnContainer", listItemWrapperClass = "", listItemTooltipClass = "colorwaysBtn-tooltipContent" }: { listItemClass?: string, listItemWrapperClass?: string, listItemTooltipClass?: string; }) {
    const [activeColorway, setActiveColorway] = useState<string>("None");
    return (<Tooltip text={[<span>Colorways</span>, <Text variant="text-xs/normal" style={{ color: "var(--text-muted)", fontWeight: 500 }}>{"Active Colorway: " + activeColorway}</Text>]} position="right" tooltipContentClassName={listItemTooltipClass}>
        {({ onMouseEnter, onMouseLeave }) => {
            return <div className={listItemClass}><div onContextMenu={() => openModal(props => <ToolboxModal modalProps={props} />)} className={listItemWrapperClass + " ColorwaySelectorBtn"} onMouseEnter={e => {
                onMouseEnter();
                DataStore.get("actveColorwayID").then((actveColorwayID: string) => setActiveColorway(actveColorwayID || "None"));
            }} onMouseLeave={onMouseLeave} onClick={() => {
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
                                    DataStore.get("customColorways").then(customColorways => {
                                        DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                            if (LazySwatchLoaded === false) {
                                                SettingsRouter.open("Appearance");
                                            }
                                            openModal(props => <SelectorModal modalProps={props} colorwayProps={colorways} customColorwayProps={customColorways} activeColorwayProps={actveColorwayID} />);
                                        });
                                    });
                                }
                            })
                            .catch(err => {
                                console.log(err);
                                return null;
                            });
                    });
                });
            }}><div className="colorwaySelectorIcon"></div></div></div >;
        }}
    </Tooltip>);
}



function CreatorModal({ modalProps, modalID }: { modalProps: ModalProps, modalID: string; }) {
    const [accentColor, setAccentColor] = useState<string>("5865f2");
    const [primaryColor, setPrimaryColor] = useState<string>("313338");
    const [secondaryColor, setSecondaryColor] = useState<string>("2b2d31");
    const [tertiaryColor, setTertiaryColor] = useState<string>("1e1f22");
    const [colorwayName, setColorwayName] = useState<string>("");
    const [tintedText, setTintedText] = useState<boolean>(true);
    const [collapsedSettings, setCollapsedSettings] = useState<boolean>(true);
    return (
        <ModalRoot {...modalProps} className="colorwayCreator-modal">
            <ModalHeader><Text variant="heading-lg/semibold" tag="h1">Create Colorway</Text></ModalHeader>
            <ModalContent className="colorwayCreator-menuWrapper">
                <Forms.FormTitle style={{ marginBottom: 0 }}>Name:</Forms.FormTitle>
                <TextInput placeholder="Give your Colorway a name" value={colorwayName} onChange={setColorwayName}></TextInput>
                <Forms.FormTitle style={{ marginBottom: 0 }}>Colors:</Forms.FormTitle>
                <div className="colorwayCreator-colorPreviews">
                    <ColorPicker
                        color={parseInt(primaryColor, 16)}
                        onChange={(color: number) => {
                            let hexColor = color.toString(16);
                            while (hexColor.length < 6) {
                                hexColor = "0" + hexColor;
                            }
                            setPrimaryColor(hexColor);
                        }}
                        showEyeDropper={true}
                        suggestedColors={["#313338", "#2b2d31", "#1e1f22", "#5865f2"]}
                    />
                    <ColorPicker
                        color={parseInt(secondaryColor, 16)}
                        onChange={(color: number) => {
                            let hexColor = color.toString(16);
                            while (hexColor.length < 6) {
                                hexColor = "0" + hexColor;
                            }
                            setSecondaryColor(hexColor);
                        }}
                        showEyeDropper={true}
                        suggestedColors={["#313338", "#2b2d31", "#1e1f22", "#5865f2"]}
                    />
                    <ColorPicker
                        color={parseInt(tertiaryColor, 16)}
                        onChange={(color: number) => {
                            let hexColor = color.toString(16);
                            while (hexColor.length < 6) {
                                hexColor = "0" + hexColor;
                            }
                            setTertiaryColor(hexColor);
                        }}
                        showEyeDropper={true}
                        suggestedColors={["#313338", "#2b2d31", "#1e1f22", "#5865f2"]}
                    />
                    <ColorPicker
                        color={parseInt(accentColor, 16)}
                        onChange={(color: number) => {
                            let hexColor = color.toString(16);
                            while (hexColor.length < 6) {
                                hexColor = "0" + hexColor;
                            }
                            setAccentColor(hexColor);
                        }}
                        showEyeDropper={true}
                        suggestedColors={["#313338", "#2b2d31", "#1e1f22", "#5865f2"]}
                    />
                </div>
                <div className={`colorwaysCreator-settingCat${collapsedSettings ? " colorwaysCreator-settingCat-collapsed" : ""}`}>
                    <div className="colorwaysCreator-settingItm colorwaysCreator-settingHeader" onClick={() => collapsedSettings === true ? setCollapsedSettings(false) : setCollapsedSettings(true)}><Forms.FormTitle style={{ marginBottom: 0 }}>Settings</Forms.FormTitle><svg className="expand-3Nh1P5 transition-30IQBn directionDown-2w0MZz" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" role="img"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 10L12 15 17 10" aria-hidden="true"></path></svg></div>
                    <div className="colorwaysCreator-settingItm"><Text variant="eyebrow" tag="h5">Use colored text</Text><Switch value={tintedText} onChange={setTintedText} hideBorder={true} style={{ marginBottom: 0 }}></Switch></div>
                </div>
                <ThemePreviewCategory isCollapsed={false} accent={"#" + accentColor} primary={"#" + primaryColor} secondary={"#" + secondaryColor} tertiary={"#" + tertiaryColor}></ThemePreviewCategory>
            </ModalContent>
            <ModalFooter>
                <Button style={{ marginLeft: 8 }} color={Button.Colors.BRAND} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={e => {
                    const customColorwayCSS = `/*Automatically Generated - Colorway Creator V${DiscordColorways.creatorVersion}*/
:root {
    --brand-100-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 13)), 100)}%;
    --brand-130-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 12)), 100)}%;
    --brand-160-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 11)), 100)}%;
    --brand-200-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 10)), 100)}%;
    --brand-230-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 9)), 100)}%;
    --brand-260-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 8)), 100)}%;
    --brand-300-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 7)), 100)}%;
    --brand-330-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 6)), 100)}%;
    --brand-345-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 5)), 100)}%;
    --brand-360-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 4)), 100)}%;
    --brand-400-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 3)), 100)}%;
    --brand-430-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + (3.6 * 2)), 100)}%;
    --brand-460-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.min(Math.round(HexToHSL("#" + accentColor)[2] + 3.6), 100)}%;
    --brand-500-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${HexToHSL("#" + accentColor)[2]}%;
    --brand-530-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round(HexToHSL("#" + accentColor)[2] - 3.6), 0)}%;
    --brand-560-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 2)), 0)}%;
    --brand-600-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 3)), 0)}%;
    --brand-630-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 4)), 0)}%;
    --brand-660-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 5)), 0)}%;
    --brand-700-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 6)), 0)}%;
    --brand-730-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 7)), 0)}%;
    --brand-760-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 8)), 0)}%;
    --brand-800-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 9)), 0)}%;
    --brand-830-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 10)), 0)}%;
    --brand-860-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 11)), 0)}%;
    --brand-900-hsl: ${HexToHSL("#" + accentColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + accentColor)[1]}%) ${Math.max(Math.round(HexToHSL("#" + accentColor)[2] - (3.6 * 12)), 0)}%;
    --primary-800-hsl: ${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + tertiaryColor)[1]}%) ${Math.min(HexToHSL("#" + tertiaryColor)[2] + (3.6 * 2), 100)}%;
    --primary-730-hsl: ${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + tertiaryColor)[1]}%) ${Math.min(HexToHSL("#" + tertiaryColor)[2] + 3.6, 100)}%;
    --primary-700-hsl: ${HexToHSL("#" + tertiaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + tertiaryColor)[1]}%) ${HexToHSL("#" + tertiaryColor)[2]}%;
    --primary-660-hsl: ${HexToHSL("#" + secondaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + secondaryColor)[1]}%) ${Math.min(HexToHSL("#" + secondaryColor)[2] + 3.6, 100)}%;
    --primary-645-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${Math.max(HexToHSL("#" + primaryColor)[2] - 5, 0)}%;
    --primary-630-hsl: ${HexToHSL("#" + secondaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + secondaryColor)[1]}%) ${HexToHSL("#" + secondaryColor)[2]}%;
    --primary-600-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${HexToHSL("#" + primaryColor)[2]}%;
    --primary-560-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${Math.min(HexToHSL("#" + primaryColor)[2] + 3.6, 100)}%;
    --primary-530-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${Math.min(HexToHSL("#" + primaryColor)[2] + (3.6 * 2), 100)}%;
    --primary-500-hsl: ${HexToHSL("#" + primaryColor)[0]} calc(var(--saturation-factor, 1)*${HexToHSL("#" + primaryColor)[1]}%) ${Math.min(HexToHSL("#" + primaryColor)[2] + (3.6 * 3), 100)}%;${tintedText ? `\n    --primary-460-hsl: 0 calc(var(--saturation-factor, 1)*0%) 50%;
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
                        name: colorwayName || "Colorway",
                        import: customColorwayCSS,
                        accent: "#" + accentColor,
                        primary: "#" + primaryColor,
                        secondary: "#" + secondaryColor,
                        tertiary: "#" + tertiaryColor,
                        author: UserStore.getCurrentUser().username,
                        authorID: UserStore.getCurrentUser().id
                    };
                    const customColorwaysArray: Colorway[] = [customColorway];
                    DataStore.get("customColorways").then(customColorways => {
                        customColorways.forEach((color: Colorway, i: number) => {
                            if (color.name !== customColorway.name) {
                                customColorwaysArray.push(color);
                            }
                        });
                        DataStore.set("customColorways", customColorwaysArray);
                    });
                    closeModal(modalID);
                    document.getElementById("colorway-refreshcolorway")?.click();
                }}>Finish</Button><Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                    function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
                    setPrimaryColor(getHex(getComputedStyle(document.body).getPropertyValue("--background-primary")).split("#")[1]);
                    setSecondaryColor(getHex(getComputedStyle(document.body).getPropertyValue("--background-secondary")).split("#")[1]);
                    setTertiaryColor(getHex(getComputedStyle(document.body).getPropertyValue("--background-tertiary")).split("#")[1]);
                    setAccentColor(getHex(getComputedStyle(document.body).getPropertyValue("--brand-experiment")).split("#")[1]);
                }}>Copy Current Colors</Button><Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                    let colorwayID: string;
                    function setColorwayID(e: string) {
                        colorwayID = e;
                    }
                    const hexToString = (hex: string) => {
                        let str = "";
                        for (let i = 0; i < hex.length; i += 2) {
                            const hexValue = hex.substr(i, 2);
                            const decimalValue = parseInt(hexValue, 16);
                            str += String.fromCharCode(decimalValue);
                        }
                        return str;
                    };
                    const ColorwayIDModal = openModal(props => {
                        return (
                            <ModalRoot {...props} className="colorwaysCreator-noMinHeight">
                                <ModalContent className="colorwaysCreator-noHeader colorwaysCreator-noMinHeight">
                                    <Forms.FormTitle>Colorway ID:</Forms.FormTitle>
                                    <TextInput placeholder="Enter Colorway ID" onInput={e => {
                                        setColorwayID(e.currentTarget.value);
                                    }}></TextInput>
                                </ModalContent>
                                <ModalFooter>
                                    <Button style={{ marginLeft: 8 }} color={Button.Colors.BRAND} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                                        const allEqual = (arr: any[]) => arr.every(v => v === arr[0]);
                                        if (!colorwayID) {
                                            throw new Error("Please enter a Colorway ID");
                                        } else if (colorwayID.length < 62) {
                                            throw new Error("Invalid Colorway ID");
                                        } else if (!hexToString(colorwayID).includes(",")) {
                                            throw new Error("Invalid Colorway ID");
                                        } else if (!allEqual(hexToString(colorwayID).split(",").map((e: string) => e.match("#")!.length)) && hexToString(colorwayID).split(",").map((e: string) => e.match("#")!.length)[0] !== 1) {
                                            throw new Error("Invalid Colorway ID");
                                        } else {
                                            const colorArray: string[] = hexToString(colorwayID).split(",");
                                            setAccentColor(colorArray[0].split("#")[1]);
                                            setPrimaryColor(colorArray[1].split("#")[1]);
                                            setSecondaryColor(colorArray[2].split("#")[1]);
                                            setTertiaryColor(colorArray[3].split("#")[1]);
                                            closeModal(ColorwayIDModal);
                                        }
                                    }}>Finish</Button><Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => { closeModal(ColorwayIDModal); }}>Cancel</Button>
                                </ModalFooter>
                            </ModalRoot>
                        );
                    });
                }}>Enter Colorway ID</Button><Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                    closeModal(modalID);
                }}>Cancel</Button>
            </ModalFooter>
        </ModalRoot >
    );
}

/**
 * Discord's search icon, as seen in the GIF search bar
 */
export function SearchIcon({ height = 24, width = 24, className, style }: { height?: number, width?: number, className?: string, style?: CSSProperties; }) {
    return (
        <svg
            className={className}
            aria-label="Search"
            aria-hidden="false"
            role="img"
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={style}
        >
            <path
                fill="currentColor"
                d="M21.707 20.293L16.314 14.9C17.403 13.504 18 11.799 18 10C18 7.863 17.167 5.854 15.656 4.344C14.146 2.832 12.137 2 10 2C7.863 2 5.854 2.832 4.344 4.344C2.833 5.854 2 7.863 2 10C2 12.137 2.833 14.146 4.344 15.656C5.854 17.168 7.863 18 10 18C11.799 18 13.504 17.404 14.9 16.314L20.293 21.706L21.707 20.293ZM10 16C8.397 16 6.891 15.376 5.758 14.243C4.624 13.11 4 11.603 4 10C4 8.398 4.624 6.891 5.758 5.758C6.891 4.624 8.397 4 10 4C11.603 4 13.109 4.624 14.242 5.758C15.376 6.891 16 8.398 16 10C16 11.603 15.376 13.11 14.242 14.243C13.109 15.376 11.603 16 10 16Z"
            />
        </svg>
    );
}

export function CloseIcon({ height = 24, width = 24, className, style }: { height?: number, width?: number, className?: string, style?: CSSProperties; }) {
    return (
        <svg
            aria-label="Clear"
            aria-hidden="false"
            role="img"
            className={className}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            style={style}>
            <path
                fill="currentColor"
                d="M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z" />
        </svg>
    );
}

function SelectorModal({ modalProps, colorwayProps, customColorwayProps, activeColorwayProps }: { modalProps: ModalProps, colorwayProps: Colorway[], customColorwayProps: Colorway[], activeColorwayProps: string; }): JSX.Element | any {
    let results: Colorway[];
    const [currentColorway, setCurrentColorway] = useState<string>(activeColorwayProps);
    const [colorways, setColorways] = useState<Colorway[]>(colorwayProps);
    const [customColorways, setCustomColorways] = useState<Colorway[]>(customColorwayProps);
    const [searchBarVisibility, setSearchBarVisibility] = useState<boolean>(false);
    function searchColorways(e: string) {
        results = [];
        colorwayProps.find((Colorway: Colorway) => {
            if (Colorway.name.toLowerCase().includes(e.toLowerCase())) {
                results.push(Colorway);
            }
        });
        setColorways(results);
        results = [];
        customColorwayProps.find((Colorway: Colorway) => {
            if (Colorway.name.toLowerCase().includes(e.toLowerCase())) {
                results.push(Colorway);
            }
        });
        setCustomColorways(results);
    }
    return (
        <ModalRoot {...modalProps} className="colorwaySelectorModal">
            {/* searchBarVisibility === false ? <ModalHeader className="colorwaySelector-header"><Text variant="heading-lg/semibold" tag="h1" style={{ lineHeight: "40px", paddingLeft: "8px" }}>Discord Colorways</Text><Button size={Button.Sizes.ICON} look={Button.Looks.BLANK} onClick={() => setSearchBarVisibility(true)}><SearchIcon className="colorwaySelector-headerIcon" style={{ marginLeft: "auto" }} /></Button></ModalHeader> : <ModalHeader className="colorwaySelector-header"><TextInput className="colorwaySelector-search" placeholder="Search for Colorways..." onChange={searchColorways}></TextInput><Button size={Button.Sizes.ICON} look={Button.Looks.BLANK} onClick={() => { setSearchBarVisibility(false); searchColorways(""); }}><CloseIcon className="colorwaySelector-headerIcon" style={{ marginLeft: "auto" }} /></Button></ModalHeader>*/}
            <ModalContent className="colorwaySelectorModalContent">
                <TextInput className="colorwaySelector-search" placeholder="Search for Colorways..." onChange={searchColorways} />
                <div className="customColorways-titleWrapper">
                    <hr className="colorwaySelector-hr" />
                    <Forms.FormTitle style={{ marginBottom: 0 }} className="colorwaysSelector-title">Colorways</Forms.FormTitle>
                    <hr className="colorwaySelector-hr" />
                </div>
                <div className="ColorwaySelectorWrapper">
                    <Tooltip text="Refresh Colorways...">
                        {({ onMouseEnter, onMouseLeave }) => {
                            return <div className="discordColorway" id="colorway-refreshcolorway" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={() => {
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
                                                    DataStore.get("customColorways").then(customColorways => {
                                                        DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                                            setColorways(colorwaysArr);
                                                            setCustomColorways(customColorways);
                                                            setCurrentColorway(actveColorwayID);
                                                        });
                                                    });
                                                }
                                            })
                                            .catch(err => {
                                                console.log(err);
                                                return null;
                                            });
                                    });
                                });
                            }}>
                                <div className="colorwayRefreshIcon">
                                    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><g id="Frame_-_24px"><rect y="0" fill="none" width="24" height="24"></rect></g><g id="Filled_Icons"><g><path d="M6.351,6.351C7.824,4.871,9.828,4,12,4c4.411,0,8,3.589,8,8h2c0-5.515-4.486-10-10-10 C9.285,2,6.779,3.089,4.938,4.938L3,3v6h6L6.351,6.351z"></path><path d="M17.649,17.649C16.176,19.129,14.173,20,12,20c-4.411,0-8-3.589-8-8H2c0,5.515,4.486,10,10,10 c2.716,0,5.221-1.089,7.062-2.938L21,21v-6h-6L17.649,17.649z"></path></g></g></svg>
                                </div>
                            </div>;
                        }}
                    </Tooltip>
                    <Tooltip text="Create Colorway...">
                        {({ onMouseEnter, onMouseLeave }) => {
                            return <div className="discordColorway" id="colorway-createcolorway" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onClick={() => { const modal = openModal(props => <CreatorModal modalProps={props} modalID={modal} />); }}><div className="colorwayCreateIcon">
                                <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M20 11.1111H12.8889V4H11.1111V11.1111H4V12.8889H11.1111V20H12.8889V12.8889H20V11.1111Z" /></svg>
                            </div></div>;
                        }}
                    </Tooltip>
                    {colorways.map((color, ind) => {
                        var colors: Array<string> = color.colors || ["accent", "primary", "secondary", "tertiary"];
                        // eslint-disable-next-line no-unneeded-ternary
                        return <Tooltip text={color.name}>
                            {({ onMouseEnter, onMouseLeave }) => {
                                return <div className={`discordColorway${currentColorway === color.name ? " active" : ""}`} id={"colorway-" + color.name} data-last-official={ind + 1 === colorways.length} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                                    <div className="colorwayCheckIconContainer">
                                        <div className="colorwayCheckIcon">
                                            <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M8.99991 16.17L4.82991 12L3.40991 13.41L8.99991 19L20.9999 7.00003L19.5899 5.59003L8.99991 16.17Z"></path></svg>
                                        </div>
                                    </div>
                                    <div className="colorwayInfoIconContainer" onClick={() => { const modal = openModal(props => <ColorwayInfoModal modalProps={props} colorwayProps={color} discrimProps={false} modalID={modal} />); }}>
                                        <div className="colorwayInfoIcon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" /></svg>
                                        </div>
                                    </div>
                                    <div className="discordColorwayPreviewColorContainer" onClick={() => {
                                        if (currentColorway === color.name) {
                                            DataStore.set("actveColorwayID", null);
                                            DataStore.set("actveColorway", null);
                                            ColorwayCSS.remove();
                                        } else {
                                            DataStore.set("actveColorwayID", color.name);
                                            DataStore.set("actveColorway", color.import);
                                            ColorwayCSS.set(color.import);
                                        }
                                        DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                            setCurrentColorway(actveColorwayID);
                                        });
                                    }}>
                                        {colors.map(colorItm => {
                                            return <div className="discordColorwayPreviewColor" style={{ backgroundColor: color[colorItm] }}></div>;
                                        })}
                                    </div>
                                </div>;
                            }}
                        </Tooltip>;
                    })}
                </div>
                <div className="customColorways-titleWrapper">
                    <hr className="colorwaySelector-hr" />
                    <Forms.FormTitle style={{ marginBottom: 0 }} className="colorwaysSelector-title">Custom Colorways</Forms.FormTitle>
                    <hr className="colorwaySelector-hr" />
                </div>
                <div className="ColorwaySelectorWrapper customColorways-wrapper">
                    {customColorways.map((color, ind) => {
                        var colors: Array<string> = color.colors || ["accent", "primary", "secondary", "tertiary"];
                        // eslint-disable-next-line no-unneeded-ternary
                        return <Tooltip text={color.name}>
                            {({ onMouseEnter, onMouseLeave }) => {
                                return <div className={`discordColorway${currentColorway === color.name ? " active" : ""}`} id={"colorway-" + color.name} data-last-official={ind + 1 === colorways.length} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
                                    <div className="colorwayCheckIconContainer">
                                        <div className="colorwayCheckIcon">
                                            <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" role="img" width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M8.99991 16.17L4.82991 12L3.40991 13.41L8.99991 19L20.9999 7.00003L19.5899 5.59003L8.99991 16.17Z"></path></svg>
                                        </div>
                                    </div>
                                    <div className="colorwayInfoIconContainer" onClick={() => {
                                        const modal = openModal(props => { return <ColorwayInfoModal modalProps={props} colorwayProps={color} discrimProps={true} modalID={modal} />; });
                                    }}>
                                        <div className="colorwayInfoIcon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z" /></svg>
                                        </div>
                                    </div>
                                    <div className="discordColorwayPreviewColorContainer" onClick={() => {
                                        if (currentColorway === color.name) {
                                            DataStore.set("actveColorwayID", null);
                                            DataStore.set("actveColorway", null);
                                            ColorwayCSS.remove();
                                        } else {
                                            DataStore.set("actveColorwayID", color.name);
                                            DataStore.set("actveColorway", color.import);
                                            ColorwayCSS.set(color.import);
                                        }
                                        DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                            setCurrentColorway(actveColorwayID);
                                        });
                                    }}>
                                        {colors.map(colorItm => {
                                            return <div className="discordColorwayPreviewColor" style={{ backgroundColor: color[colorItm] }}></div>;
                                        })}
                                    </div>
                                </div>;
                            }}
                        </Tooltip>;
                    })}
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

function ColorwayInfoModal({ modalProps, colorwayProps, discrimProps, modalID }: { modalProps: ModalProps, colorwayProps: Colorway, discrimProps: boolean, modalID: string; }) {
    const colors: string[] = colorwayProps.colors || ["accent", "primary", "secondary", "tertiary"];
    return (<ModalRoot {...modalProps} className="colorwayCreator-modal">
        <ModalHeader><Text variant="heading-lg/semibold" tag="h1">Colorway Details: {colorwayProps.name}</Text></ModalHeader>
        <ModalContent>
            <div className="colorwayInfo-wrapper">
                <div className="colorwayInfo-colorSwatches">
                    {colors.map(color => {
                        return <div className="colorwayInfo-colorSwatch" style={{ backgroundColor: colorwayProps[color] }} onClick={() => {
                            Clipboard.copy(colorwayProps[color]);
                            Toasts.show({ message: "Copied color successfully", type: 1, id: "copy-colorway-color-notify" });
                        }}></div>;
                    })}
                </div>
                <div className="colorwayInfo-row colorwayInfo-author">
                    <Forms.FormTitle style={{ marginBottom: 0 }}>Author:</Forms.FormTitle>
                    <Button color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => { openUserProfile(colorwayProps.authorID); }}>{colorwayProps.author}</Button>
                </div>
                <div className="colorwayInfo-row colorwayInfo-css">
                    <Forms.FormTitle style={{ marginBottom: 0 }}>CSS:</Forms.FormTitle>
                    <Text variant="code" selectable={true} className="colorwayInfo-cssCodeblock">{colorwayProps.import}</Text>
                </div>
                <ThemePreviewCategory isCollapsed={true} className="colorwayInfo-lastCat" accent={colorwayProps.accent} primary={colorwayProps.primary} secondary={colorwayProps.secondary} tertiary={colorwayProps.tertiary}></ThemePreviewCategory>
            </div>
        </ModalContent>
        {discrimProps === true ? <ModalFooter>
            <Button style={{ marginLeft: 8 }} color={Button.Colors.RED} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                DataStore.get("customColorways").then((customColorways: Colorway[]) => {
                    if (customColorways.length > 0) {
                        const customColorwaysArray: Colorway[] = [];
                        DataStore.get("customColorways").then(customColorways => {
                            customColorways.forEach((color: Colorway, i: number) => {
                                if (color.name !== colorwayProps.name) {
                                    customColorwaysArray.push(color);
                                }
                                if (i + 1 === customColorways.length) {
                                    DataStore.set("customColorways", customColorwaysArray);
                                }
                            });
                        });
                        DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                            if (actveColorwayID === colorwayProps.name) {
                                DataStore.set("actveColorway", null);
                                DataStore.set("actveColorwayID", null);
                            }
                        });
                        closeModal(modalID);
                        document.getElementById("colorway-refreshcolorway")?.click();
                    }
                });
            }}>Delete Colorway</Button><Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                const stringToHex = (str: string) => {
                    let hex = "";
                    for (let i = 0; i < str.length; i++) {
                        const charCode = str.charCodeAt(i);
                        const hexValue = charCode.toString(16);

                        // Pad with zeros to ensure two-digit representation
                        hex += hexValue.padStart(2, "0");
                    }
                    return hex;
                };
                const colorwayIDArray = `${colorwayProps.accent},${colorwayProps.primary},${colorwayProps.secondary},${colorwayProps.tertiary}`;
                const colorwayID = stringToHex(colorwayIDArray);
                Clipboard.copy(colorwayID);
                Toasts.show({ message: "Copied Colorway ID Successfully", type: 1, id: "copy-colorway-id-notify" });
            }}>Copy Colorway ID</Button>
            <Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                Clipboard.copy(colorwayProps.import);
                Toasts.show({ message: "Copied CSS to Clipboard", type: 1, id: "copy-colorway-css-notify" });
            }}>Copy CSS</Button>
            <Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                closeModal(modalID);
            }}>Cancel</Button>
        </ModalFooter> : <div className="colorwaySelector-noDisplay"></div>}
    </ModalRoot>);
}

export function ThemePreviewCategory({ accent, primary, secondary, tertiary, className, isCollapsed, previewCSS }: { accent: string, primary: string, secondary: string, tertiary: string, className?: string, isCollapsed: boolean, previewCSS?: string; }) {
    const [collapsed, setCollapsed] = useState<boolean>(isCollapsed);
    return (<div className={`${collapsed === true ? "colorwaysPreview colorwaysPreview-collapsed" : "colorwaysPreview"} ${className}`}>
        <div className="colorwaysCreator-settingItm colorwaysCreator-settingHeader" onClick={() => collapsed === true ? setCollapsed(false) : setCollapsed(true)}><Forms.FormTitle style={{ marginBottom: 0 }}>Preview</Forms.FormTitle><svg className="expand-3Nh1P5 transition-30IQBn directionDown-2w0MZz" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" role="img"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 10L12 15 17 10" aria-hidden="true"></path></svg></div>
        <style>{previewCSS}</style>
        <ThemePreview accent={accent} primary={primary} secondary={secondary} tertiary={tertiary} />
    </div>);
}

export function ThemePreview({ accent, primary, secondary, tertiary, previewCSS }: { accent: string, primary: string, secondary: string, tertiary: string, previewCSS?: string; }) {
    return (<div className="colorwaysPreview-container">
        <style>{previewCSS}</style>
        <div className="colorwaysPreview-wrapper" style={{ backgroundColor: tertiary }}>
            <div className="colorwaysPreview-titlebar"></div>
            <div className="colorwaysPreview-body">
                <div className="colorwayPreview-guilds">
                    <div className="colorwayPreview-guild">
                        <div className="colorwayPreview-guildItem" style={{ backgroundColor: primary }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = accent; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = primary; }} onClick={e => {
                            e.currentTarget.parentElement?.parentElement?.parentElement?.parentElement?.requestFullscreen();
                        }}>
                            <svg className="controlIcon-10O-4h" aria-hidden="true" role="img" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M19,3H14V5h5v5h2V5A2,2,0,0,0,19,3Z"></path><path fill="currentColor" d="M19,19H14v2h5a2,2,0,0,0,2-2V14H19Z"></path><path fill="currentColor" d="M3,5v5H5V5h5V3H5A2,2,0,0,0,3,5Z"></path><path fill="currentColor" d="M5,14H3v5a2,2,0,0,0,2,2h5V19H5Z"></path></svg>
                        </div>
                    </div>
                    <div className="colorwayPreview-guild">
                        <div className="colorwayPreview-guildSeparator" style={{ backgroundColor: primary }}></div>
                    </div>
                    <div className="colorwayPreview-guild">
                        <div className="colorwayPreview-guildItem" style={{ backgroundColor: primary }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = accent; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = primary; }}></div>
                    </div>
                    <div className="colorwayPreview-guild">
                        <div className="colorwayPreview-guildItem" style={{ backgroundColor: primary }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = accent; }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = primary; }}></div>
                    </div>
                </div>
                <div className="colorwayPreview-channels" style={{ backgroundColor: secondary }}>
                    <div className="colorwayPreview-userArea" style={{ backgroundColor: "hsl(" + HexToHSL(secondary)[0] + " " + HexToHSL(secondary)[1] + "% " + Math.max(HexToHSL(secondary)[2] - 3.6, 0) + "%)" }}></div>
                    <div className="colorwayPreview-filler"></div>
                    <div className="colorwayPreview-topShadow" style={{ "--primary-900-hsl": `${HexToHSL(tertiary)[0]} ${HexToHSL(tertiary)[1]}% ${Math.max(HexToHSL(tertiary)[2] - (3.6 * 6), 0)}%`, "--primary-500-hsl": `${HexToHSL(primary)[0]} ${HexToHSL(primary)[1]}% ${Math.min(HexToHSL(primary)[2] + (3.6 * 3), 100)}%` } as React.CSSProperties}>
                        <Text tag="div" variant="text-md/semibold" lineClamp={1}>Discord Colorways</Text>
                    </div>
                </div>
                <div className="colorwayPreview-chat" style={{ backgroundColor: primary }}>
                    <div className="colorwayPreview-chatBox" style={{ backgroundColor: "hsl(" + HexToHSL(primary)[0] + " " + HexToHSL(primary)[1] + "% " + Math.min(HexToHSL(primary)[2] + 3.6, 100) + "%)" }}></div>
                    <div className="colorwayPreview-filler"></div>
                    <div className="colorwayPreview-topShadow" style={{ "--primary-900-hsl": `${HexToHSL(tertiary)[0]} ${HexToHSL(tertiary)[1]}% ${Math.max(HexToHSL(tertiary)[2] - (3.6 * 6), 0)}%` } as React.CSSProperties}></div>
                </div>
            </div>
        </div>
    </div>);
}

export function ColorPickerModal({ modalProps }: { modalProps: ModalProps; }) {
    const [accentColor, setAccentColor] = useState<string>("5865f2");
    const [primaryColor, setPrimaryColor] = useState<string>("313338");
    const [secondaryColor, setSecondaryColor] = useState<string>("2b2d31");
    const [tertiaryColor, setTertiaryColor] = useState<string>("1e1f22");
    return (<ModalRoot {...modalProps} className="colorwayCreator-modal">
        <ModalHeader><Text variant="heading-lg/semibold" tag="h1">Colorpicker</Text></ModalHeader>
        <ModalContent className="colorwayCreator-menuWrapper">
            <Forms.FormTitle style={{ marginBottom: 0 }}>Colors:</Forms.FormTitle>
            <div className="colorwayCreator-colorPreviews">
                <ColorPicker
                    color={parseInt(primaryColor, 16)}
                    onChange={(color: number) => {
                        let hexColor = color.toString(16);
                        while (hexColor.length < 6) {
                            hexColor = "0" + hexColor;
                        }
                        setPrimaryColor(hexColor);
                    }}
                    showEyeDropper={true}
                    suggestedColors={["#313338", "#2b2d31", "#1e1f22", "#5865f2"]}
                />
                <ColorPicker
                    color={parseInt(secondaryColor, 16)}
                    onChange={(color: number) => {
                        let hexColor = color.toString(16);
                        while (hexColor.length < 6) {
                            hexColor = "0" + hexColor;
                        }
                        setSecondaryColor(hexColor);
                    }}
                    showEyeDropper={true}
                    suggestedColors={["#313338", "#2b2d31", "#1e1f22", "#5865f2"]}
                />
                <ColorPicker
                    color={parseInt(tertiaryColor, 16)}
                    onChange={(color: number) => {
                        let hexColor = color.toString(16);
                        while (hexColor.length < 6) {
                            hexColor = "0" + hexColor;
                        }
                        setTertiaryColor(hexColor);
                    }}
                    showEyeDropper={true}
                    suggestedColors={["#313338", "#2b2d31", "#1e1f22", "#5865f2"]}
                />
                <ColorPicker
                    color={parseInt(accentColor, 16)}
                    onChange={(color: number) => {
                        let hexColor = color.toString(16);
                        while (hexColor.length < 6) {
                            hexColor = "0" + hexColor;
                        }
                        setAccentColor(hexColor);
                    }}
                    showEyeDropper={true}
                    suggestedColors={["#313338", "#2b2d31", "#1e1f22", "#5865f2"]}
                />
            </div>
        </ModalContent>
        <ModalFooter>
            <Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
                setPrimaryColor(getHex(getComputedStyle(document.body).getPropertyValue("--background-primary")).split("#")[1]);
                setSecondaryColor(getHex(getComputedStyle(document.body).getPropertyValue("--background-secondary")).split("#")[1]);
                setTertiaryColor(getHex(getComputedStyle(document.body).getPropertyValue("--background-tertiary")).split("#")[1]);
                setAccentColor(getHex(getComputedStyle(document.body).getPropertyValue("--brand-experiment")).split("#")[1]);
            }}>Copy Current Colors</Button><Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                let colorwayID: string;
                function setColorwayID(e: string) {
                    colorwayID = e;
                }
                const hexToString = (hex: string) => {
                    let str = "";
                    for (let i = 0; i < hex.length; i += 2) {
                        const hexValue = hex.substr(i, 2);
                        const decimalValue = parseInt(hexValue, 16);
                        str += String.fromCharCode(decimalValue);
                    }
                    return str;
                };
                const ColorwayIDModal = openModal(props => {
                    return (
                        <ModalRoot {...props} className="colorwaysCreator-noMinHeight">
                            <ModalContent className="colorwaysCreator-noHeader colorwaysCreator-noMinHeight">
                                <Forms.FormTitle>Colorway ID:</Forms.FormTitle>
                                <TextInput placeholder="Enter Colorway ID" onInput={e => {
                                    setColorwayID(e.currentTarget.value);
                                }}></TextInput>
                            </ModalContent>
                            <ModalFooter>
                                <Button style={{ marginLeft: 8 }} color={Button.Colors.BRAND} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                                    const allEqual = (arr: any[]) => arr.every(v => v === arr[0]);
                                    if (!colorwayID) {
                                        throw new Error("Please enter a Colorway ID");
                                    } else if (colorwayID.length < 62) {
                                        throw new Error("Invalid Colorway ID");
                                    } else if (!hexToString(colorwayID).includes(",")) {
                                        throw new Error("Invalid Colorway ID");
                                    } else if (!allEqual(hexToString(colorwayID).split(",").map((e: string) => e.match("#")!.length)) && hexToString(colorwayID).split(",").map((e: string) => e.match("#")!.length)[0] !== 1) {
                                        throw new Error("Invalid Colorway ID");
                                    } else {
                                        const colorArray: string[] = hexToString(colorwayID).split(",");
                                        setAccentColor(colorArray[0].split("#")[1]);
                                        setPrimaryColor(colorArray[1].split("#")[1]);
                                        setSecondaryColor(colorArray[2].split("#")[1]);
                                        setTertiaryColor(colorArray[3].split("#")[1]);
                                        closeModal(ColorwayIDModal);
                                    }
                                }}>Finish</Button><Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => { closeModal(ColorwayIDModal); }}>Cancel</Button>
                            </ModalFooter>
                        </ModalRoot>
                    );
                });
            }}>Enter Colorway ID</Button>
            <Button style={{ marginLeft: 8 }} color={Button.Colors.BRAND} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => {
                const stringToHex = (str: string) => {
                    let hex = "";
                    for (let i = 0; i < str.length; i++) {
                        const charCode = str.charCodeAt(i);
                        const hexValue = charCode.toString(16);

                        // Pad with zeros to ensure two-digit representation
                        hex += hexValue.padStart(2, "0");
                    }
                    return hex;
                };
                const colorwayIDArray = `#${accentColor},#${primaryColor},#${secondaryColor},#${tertiaryColor}`;
                const colorwayID = stringToHex(colorwayIDArray);
                Clipboard.copy(colorwayID);
                Toasts.show({ message: "Copied Colorway ID Successfully", type: 1, id: "copy-colorway-id-notify" });
            }}>Copy Colorway ID</Button>
        </ModalFooter>
    </ModalRoot>);
}

interface ToolboxItem {
    title: string,
    onClick: () => void,
    id?: string;
}

const colorVariables: string[] = [
    "brand-100",
    "brand-130",
    "brand-160",
    "brand-200",
    "brand-230",
    "brand-260",
    "brand-300",
    "brand-330",
    "brand-345",
    "brand-360",
    "brand-400",
    "brand-430",
    "brand-460",
    "brand-500",
    "brand-530",
    "brand-560",
    "brand-600",
    "brand-630",
    "brand-660",
    "brand-700",
    "brand-730",
    "brand-760",
    "brand-800",
    "brand-830",
    "brand-860",
    "brand-900",
    "primary-900",
    "primary-860",
    "primary-830",
    "primary-800",
    "primary-760",
    "primary-730",
    "primary-700",
    "primary-660",
    "primary-645",
    "primary-630",
    "primary-600",
    "primary-560",
    "primary-530",
    "primary-500",
    "primary-460",
    "primary-430",
    "primary-400",
    "primary-360",
    "primary-330",
    "primary-300",
    "primary-260",
    "primary-230",
    "primary-200",
    "primary-160",
    "primary-130",
    "primary-100",
    "white-900",
    "white-860",
    "white-830",
    "white-800",
    "white-760",
    "white-730",
    "white-700",
    "white-660",
    "white-630",
    "white-600",
    "white-560",
    "white-530",
    "white-500",
    "white-460",
    "white-430",
    "white-400",
    "white-360",
    "white-330",
    "white-300",
    "white-260",
    "white-230",
    "white-200",
    "white-160",
    "white-130",
    "white-100",
    "teal-900",
    "teal-860",
    "teal-830",
    "teal-800",
    "teal-760",
    "teal-730",
    "teal-700",
    "teal-660",
    "teal-630",
    "teal-600",
    "teal-560",
    "teal-530",
    "teal-500",
    "teal-460",
    "teal-430",
    "teal-400",
    "teal-360",
    "teal-330",
    "teal-300",
    "teal-260",
    "teal-230",
    "teal-200",
    "teal-160",
    "teal-130",
    "teal-100",
    "black-900",
    "black-860",
    "black-830",
    "black-800",
    "black-760",
    "black-730",
    "black-700",
    "black-660",
    "black-630",
    "black-600",
    "black-560",
    "black-530",
    "black-500",
    "black-460",
    "black-430",
    "black-400",
    "black-360",
    "black-330",
    "black-300",
    "black-260",
    "black-230",
    "black-200",
    "black-160",
    "black-130",
    "black-100",
    "red-900",
    "red-860",
    "red-830",
    "red-800",
    "red-760",
    "red-730",
    "red-700",
    "red-660",
    "red-630",
    "red-600",
    "red-560",
    "red-530",
    "red-500",
    "red-460",
    "red-430",
    "red-400",
    "red-360",
    "red-330",
    "red-300",
    "red-260",
    "red-230",
    "red-200",
    "red-160",
    "red-130",
    "red-100",
    "yellow-900",
    "yellow-860",
    "yellow-830",
    "yellow-800",
    "yellow-760",
    "yellow-730",
    "yellow-700",
    "yellow-660",
    "yellow-630",
    "yellow-600",
    "yellow-560",
    "yellow-530",
    "yellow-500",
    "yellow-460",
    "yellow-430",
    "yellow-400",
    "yellow-360",
    "yellow-330",
    "yellow-300",
    "yellow-260",
    "yellow-230",
    "yellow-200",
    "yellow-160",
    "yellow-130",
    "yellow-100",
    "green-900",
    "green-860",
    "green-830",
    "green-800",
    "green-760",
    "green-730",
    "green-700",
    "green-660",
    "green-630",
    "green-600",
    "green-560",
    "green-530",
    "green-500",
    "green-460",
    "green-430",
    "green-400",
    "green-360",
    "green-330",
    "green-300",
    "green-260",
    "green-230",
    "green-200",
    "green-160",
    "green-130",
    "green-100",
];

const ColorVarItems: ToolboxItem[] = colorVariables.map((colorVariable: string) => {
    return {
        title: "Copy " + colorVariable,
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--" + colorVariable)));
            Toasts.show({ message: "Color " + colorVariable + " copied to clipboard", id: "toolbox-color-var-copied", type: 1 });
        },
        id: colorVariable
    };
});

const ToolboxItems: ToolboxItem[] = [
    {
        title: "Colorway Selector",
        onClick: () => {
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
                                DataStore.get("customColorways").then(customColorways => {
                                    DataStore.get("actveColorwayID").then((actveColorwayID: string) => {
                                        if (LazySwatchLoaded === false) {
                                            SettingsRouter.open("Appearance");
                                        }
                                        openModal(props => <SelectorModal modalProps={props} colorwayProps={colorways} customColorwayProps={customColorways} activeColorwayProps={actveColorwayID} />);
                                    });
                                });
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            return null;
                        });
                });
            });
        },
        id: "colorways-toolbox_colorways-selector"
    },
    {
        title: "Colorway Creator",
        onClick: () => {
            if (LazySwatchLoaded === false) {
                SettingsRouter.open("Appearance");
            }
            const modal = openModal(props => <CreatorModal modalProps={props} modalID={modal} />);
        },
        id: "colorways-toolbox_colorways-creator"
    },
    {
        title: "Color Picker",
        onClick: () => {
            if (LazySwatchLoaded === false) {
                SettingsRouter.open("Appearance");
            }
            openModal(props => <ColorPickerModal modalProps={props} />);
        },
        id: "colorways-toolbox_colorpicker"
    },
    {
        title: "Copy Accent Color",
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--brand-experiment")));
            Toasts.show({ message: "Accent color copied to clipboard", id: "toolbox-accent-color-copied", type: 1 });
        },
        id: "colorways-toolbox_copy-accent"
    },
    {
        title: "Copy Primary Color",
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--background-primary")));
            Toasts.show({ message: "Primary color copied to clipboard", id: "toolbox-primary-color-copied", type: 1 });
        },
        id: "colorways-toolbox_copy-primary"
    },
    {
        title: "Copy Secondary Color",
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--background-secondary")));
            Toasts.show({ message: "Secondary color copied to clipboard", id: "toolbox-secondary-color-copied", type: 1 });
        },
        id: "colorways-toolbox_copy-secondary"
    },
    {
        title: "Copy Tertiary Color",
        onClick: () => {
            function getHex(str: string): string { return Object.assign(document.createElement("canvas").getContext("2d") as {}, { fillStyle: str }).fillStyle; }
            Clipboard.copy(getHex(getComputedStyle(document.body).getPropertyValue("--background-tertiary")));
            Toasts.show({ message: "Tertiary color copied to clipboard", id: "toolbox-tertiary-color-copied", type: 1 });
        },
        id: "colorways-toolbox_copy-tertiary"
    },
    {
        title: "Copy Other Colors",
        onClick: () => openModal(props => <ColorStealerModal modalProps={props} />),
        id: "colorways-toolbox_copy-other"
    }
];

export function ToolboxModal({ modalProps }: { modalProps: ModalProps; }) {
    const [toolboxItems, setToolboxItems] = useState<ToolboxItem[]>(ToolboxItems);
    let results: ToolboxItem[];
    function searchToolboxItems(e: string) {
        results = [];
        ToolboxItems.find((ToolboxItem: ToolboxItem) => {
            if (ToolboxItem.title.toLowerCase().includes(e.toLowerCase())) {
                results.push(ToolboxItem);
            }
        });
        setToolboxItems(results);
    }
    return (<ModalRoot {...modalProps}>
        <div className="colorwayToolbox-list">
            <TextInput placeholder="Search for an action:" onChange={searchToolboxItems} className="colorwayToolbox-search"></TextInput>
            <div className="colorwayToolbox-itemList">
                {toolboxItems.map((toolboxItem: ToolboxItem, i: number) => {
                    return <div id={toolboxItem.id || "colorways-toolbox_item-" + i} className="colorwayToolbox-listItem" onClick={toolboxItem.onClick}>{toolboxItem.title}</div>;
                })}
            </div>
        </div>
    </ModalRoot>);
}

export function ColorStealerModal({ modalProps }: { modalProps: ModalProps; }) {
    const [colorVarItems, setColorVarItems] = useState<ToolboxItem[]>(ColorVarItems);
    let results: ToolboxItem[];
    function searchToolboxItems(e: string) {
        results = [];
        ColorVarItems.find((ToolboxItem: ToolboxItem) => {
            if (ToolboxItem.title.toLowerCase().includes(e.toLowerCase())) {
                results.push(ToolboxItem);
            }
        });
        setColorVarItems(results);
    }
    return (<ModalRoot {...modalProps}>
        <div className="colorwayToolbox-list">
            <TextInput placeholder="Search for a color:" onChange={searchToolboxItems} className="colorwayToolbox-search"></TextInput>
            <div className="colorwayToolbox-itemList">
                {colorVarItems.map((toolboxItem: ToolboxItem) => {
                    return <div id={"colorways-colorstealer-item_" + toolboxItem.id} className="colorwayToolbox-listItem" onClick={toolboxItem.onClick} style={{ "--brand-experiment": "var(--" + toolboxItem.id + ")" } as React.CSSProperties}>{toolboxItem.title}</div>;
                })}
            </div>
        </div>
    </ModalRoot>);
}

const DiscordColorways = definePlugin({
    name: "DiscordColorways",
    description: "The definitive way to style Discord.",
    authors: [Devs.DaBluLite],
    dependencies: ["ServerListAPI"],
    creatorVersion: "1.14",
    toolboxActions: {
        "Open Toolbox": () => openModal(props => <ToolboxModal modalProps={props} />)
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
    flux: {
        "MESSAGE_CREATE": e => {
            MessageAccessories.addAccessory("colorway-id-message", () => {
                if (e.message.content.includes("colorway:"))
                    return <Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => { }}>Add this Colorway...</Button>;
                return null;
            });
        },
        "LOAD_MESSAGES": e => {
            MessageAccessories.addAccessory("colorway-id-message", () => {
                if (e.message.content.includes("colorway:"))
                    return <Button style={{ marginLeft: 8 }} color={Button.Colors.PRIMARY} size={Button.Sizes.MEDIUM} look={Button.Looks.FILLED} onClick={() => { }}>Add this Colorway...</Button>;
                return null;
            });
        }
    },
    set ColorPicker(e: any) {
        ColorPicker = e;
        LazySwatchLoaded = true;
    },
    set ListItem(e: any) {
        ListItem = e;
        console.log(ListItem);
    },
    start: () => {
        enableStyle(style);


        DataStore.get("actveColorway").then(activeColorway => {
            ColorwayCSS.set(activeColorway);
        });
        addServerListElement(ServerListRenderPosition.Above, () => <ColorwaysButton />);
    },
    stop: () => {
        disableStyle(style);
        removeServerListElement(ServerListRenderPosition.Above, () => <ColorwaysButton />);
        ColorwayCSS.remove();
    }
});

export default DiscordColorways;
