/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes, classNameFactory } from "@utils/index";
import { Tooltip } from "@webpack/common";

import { removeTagFromChannel } from "./actions";
import { openChannelTagsMenu } from "./contextMenu";
import { getChannelHiddenFor, selectVisibleChannelTags } from "./selectors";
import { settings } from "./settings";
import { TagShapeIcon } from "./TagShape";
import { ChannelId, TagId } from "./types";

const cl = classNameFactory("vc-channel-tags-");

export function ChannelTags({ channelId }: { channelId: ChannelId; }) {
    const store = settings.use(["clickTagsToRemove", "channelTags", "tags", "groups", "channels"]);
    const clickToRemove = store.clickTagsToRemove;
    const tags = selectVisibleChannelTags(channelId, store, getChannelHiddenFor(channelId, store.channels));

    if (!tags.length) return null;

    const remove = (event: React.UIEvent, tagId: TagId) => {
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
