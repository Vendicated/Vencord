/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SafetyIcon } from "@components/Icons";
import { classes, Margins } from "@utils/index";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, Dialog, GuildStore, i18n, Parser, PermissionsBits, PermissionStore, Text, Tooltip, UserStore, useState, useStateFromStores } from "@webpack/common";
import { Message } from "discord-types/general";

import { useTimeoutReason } from "../TimeoutReasonStore";


const PopoutClasses = findByPropsLazy("container", "scroller", "list");
const rowClasses = findByPropsLazy("row", "rowIcon", "rowGuildName");

const ChannelIcon = findComponentByCodeLazy("h4.97l-.8 4.84a1 1 0 0 0 1.97.32l.86-5.16H20a1");
const CustomAutoModRuleIcon = findComponentByCodeLazy("a1 1 0 0 1 1-1h8a1 1 0 0 1 0 2H3a1 1 0 0 1-1-1ZM3 19a1 1 0 1 0 0 2h8a1 1 0 0 0 0-2H3Z");
const MessageIcon = findComponentByCodeLazy('"M12 22a10 10 0 1 0-8.45-4.64c.13.19.11.44-.04.61l-2.06 2.37A1 1 0 0 0 2.2 22H12Z"');

const { setCommunicationDisabledUntil } = findByPropsLazy("setCommunicationDisabledUntil");

export default function TimeoutDetailsPopout({ closePopout, guildId, userId, message }: { closePopout(): void; guildId: string; userId: string; message: Message; }) {
    const user = UserStore.getUser(userId);
    const reason = useTimeoutReason(guildId, userId);
    const hasModerationPermission = useStateFromStores([PermissionStore], () => PermissionStore.canManageUser(PermissionsBits.MODERATE_MEMBERS, userId, GuildStore.getGuild(guildId)));
    const parse = (text: string) => Parser.parse(text, true, {
        channelId: message.channel_id,
        messageId: message.id
    });

    const [cancelling, setCancelling] = useState(false);

    return <Dialog
        className={classes("vc-std-popout", PopoutClasses.container)}
    >
        <Text tag="h2" variant="eyebrow" style={{ color: "var(--header-primary)", display: "inline" }}>
            Timeout details for {user.username}
        </Text>
        <div className={Margins.bottom8} />
        {(reason.moderator || reason.automod) && <div className={rowClasses.row}>
            <Tooltip text="Moderator">
                {p => <SafetyIcon {...p} className={rowClasses.rowIcon} height="24" width="24" />}
            </Tooltip>
            {reason.automod ? i18n.Messages.GUILD_SETTINGS_AUTOMOD_TITLE : parse(`<@${reason.moderator}>`)}
        </div>}
        {(reason.automodChannelId) && <div className={rowClasses.row}>
            <Tooltip text="Channel where offending message was sent">
                {p => <ChannelIcon {...p} className={rowClasses.rowIcon} height="24" width="24" />}
            </Tooltip>
            {parse(`<#${reason.automodChannelId}>`)}
        </div>}
        {(reason.automodRuleName) && <div className={rowClasses.row}>
            <Tooltip text="AutoMod Rule">
                {p => <CustomAutoModRuleIcon {...p} className={rowClasses.rowIcon} height="24" width="24" />}
            </Tooltip>
            {reason.automodRuleName}
        </div>}
        {(reason.reason) && <div className={rowClasses.row}>
            <Tooltip text="Reason">
                {p => <MessageIcon {...p} className={rowClasses.rowIcon} height="24" width="24" />}
            </Tooltip>
            {reason.reason}
        </div>}
        {hasModerationPermission && <div className="vc-std-popout-button-wrapper"><Button
            className="vc-std-popout-button"
            size={Button.Sizes.SMALL}
            color={Button.Colors.RED}
            onClick={async () => {
                setCancelling(true);
                await setCommunicationDisabledUntil({
                    guildId,
                    userId,
                    communicationDisabledUntilTimestamp: null,
                    duratiion: null,
                    reason: null,
                    location: null
                });
                closePopout();
            }}
            submitting={cancelling}
        >
            {i18n.Messages.REMOVE_TIME_OUT}
        </Button></div>}
    </Dialog>;
}
