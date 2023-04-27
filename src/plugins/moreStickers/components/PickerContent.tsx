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

import { React } from "@webpack/common";

import { getStickerPackMeta } from "../stickers";
import { Sticker, StickerPackMeta } from "../types";

export interface PickerContent {
    query?: string;
}

export interface PickerContentHeader {
    image: string;
    title: string;
}

export interface PickerContentRow {
    rowIndex: number;
    grid1: PickerContentRowGrid;
    grid2?: PickerContentRowGrid;
    grid3?: PickerContentRowGrid;
}

export interface PickerContentRowGrid {
    rowIndex: number;
    colIndex: number;
    sticker: Sticker;
    onHover: (sticker: Sticker | null) => void;
}

function PickerContentRowGrid({
    rowIndex,
    colIndex,
    sticker,
    onHover
}: PickerContentRowGrid) {

    return (
        <div
            role="gridcell"
            aria-rowindex={rowIndex}
            aria-colindex={colIndex}
            id={`vc-more-stickers-PickerContentRowGrid-${rowIndex}-${colIndex}`}
            onMouseEnter={() => onHover(sticker)}
        >
            <div
                className="vc-more-stickers-PickerContentRowGrid-sticker"
            >
                <span className="vc-more-stickers-PickerContentRowGrid-hiddenVisually">{sticker.title}</span>
                <div aria-hidden="true">
                    <div className="vc-more-stickers-PickerContentRowGrid-inspectedIndicator"></div>
                    <div className="vc-more-stickers-PickerContentRowGrid-stickerNode">
                        <div className="vc-more-stickers-PickerContentRowGrid-assetWrapper" style={{
                            height: "96px",
                            width: "96px"
                        }}>
                            <img
                                alt={sticker.title}
                                src={sticker.url}
                                draggable="false"
                                datatype="sticker"
                                data-id={sticker.id}
                                className="vc-more-stickers-PickerContentRowGrid-img"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PickerContentRow({ rowIndex, grid1, grid2, grid3 }: PickerContentRow) {
    return (
        <div className="vc-more-stickers-PickerContentRow"
            role="row"
            aria-rowindex={rowIndex}
        >
            <PickerContentRowGrid {...grid1} rowIndex={rowIndex} colIndex={1} />
            {grid2 && <PickerContentRowGrid {...grid2} rowIndex={rowIndex} colIndex={2} />}
            {grid3 && <PickerContentRowGrid {...grid3} rowIndex={rowIndex} colIndex={3} />}
        </div>
    );
}


function HeaderCollapseIcon({ isExpanded }: { isExpanded: boolean; }) {
    return (
        <svg
            className="vc-more-stickers-PickerContentHeader-collapseIcon"
            width={16} height={16} viewBox="0 0 24 24"
            style={{
                transform: `rotate(${isExpanded ? "0" : "-90deg"})`
            }}
        >
            <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M16.59 8.59004L12 13.17L7.41 8.59004L6 10L12 16L18 10L16.59 8.59004Z"></path>
        </svg>
    );
}

export function PickerContentHeader({ image, title }: PickerContentHeader) {
    const [isExpanded, setIsExpanded] = React.useState(true);
    return (
        <div className="vc-more-stickers-PickerContentHeader-wrapper">
            <div className="vc-more-stickers-PickerContentHeader-header"
                aria-expanded={isExpanded}
                aria-label={`Category, ${title}`}
                role="button"
                tabIndex={0}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="vc-more-stickers-PickerContentHeader-headerIcon">
                    <div>
                        <svg
                            className="vc-more-stickers-PickerContentHeader-svg"
                            width={16} height={16} viewBox="0 0 16 16"
                        >
                            <foreignObject
                                x={0} y={0} width={16} height={16}
                                overflow="visible" mask="url(#svg-mask-squircle)"
                            >
                                <img
                                    alt={title}
                                    src={image}
                                    className="vc-more-stickers-PickerContentHeader-guildIcon"
                                ></img>
                            </foreignObject>
                        </svg>
                    </div>
                </div>
                <span
                    className="vc-more-stickers-PickerContentHeader-headerLabel"
                >
                    {title}
                </span>
                <HeaderCollapseIcon isExpanded={isExpanded} />
            </div>
        </div>
    );
}

export function PickerContent({ query }: PickerContent) {
    const [currentSticker, setCurrentSticker] = React.useState<Sticker | null>(null);
    const [stickerPackMeta, setStickerPackMeta] = React.useState<StickerPackMeta | null>(null);

    React.useEffect(() => {
        if (!currentSticker?.stickerPackId) {
            setStickerPackMeta(null);
            return;
        }
        if (stickerPackMeta?.id !== currentSticker.stickerPackId) {
            getStickerPackMeta(currentSticker.stickerPackId).then(setStickerPackMeta);
        }
    }, [currentSticker]);

    function getSampleGrid(rowIndex: number, colIndex: number, onHover: PickerContentRowGrid["onHover"]): PickerContentRowGrid {
        return {
            rowIndex,
            colIndex,
            sticker: {
                id: `test-sticker-${rowIndex}-${colIndex}`,
                url: "https://media.discordapp.net/stickers/1005775259796000809.webp?size=96",
                title: `Test Sticker ${rowIndex}-${colIndex}`,
                stickerPackId: "test-sticker-pack"
            },
            onHover
        };
    }

    return (
        <div className="vc-more-stickers-PickerContent-listWrapper">
            <div className="vc-more-stickers-PickerContent-wrapper">
                <div className="vc-more-stickers-PickerContent-scroller">
                    <div className="vc-more-stickers-PickerContent-listItems" role="none presentation">
                        <div>
                            <PickerContentHeader image="https://cdn.discordapp.com/icons/1015060230222131221/d3f7c37d974d6f4f179324d63b86bb1c.webp?size=40" title="Vencord" />
                            <PickerContentRow
                                rowIndex={1}
                                grid1={getSampleGrid(1, 1, setCurrentSticker)}
                                grid2={getSampleGrid(1, 2, setCurrentSticker)}
                                grid3={getSampleGrid(1, 3, setCurrentSticker)}
                            ></PickerContentRow>
                        </div>
                    </div>
                </div>
                <div className="vc-more-stickers-PickerContent-inspector">
                    <div className="vc-more-stickers-PickerContent-inspector-graphicPrimary" aria-hidden="true">
                        <div>
                            <div className="vc-more-stickers-PickerContentRowGrid-assetWrapper" style={{
                                height: "28px",
                                width: "28px"
                            }}>
                                <img
                                    alt={currentSticker?.title ?? ""}
                                    src={currentSticker?.url}
                                    draggable="false"
                                    datatype="sticker"
                                    data-id={currentSticker?.id ?? ""}
                                    className="vc-more-stickers-PickerContent-inspector-img"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="vc-more-stickers-PickerContent-inspector-textWrapper">
                        <div className="vc-more-stickers-PickerContent-inspector-titlePrimary" data-text-variant="text-md/semibold">{currentSticker?.title ?? "貼圖包寶寶"}</div>
                        <div className="vc-more-stickers-PickerContent-inspector-titleSecondary" data-text-variant="text-md/semibold">
                            {stickerPackMeta?.title ? "from " : ""}
                            <strong>{stickerPackMeta?.title ?? ""}</strong>
                        </div>
                    </div>
                    <div className="vc-more-stickers-PickerContent-inspector-graphicSecondary" aria-hidden="true">
                        <div>
                            <svg width={32} height={32} viewBox="0 0 32 32">
                                <foreignObject x={0} y={0} width={32} height={32} overflow="visible" mask="url(#svg-mask-squircle)">
                                    <img
                                        alt={stickerPackMeta?.title ?? ""}
                                        src={stickerPackMeta?.logo?.url}
                                    ></img>
                                </foreignObject>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
