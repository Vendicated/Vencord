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
    ModalFooter,
    ModalHeader,
    type ModalProps,
    ModalRoot,
    openModal,
} from "@utils/modal";
import type { Channel } from "@vencord/discord-types";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import {
    Alerts,
    Button,
    Clickable,
    ContextMenuApi,
    Forms,
    GuildStore,
    Menu,
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

const RenameModal: React.FC<{
    currentName: string;
    onSave: (newName: string) => Promise<boolean>;
    type: "category" | "sticker";
    onClose: () => void;
    transitionState: number;
}> = ({ transitionState, onClose, currentName, onSave, type }) => {
    const [value, setValue] = React.useState(currentName);
    const [error, setError] = React.useState<string>("");

    const handleSave = async () => {
        setError("");
        if (value.trim() === "") {
            const errorMessage = type === "category"
                ? "Category name cannot be empty"
                : "Sticker name cannot be empty";
            setError(errorMessage);
            return;
        }

        const success = await onSave(value.trim());
        if (!success) {
            if (type === "category") {
                setError(getPluginIntlMessage("CATEGORY_NAME_EXISTS").replace("{name}", value.trim()));
            }
        } else {
            onClose();
        }
    };

    const handleChange = (newValue: string) => {
        setValue(newValue);
        setError("");
    };

    return (
        <ModalRoot transitionState={transitionState}>
            <ModalHeader>
                <Heading tag="h4" style={{ flexGrow: 1 }}>
                    {type === "category"
                        ? getPluginIntlMessage("RENAME_CATEGORY")
                        : getPluginIntlMessage("RENAME_STICKER")}
                </Heading>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Forms.FormTitle tag="h5" style={{ marginTop: "10px" }}>
                    {getPluginIntlMessage("NEW_NAME")}
                </Forms.FormTitle>
                <TextInput
                    style={{
                        marginBottom: "10px",
                        borderColor: error ? "var(--status-danger)" : undefined
                    }}
                    placeholder={currentName}
                    value={value}
                    onChange={handleChange}
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleSave();
                        }
                    }}
                />
                {error && (
                    <div style={{ color: "var(--status-danger)", fontSize: "12px", marginTop: "4px", marginBottom: "10px" }}>
                        {error}
                    </div>
                )}
            </ModalContent>
            <ModalFooter>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", width: "100%" }}>
                    <Button
                        color={Button.Colors.PRIMARY}
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        color={Button.Colors.BRAND}
                        onClick={handleSave}
                    >
                        Save
                    </Button>
                </div>
            </ModalFooter>
        </ModalRoot>
    );
};

const StickerGridItem: React.FC<{
    file: StickerFile;
    guildId: string;
    channel: Channel;
    closePopout: () => void;
    isFavorite: boolean;
    onToggleFavorite: (file: StickerFile) => void;
    onStickerSent: (file: StickerFile) => void;
    onStickerRename: (stickerId: string, newName: string) => Promise<boolean>;
    isClosing: boolean;
}> = ({
    file,
    guildId,
    channel,
    closePopout,
    isFavorite,
    onToggleFavorite,
    onStickerSent,
    onStickerRename,
    isClosing,
}) => {
        const [isSending, setIsSending] = React.useState(false);
        const [base64, setBase64] = React.useState<string | null>(null);
        const itemRef = React.useRef<HTMLDivElement>(null);
        const observerRef = React.useRef<IntersectionObserver | null>(null);
        const isClosingRef = React.useRef(isClosing);

        React.useEffect(() => {
            isClosingRef.current = isClosing;
            if (isClosing && observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
        }, [isClosing]);

        React.useEffect(() => {
            if (isClosing) return;

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting && !isClosingRef.current) {
                        observer.disconnect();
                        observerRef.current = null;
                        DataStore.get<string>(`${STICKER_DATA_KEY_PREFIX}${file.id}`).then(
                            (data) => {
                                if (!isClosingRef.current && data) setBase64(data);
                            },
                        );
                    }
                },
                { rootMargin: "200px" },
            );
            observerRef.current = observer;
            if (itemRef.current) observer.observe(itemRef.current);
            return () => {
                if (observerRef.current) {
                    observerRef.current.disconnect();
                    observerRef.current = null;
                }
            };
        }, [file.id, isClosing]);

        const handleStickerClick = async () => {
            if (isSending || !base64 || isClosingRef.current) return;
            setIsSending(true);

            try {
                const newStickerId = await uploadAndReplaceSticker(
                    guildId,
                    file.name,
                    base64,
                );

                if (isClosingRef.current) {
                    setIsSending(false);
                    return;
                }

                if (newStickerId) {
                    const reply = PendingReplyStore.getPendingReply(channel.id);
                    let sendOptions: any = { stickerIds: [newStickerId] };

                    if (reply) {
                        const replyOptions = MessageActions.getSendMessageOptionsForReply(reply);
                        sendOptions = { ...replyOptions, ...sendOptions };
                    }

                    await MessageActions.sendMessage(channel.id, { content: "" }, false, sendOptions);

                    if (isClosingRef.current) {
                        setIsSending(false);
                        return;
                    }

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
                if (!isClosingRef.current) setIsSending(false);
            }
        };

        const handleFavoriteToggle = (e: React.MouseEvent) => {
            e.stopPropagation();
            onToggleFavorite(file);
        };

        const handleContextMenu = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            ContextMenuApi.openContextMenu(e, () => (
                <Menu.Menu
                    navId="sticker-item-context-menu"
                    onClose={ContextMenuApi.closeContextMenu}
                >
                    <Menu.MenuItem
                        id="rename-sticker"
                        label={getPluginIntlMessage("RENAME")}
                        action={() => {
                            openModal(props => (
                                <RenameModal
                                    {...props}
                                    currentName={file.name}
                                    onSave={(newName) => onStickerRename(file.id, newName)}
                                    type="sticker"
                                />
                            ));
                        }}
                    />
                </Menu.Menu>
            ));
        };

        const tooltipContent = base64 ? (
            <div className="unlimited-stickers-tooltip-preview">
                <img
                    src={base64}
                    alt={file.name}
                    className="unlimited-stickers-tooltip-preview-img"
                />
                <div className="unlimited-stickers-tooltip-preview-name">
                    {file.name}
                </div>
            </div>
        ) : file.name;

        return (
            <Tooltip text={tooltipContent} tooltipClassName="unlimited-stickers-tooltip">
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
                            onContextMenu={handleContextMenu}
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
    onCategoryRename: (oldName: string, newName: string) => Promise<boolean>;
    onStickerRename: (stickerId: string, newName: string) => Promise<boolean>;
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
    onCategoryRename,
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

    const handleContextMenu = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (storageKey) return;

        ContextMenuApi.openContextMenu(e, () => (
            <Menu.Menu
                navId="sticker-category-context-menu"
                onClose={ContextMenuApi.closeContextMenu}
            >
                <Menu.MenuItem
                    id="rename-category"
                    label={getPluginIntlMessage("RENAME")}
                    action={() => {
                        openModal(props => (
                            <RenameModal
                                {...props}
                                currentName={categoryName}
                                onSave={(newName) => onCategoryRename(categoryName, newName)}
                                type="category"
                            />
                        ));
                    }}
                />
            </Menu.Menu>
        ));
    }, [categoryName, onCategoryRename, storageKey]);

    React.useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        if (storageKey) saveExpansionState(storageKey, isExpanded);
    }, [isExpanded, storageKey]);

    const observerRef = React.useRef<IntersectionObserver | null>(null);

    React.useEffect(() => {
        if (isContentLoaded || !categoryRef.current || isClosing) {
            if (isClosing && observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isClosing) {
                    setIsContentLoaded(true);
                    setIsExpanded(true);
                    observer.disconnect();
                    observerRef.current = null;
                }
            },
            { rootMargin: "100px" },
        );
        observerRef.current = observer;
        observer.observe(categoryRef.current);
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
        };
    }, [isContentLoaded, isClosing]);

    return (
        <div className="unlimited-stickers-category" ref={categoryRef}>
            <Clickable
                className="unlimited-stickers-category-header"
                onClick={handleToggleExpanded}
                onContextMenu={handleContextMenu}
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
            {isExpanded && isContentLoaded && !isClosing && (
                <div className="unlimited-stickers-grid">
                    {files.length > 0 ? (
                        files.map((file) => (
                            <StickerGridItem
                                key={file.id}
                                file={file}
                                isFavorite={rest.favoriteIds.has(file.id)}
                                isClosing={isClosing}
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
    const isClosingRef = React.useRef(false);

    const isClosing = rootProps.transitionState === 2;

    React.useEffect(() => {
        isClosingRef.current = isClosing;
    }, [isClosing]);

    React.useEffect(() => {
        if (isClosing) return;

        const loadStickerData = async () => {
            try {
                const id = await ensureStickerGuild();
                if (isClosingRef.current) return;
                setGuildIdState(id);
                if (!id) return;

                const libraryData =
                    (await DataStore.get<StickerCategory[]>(LIBRARY_KEY)) ?? [];

                const mergedCategories: StickerCategory[] = [];
                const categoryMap = new Map<string, StickerCategory>();

                for (const category of libraryData) {
                    const existingCategory = categoryMap.get(category.name);
                    if (existingCategory) {
                        const existingFileIds = new Set(existingCategory.files.map(f => f.id));
                        const uniqueNewFiles = category.files.filter(f => !existingFileIds.has(f.id));
                        existingCategory.files.push(...uniqueNewFiles);
                    } else {
                        categoryMap.set(category.name, { ...category, files: [...category.files] });
                        mergedCategories.push(categoryMap.get(category.name)!);
                    }
                }

                if (mergedCategories.length !== libraryData.length) {
                    await DataStore.set(LIBRARY_KEY, mergedCategories);
                }

                mergedCategories.sort((a, b) => a.name.localeCompare(b.name));

                const [favIds, recentIdsData, favExpanded, recExpanded] = await Promise.all([
                    getFavorites(),
                    getRecentStickers(),
                    DataStore.get<boolean>(FAVORITES_EXPANDED_KEY),
                    DataStore.get<boolean>(RECENT_EXPANDED_KEY),
                ]);

                if (isClosingRef.current) return;

                initialExpansionState.current[FAVORITES_EXPANDED_KEY] = favExpanded ?? true;
                initialExpansionState.current[RECENT_EXPANDED_KEY] = recExpanded ?? true;

                setAllCategories(mergedCategories);
                setFavoriteIds(new Set(favIds));
                setRecentIds(recentIdsData);
            } catch (e) {
                logger.error("Failed to load sticker data:", e);
            } finally {
                if (!isClosingRef.current) setIsLoading(false);
            }
        };

        if (rootProps.transitionState === 1 && !hasStartedLoading) {
            setHasStartedLoading(true);
            loadStickerData();
        }
    }, [rootProps.transitionState, hasStartedLoading, isClosing]);

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
            if (isClosing) return;
            const newFavoriteIds = new Set(favoriteIds);
            if (newFavoriteIds.has(file.id)) {
                newFavoriteIds.delete(file.id);
            } else {
                newFavoriteIds.add(file.id);
            }
            setFavoriteIds(newFavoriteIds);
            await saveFavorites(Array.from(newFavoriteIds));
        },
        [favoriteIds, isClosing],
    );

    const handleStickerSent = React.useCallback(async (file: StickerFile) => {
        if (isClosing) return;
        await addRecentSticker(file.id);
        setRecentIds((prev) =>
            [file.id, ...prev.filter((id) => id !== file.id)].slice(0, 16),
        );
    }, [isClosing]);

    const handleCategoryRename = React.useCallback(async (oldName: string, newName: string): Promise<boolean> => {
        if (isClosing) return false;
        if (oldName === newName) return true;

        const categoryExists = allCategories.some(cat => cat.name === newName);
        if (categoryExists) {
            return false;
        }

        const updatedCategories = allCategories.map(cat =>
            cat.name === oldName ? { ...cat, name: newName } : cat
        );
        setAllCategories(updatedCategories);
        await DataStore.set(LIBRARY_KEY, updatedCategories);
        return true;
    }, [allCategories, isClosing]);

    const handleStickerRename = React.useCallback(async (stickerId: string, newName: string): Promise<boolean> => {
        if (isClosing) return false;

        const updatedCategories = allCategories.map(cat => ({
            ...cat,
            files: cat.files.map(file =>
                file.id === stickerId ? { ...file, name: newName } : file
            )
        }));
        setAllCategories(updatedCategories);
        await DataStore.set(LIBRARY_KEY, updatedCategories);
        return true;
    }, [allCategories, isClosing]);

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
        if (isClosing) {
            return null;
        }

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
            onCategoryRename: handleCategoryRename,
            onStickerRename: handleStickerRename,
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
            {!isLoading && !isClosing && (
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