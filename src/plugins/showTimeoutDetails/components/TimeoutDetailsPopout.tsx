/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { SafetyIcon } from "@components/Icons";
import { classes, Margins } from "@utils/index";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { Button, Dialog, GuildMemberStore, GuildStore, i18n, Parser, PermissionsBits, PermissionStore, Text, UserStore, useState, useStateFromStores } from "@webpack/common";
import { Message } from "discord-types/general";

import { CountDown } from "..";
import { useTimeoutReason } from "../TimeoutReasonStore";
import TimeoutDetailsRow from "./TimeoutDetailsRow";

const PopoutClasses = findByPropsLazy("container", "scroller", "list");

const TimeoutIcon = findComponentByCodeLazy("M12 23c.08 0 .14-.08.11-.16a2.88 2.88 0 0 1 .29-2.31l2.2-3.85");
const ChannelIcon = findComponentByCodeLazy("h4.97l-.8 4.84a1 1 0 0 0 1.97.32l.86-5.16H20a1");
const CustomAutoModRuleIcon = findComponentByCodeLazy("a1 1 0 0 1 1-1h8a1 1 0 0 1 0 2H3a1 1 0 0 1-1-1ZM3 19a1 1 0 1 0 0 2h8a1 1 0 0 0 0-2H3Z");
const MessageIcon = findComponentByCodeLazy('"M12 22a10 10 0 1 0-8.45-4.64c.13.19.11.44-.04.61l-2.06 2.37A1 1 0 0 0 2.2 22H12Z"');

const { setCommunicationDisabledUntil } = findByPropsLazy("setCommunicationDisabledUntil");

export default function TimeoutDetailsPopout({ closePopout, guildId, userId, message }: { closePopout(): void; guildId: string; userId: string; message: Message; }) {
    const user = UserStore.getUser(userId);
    const member = GuildMemberStore.getMember(guildId, userId);
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

        <TimeoutDetailsRow
            description="Remaining time in timeout"
            icon={TimeoutIcon}
        >
            <CountDown
                deadline={new Date(member.communicationDisabledUntil!)}
                showUnits
                stopAtOneSec
            />
        </TimeoutDetailsRow>

        <TimeoutDetailsRow
            description="Moderator"
            icon={SafetyIcon}
            condition={!!(reason.moderator || reason.automod)}
        >
            {reason.automod ? i18n.Messages.GUILD_SETTINGS_AUTOMOD_TITLE : parse(`<@${reason.moderator}>`)}
        </TimeoutDetailsRow>

        <TimeoutDetailsRow
            description="Channel where offending message was sent"
            icon={ChannelIcon}
            condition={!!reason.automodChannelId}
        >
            {parse(`<#${reason.automodChannelId}>`)}
        </TimeoutDetailsRow>

        <TimeoutDetailsRow
            description="AutoMod Rule"
            icon={CustomAutoModRuleIcon}
        >
            {reason.automodRuleName}
        </TimeoutDetailsRow>

        <TimeoutDetailsRow
            description="Reason"
            icon={MessageIcon}
        >
            {reason.reason}
        </TimeoutDetailsRow>

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
