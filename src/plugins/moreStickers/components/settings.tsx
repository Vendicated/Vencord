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

import { Text, Forms, React, Button, Toasts, TextInput, TextArea } from "@webpack/common";
import { Flex } from "@components/Flex";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { getStickerPackMetas, deleteStickerPack, saveStickerPack } from "../stickers";
import { StickerPackMeta } from "../types";
import { getIdFromUrl as getLineIdFromUrl, getStickerPackById, parseHtml as getLineSPFromHtml, convert as convertLineSP } from "../lineStickers";

export const Settings = () => {
    const [stickerPackMetas, setstickerPackMetas] = React.useState<StickerPackMeta[]>([]);
    const [addStickerUrl, setAddStickerUrl] = React.useState<string>("");
    const [addStickerHtml, setAddStickerHtml] = React.useState<string>("");
    async function refreshStickerPackMetas() {
        setstickerPackMetas(await getStickerPackMetas());
    }
    React.useEffect(() => {
        refreshStickerPackMetas();
    }, []);
    const [hoveredStickerPackId, setHoveredStickerPackId] = React.useState<string | null>(null);

    return (
        <div className="vc-more-stickers-settings">
            <Forms.FormTitle tag="h3">Stickers Management</Forms.FormTitle>

            <div className="section">
                <Forms.FormTitle tag="h5">Add Sticker</Forms.FormTitle>
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
                                    getLineIdFromUrl(v);
                                } catch (e: any) {
                                    return e.message;
                                }

                                return true;
                            }
                            }
                            placeholder="Sticker Pack URL"
                        />
                    </span>
                    <Button
                        size={Button.Sizes.SMALL}
                        onClick={async (e) => {
                            e.preventDefault();
                            try {
                                const id = getLineIdFromUrl(addStickerUrl);
                                const lineSP = await getStickerPackById(id);
                                const stickerPack = convertLineSP(lineSP);
                                await saveStickerPack(stickerPack);
                                setAddStickerUrl("");
                                refreshStickerPackMetas();
                                Toasts.show({
                                    message: "Sticker Pack added",
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
                        }}
                    >Insert</Button>
                </Flex>
            </div>
            <div className="section">
                <Forms.FormTitle tag="h5">Add Sticker from HTML</Forms.FormTitle>
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
                        onClick={async (e) => {
                            e.preventDefault();
                            try {
                                const lineSP = getLineSPFromHtml(addStickerHtml);
                                const stickerPack = convertLineSP(lineSP);
                                await saveStickerPack(stickerPack);
                                Toasts.show({
                                    message: "Sticker Pack added",
                                    type: Toasts.Type.SUCCESS,
                                    id: Toasts.genId(),
                                    options: {
                                        duration: 1000
                                    }
                                });
                                setAddStickerHtml("");
                                refreshStickerPackMetas();
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
                        }}
                    >Insert from HTML</Button>
                </Flex>
            </div>
            <Forms.FormDivider style={{
                marginTop: "8px",
                marginBottom: "4px"
            }} />
            <div className="section">
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                    gap: "8px"
                }}>
                    {
                        stickerPackMetas.map((meta) => (
                            <React.Fragment key={meta.id}>
                                <div className="sticker-pack"
                                    onMouseEnter={() => setHoveredStickerPackId(meta.id)}
                                    onMouseLeave={() => setHoveredStickerPackId(null)}
                                >
                                    <div className={
                                        [
                                            "vc-more-stickers-picker-content-row-grid-inspected-indicator",
                                            `${hoveredStickerPackId === meta.id ? "inspected" : ""}`
                                        ].join(" ")
                                    } style={{
                                        top: "unset",
                                        left: "unset",
                                        height: "96px",
                                        width: "96px",
                                    }}></div>
                                    <img src={meta.logo.image} width="96" />
                                    <button className={
                                        [
                                            hoveredStickerPackId === meta.id ? "show" : ""
                                        ].join(" ")
                                    }
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
                                        <svg width="24" height="24" viewBox="0 0 24 24">
                                            <title>Delete</title>
                                            <path fill="var(--status-danger)" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z" />
                                            <path fill="var(--status-danger)" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z" />
                                        </svg>
                                    </button>
                                </div>
                            </React.Fragment>
                        ))
                    }
                </div>
            </div>

        </div>
    );
};
