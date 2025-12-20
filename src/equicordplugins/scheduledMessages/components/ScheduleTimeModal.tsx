/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Heading } from "@components/Heading";
import { classNameFactory } from "@utils/css";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, DraftType, showToast, TextInput, Toasts, UploadManager, useState } from "@webpack/common";

import { ScheduledAttachment } from "../types";
import { addScheduledMessage, getChannelDisplayInfo } from "../utils";
import { ErrorIcon } from "./Icons";

const cl = classNameFactory("vc-scheduled-msg-");
const ComponentDispatch = findByPropsLazy("dispatchToLastSubscribed");

function ScheduleTimeModalInner({ channelId, content, attachments, rootProps, close }: {
    channelId: string;
    content: string;
    attachments?: ScheduledAttachment[];
    rootProps: ModalProps;
    close: () => void;
}) {
    const [scheduleType, setScheduleType] = useState<"delay" | "time">("delay");
    const [delayMinutes, setDelayMinutes] = useState("5");
    const [scheduledDateTime, setScheduledDateTime] = useState("");
    const [error, setError] = useState("");

    const { name, avatar } = getChannelDisplayInfo(channelId);
    const channel = ChannelStore.getChannel(channelId);
    if (!channel) return null;

    const isDM = channel.isPrivate();

    const handleSchedule = async () => {
        let scheduledTime: number;

        if (scheduleType === "delay") {
            const minutes = parseInt(delayMinutes, 10);
            if (isNaN(minutes) || minutes < 1) {
                setError("Please enter a valid delay (minimum 1 minute)");
                return;
            }
            scheduledTime = Date.now() + minutes * 60 * 1000;
        } else {
            const dateTime = new Date(scheduledDateTime).getTime();
            if (isNaN(dateTime) || dateTime <= Date.now()) {
                setError("Please select a future date and time");
                return;
            }
            scheduledTime = dateTime;
        }

        const result = await addScheduledMessage(channelId, content, scheduledTime, attachments);

        if (result.success) {
            ComponentDispatch.dispatchToLastSubscribed("CLEAR_TEXT");
            UploadManager.clearAll(channelId, DraftType.ChannelMessage);
            showToast("Message scheduled!", Toasts.Type.SUCCESS);
            close();
        } else {
            setError(result.error ?? "Failed to schedule message");
        }
    };

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Heading tag="h2" className={cl("modal-title")}>Schedule Message</Heading>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                <div className={cl("channel-info")}>
                    {avatar && <img src={avatar} className={cl("channel-avatar")} alt="" />}
                    <span className={cl("channel-text")}>
                        Scheduling for: <strong>{isDM ? name : `#${name}`}</strong>
                    </span>
                </div>

                <Heading tag="h5" className={cl("field-label")}>Schedule Type</Heading>
                <div className={cl("schedule-type-buttons")}>
                    <Button
                        size="small"
                        variant={scheduleType === "delay" ? "primary" : "secondary"}
                        onClick={() => setScheduleType("delay")}
                    >
                        Delay
                    </Button>
                    <Button
                        size="small"
                        variant={scheduleType === "time" ? "primary" : "secondary"}
                        onClick={() => setScheduleType("time")}
                    >
                        Specific Time
                    </Button>
                </div>

                {scheduleType === "delay" ? (
                    <>
                        <Heading tag="h5" className={cl("field-label")}>Delay (minutes)</Heading>
                        <TextInput
                            value={delayMinutes}
                            onChange={setDelayMinutes}
                            placeholder="5"
                            type="number"
                        />
                    </>
                ) : (
                    <>
                        <Heading tag="h5" className={cl("field-label")}>Date & Time</Heading>
                        <input
                            type="datetime-local"
                            className={cl("datetime-input")}
                            value={scheduledDateTime}
                            onChange={e => setScheduledDateTime(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                        />
                    </>
                )}

                {error && (
                    <div className={cl("error")}>
                        <ErrorIcon />
                        <span>{error}</span>
                    </div>
                )}
            </ModalContent>

            <ModalFooter className={cl("modal-footer")}>
                <Button onClick={handleSchedule} variant="positive">Schedule</Button>
                <Button variant="secondary" onClick={close}>Cancel</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export const ScheduleTimeModal = ErrorBoundary.wrap(ScheduleTimeModalInner, { noop: true });

export function openScheduleTimeModal(channelId: string, content: string, attachments?: ScheduledAttachment[]): void {
    const key = openModal(props => (
        <ScheduleTimeModal
            channelId={channelId}
            content={content}
            attachments={attachments}
            rootProps={props}
            close={() => closeModal(key)}
        />
    ));
}
