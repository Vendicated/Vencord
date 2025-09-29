/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { useSettings } from "@api/Settings";
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Forms, Select, Slider, Text } from "@webpack/common";

export function NotificationSection() {
    return (
        <Forms.FormSection className={Margins.top16} title="Vencord Notifications" tag="h5">
            <Flex>
                <Button onClick={openNotificationSettingsModal}>
                    Notification Settings
                </Button>
                <Button onClick={openNotificationLogModal}>
                    View Notification Log
                </Button>
            </Flex>
        </Forms.FormSection>
    );
}

export function openNotificationSettingsModal() {
    openModal(props => (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Notification Settings</Text>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent>
                <NotificationSettings />
            </ModalContent>
        </ModalRoot>
    ));
}

function NotificationSettings() {
    const settings = useSettings().notifications;

    return (
        <div style={{ padding: "1em 0" }}>
            <Forms.FormTitle tag="h5">Notification Style</Forms.FormTitle>
            {settings.useNative !== "never" && Notification?.permission === "denied" && (
                <ErrorCard style={{ padding: "1em" }} className={Margins.bottom8}>
                    <Forms.FormTitle tag="h5">Desktop Notification Permission denied</Forms.FormTitle>
                    <Forms.FormText>You have denied Notification Permissions. Thus, Desktop notifications will not work!</Forms.FormText>
                </ErrorCard>
            )}
            <Forms.FormText className={Margins.bottom8}>
                Some plugins may show you notifications. These come in two styles:
                <ul>
                    <li><strong>Vencord Notifications</strong>: These are in-app notifications</li>
                    <li><strong>Desktop Notifications</strong>: Native Desktop notifications (like when you get a ping)</li>
                </ul>
            </Forms.FormText>
            <Select
                placeholder="Notification Style"
                options={[
                    { label: "Only use Desktop notifications when Discord is not focused", value: "not-focused", default: true },
                    { label: "Always use Desktop notifications", value: "always" },
                    { label: "Always use Vencord notifications", value: "never" },
                ] satisfies Array<{ value: typeof settings["useNative"]; } & Record<string, any>>}
                closeOnSelect={true}
                select={v => settings.useNative = v}
                isSelected={v => v === settings.useNative}
                serialize={identity}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>Notification Position</Forms.FormTitle>
            <Select
                isDisabled={settings.useNative === "always"}
                placeholder="Notification Position"
                options={[
                    { label: "Bottom Right", value: "bottom-right", default: true },
                    { label: "Top Right", value: "top-right" },
                ] satisfies Array<{ value: typeof settings["position"]; } & Record<string, any>>}
                select={v => settings.position = v}
                isSelected={v => v === settings.position}
                serialize={identity}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>Notification Timeout</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>Set to 0s to never automatically time out</Forms.FormText>
            <Slider
                disabled={settings.useNative === "always"}
                markers={[0, 1000, 2500, 5000, 10_000, 20_000]}
                minValue={0}
                maxValue={20_000}
                initialValue={settings.timeout}
                onValueChange={v => settings.timeout = v}
                onValueRender={v => (v / 1000).toFixed(2) + "s"}
                onMarkerRender={v => (v / 1000) + "s"}
                stickToMarkers={false}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>Notification Log Limit</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>
                The amount of notifications to save in the log until old ones are removed.
                Set to <code>0</code> to disable Notification log and <code>∞</code> to never automatically remove old Notifications
            </Forms.FormText>
            <Slider
                markers={[0, 25, 50, 75, 100, 200]}
                minValue={0}
                maxValue={200}
                stickToMarkers={true}
                initialValue={settings.logLimit}
                onValueChange={v => settings.logLimit = v}
                onValueRender={v => v === 200 ? "∞" : v}
                onMarkerRender={v => v === 200 ? "∞" : v}
            />
        </div>
    );
}
