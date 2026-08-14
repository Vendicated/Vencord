/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes, classNameFactory } from "@utils/index";
import { Tooltip } from "@webpack/common";

import { openChannelTagsMenu } from "./contextMenu";
import { ChannelId, compareTags, isGroupHiddenForChannel, removeTagFromChannel, TagId } from "./data";
import { getChannelTagMap, getTagMap, settings } from "./settings";
import { TagShapeIcon } from "./TagShape";

const cl = classNameFactory("vc-channel-tags-");

export function ChannelTags({ channelId }: { channelId: ChannelId; }) {
    settings.use();
    const clickToRemove = settings.store.clickTagsToRemove;
    const channelTags = getChannelTagMap();
    const tagMap = getTagMap();

    const tags = (channelTags[channelId] ?? [])
        .map(id => [id, tagMap[id]] as const)
        .filter((entry): entry is readonly [TagId, NonNullable<typeof entry[1]>] => entry[1] != null)
        .filter(([, tag]) => !isGroupHiddenForChannel(tag.group, channelId))
        .sort(([, a], [, b]) => compareTags(a, b));

    if (!tags.length) return null;

    const remove = (event: React.MouseEvent | React.KeyboardEvent, tagId: TagId) => {
        event.preventDefault();
        event.stopPropagation();
        removeTagFromChannel(channelId, tagId);
    };

    return (
        <div className={cl("decorations")}>
            {tags.map(([id, tag]) => (
                <Tooltip key={id} position="top" text={tag.name}>
                    {tooltipProps => (
                        <span
                            {...tooltipProps}
                            aria-label={clickToRemove ? `Remove ${tag.name} tag` : undefined}
                            className={classes(cl("decoration"), clickToRemove && cl("clickable"))}
                            onClick={clickToRemove ? event => remove(event, id) : undefined}
                            onContextMenu={event => openChannelTagsMenu(event, channelId)}
                            onKeyDown={clickToRemove
                                ? event => {
                                    if (event.key === "Enter" || event.key === " ") remove(event, id);
                                }
                                : undefined}
                            role={clickToRemove ? "button" : undefined}
                            tabIndex={clickToRemove ? 0 : undefined}
                        >
                            <TagShapeIcon color={tag.color} tagShape={tag.shape} />
                        </span>
                    )}
                </Tooltip>
            ))}
        </div>
    );
}
