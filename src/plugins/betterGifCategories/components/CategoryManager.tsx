/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./CategoryManager.css";

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { ExpandableSection } from "@components/ExpandableCard";
import { Flex } from "@components/Flex";
import { Grid } from "@components/Grid";
import { DeleteIcon, PencilIcon } from "@components/Icons";
import { Heading } from "@components/index";
import { Paragraph } from "@components/Paragraph";
import { openCreateCategoryModal, openRenameCategoryModal } from "@plugins/betterGifCategories/CreateCategoryModal";
import { deleteCategory, getCategories, type Gif, type GifCategory, GifFormat, removeGifFromCategory, reorderCategories } from "@plugins/betterGifCategories/data";
import { deleteCategorySubtitle } from "@plugins/betterGifCategories/helpers";
import { ConfirmModal, openModal, useState } from "@webpack/common";

function confirmDeleteCategory(category: GifCategory, onConfirm: () => void) {
    openModal(props => (
        <ConfirmModal
            {...props}
            title="Delete Category"
            subtitle={deleteCategorySubtitle(category)}
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={onConfirm}
        />
    ));
}

function GifTile({ gif, onRemove }: { gif: Gif; onRemove: () => void; }) {
    return (
        <div className="vc-bgc-manager-gif">
            {gif.format === GifFormat.Video
                ? <video src={gif.src} muted loop autoPlay />
                : <img src={gif.src} alt="" />
            }
            <Button
                variant="none"
                size="iconOnly"
                className="vc-bgc-manager-gif-remove-btn"
                aria-label="Remove from category"
                onClick={onRemove}
            >
                <DeleteIcon width={14} height={14} />
            </Button>
        </div>
    );
}

function CategoryNameRow({ category, onRenamed }: { category: GifCategory; onRenamed: () => void; }) {
    return (
        <Flex alignItems="center" gap={8}>
            <Paragraph>{category.name}</Paragraph>
            <Button
                variant="secondary"
                size="iconOnly"
                aria-label="Rename category"
                onClick={() => {
                    // Modal as workaround for spacebar triggering collapse/expand instead of inputting
                    openRenameCategoryModal(category, onRenamed);
                }}
            >
                <PencilIcon width={14} height={14} />
            </Button>
        </Flex>
    );
}

function CategoryRow({ category, index, count, onChanged }: {
    category: GifCategory;
    index: number;
    count: number;
    onChanged: () => void;
}) {
    function move(delta: number) {
        const ids = getCategories().map(c => c.id);
        const target = index + delta;

        if (target < 0 || target >= ids.length) {
            return;
        }

        [ids[index], ids[target]] = [ids[target], ids[index]];
        reorderCategories(ids).then(onChanged);
    }

    return (
        <ExpandableSection
            className="vc-bgc-manager-category"
            renderContent={() => (
                category.gifs.length === 0
                    ? <Paragraph>No gifs in this category yet.</Paragraph>
                    : (
                        <Grid columns={1} gap="8px"
                            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
                        >
                            {category.gifs.map(gif => (
                                <GifTile
                                    key={gif.url}
                                    gif={gif}
                                    onRemove={() => removeGifFromCategory(category.id, gif.url).then(onChanged)}
                                />
                            ))}
                        </Grid>
                    )
            )}
        >
            <Flex alignItems="center" justifyContent="space-between" style={{ flex: 1 }}>
                <CategoryNameRow category={category} onRenamed={onChanged} />
                <Flex alignItems="center" gap={4} onClick={e => e.stopPropagation()}>
                    <Paragraph style={{ opacity: 0.7 }}>
                        {category.gifs.length} gif{category.gifs.length === 1 ? "" : "s"}
                    </Paragraph>
                    <Button
                        variant="secondary"
                        size="iconOnly"
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => move(-1)}
                    >
                        ▲
                    </Button>
                    <Button
                        variant="secondary"
                        size="iconOnly"
                        aria-label="Move down"
                        disabled={index === count - 1}
                        onClick={() => move(1)}
                    >
                        ▼
                    </Button>
                    <Button
                        variant="dangerSecondary"
                        size="iconOnly"
                        aria-label="Delete category"
                        onClick={() => confirmDeleteCategory(category, () => deleteCategory(category.id).then(onChanged))}
                    >
                        <DeleteIcon width={16} height={16} />
                    </Button>
                </Flex>
            </Flex>
        </ExpandableSection>
    );
}

export default function CategoryManager() {
    const [categories, setCategories] = useState<GifCategory[]>(() => getCategories());

    function refresh() {
        setCategories([...getCategories()]);
    }

    return (
        <Card>
            <Flex alignItems="center" justifyContent="space-between">
                <Heading tag="h3">Categories</Heading>
                <Button size="small" onClick={() => openCreateCategoryModal(refresh)}>New Category</Button>
            </Flex>
            {categories.length === 0
                ? <Paragraph>You have no categories yet.</Paragraph>
                : (
                    <Flex flexDirection="column" gap={6}>
                        {categories.map((category, index) => (
                            <CategoryRow
                                key={category.id}
                                category={category}
                                index={index}
                                count={categories.length}
                                onChanged={refresh}
                            />
                        ))}
                    </Flex>
                )
            }
        </Card>
    );
}
