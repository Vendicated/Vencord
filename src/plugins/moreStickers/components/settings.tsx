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

import { CheckedTextInput } from "@components/CheckedTextInput";
import { Flex } from "@components/Flex";
import { Button, Forms, React, TabBar, Text, TextArea, Toasts } from "@webpack/common";

import { convert as convertLineSP, getIdFromUrl as getLineStickerPackIdFromUrl, getStickerPackById as getLineStickerPackById, parseHtml as getLineSPFromHtml, isLineStickerPackHtml } from "../lineStickers";
import { convert as convertLineEP, getIdFromUrl as getLineEmojiPackIdFromUrl, getStickerPackById as getLineEmojiPackById, parseHtml as getLineEPFromHtml, isLineEmojiPackHtml } from "../lineEmojis";
import { deleteStickerPack, getStickerPackMetas, saveStickerPack } from "../stickers";
import { StickerPack, StickerPackMeta } from "../types";
import { cl, clPicker } from "../utils";

enum SettingsTabsKey {
    ADD_STICKER_PACK_URL = "Add from URL",
    ADD_STICKER_PACK_HTML = "Add from HTML",
    ADD_STICKER_PACK_FILE = "Add from File",
}

const noDrag = {
    onMouseDown: e => { e.preventDefault(); return false; },
    onDragStart: e => { e.preventDefault(); return false; }
};

const StickerPackMetadata = ({ meta, hoveredStickerPackId, setHoveredStickerPackId, refreshStickerPackMetas }:
    { meta: StickerPackMeta, [key: string]: any; }
) => {
    return (
        <div className="sticker-pack"
            onMouseEnter={() => setHoveredStickerPackId(meta.id)}
            onMouseLeave={() => setHoveredStickerPackId(null)}
        >
            <div className={
                [
                    clPicker("content-row-grid-inspected-indicator"),
                    hoveredStickerPackId === meta.id ? "inspected" : ""
                ].join(" ")
            } style={{
                top: "unset",
                left: "unset",
                height: "96px",
                width: "96px",
            }}></div>
            <img src={meta.logo.image} width="96" {...noDrag} />
            <button
                className={hoveredStickerPackId === meta.id ? "show" : ""}
                onClick={async () => {
                    try {
                        await deleteStickerPack(meta.id);
                        Toasts.show({
                            message: "Sticker Pack deleted",
                            type: Toasts.Type.SUCCESS,
                            id: Toasts.genId(),
                            options: {
                                duration: 1000
                            }
                        });
                        await refreshStickerPackMetas();
                    } catch (e: any) {
                        Toasts.show({
                            message: e.message,
                            type: Toasts.Type.FAILURE,
                            id: Toasts.genId(),
                            options: {
                                duration: 1000
                            }
                        });
                    }
                }}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" style={{ fill: "var(--status-danger)" }}>
                    <title>Delete</title>
                    <path d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z" />
                    <path d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z" />
                </svg>
            </button>
            <Text className={cl("pack-title")} tag="span">{meta.title}</Text>
        </div>
    );
};

export const Settings = () => {
    const [stickerPackMetas, setstickerPackMetas] = React.useState<StickerPackMeta[]>([]);
    const [addStickerUrl, setAddStickerUrl] = React.useState<string>("");
    const [addStickerHtml, setAddStickerHtml] = React.useState<string>("");
    const [tab, setTab] = React.useState<SettingsTabsKey>(SettingsTabsKey.ADD_STICKER_PACK_URL);
    const [hoveredStickerPackId, setHoveredStickerPackId] = React.useState<string | null>(null);

    async function refreshStickerPackMetas() {
        setstickerPackMetas(await getStickerPackMetas());
    }
    React.useEffect(() => {
        refreshStickerPackMetas();
    }, []);

    return (
        <div className={cl("settings")}>
            <TabBar
                type="top"
                look="brand"
                selectedItem={tab}
                onItemSelect={setTab}
                className="tab-bar"
            >
                {
                    Object.values(SettingsTabsKey).map(k => (
                        <TabBar.Item key={k} id={k} className="tab-bar-item">
                            {k}
                        </TabBar.Item>
                    ))
                }
            </TabBar>

            {tab === SettingsTabsKey.ADD_STICKER_PACK_URL &&
                <div className="section">
                    <Forms.FormTitle tag="h5">Add Sticker Pack from URL</Forms.FormTitle>
                    <Forms.FormText>
                        <p>
                            Currently LINE stickers supported only. <br />
                            Telegram stickers support is planned, but due to the lack of a public API, it is most likely to be provided by sticker pack files instead of adding by URL.
                        </p>
                    </Forms.FormText>
                    <Flex flexDirection="row" style={{
                        alignItems: "center",
                        justifyContent: "center"
                    }} >
                        <span style={{
                            flexGrow: 1
                        }}>
                            <CheckedTextInput
                                value={addStickerUrl}
                                onChange={setAddStickerUrl}
                                validate={(v: string) => {
                                    try {
                                        getLineStickerPackIdFromUrl(v);
                                        return true;
                                    } catch (e: any) { }
                                    try {
                                        getLineEmojiPackIdFromUrl(v);
                                        return true;
                                    } catch (e: any) { }

                                    return "Invalid URL";
                                }}
                                placeholder="Sticker Pack URL"
                            />
                        </span>
                        <Button
                            size={Button.Sizes.SMALL}
                            onClick={async e => {
                                e.preventDefault();

                                let type: string = "";
                                try {
                                    getLineStickerPackIdFromUrl(addStickerUrl);
                                    type = "LineStickerPack";
                                } catch (e: any) { }

                                try {
                                    getLineEmojiPackIdFromUrl(addStickerUrl);
                                    type = "LineEmojiPack";
                                } catch (e: any) { }

                                let errorMessage = "";
                                switch (type) {
                                    case "LineStickerPack": {
                                        try {
                                            const id = getLineStickerPackIdFromUrl(addStickerUrl);
                                            const lineSP = await getLineStickerPackById(id);
                                            const stickerPack = convertLineSP(lineSP);
                                            await saveStickerPack(stickerPack);
                                        } catch (e: any) {
                                            console.error(e);
                                            errorMessage = e.message;
                                        }
                                        break;
                                    };
                                    case "LineEmojiPack": {
                                        try {
                                            const id = getLineEmojiPackIdFromUrl(addStickerUrl);
                                            const lineEP = await getLineEmojiPackById(id);
                                            const stickerPack = convertLineEP(lineEP);
                                            await saveStickerPack(stickerPack);

                                        } catch (e: any) {
                                            console.error(e);
                                            errorMessage = e.message;
                                        }
                                        break;
                                    }
                                }

                                setAddStickerUrl("");
                                refreshStickerPackMetas();

                                if (errorMessage) {
                                    Toasts.show({
                                        message: errorMessage,
                                        type: Toasts.Type.FAILURE,
                                        id: Toasts.genId(),
                                        options: {
                                            duration: 1000
                                        }
                                    });
                                } else {
                                    Toasts.show({
                                        message: "Sticker Pack added",
                                        type: Toasts.Type.SUCCESS,
                                        id: Toasts.genId(),
                                        options: {
                                            duration: 1000
                                        }
                                    });
                                }

                            }}
                        >Insert</Button>
                    </Flex>
                </div>
            }
            {tab === SettingsTabsKey.ADD_STICKER_PACK_HTML &&
                <div className="section">
                    <Forms.FormTitle tag="h5">Add Sticker Pack from HTML</Forms.FormTitle>
                    <Forms.FormText>
                        <p>
                            When encountering errors while adding a sticker pack, you can try to add it using the HTML source code of the sticker pack page.<br />
                            This applies to stickers which are region locked / OS locked / etc.<br />
                            The region LINE recognized may vary from the region you are in due to the CORS proxy we're using.
                        </p>
                    </Forms.FormText>
                    <Flex flexDirection="row" style={{
                        alignItems: "center",
                        justifyContent: "center"
                    }} >
                        <span style={{
                            flexGrow: 1
                        }}>
                            <TextArea
                                value={addStickerHtml}
                                onChange={setAddStickerHtml}
                                placeholder="Paste HTML here"
                                rows={1}
                            />
                        </span>
                        <Button
                            size={Button.Sizes.SMALL}
                            onClick={async e => {
                                e.preventDefault();

                                let errorMessage = "";
                                if (isLineEmojiPackHtml(addStickerHtml)) {
                                    try {
                                        const lineSP = getLineSPFromHtml(addStickerHtml);
                                        const stickerPack = convertLineSP(lineSP);
                                        await saveStickerPack(stickerPack);
                                    } catch (e: any) {
                                        console.error(e);
                                        errorMessage = e.message;
                                    }
                                } else if (isLineStickerPackHtml(addStickerHtml)) {
                                    try {
                                        const lineEP = getLineEPFromHtml(addStickerHtml);
                                        const stickerPack = convertLineEP(lineEP);
                                        await saveStickerPack(stickerPack);
                                    } catch (e: any) {
                                        console.error(e);
                                        errorMessage = e.message;
                                    }
                                }

                                setAddStickerHtml("");
                                refreshStickerPackMetas();

                                if (errorMessage) {
                                    Toasts.show({
                                        message: errorMessage,
                                        type: Toasts.Type.FAILURE,
                                        id: Toasts.genId(),
                                        options: {
                                            duration: 1000
                                        }
                                    });
                                } else {
                                    Toasts.show({
                                        message: "Sticker Pack added",
                                        type: Toasts.Type.SUCCESS,
                                        id: Toasts.genId(),
                                        options: {
                                            duration: 1000
                                        }
                                    });
                                }
                            }}
                        >Insert from HTML</Button>
                    </Flex>
                </div>
            }
            {
                tab === SettingsTabsKey.ADD_STICKER_PACK_FILE &&
                <div className="section">
                    <Forms.FormTitle tag="h5">Add Sticker Pack from File</Forms.FormTitle>

                    <Button
                        size={Button.Sizes.SMALL}
                        onClick={async e => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = ".stickerpack,.stickerpacks,.json";
                            input.onchange = async e => {
                                try {
                                    const file = input.files?.[0];
                                    if (!file) return;

                                    const fileText = await file.text();
                                    const fileJson = JSON.parse(fileText);
                                    let stickerPacks: StickerPack[] = [];
                                    if (Array.isArray(fileJson)) {
                                        stickerPacks = fileJson;
                                    } else {
                                        stickerPacks = [fileJson];
                                    }

                                    for (const stickerPack of stickerPacks) {
                                        await saveStickerPack(stickerPack);
                                    }

                                    Toasts.show({
                                        message: "Sticker Packs added",
                                        type: Toasts.Type.SUCCESS,
                                        id: Toasts.genId(),
                                        options: {
                                            duration: 1000
                                        }
                                    });
                                } catch (e: any) {
                                    console.error(e);
                                    Toasts.show({
                                        message: e.message,
                                        type: Toasts.Type.FAILURE,
                                        id: Toasts.genId(),
                                        options: {
                                            duration: 1000
                                        }
                                    });
                                }
                            };
                            input.click();
                        }}
                    >
                        Open Sticker Pack File
                    </Button>
                </div>
            }
            <Forms.FormDivider style={{
                marginTop: "8px",
                marginBottom: "8px"
            }} />
            <Forms.FormTitle tag="h5">Stickers Management</Forms.FormTitle>

            <div className="section">
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                    gap: "8px"
                }}>
                    {
                        stickerPackMetas.map(meta => (
                            <StickerPackMetadata
                                key={meta.id}
                                meta={meta}
                                hoveredStickerPackId={hoveredStickerPackId}
                                setHoveredStickerPackId={setHoveredStickerPackId}
                                refreshStickerPackMetas={refreshStickerPackMetas}
                            />
                        ))
                    }
                </div>
            </div>

        </div>
    );
};
