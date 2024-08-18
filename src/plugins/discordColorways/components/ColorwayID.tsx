import { DataStore, openModal, useState, useEffect, Toasts } from "..";
import { generateCss } from "../css";
import { colorToHex, hexToString } from "../utils";
import CreatorModal from "./CreatorModal";
import { ColorwayCSS } from "../colorwaysAPI";

export let changeThemeIDCard: (theme: string) => void = () => { };

export default function ({ props }) {
    const [theme, setTheme] = useState("discord");

    useEffect(() => {
        async function load() {
            setTheme(await DataStore.get("colorwaysPluginTheme") as string);
        }
        changeThemeIDCard = (theme) => setTheme(theme);
        load();
        return () => {
            changeThemeIDCard = () => { };
        };
    }, []);
    if (String(props.message.content).match(/colorway:[0-9a-f]{0,100}/)) {
        return <div className="colorwayIDCard" data-theme={theme}>
            {String(props.message.content).match(/colorway:[0-9a-f]{0,100}/g)?.map((colorID: string) => {
                colorID = hexToString(colorID.split("colorway:")[1]);
                return <div className="colorwayMessage">
                    <div className="discordColorwayPreviewColorContainer" style={{ width: "56px", height: "56px", marginRight: "16px" }}>
                        {(() => {
                            if (colorID) {
                                if (!colorID.includes(",")) {
                                    throw new Error("Invalid Colorway ID");
                                } else {
                                    return colorID.split("|").filter(string => string.includes(",#"))[0].split(/,#/).map((color: string) => <div className="discordColorwayPreviewColor" style={{ backgroundColor: `#${colorToHex(color)}` }} />);
                                }
                            } else return null;
                        })()}
                    </div>
                    <div className="colorwayMessage-contents">
                        <span className="colorwaysModalSectionHeader">Colorway{/n:([A-Za-z0-9]+( [A-Za-z0-9]+)+)/i.exec(colorID) ? `: ${/n:([A-Za-z0-9]+( [A-Za-z0-9]+)+)/i.exec(colorID)![1]}` : ""}</span>
                        <div style={{
                            display: "flex",
                            gap: "1em"
                        }}>
                            <button
                                className="colorwaysPillButton"
                                onClick={() => openModal(modalProps => <CreatorModal
                                    modalProps={modalProps}
                                    colorwayID={colorID}
                                />)}
                            >
                                Add this Colorway...
                            </button>
                            <button
                                className="colorwaysPillButton"
                                onClick={() => {
                                    navigator.clipboard.writeText(colorID);
                                    Toasts.show({
                                        message: "Copied Colorway ID Successfully",
                                        type: 1,
                                        id: "copy-colorway-id-notify",
                                    });
                                }}
                            >
                                Copy Colorway ID
                            </button>
                            <button
                                className="colorwaysPillButton"
                                onClick={() => {
                                    if (!colorID.includes(",")) {
                                        throw new Error("Invalid Colorway ID");
                                    } else {
                                        colorID.split("|").forEach((prop: string) => {
                                            if (prop.includes(",#")) {
                                                DataStore.set("activeColorwayObject", {
                                                    id: "Temporary Colorway", css: generateCss(
                                                        colorToHex(prop.split(/,#/)[1]),
                                                        colorToHex(prop.split(/,#/)[2]),
                                                        colorToHex(prop.split(/,#/)[3]),
                                                        colorToHex(prop.split(/,#/)[0]),
                                                        true,
                                                        true,
                                                        32,
                                                        "Temporary Colorway"
                                                    ), sourceType: "temporary", source: null
                                                });
                                                ColorwayCSS.set(generateCss(
                                                    colorToHex(prop.split(/,#/)[1]),
                                                    colorToHex(prop.split(/,#/)[2]),
                                                    colorToHex(prop.split(/,#/)[3]),
                                                    colorToHex(prop.split(/,#/)[0]),
                                                    true,
                                                    true,
                                                    32,
                                                    "Temporary Colorway"
                                                ));
                                            }
                                        });
                                    }
                                }}
                            >
                                Apply temporarily
                            </button>
                        </div>
                    </div>
                </div>;
            })}
        </div>;
    } else {
        return null;
    }
}
