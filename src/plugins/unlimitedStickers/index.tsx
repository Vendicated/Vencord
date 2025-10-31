/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 chev
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton, type ChatBarButtonFactory } from "@api/ChatButtons";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Alerts, ChannelStore, React, Toasts, UserStore, Checkbox, ScrollerThin } from "@webpack/common";
import { nanoid } from "nanoid";

import { getPluginIntlMessage } from "./intl";
import { openStickerPicker } from "./StickerPicker";

export const LIBRARY_KEY = "UnlimitedStickers_library";
export const FAVORITES_KEY = "UnlimitedStickers_Favorite_Ids";
export const RECENT_KEY = "UnlimitedStickers_Recent_Ids";
export const STICKER_DATA_KEY_PREFIX = "UnlimitedStickers_Data_";
export const RECENT_LIMIT = 16;
export const FAVORITES_EXPANDED_KEY = "UnlimitedStickers_FavoritesExpanded";
export const RECENT_EXPANDED_KEY = "UnlimitedStickers_RecentExpanded";

export interface StickerFile {
    id: string;
    name: string;
}

export interface StickerCategory {
    name: string;
    files: StickerFile[];
}

interface DirectoryInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    webkitdirectory?: string;
}

interface FileWithRelativePath extends File {
    readonly webkitRelativePath: string;
}

const StickerManagementSetting: React.FC = () => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [categories, setCategories] = React.useState<StickerCategory[]>([]);
    const [selectedCategories, setSelectedCategories] = React.useState<Set<string>>(new Set());
    const [loading, setLoading] = React.useState(true);

    const fetchCategories = async () => {
        setLoading(true);
        const cats = (await DataStore.get<StickerCategory[]>(LIBRARY_KEY)) ?? [];
        setCategories(cats);
        setLoading(false);
    };

    React.useEffect(() => {
        fetchCategories();
    }, []);

    const handleSelectionChange = (categoryName: string) => {
        const newSelection = new Set(selectedCategories);
        if (newSelection.has(categoryName)) {
            newSelection.delete(categoryName);
        } else {
            newSelection.add(categoryName);
        }
        setSelectedCategories(newSelection);
    };

    const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        Toasts.show({ message: `Processing ${files.length} files...`, id: Toasts.genId(), type: Toasts.Type.MESSAGE });

        const filesByDir = new Map<string, File[]>();
        for (const file of Array.from(files)) {
            if (!/\.(png|apng|gif|jpe?g)$/i.test(file.name)) continue;

            const path = (file as FileWithRelativePath).webkitRelativePath;
            const parts = path.split('/');
            const dirName = parts.length > 1 ? parts[parts.length - 2] : "Uploaded Stickers";

            let dirFiles = filesByDir.get(dirName);
            if (!dirFiles) {
                dirFiles = [];
                filesByDir.set(dirName, dirFiles);
            }
            dirFiles.push(file);
        }

        if (filesByDir.size === 0) {
            Toasts.show({ message: "No supported image files found in the selected folder(s).", id: Toasts.genId(), type: Toasts.Type.FAILURE });
            return;
        }

        const newCategories: StickerCategory[] = [];
        const stickerDataToSave: { key: string; value: string; }[] = [];

        for (const [categoryName, categoryFiles] of filesByDir.entries()) {
            const stickerFiles: StickerFile[] = await Promise.all(
                categoryFiles.map(file => new Promise<StickerFile>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const newId = nanoid();
                        stickerDataToSave.push({
                            key: `${STICKER_DATA_KEY_PREFIX}${newId}`,
                            value: reader.result as string,
                        });
                        resolve({
                            id: newId,
                            name: file.name.replace(/\.[^/.]+$/, ""),
                        });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                }))
            );
            newCategories.push({ name: categoryName, files: stickerFiles });
        }

        await Promise.all(stickerDataToSave.map(item => DataStore.set(item.key, item.value)));

        await DataStore.update<StickerCategory[]>(LIBRARY_KEY, (existingData = []) => {
            for (const newCategory of newCategories) {
                const existingCategory = existingData.find(c => c.name === newCategory.name);
                if (existingCategory) {
                    const existingNames = new Set(existingCategory.files.map(f => f.name));
                    const uniqueNewFiles = newCategory.files.filter(f => !existingNames.has(f.name));
                    existingCategory.files.push(...uniqueNewFiles);
                } else {
                    existingData.push(newCategory);
                }
            }
            return existingData;
        });

        const totalStickers = stickerDataToSave.length;
        Toasts.show({ message: `Added ${totalStickers} stickers across ${newCategories.length} categories.`, type: Toasts.Type.SUCCESS, id: Toasts.genId() });
        if (event.target) event.target.value = "";
        fetchCategories();
    };

    const deleteStickerData = async (stickerIds: string[]) => {
        const keysToDelete = [
            ...stickerIds.map(id => `${STICKER_DATA_KEY_PREFIX}${id}`)
        ];
        await Promise.all(keysToDelete.map(key => DataStore.del(key)));
    };

    const handleBatchDelete = async (categoryNames: string[]) => {
        const deletedStickerIds: string[] = [];
        const remainingCategories = categories.filter(cat => {
            if (categoryNames.includes(cat.name)) {
                deletedStickerIds.push(...cat.files.map(f => f.id));
                return false;
            }
            return true;
        });

        await deleteStickerData(deletedStickerIds);
        await DataStore.set(LIBRARY_KEY, remainingCategories);

        await DataStore.update<string[]>(FAVORITES_KEY, (favs = []) => favs.filter(id => !deletedStickerIds.includes(id)));
        await DataStore.update<string[]>(RECENT_KEY, (recents = []) => recents.filter(id => !deletedStickerIds.includes(id)));

        Toasts.show({ message: `Deleted ${categoryNames.length} categories and their stickers.`, type: Toasts.Type.SUCCESS, id: Toasts.genId() });
        fetchCategories();
        setSelectedCategories(new Set());
    };

    const handleDeleteSelected = () => {
        if (selectedCategories.size === 0) return;
        Alerts.show({
            title: "Delete Selected Categories",
            body: `Are you sure you want to delete ${selectedCategories.size} selected categories and all their stickers? This cannot be undone.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            onConfirm: () => handleBatchDelete(Array.from(selectedCategories))
        });
    };

    const clearAllStickers = () => {
        Alerts.show({
            title: "Clear All Stickers",
            body: "Are you sure you want to delete all your uploaded stickers? This cannot be undone.",
            confirmText: "Delete",
            cancelText: "Cancel",
            onConfirm: () => handleBatchDelete(categories.map(c => c.name))
        });
    };

    const inputProps: DirectoryInputProps = {
        type: "file",
        webkitdirectory: "",
        style: { display: 'none' },
        onChange: handleFolderUpload,
    };

    return (
        <div>
            <input ref={fileInputRef} {...inputProps} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: '16px' }}>
                <Button onClick={() => fileInputRef.current?.click()} size="small">
                    Upload Sticker Folder(s)
                </Button>
                <Button onClick={handleDeleteSelected} size="small" variant="dangerPrimary" disabled={selectedCategories.size === 0}>
                    Delete Selected
                </Button>
                <Button onClick={clearAllStickers} size="small" variant="dangerPrimary" disabled={categories.length === 0}>
                    Delete All
                </Button>
            </div>
            {loading ? <Paragraph>Loading categories...</Paragraph> : categories.length > 0 ? (
                <ScrollerThin style={{ maxHeight: "40vh" }}>
                    {categories.map(category => (
                        <div key={category.name} style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
                            <Checkbox value={selectedCategories.has(category.name)} onChange={() => handleSelectionChange(category.name)} />
                            <span style={{ marginLeft: '8px', flexGrow: 1, color: 'var(--text-muted)' }}>{category.name} ({category.files.length} stickers)</span>
                            <Button size="min" variant="dangerSecondary" onClick={() => Alerts.show({
                                title: `Delete ${category.name}`,
                                body: `Are you sure you want to delete the "${category.name}" category and all its stickers? This cannot be undone.`,
                                onConfirm: () => handleBatchDelete([category.name]),
                                confirmText: "Delete"
                            })}>Delete</Button>
                        </div>
                    ))}
                </ScrollerThin>
            ) : (
                <Paragraph>
                    Upload folders containing your stickers. Each folder will become a category.
                </Paragraph>
            )}
        </div>
    );
};

export const settings = definePluginSettings({
    stickerManagement: {
        type: OptionType.COMPONENT,
        component: StickerManagementSetting,
        description: "Upload and manage your local stickers.",
    },
}).withPrivateSettings<{
    stickerGuildId: string | null;
    stickerSlotId: string | null;
}>();

export const getFavorites = async (): Promise<string[]> => {
    return (await DataStore.get<string[]>(FAVORITES_KEY)) ?? [];
};

export const saveFavorites = async (favorites: string[]): Promise<void> => {
    await DataStore.set(FAVORITES_KEY, favorites);
};

export const getRecentStickers = async (): Promise<string[]> => {
    return (await DataStore.get<string[]>(RECENT_KEY)) ?? [];
};

export const addRecentSticker = async (stickerId: string): Promise<void> => {
    await DataStore.update<string[]>(RECENT_KEY, (recents = []) => {
        const index = recents.indexOf(stickerId);
        if (index > -1) {
            recents.splice(index, 1);
        }
        recents.unshift(stickerId);
        if (recents.length > RECENT_LIMIT) {
            recents.length = RECENT_LIMIT;
        }
        return recents;
    });
};

export const getExpansionState = async (key: string): Promise<boolean> => {
    return (await DataStore.get<boolean>(key)) ?? true;
};

export const saveExpansionState = async (
    key: string,
    isExpanded: boolean,
): Promise<void> => {
    await DataStore.set(key, isExpanded);
};

const UnlimitedStickerIcon: React.FC<{ className?: string; width?: number; height?: number; }> = ({
    className,
    width = 20,
    height = 20,
}) => (
    <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 24 24"
        width={width}
        height={height}
        className={className}
    >
        <defs>
            <clipPath id="c">
                <path d="M0 0h24v24H0z" />
            </clipPath>
            <clipPath id="d">
                <path d="M0 0h600v600H0z" />
            </clipPath>
            <filter id="a" filterUnits="objectBoundingBox" x="0%" y="0%" width="100%" height="100%">
                <feComponentTransfer in="SourceGraphic">
                    <feFuncA type="table" tableValues="1.0 0.0" />
                </feComponentTransfer>
            </filter>
            <path
                fill="#C4C5C9"
                d="M-5.5-2a1.5 1.5 0 1 0-.001-3.001A1.5 1.5 0 0 0-5.5-2M7-3.5a1.5 1.5 0 1 1-3.001-.001A1.5 1.5 0 0 1 7-3.5M-2.911-.556A1.001 1.001 0 0 0-4.573.556 5.5 5.5 0 0 0 0 3 5.5 5.5 0 0 0 4.573.556 1 1 0 1 0 2.911-.556 3.5 3.5 0 0 1 0 1 3.5 3.5 0 0 1-2.911-.556"
                transform="matrix(25 0 0 25 300 300)"
                style={{ display: 'block' }}
                id="b"
            />
            <mask id="e" style={{ maskType: 'alpha' }}>
                <g filter="url(#a)">
                    <path fill="#fff" opacity="0" d="M0 0h600v600H0z" />
                    <use href="#b" />
                </g>
            </mask>
        </defs>
        <g clipPath="url(#c)">
            <g clipPath="url(#d)" transform="rotate(.012) scale(.04)" style={{ display: 'block' }}>
                <g mask="url(#e)" style={{ display: 'block' }}>
                    <path
                        fill="#C4C5C9"
                        d="M150 50h300a100 100 0 0 1 100 100v187.5a12.5 12.5 0 0 1-12.5 12.5H475a125 125 0 0 0-125 125v62.5a12.5 12.5 0 0 1-12.5 12.5H150A100 100 0 0 1 50 450V150A100 100 0 0 1 150 50"
                    />
                </g>
                <g transform="translate(355 355) scale(10)">
                    <path
                        d="m8.121 9.879 2.083 2.083.007-.006 1.452 1.452.006.006 2.122 2.122a5 5 0 1 0 0-7.072l-.714.714 1.415 1.414.713-.713a3 3 0 1 1 0 4.242l-2.072-2.072-.007.006-3.59-3.59a5 5 0 1 0 0 7.07l.713-.713-1.414-1.414-.714.713a3 3 0 1 1 0-4.242"
                        fill="#C4C5C9"
                    />
                </g>
            </g>
        </g>
    </svg>
);

export const UnlimitedStickersChatBarIcon: ChatBarButtonFactory = (props) => {
    const channel = ChannelStore.getChannel(props.channel.id);
    if (!channel || props.disabled) return null;

    const handleButtonClick = () => {
        const currentUser = UserStore.getCurrentUser();
        if (currentUser?.premiumType != null) {
            openStickerPicker(channel);
        } else {
            Toasts.show({
                message: getPluginIntlMessage("NITRO_REQUIRED_BODY"),
                id: Toasts.genId(),
                type: Toasts.Type.FAILURE,
            });
        }
    };

    return (
        <ChatBarButton
            tooltip={getPluginIntlMessage("OPEN_LOCAL_STICKER_PICKER")}
            onClick={handleButtonClick}
        >
            <UnlimitedStickerIcon width={20} height={20} />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "UnlimitedStickers",
    description:
        "Send local images as stickers by temporarily uploading them to a private server.",
    authors: [Devs.chev],
    settings,
    renderChatBarButton: UnlimitedStickersChatBarIcon,
});