/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { debounce } from "@shared/debounce";
import { ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React, Text, TextInput } from "@webpack/common";

import { PickerContent, PickerContentHeader, PickerContentRow, PickerContentRowGrid, PickerHeaderProps, SidebarProps, Sticker, StickerCategoryType, StickerPack } from "../types";
import { sendSticker } from "../upload";
import { clPicker, FFmpegStateContext } from "../utils";
import { CategoryImage, CategoryScroller, CategoryWrapper, StickerCategory } from "./categories";
import { CancelIcon, CogIcon, IconContainer, RecentlyUsedIcon, SearchIcon } from "./icons";
import { addRecentSticker, getRecentStickers, Header, RECENT_STICKERS_ID, RECENT_STICKERS_TITLE, Settings } from "./misc";

const debounceQueryChange = debounce((cb: Function, ...args: any) => cb(...args), 150);

export const RecentPack = {
    id: RECENT_STICKERS_ID,
    name: RECENT_STICKERS_TITLE,
} as StickerCategoryType;

export const PickerSidebar = ({ packMetas, onPackSelect }: SidebarProps) => {
    const [activePack, setActivePack] = React.useState<StickerCategoryType>(RecentPack);
    const [hovering, setHovering] = React.useState(false);

    return (
        <CategoryWrapper>
            <CategoryScroller categoryLength={packMetas.length}>
                <StickerCategory
                    style={{ padding: "4px", boxSizing: "border-box", width: "32px" }}
                    isActive={activePack === RecentPack}
                    onClick={() => {
                        if (activePack === RecentPack) return;

                        onPackSelect(RecentPack);
                        setActivePack(RecentPack);
                    }}
                >
                    <RecentlyUsedIcon width={24} height={24} color={
                        activePack === RecentPack ? " var(--interactive-active)" : "var(--interactive-normal)"
                    } />
                </StickerCategory>
                {
                    ...packMetas.map(pack => {
                        return (
                            <StickerCategory
                                key={pack.id}
                                onClick={() => {
                                    if (activePack?.id === pack.id) return;

                                    onPackSelect(pack);
                                    setActivePack(pack);
                                }}
                                isActive={activePack?.id === pack.id}
                            >
                                <CategoryImage src={pack.iconUrl!} alt={pack.name} isActive={activePack?.id === pack.id} />
                            </StickerCategory>
                        );
                    })
                }
            </CategoryScroller>
            <div className={clPicker("settings-cog-container")}>
                <button
                    className={clPicker("settings-cog") + (
                        hovering ? ` ${clPicker("settings-cog-active")}` : ""
                    )}
                    onClick={() => {
                        openModal(modalProps => {
                            return (
                                <ModalRoot size={ModalSize.LARGE} {...modalProps}>
                                    <ModalHeader>
                                        <Text tag="h2">Stickers+</Text>
                                    </ModalHeader>
                                    <ModalContent>
                                        <Settings />
                                    </ModalContent>
                                </ModalRoot>
                            );
                        });
                    }}
                    onMouseEnter={() => setHovering(true)}
                    onMouseLeave={() => setHovering(false)}
                >
                    <CogIcon width={20} height={20} />
                </button>
            </div>
        </CategoryWrapper>
    );
};

function PickerContentRowGrid({
    rowIndex,
    colIndex,
    sticker,
    onHover,
    channelId,
    onSend = () => { },
    isHovered = false
}: PickerContentRowGrid) {
    if (FFmpegStateContext === undefined) {
        return <div>FFmpegStateContext is undefined</div>;
    }

    const ffmpegState = React.useContext(FFmpegStateContext);

    return (
        <div
            role="gridcell"
            aria-rowindex={rowIndex}
            aria-colindex={colIndex}
            id={clPicker(`content-row-grid-${rowIndex}-${colIndex}`)}
            onMouseEnter={() => onHover(sticker)}
            onClick={e => {
                if (!channelId) return;

                sendSticker({ channelId, sticker, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, ffmpegState });
                addRecentSticker(sticker);
                onSend(sticker, e.ctrlKey);
            }}
        >
            <div
                className={clPicker("content-row-grid-sticker")}
            >
                <span className={clPicker("content-row-grid-hidden-visually")}>{sticker.title}</span>
                <div aria-hidden="true">
                    <div className={
                        [
                            clPicker("content-row-grid-inspected-indicator"),
                            `${isHovered ? "inspected" : ""}`
                        ].join(" ")
                    }></div>
                    <div className={clPicker("content-row-grid-sticker-node")}>
                        <div className={clPicker("content-row-grid-asset-wrapper")} style={{
                            height: "96px",
                            width: "96px"
                        }}>
                            <img
                                alt={sticker.title}
                                src={sticker.image}
                                draggable="false"
                                datatype="sticker"
                                data-id={sticker.id}
                                className={clPicker("content-row-grid-img")}
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
        <div className={clPicker("content-row")}
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
            className={clPicker("content-header-collapse-icon")}
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
                block: "start",
            });

            afterScroll();
        }
    }, [isSelected]);

    return (
        <span>
            <div className={clPicker("content-header-wrapper")}>
                <div className={clPicker("content-header-header")} ref={headerElem}
                    aria-expanded={isExpand}
                    aria-label={`Category, ${title}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                        setIsExpand(e => !e);
                    }}
                >
                    <div className={clPicker("content-header-header-icon")}>
                        <div>
                            {typeof image === "string" ? <svg
                                className={clPicker("content-header-svg")}
                                width={16} height={16} viewBox="0 0 16 16"
                            >
                                <foreignObject
                                    x={0} y={0} width={16} height={16}
                                    overflow="visible" mask="url(#svg-mask-squircle)"
                                >
                                    <img
                                        alt={title}
                                        src={image}
                                        className={clPicker("content-header-guild-icon")}
                                        loading="lazy"
                                    ></img>
                                </foreignObject>
                            </svg>
                                : image}
                        </div>
                    </div>
                    <span
                        className={clPicker("content-header-header-label")}
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

export function PickerContent({ stickerPacks, selectedStickerPackId, setSelectedStickerPackId, channelId, closePopout, query }: PickerContent) {
    const [currentSticker, setCurrentSticker] = (
        React.useState<Sticker | null>((
            stickerPacks.length && stickerPacks[0].stickers.length) ?
            stickerPacks[0].stickers[0] :
            null
        )
    );

    const [currentStickerPack, setCurrentStickerPack] = React.useState<StickerPack | null>(stickerPacks.length ? stickerPacks[0] : null);
    const [recentStickers, setRecentStickers] = React.useState<Sticker[]>([]);

    const stickerPacksElemRef = React.useRef<HTMLDivElement>(null);
    const scrollerRef = React.useRef<HTMLDivElement>(null);

    function queryFilter(stickers: Sticker[]): Sticker[] {
        if (!query) return stickers;
        return stickers.filter(sticker => sticker.title.toLowerCase().includes(query.toLowerCase()));
    }

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
                    onSend: (_, s) => { !s && closePopout(); },
                    isHovered: currentSticker?.id === stickers[0].id
                }}
                grid2={
                    stickers.length > 1 ? {
                        rowIndex: i,
                        colIndex: 2,
                        sticker: stickers[1],
                        onHover: setCurrentSticker,
                        onSend: (_, s) => { !s && closePopout(); },
                        isHovered: currentSticker?.id === stickers[1].id
                    } : undefined
                }
                grid3={
                    stickers.length > 2 ? {
                        rowIndex: i,
                        colIndex: 3,
                        sticker: stickers[2],
                        onHover: setCurrentSticker,
                        onSend: (_, s) => { !s && closePopout(); },
                        isHovered: currentSticker?.id === stickers[2].id
                    } : undefined
                }
            />
        ));

    return (
        <div className={clPicker("content-list-wrapper")}>
            <div className={clPicker("content-wrapper")}>
                <div className={clPicker("content-scroller")} ref={scrollerRef}>
                    <div className={clPicker("content-list-items")} role="none presentation">
                        <div ref={stickerPacksElemRef}>
                            <PickerContentHeader
                                image={
                                    <RecentlyUsedIcon width={16} height={16} color="currentColor" />
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
                                    ...stickersToRows(
                                        queryFilter(recentStickers)
                                    )
                                }
                            </PickerContentHeader>
                            {
                                stickerPacks.map(sp => {
                                    const rows = stickersToRows(queryFilter(sp.stickers));
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
                <div
                    className={clPicker("content-inspector")}
                    style={{
                        visibility: !currentSticker ? "hidden" : "visible",
                        ...(!currentSticker ? {
                            height: "0"
                        } : {})
                    }}
                >
                    <div className={clPicker("content-inspector-graphic-primary")} aria-hidden="true">
                        <div>
                            <div className={clPicker("content-row-grid-asset-wrapper")} style={{
                                height: "28px",
                                width: "28px"
                            }}>
                                <img
                                    alt={currentSticker?.title ?? ""}
                                    src={currentSticker?.image}
                                    draggable="false"
                                    datatype="sticker"
                                    data-id={currentSticker?.id ?? ""}
                                    className={clPicker("content-inspector-img")}
                                />
                            </div>
                        </div>
                    </div>
                    <div className={clPicker("content-inspector-text-wrapper")}>
                        <div className={clPicker("content-inspector-title-primary")} data-text-variant="text-md/semibold">{currentSticker?.title ?? ""}</div>
                        <div className={clPicker("content-inspector-title-secondary")} data-text-variant="text-md/semibold">
                            {currentStickerPack?.title ? "from " : ""}
                            <strong>{currentStickerPack?.title ?? ""}</strong>
                        </div>
                    </div>
                    <div className={clPicker("content-inspector-graphic-secondary")} aria-hidden="true">
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


export const PickerHeader = ({ onQueryChange }: PickerHeaderProps) => {
    const [query, setQuery] = React.useState<string | undefined>();

    const setQueryDebounced = (value: string, immediate = false) => {
        setQuery(value);
        if (immediate) onQueryChange(value);
        else debounceQueryChange(onQueryChange, value);
    };

    return (
        <Header>
            <div className={clPicker("container")}>
                <div>
                    <div className={clPicker("search-box")}>
                        <TextInput
                            style={{ height: "30px" }}

                            placeholder="Search stickers"
                            autoFocus={true}
                            value={query}

                            onChange={(value: string) => setQueryDebounced(value)}
                        />
                    </div>
                    <div className={clPicker("search-icon")}>
                        <IconContainer>
                            {
                                (query && query.length > 0) ?
                                    <CancelIcon className={clPicker("clear-icon")} width={20} height={20} onClick={() => setQueryDebounced("", true)} /> :
                                    <SearchIcon width={20} height={20} color="var(--text-muted)" />
                            }
                        </IconContainer>
                    </div>
                </div>
            </div>
        </Header>
    );
};
