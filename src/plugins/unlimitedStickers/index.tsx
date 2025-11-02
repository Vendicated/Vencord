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
import { Logger } from "@utils/Logger";
import { ModalCloseButton, ModalContent, ModalHeader, type ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import definePlugin, { OptionType } from "@utils/types";
import { chooseFile, saveFile } from "@utils/web";
import { Alerts, ChannelStore, React, Toasts, UserStore, Checkbox, ScrollerThin } from "@webpack/common";
import { Heading } from "@components/index";
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

const logger = new Logger("UnlimitedStickers");

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

const RefreshIcon: React.FC<{ className?: string; width?: number; height?: number; }> = ({
    className,
    width = 16,
    height = 16,
}) => (
    <svg
        className={className}
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
    >
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
    </svg>
);

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

    const handleSelectAll = () => {
        setSelectedCategories(new Set(categories.map(c => c.name)));
    };

    const handleDeselectAll = () => {
        setSelectedCategories(new Set());
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
        const categoriesToDelete = categories.filter(cat => categoryNames.includes(cat.name));
        for (const cat of categoriesToDelete) {
            deletedStickerIds.push(...cat.files.map(f => f.id));
        }
        const totalStickers = deletedStickerIds.length;

        const loadingToast = Toasts.show({
            message: `Deleting ${categoryNames.length} categor${categoryNames.length === 1 ? "y" : "ies"} and ${totalStickers} sticker${totalStickers === 1 ? "" : "s"}...`,
            type: Toasts.Type.MESSAGE,
            id: Toasts.genId(),
        });

        const remainingCategories = categories.filter(cat => {
            if (categoryNames.includes(cat.name)) {
                return false;
            }
            return true;
        });

        await deleteStickerData(deletedStickerIds);
        await DataStore.set(LIBRARY_KEY, remainingCategories);

        await DataStore.update<string[]>(FAVORITES_KEY, (favs = []) => favs.filter(id => !deletedStickerIds.includes(id)));
        await DataStore.update<string[]>(RECENT_KEY, (recents = []) => recents.filter(id => !deletedStickerIds.includes(id)));

        Toasts.pop();
        Toasts.show({ message: `Deleted ${categoryNames.length} categor${categoryNames.length === 1 ? "y" : "ies"} and their stickers.`, type: Toasts.Type.SUCCESS, id: Toasts.genId() });
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
                <Button onClick={importStickers} size="small" variant="primary">
                    Import
                </Button>
                <Button onClick={exportStickers} size="small" variant="primary">
                    Export All
                </Button>
                <Button onClick={() => exportSelectedStickers(Array.from(selectedCategories))} size="small" variant="primary" disabled={selectedCategories.size === 0}>
                    Export Selected
                </Button>
                <Button onClick={handleDeleteSelected} size="small" variant="dangerPrimary" disabled={selectedCategories.size === 0}>
                    Delete Selected
                </Button>
                <Button onClick={clearAllStickers} size="small" variant="dangerPrimary" disabled={categories.length === 0}>
                    Delete All
                </Button>
                <Button onClick={fetchCategories} size="small" variant="secondary" style={{ padding: "4px 8px" }}>
                    <RefreshIcon width={16} height={16} />
                </Button>
            </div>
            {!loading && categories.length > 0 && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                    <Button onClick={handleSelectAll} size="small" variant="secondary">
                        Select All
                    </Button>
                    <Button onClick={handleDeselectAll} size="small" variant="secondary">
                        Deselect All
                    </Button>
                </div>
            )}
            {loading ? (
                <Paragraph>Loading categories...</Paragraph>
            ) : categories.length > 0 ? (
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
                    <br />
                    <br />
                    You can also import a previously exported sticker collection using the "Import" button above.
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

interface StickerExportData {
    version: string;
    categories: StickerCategory[];
    stickerData: Record<string, string>;
    favorites: string[];
}

const ImportSelectionModal: React.FC<ModalProps & { importData: StickerExportData; }> = ({ onClose, importData }) => {
    const [selectedCategories, setSelectedCategories] = React.useState<Set<string>>(
        new Set(importData.categories.map(c => c.name))
    );

    const handleSelectionChange = (categoryName: string) => {
        const newSelection = new Set(selectedCategories);
        if (newSelection.has(categoryName)) {
            newSelection.delete(categoryName);
        } else {
            newSelection.add(categoryName);
        }
        setSelectedCategories(newSelection);
    };

    const handleSelectAll = () => {
        setSelectedCategories(new Set(importData.categories.map(c => c.name)));
    };

    const handleDeselectAll = () => {
        setSelectedCategories(new Set());
    };

    const handleImport = async () => {
        if (selectedCategories.size === 0) {
            Toasts.show({
                message: "Please select at least one category to import.",
                type: Toasts.Type.FAILURE,
                id: Toasts.genId(),
            });
            return;
        }

        onClose();

        const categoriesToImport = importData.categories.filter(c => selectedCategories.has(c.name));
        const totalFiles = categoriesToImport.reduce((sum, cat) => sum + cat.files.length, 0);

        const loadingToast = Toasts.show({
            message: `Importing ${selectedCategories.size} categor${selectedCategories.size === 1 ? "y" : "ies"} and ${totalFiles} file${totalFiles === 1 ? "" : "s"}...`,
            type: Toasts.Type.MESSAGE,
            id: Toasts.genId(),
        });

        try {
            const selectedStickerIds = new Set<string>();
            for (const category of categoriesToImport) {
                for (const file of category.files) {
                    selectedStickerIds.add(file.id);
                }
            }

            const idMapping = new Map<string, string>();
            for (const id of selectedStickerIds) {
                if (!idMapping.has(id)) {
                    idMapping.set(id, nanoid());
                }
            }

            const importedCategories: StickerCategory[] = categoriesToImport.map(category => ({
                name: category.name,
                files: category.files.map(file => ({
                    id: idMapping.get(file.id)!,
                    name: file.name,
                })),
            }));

            const stickerDataPromises: Promise<void>[] = [];
            for (const oldId of selectedStickerIds) {
                const base64 = importData.stickerData[oldId];
                if (base64) {
                    const newId = idMapping.get(oldId);
                    if (newId) {
                        stickerDataPromises.push(
                            DataStore.set(`${STICKER_DATA_KEY_PREFIX}${newId}`, base64)
                        );
                    }
                }
            }
            await Promise.all(stickerDataPromises);

            await DataStore.update<StickerCategory[]>(LIBRARY_KEY, (existingData = []) => {
                const result = [...existingData];
                for (const importedCategory of importedCategories) {
                    const existingCategory = result.find(c => c.name === importedCategory.name);
                    if (existingCategory) {
                        const existingNames = new Set(existingCategory.files.map(f => f.name));
                        const uniqueNewFiles = importedCategory.files.filter(f => !existingNames.has(f.name));
                        existingCategory.files.push(...uniqueNewFiles);
                    } else {
                        result.push(importedCategory);
                    }
                }
                return result;
            });

            if (importData.favorites && importData.favorites.length > 0) {
                const newFavoriteIds = importData.favorites
                    .filter(oldId => selectedStickerIds.has(oldId))
                    .map(oldId => idMapping.get(oldId))
                    .filter((id): id is string => id !== undefined);

                if (newFavoriteIds.length > 0) {
                    await DataStore.update<string[]>(FAVORITES_KEY, (existingFavorites = []) => {
                        const combined = new Set([...existingFavorites, ...newFavoriteIds]);
                        return Array.from(combined);
                    });
                }
            }

            const totalFavorites = importData.favorites?.filter(id => selectedStickerIds.has(id)).length ?? 0;

            Toasts.pop();
            Toasts.show({
                message: `Imported ${selectedCategories.size} categor${selectedCategories.size === 1 ? "y" : "ies"} with ${totalFiles} sticker${totalFiles === 1 ? "" : "s"}${totalFavorites > 0 ? ` and ${totalFavorites} favorite${totalFavorites === 1 ? "" : "s"}` : ""}.`,
                type: Toasts.Type.SUCCESS,
                id: Toasts.genId(),
            });
        } catch (error) {
            logger.error("Failed to import selected stickers:", error);
            Toasts.pop();
            Toasts.show({
                message: `Failed to import stickers: ${error instanceof Error ? error.message : String(error)}`,
                type: Toasts.Type.FAILURE,
                id: Toasts.genId(),
            });
        }
    };

    return (
        <ModalRoot {...({} as ModalProps)} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Heading tag="h2" style={{ flexGrow: 1 }}>
                    Select Categories to Import
                </Heading>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <div style={{ padding: "8px 0" }}>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                        <Button onClick={handleSelectAll} size="small" variant="secondary">
                            Select All
                        </Button>
                        <Button onClick={handleDeselectAll} size="small" variant="secondary">
                            Deselect All
                        </Button>
                    </div>
                    <ScrollerThin style={{ maxHeight: "400px" }}>
                        {importData.categories.map(category => (
                            <div key={category.name} style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>
                                <Checkbox
                                    value={selectedCategories.has(category.name)}
                                    onChange={() => handleSelectionChange(category.name)}
                                />
                                <span style={{ marginLeft: '8px', flexGrow: 1, color: 'var(--text-normal)' }}>
                                    {category.name} ({category.files.length} sticker{category.files.length === 1 ? "" : "s"})
                                </span>
                            </div>
                        ))}
                    </ScrollerThin>
                </div>
            </ModalContent>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", padding: "16px" }}>
                <Button onClick={onClose} size="small" variant="secondary">
                    Cancel
                </Button>
                <Button onClick={handleImport} size="small" variant="primary" disabled={selectedCategories.size === 0}>
                    Import Selected ({selectedCategories.size})
                </Button>
            </div>
        </ModalRoot>
    );
};

export const exportStickers = async (): Promise<void> => {
    try {
        const categories = (await DataStore.get<StickerCategory[]>(LIBRARY_KEY)) ?? [];
        const favorites = await getFavorites();

        const allStickerIds = new Set<string>();
        for (const category of categories) {
            for (const file of category.files) {
                allStickerIds.add(file.id);
            }
        }
        const totalCategories = categories.length;
        const totalStickers = allStickerIds.size;

        const loadingToast = Toasts.show({
            message: `Exporting ${totalCategories} categor${totalCategories === 1 ? "y" : "ies"} and ${totalStickers} sticker${totalStickers === 1 ? "" : "s"}...`,
            type: Toasts.Type.MESSAGE,
            id: Toasts.genId(),
        });

        const stickerData: Record<string, string> = {};
        await Promise.all(
            Array.from(allStickerIds).map(async (id) => {
                const data = await DataStore.get<string>(`${STICKER_DATA_KEY_PREFIX}${id}`);
                if (data) {
                    stickerData[id] = data;
                }
            })
        );

        const exportData: StickerExportData = {
            version: "1.0",
            categories,
            stickerData,
            favorites,
        };

        const json = JSON.stringify(exportData, null, 2);
        const data = new TextEncoder().encode(json);
        const filename = `unlimited-stickers-export-${new Date().toISOString().split('T')[0]}.json`;

        if (IS_DISCORD_DESKTOP) {
            DiscordNative.fileManager.saveWithDialog(data, filename);
        } else {
            saveFile(new File([data], filename, { type: "application/json" }));
        }

        Toasts.pop();
        Toasts.show({
            message: `Exported ${categories.length} categories with ${allStickerIds.size} stickers and ${favorites.length} favorites.`,
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
        });
    } catch (error) {
        logger.error("Failed to export stickers:", error);
        Toasts.show({
            message: "Failed to export stickers. Check console for details.",
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
        });
    }
};

export const exportSelectedStickers = async (selectedCategoryNames: string[]): Promise<void> => {
    if (selectedCategoryNames.length === 0) {
        Toasts.show({
            message: "Please select at least one category to export.",
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
        });
        return;
    }

    try {
        const categories = (await DataStore.get<StickerCategory[]>(LIBRARY_KEY)) ?? [];
        const categoriesToExport = categories.filter(c => selectedCategoryNames.includes(c.name));
        const favorites = await getFavorites();

        const selectedStickerIds = new Set<string>();
        for (const category of categoriesToExport) {
            for (const file of category.files) {
                selectedStickerIds.add(file.id);
            }
        }

        const totalCategories = categoriesToExport.length;
        const totalStickers = selectedStickerIds.size;

        const loadingToast = Toasts.show({
            message: `Exporting ${totalCategories} categor${totalCategories === 1 ? "y" : "ies"} and ${totalStickers} sticker${totalStickers === 1 ? "" : "s"}...`,
            type: Toasts.Type.MESSAGE,
            id: Toasts.genId(),
        });

        const stickerData: Record<string, string> = {};
        await Promise.all(
            Array.from(selectedStickerIds).map(async (id) => {
                const data = await DataStore.get<string>(`${STICKER_DATA_KEY_PREFIX}${id}`);
                if (data) {
                    stickerData[id] = data;
                }
            })
        );

        const selectedFavorites = favorites.filter(id => selectedStickerIds.has(id));

        const exportData: StickerExportData = {
            version: "1.0",
            categories: categoriesToExport,
            stickerData,
            favorites: selectedFavorites,
        };

        const json = JSON.stringify(exportData, null, 2);
        const data = new TextEncoder().encode(json);
        const filename = `unlimited-stickers-export-selected-${new Date().toISOString().split('T')[0]}.json`;

        if (IS_DISCORD_DESKTOP) {
            DiscordNative.fileManager.saveWithDialog(data, filename);
        } else {
            saveFile(new File([data], filename, { type: "application/json" }));
        }

        Toasts.pop();
        Toasts.show({
            message: `Exported ${totalCategories} categor${totalCategories === 1 ? "y" : "ies"} with ${totalStickers} sticker${totalStickers === 1 ? "" : "s"} and ${selectedFavorites.length} favorite${selectedFavorites.length === 1 ? "" : "s"}.`,
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
        });
    } catch (error) {
        logger.error("Failed to export selected stickers:", error);
        Toasts.show({
            message: "Failed to export selected stickers. Check console for details.",
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
        });
    }
};

export const importStickersSelected = async (): Promise<void> => {
    try {
        let jsonData: string;

        if (IS_DISCORD_DESKTOP) {
            const [file] = await DiscordNative.fileManager.openFiles({
                filters: [
                    { name: "Unlimited Stickers Export", extensions: ["json"] },
                    { name: "all", extensions: ["*"] }
                ]
            });

            if (!file) return;

            jsonData = new TextDecoder().decode(file.data);
        } else {
            const file = await chooseFile("application/json");
            if (!file) return;

            jsonData = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsText(file);
            });
        }

        const importData = JSON.parse(jsonData) as StickerExportData;

        if (!importData.version || !importData.categories || !importData.stickerData) {
            throw new Error("Invalid export file format");
        }

        openModal((props: ModalProps) => (
            <ImportSelectionModal {...props} importData={importData} />
        ));
    } catch (error) {
        logger.error("Failed to open import selection:", error);
        Toasts.show({
            message: `Failed to open import selection: ${error instanceof Error ? error.message : String(error)}`,
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
        });
    }
};

export const importStickers = async (): Promise<void> => {
    try {
        let jsonData: string;

        if (IS_DISCORD_DESKTOP) {
            const [file] = await DiscordNative.fileManager.openFiles({
                filters: [
                    { name: "Unlimited Stickers Export", extensions: ["json"] },
                    { name: "all", extensions: ["*"] }
                ]
            });

            if (!file) return;

            jsonData = new TextDecoder().decode(file.data);
        } else {
            const file = await chooseFile("application/json");
            if (!file) return;

            jsonData = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsText(file);
            });
        }

        const importData = JSON.parse(jsonData) as StickerExportData;

        if (!importData.version || !importData.categories || !importData.stickerData) {
            throw new Error("Invalid export file format");
        }

        const totalCategories = importData.categories.length;
        const totalFiles = Object.keys(importData.stickerData).length;

        const loadingToast = Toasts.show({
            message: `Importing ${totalCategories} categor${totalCategories === 1 ? "y" : "ies"} and ${totalFiles} file${totalFiles === 1 ? "" : "s"}...`,
            type: Toasts.Type.MESSAGE,
            id: Toasts.genId(),
        });

        const idMapping = new Map<string, string>();
        const allOldIds = new Set<string>();

        for (const category of importData.categories) {
            for (const file of category.files) {
                allOldIds.add(file.id);
                if (!idMapping.has(file.id)) {
                    idMapping.set(file.id, nanoid());
                }
            }
        }

        const importedCategories: StickerCategory[] = importData.categories.map(category => ({
            name: category.name,
            files: category.files.map(file => ({
                id: idMapping.get(file.id)!,
                name: file.name,
            })),
        }));

        const stickerDataPromises: Promise<void>[] = [];
        for (const [oldId, base64] of Object.entries(importData.stickerData)) {
            const newId = idMapping.get(oldId);
            if (newId) {
                stickerDataPromises.push(
                    DataStore.set(`${STICKER_DATA_KEY_PREFIX}${newId}`, base64)
                );
            }
        }
        await Promise.all(stickerDataPromises);

        await DataStore.update<StickerCategory[]>(LIBRARY_KEY, (existingData = []) => {
            const result = [...existingData];
            for (const importedCategory of importedCategories) {
                const existingCategory = result.find(c => c.name === importedCategory.name);
                if (existingCategory) {
                    const existingNames = new Set(existingCategory.files.map(f => f.name));
                    const uniqueNewFiles = importedCategory.files.filter(f => !existingNames.has(f.name));
                    existingCategory.files.push(...uniqueNewFiles);
                } else {
                    result.push(importedCategory);
                }
            }
            return result;
        });

        if (importData.favorites && importData.favorites.length > 0) {
            const newFavoriteIds = importData.favorites
                .map(oldId => idMapping.get(oldId))
                .filter((id): id is string => id !== undefined);

            await DataStore.update<string[]>(FAVORITES_KEY, (existingFavorites = []) => {
                const combined = new Set([...existingFavorites, ...newFavoriteIds]);
                return Array.from(combined);
            });
        }

        const totalStickers = Object.keys(importData.stickerData).length;
        const totalFavorites = importData.favorites?.length ?? 0;

        Toasts.pop();
        Toasts.show({
            message: `Imported ${importedCategories.length} categories with ${totalStickers} stickers${totalFavorites > 0 ? ` and ${totalFavorites} favorites` : ""}.`,
            type: Toasts.Type.SUCCESS,
            id: Toasts.genId(),
        });
    } catch (error) {
        logger.error("Failed to import stickers:", error);
        Toasts.show({
            message: `Failed to import stickers: ${error instanceof Error ? error.message : String(error)}`,
            type: Toasts.Type.FAILURE,
            id: Toasts.genId(),
        });
    }
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