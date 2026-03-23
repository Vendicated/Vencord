/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { classes } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Channel } from "@vencord/discord-types";
import { findStoreLazy } from "@webpack";
import { Button, React, ScrollerThin } from "@webpack/common";

import { clearLogs, getVcLogs, vcLogSubscribe } from "../logs";
import { cl } from "../utils";
import { VoiceChannelLogEntryComponent } from "./VoiceChannelLogEntryComponent";

const AccessibilityStore = findStoreLazy("AccessibilityStore");

export function openVoiceChannelLog(channel: Channel) {
    return openModal(props => (
        <VoiceChannelLogModal props={props} channel={channel} />
    ));
}

export function VoiceChannelLogModal({ channel, props }: { channel: Channel; props: ModalProps; }) {
    const logs = React.useSyncExternalStore(vcLogSubscribe, () => getVcLogs(channel.id));

    return (
        <ModalRoot {...props} size={ModalSize.LARGE}>
            <ModalHeader>
                <BaseText size="lg" weight="semibold" className={cl("header")} style={{ flexGrow: 1 }}>
                    {channel.name} logs
                </BaseText>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent>
                <ScrollerThin fade className={classes(cl("scroller"), `group-spacing-${AccessibilityStore.messageGroupSpacing}`)}>
                    {logs.length > 0 ? logs.map((entry, i) => {
                        const elements: React.ReactNode[] = [];

                        if (i === 0 || entry.timestamp.toDateString() !== logs[i - 1].timestamp.toDateString()) {
                            elements.push(
                                <div key={`sep-${i}`} className={cl("date-separator")} role="separator" aria-label={entry.timestamp.toDateString()}>
                                    <span>{entry.timestamp.toDateString()}</span>
                                </div>
                            );
                        }

                        elements.push(
                            <VoiceChannelLogEntryComponent key={`entry-${i}`} logEntry={entry} channel={channel} />
                        );

                        return elements;
                    }) : (
                        <div className={cl("empty")}>No logs to display.</div>
                    )}
                </ScrollerThin>
            </ModalContent>

            <ModalFooter>
                <Button color={Button.Colors.RED} onClick={() => clearLogs(channel.id)}>
                    Clear logs
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}
