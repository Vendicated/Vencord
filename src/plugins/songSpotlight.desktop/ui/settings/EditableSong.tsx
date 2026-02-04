/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { Flex } from "@components/Flex";
import { LinkIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { cl } from "@plugins/songSpotlight.desktop/lib/utils";
import { useRender } from "@plugins/songSpotlight.desktop/service";
import { TrashIcon } from "@plugins/songSpotlight.desktop/ui/common";
import { ServiceIcon } from "@plugins/songSpotlight.desktop/ui/components/ServiceIcon";
import { Song } from "@song-spotlight/api/structs";
import { copyWithToast } from "@utils/discord";
import { ContextMenuApi, FluxDispatcher, Menu } from "@webpack/common";

interface EditableSongProps {
    song: Song;
    index: number;
    onRemove(song: Song): void;
}

export function EditableSong({ song, index, onRemove }: EditableSongProps) {
    const { render, failed } = useRender(song);

    return (
        <Link
            href={render?.link}
            onContextMenu={e =>
                ContextMenuApi.openContextMenu(e, () => (
                    <Menu.Menu
                        navId="vc-songspotlight-editable-song"
                        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                        aria-label={render?.label}
                    >
                        <Menu.MenuItem
                            id="copy-link"
                            label="Copy link"
                            icon={LinkIcon}
                            action={() => render && copyWithToast(render.link)}
                            disabled={!render}
                        />
                        <Menu.MenuItem
                            id="remove-song"
                            color="danger"
                            label="Remove song"
                            icon={TrashIcon}
                            action={() => onRemove(song)}
                        />
                    </Menu.Menu>
                ))}
        >
            <Flex alignItems="center" gap="12px" className={cl("editable-song")}>
                <ServiceIcon width={28} height={28} service={song.service} />
                <Flex flexDirection="column" justifyContent="center" gap={0}>
                    <BaseText size="md" weight="medium" className={cl("clamped")}>
                        {render ? render.label : failed ? "<err!>" : "..."}
                    </BaseText>
                    <BaseText size="sm" weight="normal" className={cl("clamped", "sub")}>
                        {render ? render.sublabel : failed ? "<err!>" : "..."}
                    </BaseText>
                </Flex>
            </Flex>
        </Link>
    );
}
