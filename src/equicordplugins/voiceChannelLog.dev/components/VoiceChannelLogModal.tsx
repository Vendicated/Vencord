/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { getVcLogs, vcLogSubscribe } from "@equicordplugins/voiceChannelLog.dev/logs";
import { classes } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Channel } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { React, ScrollerThin } from "@webpack/common";

import { cl } from "..";
import { VoiceChannelLogEntryComponent } from "./VoiceChannelLogEntryComponent";

const AccessibilityStore = findStoreLazy("AccessibilityStore");

export function openVoiceChannelLog(channel: Channel) {
    return openModal(props => (
        <VoiceChannelLogModal
            props={props}
            channel={channel}
        />
    ));
}

export function VoiceChannelLogModal({ channel, props }: { channel: Channel; props: ModalProps; }) {
    React.useSyncExternalStore(vcLogSubscribe, () => getVcLogs(channel.id));
    const vcLogs = getVcLogs(channel.id);
    const logElements: (React.ReactNode)[] = [];

    if (vcLogs.length > 0) {
        for (let i = 0; i < vcLogs.length; i++) {
            const logEntry = vcLogs[i];
            if (i === 0 || logEntry.timestamp.toDateString() !== vcLogs[i - 1].timestamp.toDateString()) {
                logElements.push(<div className={classes(cl("date-separator"))} role="separator" aria-label={logEntry.timestamp.toDateString()}>
                    <span>
                        {logEntry.timestamp.toDateString()}
                    </span>
                </div>);
            } else {
                logElements.push(<VoiceChannelLogEntryComponent logEntry={logEntry} channel={channel} />);
            }
        }
    } else {
        logElements.push(<div className={cl("empty")}>No logs to display.</div>);
    }

    return (
        <ModalRoot
            {...props}
            size={ModalSize.LARGE}
        >
            <ModalHeader>
                <BaseText size="lg" weight="semibold" className={cl("header")} style={{ flexGrow: 1 }}>{channel.name} logs</BaseText>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent>
                <ScrollerThin fade className={classes(cl("scroller"), `group-spacing-${AccessibilityStore.messageGroupSpacing}`)}>
                    {logElements}
                </ScrollerThin>
            </ModalContent>
        </ModalRoot >
    );
}
