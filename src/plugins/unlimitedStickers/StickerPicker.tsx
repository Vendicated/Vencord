/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 chev
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { Divider, Heading } from "@components/index";
import { getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import {
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    type ModalProps,
    ModalRoot,
    openModal,
} from "@utils/modal";
import type { Channel } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import {
    Alerts,
    Clickable,
    GuildStore,
    MessageActions,
    React,
    RestAPI,
    ScrollerThin,
    TextInput,
    Toasts,
    Tooltip,
    FluxDispatcher,
} from "@webpack/common";
import "./styles.css";

import {
    addRecentSticker,
    FAVORITES_EXPANDED_KEY,
    getFavorites,
    getRecentStickers,
    LIBRARY_KEY,
    RECENT_EXPANDED_KEY,
    STICKER_DATA_KEY_PREFIX,
    type StickerCategory,
    type StickerFile,
    saveExpansionState,
    saveFavorites,
    settings,
} from "./index";
import { getPluginIntlMessage } from "./intl";

const logger = new Logger("UnlimitedStickers");
const Spinner = findByCodeLazy("wanderingCubes");

const ChevronIcon: React.FC<{
    className?: string;
    width?: number;
    height?: number;
}> = ({ className, width = 24, height = 24 }) => (
    <svg
        className={className}
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
    </svg>
);

const StarIcon: React.FC<{
    className?: string;
    width?: number;
    height?: number;
    filled?: boolean;
}> = ({ className, width = 16, height = 16, filled = false }) => (
    <svg
        aria-hidden="true"
        className={className}
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);

const ensureStickerGuild = async (): Promise<string | null> => {
    let guildId = settings.store.stickerGuildId;
    if (guildId && GuildStore.getGuild(guildId)) return guildId;
    try {
        const newGuild = await RestAPI.post({
            url: "/guilds",
            body: {
                name: getPluginIntlMessage("STICKER_GUILD_NAME"),
                icon: null,
                channels: [],
            },
        });

        guildId = newGuild.body.id;
        settings.store.stickerGuildId = guildId;

        Alerts.show({
            title: getPluginIntlMessage("STICKER_GUILD_CREATED_TITLE"),
            body: getPluginIntlMessage("STICKER_GUILD_CREATED_BODY"),
            confirmText: getIntlMessage("GOT_IT"),
        });
        return guildId;
    } catch (error) {
        logger.error(
            `Failed to create 'Vencord Local Stickers' ${getIntlMessage("GUILD").toLowerCase()}:`,
            error,
        );
        Toasts.show({
            message: getPluginIntlMessage("STICKER_GUILD_CREATE_FAILED_BODY"),
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE,
        });
        return null;
    }
};
const uploadAndReplaceSticker = async (
    guildId: string,
    stickerName: string,
    base64File: string,
): Promise<string | null> => {
    const currentStickerId = settings.store.stickerSlotId;
    if (currentStickerId) {
        try {
            await RestAPI.del({
                url: `/guilds/${guildId}/stickers/${currentStickerId}`,
            });
        } catch (e) {
            logger.warn("Could not delete old sticker slot.", e);
        }
    }

    try {
        const blob = await fetch(base64File).then((res) => res.blob());
        const formData = new FormData();
        const safeStickerName = stickerName
            .replace(/[^a-zA-Z0-9_]/g, "_")
            .substring(0, 30)
            .padEnd(2, "_");
        formData.append("name", safeStickerName);
        formData.append(
            "description",
            getPluginIntlMessage("EPHEMERAL_STICKER_DESC"),
        );
        formData.append("tags", "vencord");
        formData.append(
            "file",
            blob,
            `${safeStickerName}.${blob.type.split("/")[1]}`,
        );
        const newSticker = await RestAPI.post({
            url: `/guilds/${guildId}/stickers`,
            body: formData,
        });
        settings.store.stickerSlotId = newSticker.body.id;
        return newSticker.body.id;
    } catch (error) {
        logger.error("Failed to upload new sticker:", error);
        const errorMessage =
            ((error as { body?: { message: string; }; })?.body?.message) ||
            (error as Error).message ||
            getIntlMessage("UNKNOWN_ERROR");
        Toasts.show({
            message: `${getPluginIntlMessage("STICKER_UPLOAD_FAILED")}: ${errorMessage}`,
            id: Toasts.genId(),
            type: Toasts.Type.FAILURE,
        });
        return null;
    }
};

const PendingReplyStore = findByPropsLazy("getPendingReply");

const StickerGridItem: React.FC<{
    file: StickerFile;
    guildId: string;
    channel: Channel;
    closePopout: () => void;
    isFavorite: boolean;
    onToggleFavorite: (file: StickerFile) => void;
    onStickerSent: (file: StickerFile) => void;
}> = ({
    file,
    guildId,
    channel,
    closePopout,
    isFavorite,
    onToggleFavorite,
    onStickerSent,
}) => {
        const [isSending, setIsSending] = React.useState(false);
        const [base64, setBase64] = React.useState<string | null>(null);
        const itemRef = React.useRef<HTMLDivElement>(null);

        React.useEffect(() => {
            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        observer.disconnect();
                        DataStore.get<string>(`${STICKER_DATA_KEY_PREFIX}${file.id}`).then(
                            (data) => data && setBase64(data),
                        );
                    }
                },
                { rootMargin: "200px" },
            );
            if (itemRef.current) observer.observe(itemRef.current);
            return () => observer.disconnect();
        }, [file.id]);

        const handleStickerClick = async () => {
            if (isSending || !base64) return;
            setIsSending(true);

            try {
                const newStickerId = await uploadAndReplaceSticker(
                    guildId,
                    file.name,
                    base64,
                );

                if (newStickerId) {
                    const reply = PendingReplyStore.getPendingReply(channel.id);
                    let sendOptions: any = { stickerIds: [newStickerId] };

                    if (reply) {
                        const replyOptions = MessageActions.getSendMessageOptionsForReply(reply);
                        sendOptions = { ...replyOptions, ...sendOptions };
                    }

                    await MessageActions.sendMessage(channel.id, { content: "" }, false, sendOptions);

                    if (reply) {
                        FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId: channel.id });
                    }

                    onStickerSent(file);
                    closePopout();
                } else {
                    setIsSending(false);
                }
            } catch (error) {
                logger.error("Error sending sticker:", error);
                setIsSending(false);
            }
        };

        const handleFavoriteToggle = (e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleFavorite(file);
        };

        return (
            <Tooltip text={file.name}>
                {(props) => (
                    <div ref={itemRef}>
                        <Clickable
                            {...props}
                            className={classes(
                                "unlimited-stickers-grid-item",
                                isSending && "unlimited-stickers-grid-item--loading",
                                !base64 &&
                                !isSending &&
                                "unlimited-stickers-grid-item--placeholder",
                            )}
                            onClick={handleStickerClick}
                        >
                            {isSending && (
                                <div className="unlimited-stickers-loading-spinner-container">
                                    <Spinner type={Spinner.Type.SPINNING_CIRCLE} />
                                </div>
                            )}
                            {base64 && (
                                <img
                                    src={base64}
                                    alt={file.name}
                                    className="unlimited-stickers-grid-item-img"
                                    loading="lazy"
                                    onLoad={(e) => e.currentTarget.classList.add("loaded")}
                                />
                            )}
                            {base64 && !isSending && (
                                <Tooltip
                                    text={
                                        isFavorite
                                            ? getPluginIntlMessage("REMOVE_FROM_FAVORITES")
                                            : getPluginIntlMessage("ADD_TO_FAVORITES")
                                    }
                                >
                                    {(props) => (
                                        <Clickable
                                            {...props}
                                            onClick={handleFavoriteToggle}
                                            className={classes(
                                                "unlimited-stickers-favorite-button",
                                                isFavorite && "is-favorited",
                                            )}
                                        >
                                            <StarIcon filled={isFavorite} />
                                        </Clickable>
                                    )}
                                </Tooltip>
                            )}
                        </Clickable>
                    </div>
                )}
            </Tooltip>
        );
    };

interface StickerCategoryWrapperProps {
    categoryName: string;
    files: StickerFile[];
    guildId: string;
    channel: Channel;
    closePopout: () => void;
    favoriteIds: Set<string>;
    onToggleFavorite: (file: StickerFile) => void;
    onStickerSent: (file: StickerFile) => void;
    initialIsExpanded: boolean;
    storageKey?: string;
    isInitiallyLoaded?: boolean;
    isClosing: boolean;
}

const StickerCategoryWrapper: React.FC<StickerCategoryWrapperProps> = ({
    initialIsExpanded,
    storageKey,
    categoryName,
    files,
    isInitiallyLoaded = false,
    isClosing,
    ...rest
}) => {
    const [isExpanded, setIsExpanded] = React.useState(initialIsExpanded);
    const [isContentLoaded, setIsContentLoaded] =
        React.useState(isInitiallyLoaded);
    const categoryRef = React.useRef<HTMLDivElement>(null);
    const isInitialMount = React.useRef(true);

    const handleToggleExpanded = React.useCallback(
        () => setIsExpanded((prev) => !prev),
        [],
    );

    React.useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (storageKey) saveExpansionState(storageKey, isExpanded);
    }, [isExpanded, storageKey]);

    React.useEffect(() => {
        if (isContentLoaded || !categoryRef.current || isClosing) {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isClosing) {
                    setIsContentLoaded(true);
                    setIsExpanded(true);
                    observer.disconnect();
                }
            },
            { rootMargin: "100px" },
        );
        observer.observe(categoryRef.current);
        return () => observer.disconnect();
    }, [isContentLoaded, isClosing]);

    return (
        <div className="unlimited-stickers-category" ref={categoryRef}>
            <Clickable
                className="unlimited-stickers-category-header"
                onClick={handleToggleExpanded}
                aria-expanded={isExpanded}
            >
                <Heading tag="h5">
                    {categoryName} ({files.length})
                </Heading>
                <ChevronIcon
                    className={classes(
                        "unlimited-stickers-category-arrow",
                        isExpanded && "unlimited-stickers-category-arrow--expanded",
                    )}
                    width={20}
                    height={20}
                />
            </Clickable>
            {isExpanded && isContentLoaded && (
                <div className="unlimited-stickers-grid">
                    {files.length > 0 ? (
                        files.map((file) => (
                            <StickerGridItem
                                key={file.id}
                                file={file}
                                isFavorite={rest.favoriteIds.has(file.id)}
                                {...rest}
                            />
                        ))
                    ) : (
                        <div className="unlimited-stickers-empty-category">
                            {getPluginIntlMessage("NO_STICKERS_IN_CATEGORY")}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

interface StickerPickerModalProps {
    rootProps: ModalProps;
    channel: Channel;
}

const StickerPickerModal: React.FC<StickerPickerModalProps> = ({
    rootProps,
    channel,
}) => {
    const [allCategories, setAllCategories] = React.useState<StickerCategory[]>(
        [],
    );
    const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(new Set());
    const [recentIds, setRecentIds] = React.useState<string[]>([]);
    const [guildId, setGuildIdState] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [hasStartedLoading, setHasStartedLoading] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    const initialExpansionState = React.useRef<Record<string, boolean>>({});

    const isClosing = rootProps.transitionState === 2;

    React.useEffect(() => {
        const loadStickerData = async () => {
            try {
                const id = await ensureStickerGuild();
                setGuildIdState(id);
                if (!id) return;

                const libraryData =
                    (await DataStore.get<StickerCategory[]>(LIBRARY_KEY)) ?? [];
                libraryData.sort((a, b) => a.name.localeCompare(b.name));

                const [favIds, recentIdsData, favExpanded, recExpanded] = await Promise.all([
                    getFavorites(),
                    getRecentStickers(),
                    DataStore.get<boolean>(FAVORITES_EXPANDED_KEY),
                    DataStore.get<boolean>(RECENT_EXPANDED_KEY),
                ]);

                initialExpansionState.current[FAVORITES_EXPANDED_KEY] = favExpanded ?? true;
                initialExpansionState.current[RECENT_EXPANDED_KEY] = recExpanded ?? true;

                setAllCategories(libraryData);
                setFavoriteIds(new Set(favIds));
                setRecentIds(recentIdsData);
            } catch (e) {
                logger.error("Failed to load sticker data:", e);
            } finally {
                setIsLoading(false);
            }
        };

        if (rootProps.transitionState === 1 && !hasStartedLoading) {
            setHasStartedLoading(true);
            loadStickerData();
        }
    }, [rootProps.transitionState, hasStartedLoading]);

    const allStickersMap = React.useMemo(() => {
        const map = new Map<string, StickerFile>();
        for (const category of allCategories) {
            for (const file of category.files) {
                map.set(file.id, file);
            }
        }
        return map;
    }, [allCategories]);

    const favoriteFiles = React.useMemo(() =>
        Array.from(favoriteIds)
            .map(id => allStickersMap.get(id))
            .filter(Boolean) as StickerFile[],
        [favoriteIds, allStickersMap]);

    const recentFiles = React.useMemo(() =>
        recentIds
            .map(id => allStickersMap.get(id))
            .filter(Boolean) as StickerFile[],
        [recentIds, allStickersMap]);

    const handleToggleFavorite = React.useCallback(
        async (file: StickerFile) => {
            const newFavoriteIds = new Set(favoriteIds);
            if (newFavoriteIds.has(file.id)) {
                newFavoriteIds.delete(file.id);
            } else {
                newFavoriteIds.add(file.id);
            }
            setFavoriteIds(newFavoriteIds);
            await saveFavorites(Array.from(newFavoriteIds));
        },
        [favoriteIds],
    );

    const handleStickerSent = React.useCallback(async (file: StickerFile) => {
        await addRecentSticker(file.id);
        setRecentIds((prev) =>
            [file.id, ...prev.filter((id) => id !== file.id)].slice(0, 16),
        );
    }, []);

    const { filteredFavorites, filteredRecents, filteredLocalCategories } =
        React.useMemo(() => {
            if (!searchQuery)
                return {
                    filteredFavorites: favoriteFiles,
                    filteredRecents: recentFiles,
                    filteredLocalCategories: allCategories,
                };
            const lowerQuery = searchQuery.toLowerCase();
            const filteredFav = favoriteFiles.filter((f) =>
                f.name.toLowerCase().includes(lowerQuery),
            );
            const filteredRec = recentFiles.filter((f) =>
                f.name.toLowerCase().includes(lowerQuery),
            );
            const filteredCat = allCategories
                .map((cat) => {
                    if (cat.name.toLowerCase().includes(lowerQuery)) return cat;
                    const matchingFiles = cat.files.filter((f) =>
                        f.name.toLowerCase().includes(lowerQuery),
                    );
                    return matchingFiles.length > 0
                        ? { ...cat, files: matchingFiles }
                        : null;
                })
                .filter(Boolean) as StickerCategory[];
            return {
                filteredFavorites: filteredFav,
                filteredRecents: filteredRec,
                filteredLocalCategories: filteredCat,
            };
        }, [allCategories, favoriteFiles, recentFiles, searchQuery]);

    const renderContent = () => {
        if (isLoading)
            return (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                    <Spinner type={Spinner.Type.WANDERING_CUBES} />
                </div>
            );
        if (!guildId)
            return (
                <p style={{ padding: 10, color: 'var(--text-muted)' }}>
                    {getPluginIntlMessage("STICKER_GUILD_CREATE_FAILED_BODY")}
                </p>
            );
        const noResults =
            filteredLocalCategories.length === 0 &&
            filteredFavorites.length === 0 &&
            filteredRecents.length === 0;
        if (noResults)
            return (
                <p style={{ padding: 20, textAlign: "center", color: 'var(--text-muted)' }}>
                    {searchQuery
                        ? getPluginIntlMessage("NO_STICKERS_FOUND_QUERY").replace(
                            "{query}",
                            searchQuery,
                        )
                        : getPluginIntlMessage("NO_FILES_FOUND_BODY")}
                </p>
            );

        const commonProps = {
            guildId,
            channel,
            closePopout: rootProps.onClose,
            favoriteIds,
            onToggleFavorite: handleToggleFavorite,
            onStickerSent: handleStickerSent,
            isClosing,
        };
        const isSearching = !!searchQuery;

        return (
            <div className="unlimited-stickers-modal-content">
                <ScrollerThin className="unlimited-stickers-scroller">
                    <StickerCategoryWrapper
                        key="favorites-category"
                        categoryName={getPluginIntlMessage("FAVORITES")}
                        files={filteredFavorites}
                        initialIsExpanded={
                            initialExpansionState.current[FAVORITES_EXPANDED_KEY] ?? true
                        }
                        storageKey={FAVORITES_EXPANDED_KEY}
                        isInitiallyLoaded={true}
                        {...commonProps}
                    />
                    <StickerCategoryWrapper
                        key="recent-category"
                        categoryName={getPluginIntlMessage("RECENTLY_USED")}
                        files={filteredRecents}
                        initialIsExpanded={
                            initialExpansionState.current[RECENT_EXPANDED_KEY] ?? true
                        }
                        storageKey={RECENT_EXPANDED_KEY}
                        isInitiallyLoaded={true}
                        {...commonProps}
                    />
                    {filteredLocalCategories.map((category, index) => (
                        <StickerCategoryWrapper
                            key={category.name}
                            categoryName={category.name}
                            files={category.files}
                            initialIsExpanded={isSearching ? true : index === 0}
                            isInitiallyLoaded={isSearching || index === 0}
                            {...commonProps}
                        />
                    ))}
                </ScrollerThin>
            </div>
        );
    };

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader>
                <Heading tag="h2" style={{ flexGrow: 1 }}>
                    {getPluginIntlMessage("STICKERS")}
                </Heading>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            {!isLoading && (
                <>
                    <div style={{ padding: "0 16px 8px 16px" }}>
                        <TextInput
                            placeholder={getPluginIntlMessage("SEARCH_STICKERS_PLACEHOLDER")}
                            value={searchQuery}
                            onChange={setSearchQuery}
                            autoFocus
                        />
                    </div>
                    <Divider style={{ margin: "8px 0 8px" }} />
                </>
            )}
            <ModalContent style={{ paddingTop: 0 }}>{renderContent()}</ModalContent>
        </ModalRoot>
    );
};

export const openStickerPicker = (channel: Channel) =>
    openModal((props) => (
        <StickerPickerModal rootProps={props} channel={channel} />
    ));