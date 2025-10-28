/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 chev
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Divider, Heading } from "@components/index";
import { getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { PluginNative } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { Alerts, Clickable, GuildStore, MessageActions, React, RestAPI, ScrollerThin, TextInput, Toasts, Tooltip } from "@webpack/common";
import type { IpcMainInvokeEvent } from "electron";

import {
    settings,
    getFavorites,
    saveFavorites,
    getRecentStickers,
    addRecentSticker,
    FAVORITES_EXPANDED_KEY,
    RECENT_EXPANDED_KEY,
    getExpansionState,
    saveExpansionState
} from "./index";
import { getPluginIntlMessage } from "./intl";

interface StickerFile {
    name: string;
    path: string;
}

interface StickerCategory {
    name: string;
    files: StickerFile[];
}

interface StickerResponse {
    categories: StickerCategory[];
    debug?: string;
}

interface StickerFileWithPreview extends StickerFile {
    base64: string | null;
}

const Native = VencordNative.pluginHelpers.UnlimitedStickers as PluginNative<{
    getStickerFiles: (event: IpcMainInvokeEvent, stickerPath: string) => StickerResponse;
    getFileAsBase64: (event: IpcMainInvokeEvent, path: string) => string | null;
}>;

const logger = new Logger("UnlimitedStickers");
const Spinner = findByCodeLazy("wanderingCubes");

const ChevronIcon: React.FC<{ className?: string; width?: number; height?: number; }> = ({ className, width = 24, height = 24 }) => (
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

const StarIcon: React.FC<{ className?: string; width?: number; height?: number; filled?: boolean; }> = ({ className, width = 16, height = 16, filled = false }) => (
    <svg className={className} width={width} height={height} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
);

/**
 * Ensures the sticker guild exists, creating it if necessary.
 * @returns The ID of the sticker guild, or null if creation failed.
 */
const ensureStickerGuild = async (): Promise<string | null> => {
    let guildId = settings.store.stickerGuildId;

    if (guildId && GuildStore.getGuild(guildId)) {
        return guildId;
    }

    try {
        const newGuild = await RestAPI.post({
            url: "/guilds",
            body: { name: getPluginIntlMessage("STICKER_GUILD_NAME"), icon: null, channels: [] }
        });

        guildId = newGuild.body.id;
        settings.store.stickerGuildId = guildId;

        Alerts.show({
            title: getPluginIntlMessage("STICKER_GUILD_CREATED_TITLE"),
            body: getPluginIntlMessage("STICKER_GUILD_CREATED_BODY"),
            confirmText: getIntlMessage("GOT_IT")
        });
        return guildId;
    } catch (error) {
        logger.error(`Failed to create 'Vencord Local Stickers' ${getIntlMessage("GUILD").toLowerCase()}:`, error);
        Toasts.show({ message: getPluginIntlMessage("STICKER_GUILD_CREATE_FAILED_BODY"), id: Toasts.genId(), type: Toasts.Type.FAILURE });
        return null;
    }
};

/**
 * Uploads a sticker by replacing the one in the single, reusable sticker slot.
 * @param guildId The ID of the sticker guild.
 * @param stickerName The name for the sticker.
 * @param base64File The base64 data URL of the sticker file.
 * @returns The ID of the newly uploaded sticker, or null on failure.
 */
const uploadAndReplaceSticker = async (guildId: string, stickerName: string, base64File: string): Promise<string | null> => {
    const currentStickerId = settings.store.stickerSlotId;

    // Delete the old sticker before uploading a new one to avoid filling the server with stickers.
    if (currentStickerId) {
        try {
            await RestAPI.del({ url: `/guilds/${guildId}/stickers/${currentStickerId}` });
        } catch (e) {
            logger.warn("Could not delete old sticker slot.", e);
        }
    }

    try {
        const blob = await fetch(base64File).then(res => res.blob());
        const formData = new FormData();
        // Sanitize sticker names.
        const safeStickerName = stickerName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30).padEnd(2, '_');
        formData.append('name', safeStickerName);
        formData.append('description', getPluginIntlMessage("EPHEMERAL_STICKER_DESC"));
        formData.append('tags', 'vencord');
        formData.append('file', blob, `${safeStickerName}.${blob.type.split('/')[1]}`);

        const newSticker = await RestAPI.post({ url: `/guilds/${guildId}/stickers`, body: formData });

        settings.store.stickerSlotId = newSticker.body.id;
        return newSticker.body.id;
    } catch (error) {
        logger.error("Failed to upload new sticker:", error);
        const errorMessage = (error as any)?.body?.message || (error as Error).message || getIntlMessage("UNKNOWN_ERROR");
        Toasts.show({ message: `${getPluginIntlMessage("STICKER_UPLOAD_FAILED")}: ${errorMessage}`, id: Toasts.genId(), type: Toasts.Type.FAILURE });
        return null;
    }
};

const StickerGridItem: React.FC<{
    file: StickerFileWithPreview;
    guildId: string;
    channel: Channel;
    closePopout: () => void;
    isFavorite: boolean;
    onToggleFavorite: (file: StickerFileWithPreview) => void;
    onStickerSent: (file: StickerFileWithPreview) => void;
}> = ({ file, guildId, channel, closePopout, isFavorite, onToggleFavorite, onStickerSent }) => {
    const [isSending, setIsSending] = React.useState(false);

    const handleStickerClick = async () => {
        if (isSending || !file.base64) return;
        setIsSending(true);

        try {
            const newStickerId = await uploadAndReplaceSticker(guildId, file.name, file.base64);

            if (newStickerId) {
                await MessageActions.sendMessage(
                    channel.id,
                    { content: "" },
                    false,
                    { stickerIds: [newStickerId] }
                );
                onStickerSent(file);
                closePopout();
            } else {
                setIsSending(false);
            }
        } catch (error) {
            logger.error("Error during sticker click handling:", error);
            setIsSending(false);
        }
    };

    const handleFavoriteToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggleFavorite(file);
    };

    return (
        <Tooltip text={file.name}>
            {props => (
                <Clickable
                    {...props}
                    className={classes(
                        "unlimited-stickers-grid-item",
                        isSending && "unlimited-stickers-grid-item--loading",
                        !file.base64 && !isSending && "unlimited-stickers-grid-item--placeholder"
                    )}
                    onClick={handleStickerClick}
                >
                    {isSending && (
                        <div className="unlimited-stickers-loading-spinner-container">
                            <Spinner type={Spinner.Type.SPINNING_CIRCLE} />
                        </div>
                    )}
                    {file.base64 && (
                        <img
                            src={file.base64}
                            alt={file.name}
                            className="unlimited-stickers-grid-item-img"
                            loading="lazy"
                            onLoad={e => e.currentTarget.classList.add("loaded")}
                        />
                    )}
                    {file.base64 && !isSending && (
                        <Tooltip text={isFavorite ? getPluginIntlMessage("REMOVE_FROM_FAVORITES") : getPluginIntlMessage("ADD_TO_FAVORITES")}>
                            {props => (
                                <Clickable
                                    {...props}
                                    onClick={handleFavoriteToggle}
                                    className={classes("unlimited-stickers-favorite-button", isFavorite && "is-favorited")}
                                    aria-label={isFavorite ? getPluginIntlMessage("REMOVE_FROM_FAVORITES") : getPluginIntlMessage("ADD_TO_FAVORITES")}
                                >
                                    <StarIcon filled={isFavorite} />
                                </Clickable>
                            )}
                        </Tooltip>
                    )}
                </Clickable>
            )}
        </Tooltip>
    );
};

interface StickerCategoryProps {
    categoryName: string;
    files: StickerFileWithPreview[];
    guildId: string;
    channel: Channel;
    closePopout: () => void;
    scrollerNode: HTMLDivElement | null;
    favoritePaths: Set<string>;
    onToggleFavorite: (file: StickerFileWithPreview) => void;
    onStickerSent: (file: StickerFileWithPreview) => void;
    initialExpanded?: boolean;
    alwaysShow?: boolean;
    isExpandedOverride?: boolean;
    onToggleExpanded?: () => void;
    hideHeader?: boolean;
}

const StickerCategoryComponent: React.FC<StickerCategoryProps> = ({
    categoryName,
    files,
    guildId,
    channel,
    closePopout,
    favoritePaths,
    onToggleFavorite,
    onStickerSent,
    initialExpanded = true,
    alwaysShow = false,
    isExpandedOverride,
    onToggleExpanded,
}) => {
    const [internalExpanded, setInternalExpanded] = React.useState(initialExpanded);

    const isExpanded = isExpandedOverride ?? internalExpanded;
    const handleToggle = onToggleExpanded ?? (() => setInternalExpanded(!internalExpanded));

    if (files.length === 0 && !alwaysShow) {
        return null;
    }

    return (
        <div className="unlimited-stickers-category">
            <Clickable
                className="unlimited-stickers-category-header"
                onClick={handleToggle}
                aria-expanded={isExpanded}
            >
                <Heading tag="h5">
                    {categoryName} ({files.length})
                </Heading>
                <ChevronIcon
                    className={classes("unlimited-stickers-category-arrow", isExpanded && "unlimited-stickers-category-arrow--expanded")}
                    width={20}
                    height={20}
                />
            </Clickable>
            {isExpanded && (
                <div className="unlimited-stickers-grid">
                    {files.length === 0 ? (
                        <p className="unlimited-stickers-empty-category">{getPluginIntlMessage("NO_STICKERS_IN_CATEGORY")}</p>
                    ) : (
                        files.map(file => (
                            <StickerGridItem
                                key={file.path}
                                file={file}
                                guildId={guildId}
                                channel={channel}
                                closePopout={closePopout}
                                isFavorite={favoritePaths.has(file.path)}
                                onToggleFavorite={onToggleFavorite}
                                onStickerSent={onStickerSent}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const LazyStickerCategory: React.FC<{
    category: StickerCategory;
    guildId: string;
    channel: Channel;
    closePopout: () => void;
    scrollerNode: HTMLDivElement | null;
    favoritePaths: Set<string>;
    onToggleFavorite: (file: StickerFileWithPreview) => void;
    onStickerSent: (file: StickerFileWithPreview) => void;
}> = ({ category, guildId, channel, closePopout, scrollerNode, favoritePaths, onToggleFavorite, onStickerSent }) => {
    const [filesWithPreviews, setFilesWithPreviews] = React.useState<StickerFileWithPreview[]>(() =>
        category.files.map(file => ({ ...file, base64: null }))
    );
    const categoryRef = React.useRef<HTMLDivElement>(null);
    const hasLoadedRef = React.useRef(false);

    React.useEffect(() => {
        const currentCategoryRef = categoryRef.current;
        if (!currentCategoryRef || !scrollerNode || hasLoadedRef.current) return;

        // Only load previews for categories that are visible or about to be visible.
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasLoadedRef.current) {
                    hasLoadedRef.current = true;
                    observer.disconnect();

                    const loadPreviews = async () => {
                        try {
                            const updatedFiles = await Promise.all(
                                category.files.map(async file => {
                                    const base64 = await Native.getFileAsBase64(file.path);
                                    return { ...file, base64 };
                                })
                            );
                            setFilesWithPreviews(updatedFiles);
                        } catch (error) {
                            logger.error(`Error loading previews for category ${category.name}:`, error);
                        }
                    };
                    loadPreviews();
                }
            },
            {
                root: scrollerNode,
                rootMargin: "300px 0px"
            }
        );

        observer.observe(currentCategoryRef);

        return () => {
            observer.disconnect();
        };
    }, [scrollerNode, category]);

    return (
        <div ref={categoryRef}>
            <StickerCategoryComponent
                categoryName={category.name}
                files={filesWithPreviews}
                guildId={guildId}
                channel={channel}
                closePopout={closePopout}
                scrollerNode={scrollerNode}
                favoritePaths={favoritePaths}
                onToggleFavorite={onToggleFavorite}
                onStickerSent={onStickerSent}
                initialExpanded={true}
            />
        </div>
    );
};

interface StickerPickerModalProps {
    rootProps: ModalProps;
    channel: Channel;
}

const StickerPickerModal: React.FC<StickerPickerModalProps> = ({ rootProps, channel }) => {
    const { stickerPath } = settings.use(["stickerPath"]);
    const [localCategories, setLocalCategories] = React.useState<StickerCategory[]>([]);
    const [favoriteFiles, setFavoriteFiles] = React.useState<StickerFileWithPreview[]>([]);
    const [favoritePaths, setFavoritePaths] = React.useState<Set<string>>(new Set());
    const [recentFiles, setRecentFiles] = React.useState<StickerFileWithPreview[]>([]);
    const [guildId, setGuildIdState] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isLoadingLocal, setIsLoadingLocal] = React.useState(true);
    const [scrollerNode, setScrollerNode] = React.useState<HTMLDivElement | null>(null);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [favoritesExpanded, setFavoritesExpanded] = React.useState(true);
    const [recentsExpanded, setRecentsExpanded] = React.useState(true);

    const scrollerCallbackRef = React.useCallback((instance: any) => {
        if (instance) {
            setScrollerNode(instance.getScrollerNode?.() ?? instance);
        } else {
            setScrollerNode(null);
        }
    }, []);

    React.useEffect(() => {
        const loadPrimaryData = async () => {
            setIsLoading(true);
            if (!stickerPath) {
                Toasts.show({ message: getPluginIntlMessage("SET_STICKER_PATH_PROMPT_BODY"), id: Toasts.genId(), type: Toasts.Type.FAILURE });
                setIsLoading(false);
                return;
            }
            try {
                const id = await ensureStickerGuild();
                setGuildIdState(id);
                if (!id) {
                    setIsLoading(false);
                    return;
                }

                const [
                    favPaths,
                    recentPaths,
                    favExpanded,
                    recExpanded
                ] = await Promise.all([
                    getFavorites(),
                    getRecentStickers(),
                    getExpansionState(FAVORITES_EXPANDED_KEY),
                    getExpansionState(RECENT_EXPANDED_KEY),
                ]);

                setFavoritesExpanded(favExpanded);
                setRecentsExpanded(recExpanded);

                const favPathsSet = new Set(favPaths);
                setFavoritePaths(favPathsSet);

                const favFilePromises = favPaths.map(async (path) => {
                    const name = path.split(/[\\/]/).pop()?.replace(/\.(png|apng|gif|jpe?g)$/i, "") ?? getPluginIntlMessage("UNKNOWN_STICKER_NAME");
                    const base64 = await Native.getFileAsBase64(path);
                    return { name, path, base64 };
                });
                const recentFilePromises = recentPaths.map(async (path) => {
                    const name = path.split(/[\\/]/).pop()?.replace(/\.(png|apng|gif|jpe?g)$/i, "") ?? getPluginIntlMessage("UNKNOWN_STICKER_NAME");
                    const base64 = await Native.getFileAsBase64(path);
                    return { name, path, base64 };
                });

                const [resolvedFavoriteFiles, resolvedRecentFiles] = await Promise.all([
                    Promise.all(favFilePromises),
                    Promise.all(recentFilePromises),
                ]);

                resolvedFavoriteFiles.sort((a, b) => a.name.localeCompare(b.name));
                setFavoriteFiles(resolvedFavoriteFiles.filter(f => f.base64));
                setRecentFiles(resolvedRecentFiles.filter(f => f.base64));

            } catch (e) {
                logger.error("Failed to load primary sticker data:", e);
                setFavoriteFiles([]);
                setFavoritePaths(new Set());
                setRecentFiles([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadPrimaryData();
    }, [stickerPath]);

    React.useEffect(() => {
        if (isLoading || !stickerPath) return;

        const loadLocalCategories = async () => {
            setIsLoadingLocal(true);
            try {
                const { categories: fetchedCategories, debug } = await Native.getStickerFiles(stickerPath);
                if (debug) logger.warn(debug);
                fetchedCategories.sort((a, b) => a.name.localeCompare(b.name));
                setLocalCategories(fetchedCategories);
            } catch (e) {
                logger.error("Failed to load local sticker categories:", e);
                setLocalCategories([]);
            } finally {
                setIsLoadingLocal(false);
            }
        };

        loadLocalCategories();
    }, [isLoading, stickerPath]);


    const handleToggleFavorite = React.useCallback(async (file: StickerFileWithPreview) => {
        const newFavoritePaths = new Set(favoritePaths);
        let updatedFavoriteFiles = [...favoriteFiles];
        let needsSave = false;

        if (newFavoritePaths.has(file.path)) {
            newFavoritePaths.delete(file.path);
            updatedFavoriteFiles = updatedFavoriteFiles.filter(favFile => favFile.path !== file.path);
            needsSave = true;
        } else {
            let currentBase64 = file.base64;
            if (!currentBase64) {
                const base64 = await Native.getFileAsBase64(file.path);
                if (base64) {
                    currentBase64 = base64;
                    const updatedFile = { ...file, base64 };
                    setLocalCategories(prev => prev.map(cat => ({ ...cat, files: cat.files.map(f => f.path === file.path ? updatedFile : f) })));
                    setRecentFiles(prev => prev.map(f => f.path === file.path ? updatedFile : f));
                    file = updatedFile;
                } else {
                    logger.error("Failed to load sticker preview for adding to favorites:", file.path);
                    Toasts.show({ message: getPluginIntlMessage("LOAD_PREVIEW_FAILED"), id: Toasts.genId(), type: Toasts.Type.FAILURE });
                    return;
                }
            }

            newFavoritePaths.add(file.path);
            updatedFavoriteFiles = [...updatedFavoriteFiles, file];
            needsSave = true;
        }

        if (needsSave) {
            setFavoritePaths(newFavoritePaths);
            updatedFavoriteFiles.sort((a, b) => a.name.localeCompare(b.name));
            setFavoriteFiles(updatedFavoriteFiles);
            await saveFavorites(Array.from(newFavoritePaths));
        }
    }, [favoritePaths, favoriteFiles]);

    const handleStickerSent = React.useCallback(async (file: StickerFileWithPreview) => {
        await addRecentSticker(file.path);
        setRecentFiles(prevRecents => {
            const existingIndex = prevRecents.findIndex(f => f.path === file.path);
            const newRecents = [...prevRecents];
            if (existingIndex > -1) {
                newRecents.splice(existingIndex, 1);
            }
            newRecents.unshift(file);
            if (newRecents.length > 16) {
                newRecents.length = 16;
            }
            return newRecents;
        });
    }, []);


    const {
        filteredFavorites,
        filteredRecents,
        filteredLocalCategories
    } = React.useMemo(() => {
        if (!searchQuery) {
            return {
                filteredFavorites: favoriteFiles,
                filteredRecents: recentFiles,
                filteredLocalCategories: localCategories
            };
        }

        const lowerQuery = searchQuery.toLowerCase();

        const filteredFavorites = favoriteFiles.filter(f => f.name.toLowerCase().includes(lowerQuery));
        const filteredRecents = recentFiles.filter(f => f.name.toLowerCase().includes(lowerQuery));

        const filteredLocalCategories = localCategories
            .map((category): StickerCategory | null => {
                const categoryNameMatches = category.name.toLowerCase().includes(lowerQuery);
                if (categoryNameMatches) {
                    return category;
                }

                const matchingFiles = category.files.filter(file =>
                    file.name.toLowerCase().includes(lowerQuery)
                );

                if (matchingFiles.length > 0) {
                    return { ...category, files: matchingFiles };
                }

                return null;
            })
            .filter((category): category is StickerCategory => category !== null);

        return { filteredFavorites, filteredRecents, filteredLocalCategories };
    }, [localCategories, favoriteFiles, recentFiles, searchQuery]);

    const handleToggleFavoritesExpanded = React.useCallback(() => {
        const newState = !favoritesExpanded;
        setFavoritesExpanded(newState);
        saveExpansionState(FAVORITES_EXPANDED_KEY, newState);
    }, [favoritesExpanded]);

    const handleToggleRecentsExpanded = React.useCallback(() => {
        const newState = !recentsExpanded;
        setRecentsExpanded(newState);
        saveExpansionState(RECENT_EXPANDED_KEY, newState);
    }, [recentsExpanded]);


    const renderContent = () => {
        if (!stickerPath) {
            return <p style={{ padding: 20, textAlign: 'center', color: 'white' }}>{getPluginIntlMessage("SET_STICKER_PATH_PROMPT_BODY")}</p>;
        }

        if (isLoading) {
            return <p style={{ padding: 20, textAlign: 'center', color: 'white' }}>{getPluginIntlMessage("LOADING_STICKERS_BODY")}</p>;
        }

        if (!guildId) {
            return <p style={{ padding: 10 }}>{getPluginIntlMessage("STICKER_GUILD_CREATE_FAILED_BODY")}</p>;
        }

        const noLocalCategoriesFound = !isLoadingLocal && filteredLocalCategories.length === 0;
        const noFavoritesFound = filteredFavorites.length === 0;
        const noRecentsFound = filteredRecents.length === 0;

        if (noLocalCategoriesFound && noFavoritesFound && noRecentsFound) {
            return (
                <p style={{ padding: 20, textAlign: 'center', color: 'white' }}>
                    {searchQuery
                        ? getPluginIntlMessage("NO_STICKERS_FOUND_QUERY").replace("{query}", searchQuery)
                        : getPluginIntlMessage("NO_FILES_FOUND_BODY")}
                </p>
            );
        }

        return (
            <div className="unlimited-stickers-modal-content">
                {/* @ts-expect-error Type mismatch */}
                <ScrollerThin ref={scrollerCallbackRef} className="unlimited-stickers-scroller">
                    <StickerCategoryComponent
                        key="favorites-category"
                        categoryName={getPluginIntlMessage("FAVORITES")}
                        files={filteredFavorites}
                        guildId={guildId!}
                        channel={channel}
                        closePopout={rootProps.onClose}
                        scrollerNode={scrollerNode}
                        favoritePaths={favoritePaths}
                        onToggleFavorite={handleToggleFavorite}
                        onStickerSent={handleStickerSent}
                        isExpandedOverride={favoritesExpanded}
                        onToggleExpanded={handleToggleFavoritesExpanded}
                    />

                    <StickerCategoryComponent
                        key="recent-category"
                        categoryName={getPluginIntlMessage("RECENTLY_USED")}
                        files={filteredRecents}
                        guildId={guildId!}
                        channel={channel}
                        closePopout={rootProps.onClose}
                        scrollerNode={scrollerNode}
                        favoritePaths={favoritePaths}
                        onToggleFavorite={handleToggleFavorite}
                        onStickerSent={handleStickerSent}
                        isExpandedOverride={recentsExpanded}
                        onToggleExpanded={handleToggleRecentsExpanded}
                    />

                    {isLoadingLocal && (
                        <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>{getPluginIntlMessage("LOADING_STICKERS_BODY")}</p>
                    )}

                    {!isLoadingLocal && filteredLocalCategories.map(category => (
                        <LazyStickerCategory
                            key={category.name}
                            category={category}
                            guildId={guildId!}
                            channel={channel}
                            closePopout={rootProps.onClose}
                            scrollerNode={scrollerNode}
                            favoritePaths={favoritePaths}
                            onToggleFavorite={handleToggleFavorite}
                            onStickerSent={handleStickerSent}
                        />
                    ))}
                </ScrollerThin>
            </div>
        );
    };

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader>
                <Heading tag="h2" style={{ flexGrow: 1 }}>{getPluginIntlMessage("STICKERS")}</Heading>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <div style={{ padding: '0 16px 8px 16px' }}>
                <TextInput
                    placeholder={getPluginIntlMessage("SEARCH_STICKERS_PLACEHOLDER")}
                    value={searchQuery}
                    onChange={setSearchQuery}
                    autoFocus
                />
            </div>
            <Divider style={{ margin: "8px 0 8px" }} />
            <ModalContent style={{ paddingTop: 0 }}>
                {renderContent()}
            </ModalContent>
        </ModalRoot>
    );
};

export const openStickerPicker = (channel: Channel) => {
    openModal(props => <StickerPickerModal rootProps={props} channel={channel} />);
};