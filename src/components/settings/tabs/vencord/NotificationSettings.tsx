/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { useSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { ErrorCard } from "@components/ErrorCard";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Select, Slider } from "@webpack/common";

export function NotificationSection() {
    return (
        <section className={Margins.top16}>
            <Heading>Notifications</Heading>
            <Paragraph className={Margins.bottom8}>
                Settings for Notifications sent by Vencord.
                This does NOT include Discord notifications (messages, etc)
            </Paragraph>
            <Flex>
                <Button onClick={openNotificationSettingsModal}>
                    Notification Settings
                </Button>
                <Button onClick={openNotificationLogModal}>
                    View Notification Log
                </Button>
            </Flex>
        </section>
    );
}

export function openNotificationSettingsModal() {
    openModal(props => (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <BaseText size="lg" weight="semibold" style={{ flexGrow: 1 }}>Notification Settings</BaseText>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent>
                <NotificationSettings />
            </ModalContent>
        </ModalRoot>
    ));
}

function NotificationSettings() {
    const settings = useSettings(["notifications.*"]).notifications;

    return (
        <div style={{ padding: "1em 0" }}>
            <Heading>Notification Style</Heading>
            {settings.useNative !== "never" && Notification?.permission === "denied" && (
                <ErrorCard style={{ padding: "1em" }} className={Margins.bottom8}>
                    <Heading>Desktop Notification Permission denied</Heading>
                    <Paragraph>You have denied Notification Permissions. Thus, Desktop notifications will not work!</Paragraph>
                </ErrorCard>
            )}
            <Paragraph className={Margins.bottom8}>
                Some plugins may show you notifications. These come in two styles:
                <ul>
                    <li><strong>Equicord Notifications</strong>: These are in-app notifications</li>
                    <li><strong>Desktop Notifications</strong>: Native Desktop notifications (like when you get a ping)</li>
                </ul>
            </Paragraph>
            <Select
                placeholder="Notification Style"
                options={[
                    { label: "Only use Desktop notifications when Discord is not focused", value: "not-focused", default: true },
                    { label: "Always use Desktop notifications", value: "always" },
                    { label: "Always use Equicord notifications", value: "never" },
                ] satisfies Array<{ value: typeof settings["useNative"]; } & Record<string, any>>}
                closeOnSelect={true}
                select={v => settings.useNative = v}
                isSelected={v => v === settings.useNative}
                serialize={identity}
            />

            <Heading className={Margins.top16 + " " + Margins.bottom8}>Notification Position</Heading>
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

            <Heading className={Margins.top16 + " " + Margins.bottom8}>Missed Notification Count</Heading>
            <FormSwitch
                title="When refocusing discord a notification will popup with how you missed"
                value={settings.missed}
                onChange={(v: boolean) => settings.missed = v}
            />

            <Heading className={Margins.top16 + " " + Margins.bottom8}>Notification Timeout</Heading>
            <Paragraph className={Margins.bottom16}>Set to 0s to never automatically time out</Paragraph>
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

            <Heading className={Margins.top16 + " " + Margins.bottom8}>Notification Log Limit</Heading>
            <Paragraph className={Margins.bottom16}>
                The amount of notifications to save in the log until old ones are removed.
                Set to <code>0</code> to disable Notification log and <code>∞</code> to never automatically remove old Notifications
            </Paragraph>
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
