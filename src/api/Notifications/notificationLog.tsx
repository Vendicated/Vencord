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
import { Settings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { Flex } from "@components/Flex";
import { openNotificationSettingsModal } from "@components/settings/tabs/vencord/NotificationSettings";
import { closeModal, ModalCloseButton, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { useAwaiter } from "@utils/react";
import { Alerts, Button, Forms, ListScrollerThin, React, Text, Timestamp, useEffect, useReducer, useState } from "@webpack/common";
import { nanoid } from "nanoid";
import type { DispatchWithoutAction } from "react";

import NotificationComponent from "./NotificationComponent";
import type { NotificationData } from "./Notifications";

interface PersistentNotificationData extends Pick<NotificationData, "title" | "body" | "image" | "icon" | "color"> {
    timestamp: number;
    id: string;
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

    await DataStore.update(KEY, (old: PersistentNotificationData[] | undefined) => {
        const log = old ?? [];

        // Omit stuff we don't need
        const {
            onClick, onClose, richBody, permanent, noPersist, dismissOnClick,
            ...pureNotification
        } = notification;

        log.unshift({
            ...pureNotification,
            timestamp: Date.now(),
            id: nanoid()
        });

        if (log.length > limit && limit !== 200)
            log.length = limit;

        return log;
    });

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

function NotificationEntry({ data }: { data: PersistentNotificationData; }) {
    const [removing, setRemoving] = useState(false);

    return (
        <div className={cl("wrapper", { removing })}>
            <NotificationComponent
                {...data}
                permanent={true}
                dismissOnClick={false}
                onClose={() => {
                    if (removing) return;
                    setRemoving(true);

                    setTimeout(() => deleteNotification(data.timestamp), 200);
                }}
                richBody={
                    <div className={cl("body-wrapper")}>
                        <div className={cl("body")}>{data.body}</div>
                        <Timestamp timestamp={new Date(data.timestamp)} className={cl("timestamp")} />
                    </div>
                }
            />
        </div >
    );
}

export function NotificationLog({ log, pending }: { log: PersistentNotificationData[], pending: boolean; }) {
    if (!log.length && !pending)
        return (
            <div className={cl("container")}>
                <div className={cl("empty")} />
                <Forms.FormText style={{ textAlign: "center" }}>
                    No notifications yet
                </Forms.FormText>
            </div>
        );

    return (
        <ListScrollerThin
            className={cl("container")}
            sections={[log.length]}
            sectionHeight={0}
            rowHeight={120}
            renderSection={() => null}
            renderRow={item => <NotificationEntry data={log[item.row]} key={log[item.row].id} />}
        />
    );
}

function LogModal({ modalProps, close }: { modalProps: ModalProps; close(): void; }) {
    const [log, pending] = useLogs();

    return (
        <ModalRoot {...modalProps} size={ModalSize.LARGE} className={cl("modal")}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Notification Log</Text>
                <ModalCloseButton onClick={close} />
            </ModalHeader>

            <div style={{ width: "100%" }}>
                <NotificationLog log={log} pending={pending} />
            </div>

            <ModalFooter>
                <Flex>
                    <Button onClick={openNotificationSettingsModal}>
                        Notification Settings
                    </Button>

                    <Button
                        disabled={log.length === 0}
                        color={Button.Colors.RED}
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
                </Flex>
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
