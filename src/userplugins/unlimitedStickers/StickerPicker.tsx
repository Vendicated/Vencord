/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 chev
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { Heading } from "@components/index";
import { getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { PluginNative } from "@utils/types";
import { Channel } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { Alerts, Clickable, GuildStore, MessageActions, React, RestAPI, ScrollerThin, Toasts } from "@webpack/common";
import type { IpcMainInvokeEvent } from "electron";

import { settings } from "./index";
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

async function ensureStickerGuild(): Promise<string | null> {
    let guildId = settings.store.stickerGuildId;

    if (guildId && GuildStore.getGuild(guildId)) {
        return guildId;
    }

    try {
        const newGuild = await RestAPI.post({
            url: "/guilds",
            body: { name: "Vencord Local Stickers", icon: null, channels: [] }
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
}

async function uploadAndReplaceSticker(guildId: string, stickerName: string, base64File: string): Promise<string | null> {
    const currentStickerId = settings.store.stickerSlotId;

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
        formData.append('name', stickerName.substring(0, 30));
        formData.append('description', 'Ephemeral Vencord Sticker');
        formData.append('tags', 'vencord');
        formData.append('file', blob, `${stickerName}.${blob.type.split('/')[1]}`);

        const newSticker = await RestAPI.post({ url: `/guilds/${guildId}/stickers`, body: formData });

        settings.store.stickerSlotId = newSticker.body.id;
        return newSticker.body.id;
    } catch (error) {
        logger.error("Failed to upload new sticker:", error);
        const errorMessage = (error as any)?.body?.message || getIntlMessage("UNKNOWN_ERROR");
        Toasts.show({ message: `${getIntlMessage("STICKER_UPLOAD_FAILED")}: ${errorMessage}`, id: Toasts.genId(), type: Toasts.Type.FAILURE });
        return null;
    }
}

interface StickerFileWithPreview extends StickerFile {
    base64: string | null;
}

const StickerGridItem: React.FC<{ file: StickerFileWithPreview; guildId: string; channel: Channel; closePopout: () => void; }> = ({ file, guildId, channel, closePopout }) => {
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
                closePopout();
            } else {
                setIsSending(false);
            }
        } catch (error) {
            logger.error("Error during sticker click handling:", error);
            setIsSending(false);
        }
    };

    return (
        <Clickable
            className={classes(
                "unlimited-stickers-grid-item",
                isSending && "unlimited-stickers-grid-item--loading",
                !file.base64 && !isSending && "unlimited-stickers-grid-item--placeholder"
            )}
            title={file.name}
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
                />
            )}
        </Clickable>
    );
};

const LazyStickerCategory: React.FC<{
    category: StickerCategory;
    guildId: string;
    channel: Channel;
    closePopout: () => void;
    scrollerNode: HTMLDivElement | null;
}> = ({ category, guildId, channel, closePopout, scrollerNode }) => {
    const [filesWithPreviews, setFilesWithPreviews] = React.useState<StickerFileWithPreview[]>(() =>
        category.files.map(file => ({ ...file, base64: null }))
    );
    const categoryRef = React.useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = React.useState(true);

    React.useEffect(() => {
        if (!categoryRef.current || !scrollerNode) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    observer.disconnect();
                    async function loadPreviews() {
                        const updatedFiles = await Promise.all(
                            filesWithPreviews.map(async file => {
                                if (file.base64) return file;
                                return { ...file, base64: await Native.getFileAsBase64(file.path) };
                            })
                        );
                        setFilesWithPreviews(updatedFiles);
                    }
                    loadPreviews();
                }
            },
            {
                root: scrollerNode,
                rootMargin: "200px 0px"
            }
        );

        observer.observe(categoryRef.current);
        return () => observer.disconnect();
    }, [scrollerNode]);

    return (
        <div ref={categoryRef} className="unlimited-stickers-category">
            <Clickable
                className="unlimited-stickers-category-header"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <Heading tag="h5">
                    {category.name}
                </Heading>
                <ChevronIcon
                    className={classes("unlimited-stickers-category-arrow", isExpanded && "unlimited-stickers-category-arrow--expanded")}
                    width={20}
                    height={20}
                />
            </Clickable>
            {isExpanded && (
                <div className="unlimited-stickers-grid">
                    {filesWithPreviews.map(file => (
                        <StickerGridItem
                            key={file.path}
                            file={file}
                            guildId={guildId}
                            channel={channel}
                            closePopout={closePopout}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


interface StickerPickerModalProps {
    rootProps: ModalProps;
    channel: Channel;
}

const StickerPickerModal: React.FC<StickerPickerModalProps> = ({ rootProps, channel }) => {
    const { stickerPath } = settings.use(["stickerPath"]);
    const [categories, setCategories] = React.useState<StickerCategory[]>([]);
    const [guildId, setGuildIdState] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [scrollerNode, setScrollerNode] = React.useState<HTMLDivElement | null>(null);

    const scrollerCallbackRef = React.useCallback((instance: any) => {
        if (instance) {
            setScrollerNode(instance.getScrollerNode?.() ?? instance);
        } else {
            setScrollerNode(null);
        }
    }, []);

    React.useEffect(() => {
        async function load() {
            setIsLoading(true);
            if (!stickerPath) {
                Toasts.show({ message: getPluginIntlMessage("SET_STICKER_PATH_PROMPT_BODY"), id: Toasts.genId(), type: Toasts.Type.FAILURE });
                setIsLoading(false);
                return;
            }
            try {
                const id = await ensureStickerGuild();
                setGuildIdState(id);

                const { categories: localCategories, debug } = await Native.getStickerFiles(stickerPath);
                if (debug) logger.warn(debug);

                setCategories(localCategories);
            } catch (e) {
                logger.error("Failed to load stickers:", e);
                setCategories([]);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [stickerPath]);

    const renderContent = () => {
        if (!stickerPath) {
            return <p style={{ padding: 20, textAlign: 'center' }}>{getPluginIntlMessage("SET_STICKER_PATH_PROMPT_BODY")}</p>;
        }

        if (isLoading) {
            return <p style={{ padding: 20, textAlign: 'center' }}>{getPluginIntlMessage("LOADING_STICKER_PREVIEWS_BODY").replace("previews...", "list...")}</p>;
        }

        if (!guildId) {
            return <p style={{ padding: 10 }}>{getPluginIntlMessage("STICKER_GUILD_CREATE_FAILED_BODY")}</p>;
        }

        return (
            <div className="unlimited-stickers-modal-content">
                {categories.length > 0 ? (
                    // @ts-expect-error: ScrollerThin is a forwardRef component but its types don't reflect that.
                    <ScrollerThin ref={scrollerCallbackRef} className="unlimited-stickers-scroller">
                        {categories.map(category => (
                            <LazyStickerCategory
                                key={category.name}
                                category={category}
                                guildId={guildId!}
                                channel={channel}
                                closePopout={rootProps.onClose}
                                scrollerNode={scrollerNode}
                            />
                        ))}
                    </ScrollerThin>
                ) : (
                    <p style={{ padding: 20, textAlign: 'center' }}>
                        {getPluginIntlMessage("NO_FILES_FOUND_BODY")}
                    </p>
                )}
            </div>
        );
    };

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader>
                <Heading tag="h2" style={{ flexGrow: 1 }}>{getPluginIntlMessage("STICKERS")}</Heading>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>
            <ModalContent>
                {renderContent()}
            </ModalContent>
        </ModalRoot>
    );
};

export const openStickerPicker = (channel: Channel) => {
    openModal(props => <StickerPickerModal rootProps={props} channel={channel} />);
};