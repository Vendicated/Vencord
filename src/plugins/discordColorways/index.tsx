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

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { disableStyle, enableStyle } from "@api/Styles";
import { Devs } from "@utils/constants";
import { ModalContent, ModalProps, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";

import style from "./style.css?managed";


const ColorwaysButton = () => (
    <div style={{ marginBottom: "8px", width: "72px", height: "48px", display: "flex", justifyContent: "center" }}>
        <div className="ColorwaySelectorBtn" onClick={() => openModal(props => <Modal modalProps={props} />)}><div className="colorwaySelectorIcon"></div></div>
    </div>
);


function Modal({ modalProps }: { modalProps: ModalProps; }) {
    return (
        <ModalRoot {...modalProps}>
            <ModalContent>
                helo
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
        if (!Vencord.Settings.plugins.DiscordColorways.colorwaySourceFiles) {
            Vencord.Settings.plugins.DiscordColorways.colorwaySourceFiles = ["https://raw.githubusercontent.com/DaBluLite/DiscordColorways/master/index.json"];
        }
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
        if (Vencord.Settings.plugins.DiscordColorways.activeColorway) {

            var colorways = [];

            Vencord.Settings.plugins.DiscordColorways.colorwaySourceFiles.forEach((colorwayList, i) => {
                fetch(colorwayList)
                    .then(response => response.json())
                    .then(data => {
                        if (!data) return;
                        if (!data.colorways?.length) return;
                        data.colorways?.forEach(color => colorways.push(color));

                        if (i + 1 == Vencord.Settings.plugins.DiscordColorways.colorwaySourceFiles.length) {
                            if (document.getElementById("activeColorwayCSS")) {
                                document.getElementById("activeColorwayCSS")!.textContent = colorways.filter(colorway => colorway.name === Vencord.Settings.plugins.DiscordColorways.activeColorway)[0].import;
                            } else {
                                document.head.append(createElement("style", { id: "activeColorwayCSS", innertext: colorways.filter(colorway => colorway.name === Vencord.Settings.plugins.DiscordColorways.activeColorway)[0].import }));
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
            Vencord.Settings.plugins.DiscordColorways.activeColorway = null;
        } else {
            console.log("No Active Colorway.");
        }
    },
    commands: [
        {
            name: "applyColorway",
            description: "Applies colorway using a name",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "colorway",
                    description: "Colorway Name",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
            ],
            execute: (_, ctx) => {
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


                const word = findOption(_, "colorway", "");

                if (!word) {
                    return sendBotMessage(ctx.channel.id, {
                        content: "No colorway was defined!"
                    });
                }

                var colorways = [];

                Vencord.Settings.plugins.DiscordColorways.colorwaySourceFiles.forEach((colorwayList, i) => {
                    fetch(colorwayList)
                        .then(response => response.json())
                        .then(data => {
                            data.colorways?.forEach(color => colorways.push(color));

                            if (i + 1 == Vencord.Settings.plugins.DiscordColorways.colorwaySourceFiles.length) {
                                if (!data.colorways?.length || !colorways.filter(colorway => colorway.name === word)[0]) {
                                    console.log(data);
                                    return sendBotMessage(ctx.channel.id, { content: "Colorway does not exist" });
                                }
                                Vencord.Settings.plugins.DiscordColorways.activeColorway = word;
                                if (document.getElementById("activeColorwayCSS")) {
                                    document.getElementById("activeColorwayCSS")!.textContent = colorways.filter(colorway => colorway.name === word)[0].import;
                                } else {
                                    document.head.append(createElement("style", { id: "activeColorwayCSS", innertext: colorways.filter(colorway => colorway.name === word)[0].import }));
                                }
                                sendBotMessage(ctx.channel.id, { content: "Applying Colorway: " + word + "..." });
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            sendBotMessage(ctx.channel.id, { content: "There was an error. Check the console for more info" });
                            return null;
                        });
                });
            }
        },
        {
            name: "disableColorway",
            description: "Applies colorway using a name",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_, ctx) => {
                if (document.getElementById("activeColorwayCSS")) {
                    document.getElementById("activeColorwayCSS")?.remove();
                    sendBotMessage(ctx.channel.id, { content: "Disabled Colorway." });
                    Vencord.Settings.plugins.DiscordColorways.activeColorway = null;
                } else {
                    sendBotMessage(ctx.channel.id, { content: "No Active Colorway." });
                }
            },
        },
        {
            name: "listAllColorways",
            description: "Lists Colorways from all Source Files.",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute: (_, ctx) => {
                let colorwaysString = "List of all Colorways:\n";

                Vencord.Settings.plugins.DiscordColorways.colorwaySourceFiles.forEach((colorwayList, i) => {
                    fetch(colorwayList)
                        .then(response => response.json())
                        .then(data => {
                            if (!data.colorways?.length || !data) {
                                return sendBotMessage(ctx.channel.id, { content: "Couldn't find any colorways" });
                            }

                            data.colorways.forEach(colorway => {
                                colorwaysString += "* " + colorway.name + "\n";
                            });

                            if (i + 1 == Vencord.Settings.plugins.DiscordColorways.colorwaySourceFiles.length) {
                                sendBotMessage(ctx.channel.id, { content: colorwaysString });
                            }
                        })
                        .catch(err => {
                            console.log(err);
                            sendBotMessage(ctx.channel.id, { content: "There was an error. Check the console for more info" });
                            return null;
                        });
                });
            },
        }
    ]
});
