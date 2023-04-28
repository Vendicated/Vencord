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

import { Sticker, StickerPack } from "../types";
import { sendSticker } from "../upload";
import { addRecentSticker, getRecentStickers, RECENT_STICKERS_ID, RECENT_STICKERS_TITLE } from "./recent";
import { RecentlyUsedIcon } from "./recentlyUsedIcon";

export interface PickerContent {
    stickerPacks: StickerPack[];
    selectedStickerPackId?: string | null;
    setSelectedStickerPackId: React.Dispatch<React.SetStateAction<string | null>>;
    channelId: string;
}

export interface PickerContentHeader {
    image: string | React.ReactNode;
    title: string;
    children?: React.ReactNode;
    isSelected?: boolean;
    afterScroll?: () => void;
    beforeScroll?: () => void;
}

export interface PickerContentRow {
    rowIndex: number;
    grid1: PickerContentRowGrid;
    grid2?: PickerContentRowGrid;
    grid3?: PickerContentRowGrid;
    channelId: string;
}

export interface PickerContentRowGrid {
    rowIndex: number;
    colIndex: number;
    sticker: Sticker;
    onHover: (sticker: Sticker | null) => void;
    isHovered?: boolean;
    channelId?: string;
    onSend?: (sticker: Sticker) => void;
}

function PickerContentRowGrid({
    rowIndex,
    colIndex,
    sticker,
    onHover,
    channelId,
    onSend = () => { },
    isHovered = false
}: PickerContentRowGrid) {

    return (
        <div
            role="gridcell"
            aria-rowindex={rowIndex}
            aria-colindex={colIndex}
            id={`vc-more-stickers-PickerContentRowGrid-${rowIndex}-${colIndex}`}
            onMouseEnter={() => onHover(sticker)}
            onClick={() => {
                if (!channelId) return;
                sendSticker(channelId, sticker);
                addRecentSticker(sticker);
                onSend(sticker);
            }}
        >
            <div
                className="vc-more-stickers-PickerContentRowGrid-sticker"
            >
                <span className="vc-more-stickers-PickerContentRowGrid-hiddenVisually">{sticker.title}</span>
                <div aria-hidden="true">
                    <div className={
                        [
                            "vc-more-stickers-PickerContentRowGrid-inspectedIndicator",
                            `${isHovered ? "inspected" : ""}`
                        ].join(" ")
                    }></div>
                    <div className="vc-more-stickers-PickerContentRowGrid-stickerNode">
                        <div className="vc-more-stickers-PickerContentRowGrid-assetWrapper" style={{
                            height: "96px",
                            width: "96px"
                        }}>
                            <img
                                alt={sticker.title}
                                src={sticker.image}
                                draggable="false"
                                datatype="sticker"
                                data-id={sticker.id}
                                className="vc-more-stickers-PickerContentRowGrid-img"
                                loading="lazy"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PickerContentRow({ rowIndex, grid1, grid2, grid3, channelId }: PickerContentRow) {
    return (
        <div className="vc-more-stickers-PickerContentRow"
            role="row"
            aria-rowindex={rowIndex}
        >
            <PickerContentRowGrid {...grid1} rowIndex={rowIndex} colIndex={1} channelId={channelId} />
            {grid2 && <PickerContentRowGrid {...grid2} rowIndex={rowIndex} colIndex={2} channelId={channelId} />}
            {grid3 && <PickerContentRowGrid {...grid3} rowIndex={rowIndex} colIndex={3} channelId={channelId} />}
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

export function PickerContentHeader({
    image,
    title,
    children,
    isSelected = false,
    afterScroll = () => { },
    beforeScroll = () => { }
}: PickerContentHeader) {

    const [isExpand, setIsExpand] = React.useState(true);
    const headerElem = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (isSelected && headerElem.current) {
            beforeScroll();
            headerElem.current.scrollIntoView({
                behavior: "smooth",
            });
            afterScroll();
        }
    }, [isSelected]);

    return (
        <span>
            <div className="vc-more-stickers-PickerContentHeader-wrapper">
                <div className="vc-more-stickers-PickerContentHeader-header" ref={headerElem}
                    aria-expanded={isExpand}
                    aria-label={`Category, ${title}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                        setIsExpand(!isExpand);
                    }}
                >
                    <div className="vc-more-stickers-PickerContentHeader-headerIcon">
                        <div>
                            {typeof image === "string" ? <svg
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
                                        loading="lazy"
                                    ></img>
                                </foreignObject>
                            </svg>
                                : image}
                        </div>
                    </div>
                    <span
                        className="vc-more-stickers-PickerContentHeader-headerLabel"
                    >
                        {title}
                    </span>
                    <HeaderCollapseIcon isExpanded={isExpand} />
                </div>
            </div>
            {isExpand ? children : null}
        </span>
    );
}

export function PickerContent({ stickerPacks, selectedStickerPackId, setSelectedStickerPackId, channelId }: PickerContent) {
    const [currentSticker, setCurrentSticker] = React.useState<Sticker | null>((stickerPacks.length && stickerPacks[0].stickers.length) ? stickerPacks[0].stickers[0] : null);
    const [currentStickerPack, setCurrentStickerPack] = React.useState<StickerPack | null>(stickerPacks.length ? stickerPacks[0] : null);
    const [recentStickers, setRecentStickers] = React.useState<Sticker[]>([]);

    const stickerPacksElemRef = React.useRef<HTMLDivElement>(null);
    const scrollerRef = React.useRef<HTMLDivElement>(null);

    async function fetchRecentStickers() {
        const recentStickers = await getRecentStickers();
        setRecentStickers(recentStickers);
    }

    React.useEffect(() => {
        fetchRecentStickers();
    }, []);

    React.useEffect(() => {
        if (currentStickerPack?.id !== currentSticker?.stickerPackId) {
            setCurrentStickerPack(stickerPacks.find(p => p.id === currentSticker?.stickerPackId) ?? currentStickerPack);
        }
    }, [currentSticker]);

    const stickersToRows = (stickers: Sticker[]): JSX.Element[] => stickers
        .reduce((acc, sticker, i) => {
            if (i % 3 === 0) {
                acc.push([]);
            }
            acc[acc.length - 1].push(sticker);
            return acc;
        }, [] as Sticker[][])
        .map((stickers, i) => (
            <PickerContentRow
                rowIndex={i}
                channelId={channelId}
                grid1={{
                    rowIndex: i,
                    colIndex: 1,
                    sticker: stickers[0],
                    onHover: setCurrentSticker,
                    onSend: fetchRecentStickers,
                    isHovered: currentSticker?.id === stickers[0].id
                }}
                grid2={
                    stickers.length > 1 ? {
                        rowIndex: i,
                        colIndex: 2,
                        sticker: stickers[1],
                        onHover: setCurrentSticker,
                        onSend: fetchRecentStickers,
                        isHovered: currentSticker?.id === stickers[1].id
                    } : undefined
                }
                grid3={
                    stickers.length > 2 ? {
                        rowIndex: i,
                        colIndex: 3,
                        sticker: stickers[2],
                        onHover: setCurrentSticker,
                        onSend: fetchRecentStickers,
                        isHovered: currentSticker?.id === stickers[2].id
                    } : undefined
                }
            />
        ));

    return (
        <div className="vc-more-stickers-PickerContent-listWrapper">
            <div className="vc-more-stickers-PickerContent-wrapper">
                <div className="vc-more-stickers-PickerContent-scroller" ref={scrollerRef}>
                    <div className="vc-more-stickers-PickerContent-listItems" role="none presentation">
                        <div ref={stickerPacksElemRef}>
                            <PickerContentHeader
                                image={
                                    <RecentlyUsedIcon size={16} color="currentColor" />
                                }
                                title={RECENT_STICKERS_TITLE}
                                isSelected={RECENT_STICKERS_ID === selectedStickerPackId}
                                beforeScroll={() => {
                                    scrollerRef.current?.scrollTo({
                                        top: 0,
                                    });
                                }}
                                afterScroll={() => { setSelectedStickerPackId(null); }}
                            >
                                {
                                    ...stickersToRows(recentStickers)
                                }
                            </PickerContentHeader>
                            {
                                stickerPacks.map(sp => {
                                    const rows = stickersToRows(sp.stickers);
                                    return (
                                        <PickerContentHeader
                                            image={sp.logo.image}
                                            title={sp.title}
                                            isSelected={sp.id === selectedStickerPackId}
                                            beforeScroll={() => {
                                                scrollerRef.current?.scrollTo({
                                                    top: 0,
                                                });
                                            }}
                                            afterScroll={() => { setSelectedStickerPackId(null); }}
                                        >
                                            {...rows}
                                        </PickerContentHeader>
                                    );
                                })
                            }
                        </div>
                    </div>
                    <div style={{
                        height: `${stickerPacksElemRef.current?.clientHeight ?? 0}px`
                    }}></div>
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
                                    src={currentSticker?.image}
                                    draggable="false"
                                    datatype="sticker"
                                    data-id={currentSticker?.id ?? ""}
                                    className="vc-more-stickers-PickerContent-inspector-img"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="vc-more-stickers-PickerContent-inspector-textWrapper">
                        <div className="vc-more-stickers-PickerContent-inspector-titlePrimary" data-text-variant="text-md/semibold">{currentSticker?.title ?? ""}</div>
                        <div className="vc-more-stickers-PickerContent-inspector-titleSecondary" data-text-variant="text-md/semibold">
                            {currentStickerPack?.title ? "from " : ""}
                            <strong>{currentStickerPack?.title ?? ""}</strong>
                        </div>
                    </div>
                    <div className="vc-more-stickers-PickerContent-inspector-graphicSecondary" aria-hidden="true">
                        <div>
                            <svg width={32} height={32} viewBox="0 0 32 32">
                                <foreignObject x={0} y={0} width={32} height={32} overflow="visible" mask="url(#svg-mask-squircle)">
                                    <img
                                        alt={currentStickerPack?.title ?? ""}
                                        src={currentStickerPack?.logo?.image}
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
