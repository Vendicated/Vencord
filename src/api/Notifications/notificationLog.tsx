/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import * as DataStore from "@api/DataStore";
import { Settings } from "@api/settings";
import { classNameFactory } from "@api/Styles";
import { useAwaiter } from "@utils/misc";
import { closeModal, ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Alerts, Button, Forms, moment, Text, Timestamp, useEffect, useReducer } from "@webpack/common";
import type { DispatchWithoutAction } from "react";

import NotificationComponent from "./NotificationComponent";
import type { NotificationData } from "./Notifications";

interface PersistentNotificationData extends Omit<NotificationData, "onClick" | "onClose" | "richBody" | "permanent" | "noPersist"> {
    timestamp: number;
}

const KEY = "notification-log";

const getLog = async () => {
    const log = await DataStore.get(KEY) as PersistentNotificationData[] | undefined;
    return log ?? [];
};

const cl = classNameFactory("vc-notification-log-");
const signals = new Set<DispatchWithoutAction>();

export async function persistNotification(notification: NotificationData) {
    if (notification.noPersist) return;

    const limit = Settings.notifications.logLimit;
    if (limit === 0) return;

    const log = await getLog();

    // Omit not serializable jazz
    const { onClick, onClose, richBody, permanent, noPersist, ...pureNotification } = notification;
    log.unshift({
        ...pureNotification,
        timestamp: Date.now()
    });

    if (log.length > limit && limit !== 101)
        log.length = limit;

    await DataStore.set(KEY, log);
    signals.forEach(x => x());
}

export async function deleteNotification(timestamp: number) {
    const log = await getLog();
    const index = log.findIndex(x => x.timestamp === timestamp);
    if (index === -1) return;

    log.splice(index, 1);
    await DataStore.set(KEY, log);
    signals.forEach(x => x());
}

export function useLogs() {
    const [signal, setSignal] = useReducer(x => x + 1, 0);

    useEffect(() => {
        signals.add(setSignal);
        return () => void signals.delete(setSignal);
    }, []);

    const [log, _, pending] = useAwaiter(getLog, {
        fallbackValue: [],
        deps: [signal]
    });

    return [log, pending] as const;
}

export function NotificationLog({ log, pending }: { log: PersistentNotificationData[], pending: boolean; }) {
    if (pending)
        return <Forms.FormText>Loading Notification log...</Forms.FormText>;

    if (!log.length)
        return (
            <div className={cl("container")}>
                <div className={cl("empty")} />
                <Forms.FormText style={{ textAlign: "center" }}>
                    No notifications yet
                </Forms.FormText>
            </div>
        );

    return (
        <div className={cl("container")}>
            {log.map(n => (
                <NotificationComponent
                    {...n}
                    key={n.timestamp}
                    onClose={() => deleteNotification(n.timestamp)}
                    permanent={true}
                    className={cl("entry")}
                    richBody={
                        <div className={cl("body")}>
                            {n.body}
                            <Timestamp timestamp={moment(n.timestamp)} className={cl("timestamp")} />
                        </div>
                    }
                />
            ))}
        </div>
    );
}

function LogModal({ modalProps, close }: { modalProps: ModalProps; close(): void; }) {
    const [log, pending] = useLogs();

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Notification Log</Text>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <ModalContent>
                <NotificationLog log={log} pending={pending} />
            </ModalContent>

            <ModalFooter>
                <Button
                    disabled={log.length === 0}
                    onClick={() => {
                        Alerts.show({
                            title: "Are you sure?",
                            body: `This will permanently remove ${log.length} notification${log.length === 1 ? "" : "s"}. This action cannot be undone.`,
                            async onConfirm() {
                                await DataStore.set(KEY, []);
                                signals.forEach(x => x());
                            },
                            confirmText: "Do it!",
                            confirmColor: "vc-notification-log-danger-btn",
                            cancelText: "Nevermind"
                        });
                    }}
                >
                    Clear Notification Log
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openNotificationLogModal() {
    const key = openModal(modalProps => (
        <LogModal
            modalProps={modalProps}
            close={() => closeModal(key)}
        />
    ));
}
