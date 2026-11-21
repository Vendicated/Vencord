/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LazyComponent } from "@utils/lazyReact";
import { findByCodeLazy, findByPropsLazy } from "@webpack";
import { React } from "@webpack/common";

const OriginalDiscordTag: ({
    className,
    type,
    verified,
    useRemSizes,
}: {
    className: string;
    type: number;
    verified?: boolean;
    useRemSizes?: boolean;
}) => React.JSX.Element = findByCodeLazy(".Messages.DISCORD_SYSTEM_MESSAGE_BOT_TAG_TOOLTIP_OFFICIAL", ".SYSTEM_DM_TAG_OFFICIAL");

const DISCORD_TAG_TYPES: {
    SYSTEM_DM: 2;
} = findByPropsLazy("SYSTEM_DM", "STAFF_ONLY_DM");

const USERNAME_COMPONENT_CLASS_NAMES: {
    decorator: string;
} = findByPropsLazy("decorator", "avatarWithText");

export const OriginalUsernameSystemTag = LazyComponent(
    () => React.memo(
        () => <OriginalDiscordTag
            className={USERNAME_COMPONENT_CLASS_NAMES.decorator}
            type={DISCORD_TAG_TYPES.SYSTEM_DM}
            verified={true}
        />
    )
);

const MESSAGE_COMPONENT_CLASS_NAMES: {
    botTagCompact: string;
    botTagCozy: string;
} = findByPropsLazy("botTagCompact", "botTagCozy");

export const OriginalMessageSystemTag = LazyComponent(
    () => React.memo(
        () => <OriginalDiscordTag
            className={MESSAGE_COMPONENT_CLASS_NAMES.botTagCompact}
            type={DISCORD_TAG_TYPES.SYSTEM_DM}
            verified={true}
        />
    )
);

const AUTOMOD_MESSAGE_COMPONENT_CLASS_NAMES: {
    systemTag: string;
} = findByPropsLazy("systemTag", "alertActionIcon");

export const OriginalAutoModMessageTag = LazyComponent(
    () => React.memo(
        () => <OriginalDiscordTag
            className={AUTOMOD_MESSAGE_COMPONENT_CLASS_NAMES.systemTag}
            type={DISCORD_TAG_TYPES.SYSTEM_DM}
        />
    )
);
