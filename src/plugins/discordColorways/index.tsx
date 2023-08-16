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
import { ModalContent, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { Text } from "@webpack/common";

import style from "./style.css?managed";

var colorways = [];

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

const refreshColorways = () => {
    colorways = [];
    Settings.plugins.DiscordColorways.colorwaySourceFiles.forEach(colorwayList => {
        fetch(colorwayList)
            .then(response => response.json())
            .then(data => {
                data.colorways?.map(color => {
                    colorways.push(color);
                });
            })
            .catch(err => {
                console.log(err);
                return null;
            });
    });
};

const refreshColorwaysPromised = new Promise((resolve, reject) => {
    colorways = [];
    Settings.plugins.DiscordColorways.colorwaySourceFiles.forEach((colorwayList, i) => {
        fetch(colorwayList)
            .then(response => response.json())
            .then(data => {
                data.colorways?.map(color => {
                    colorways.push(color);
                });
                if (i + 1 === colorwayList.length) { resolve(colorways); }
            })
            .catch(err => {
                console.log(err);
                return null;
                reject(err);
            });
    });
});


const ColorwaysButton = () => (
    <div className="ColorwaySelectorBtnContainer">
        <div className="ColorwaySelectorBtn" onClick={() => { refreshColorways(); openModal(props => <SelectorModal modalProps={props} />); }}><div className="colorwaySelectorIcon"></div></div>
    </div >
);


function SelectorModal({ modalProps }: { modalProps: ModalProps; }) {
    return (
        <ModalRoot {...modalProps} className="colorwaySelectorModal">
            <ModalContent className="colorwaySelectorModalContent">
                <Text variant="eyebrow" tag="h2">Colorways</Text>
                <div className="ColorwaySelectorWrapper">
                    <div className="discordColorway" id="colorway-refreshcolorway" onClick={refreshColorways}><div className="colorwayRefreshIcon"></div></div>
                    {colorways.map((color, ind) => {
                        // eslint-disable-next-line no-unneeded-ternary
                        return <div className={Settings.plugins.DiscordColorways.activeColorway === color.name ? "discordColorway active" : "discordColorway"} id={"colorway-" + color.name} data-last-official={ind + 1 === colorways.length ? true : false} onClick={e => {
                            document.querySelector(".discordColorway.active")?.classList.remove("active");
                            if (Settings.plugins.DiscordColorways.activeColorway === color.name) {
                                if (document.getElementById("activeColorwayCSS")) {
                                    document.getElementById("activeColorwayCSS")?.remove();
                                    Settings.plugins.DiscordColorways.activeColorway = null;
                                    e.target.className = "discordColorway";
                                }
                            } else {
                                Settings.plugins.DiscordColorways.activeColorway = color.name;
                                if (document.getElementById("activeColorwayCSS")) {
                                    document.getElementById("activeColorwayCSS")!.textContent = color.import;
                                } else {
                                    document.head.append(createElement("style", { id: "activeColorwayCSS", innertext: color.import }));
                                }
                                e.target.className = "discordColorway active";
                            }
                        }}>
                            <div className="colorwayCheckIconContainer">
                                <div className="colorwayCheckIcon"></div>
                            </div>
                            <div className="colorwayInfoIconContainer">
                                <div className="colorwayInfoIcon"></div>
                            </div>
                            <div className="discordColorwayPreviewColorContainer">
                                <div className="discordColorwayPreviewColor" style={{ backgroundColor: color.accent }}></div>
                                <div className="discordColorwayPreviewColor" style={{ backgroundColor: color.primary }}></div>
                                <div className="discordColorwayPreviewColor" style={{ backgroundColor: color.secondary }}></div>
                                <div className="discordColorwayPreviewColor" style={{ backgroundColor: color.tertiary }}></div>
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
    dependencies: ["CommandsAPI", "ServerListAPI"],
    start: () => {
        enableStyle(style);
        addServerListElement(ServerListRenderPosition.Above, () => <ColorwaysButton />);
        if (!Settings.plugins.DiscordColorways.colorwaySourceFiles) {
            Settings.plugins.DiscordColorways.colorwaySourceFiles = ["https://raw.githubusercontent.com/DaBluLite/DiscordColorways/master/index.json"];
        }
        refreshColorways();

        if (Settings.plugins.DiscordColorways.activeColorway) {
            Settings.plugins.DiscordColorways.colorwaySourceFiles.forEach((colorwayList, i) => {
                fetch(colorwayList)
                    .then(response => response.json())
                    .then(data => {
                        if (!data) return;
                        if (!data.colorways?.length) return;
                        data.colorways?.forEach(color => colorways.push(color));

                        if (i + 1 === Settings.plugins.DiscordColorways.colorwaySourceFiles.length) {
                            if (document.getElementById("activeColorwayCSS")) {
                                document.getElementById("activeColorwayCSS")!.textContent = colorways.filter(colorway => colorway.name === Settings.plugins.DiscordColorways.activeColorway)[0].import;
                            } else {
                                document.head.append(createElement("style", { id: "activeColorwayCSS", innertext: colorways.filter(colorway => colorway.name === Settings.plugins.DiscordColorways.activeColorway)[0].import }));
                            }
                        }
                    })
                    .catch(err => {
                        console.log(err);
                        return null;
                    });
            });
        }
    },
    stop: () => {
        disableStyle(style);
        removeServerListElement(ServerListRenderPosition.Above, () => <ColorwaysButton />);
        if (document.getElementById("activeColorwayCSS")) {
            document.getElementById("activeColorwayCSS")?.remove();
            console.log("Disabled Colorway.");
        } else {
            console.log("No Active Colorway.");
        }
    }
});
