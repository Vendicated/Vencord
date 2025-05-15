/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { getLanguage } from "@languages/Language";
import { formatWithReactComponent } from "@languages/LanguageUtils";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Forms, Select, Slider, Text } from "@webpack/common";

import { ErrorCard } from "..";

const langData = getLanguage("components");

export function NotificationSettings() {
    const settings = useSettings().notifications;
    const l = langData.VencordSettings.NotificationSettings;

    return (
        <div style={{ padding: "1em 0" }}>
            <Forms.FormTitle tag="h5">{l.style}</Forms.FormTitle>
            {settings.useNative !== "never" && Notification?.permission === "denied" && (
                <ErrorCard style={{ padding: "1em" }} className={Margins.bottom8}>
                    <Forms.FormTitle tag="h5">{l.permDeniedTitle}</Forms.FormTitle>
                    <Forms.FormText>{l.permDeniedText}</Forms.FormText>
                </ErrorCard>
            )}
            <Forms.FormText className={Margins.bottom8}>
                {l.notificationsInfo}
                <ul>
                    <li><strong>{l.vencordNotification}</strong>: {l.vencordNotificationInfo}</li>
                    <li><strong>{l.desktopNotification}</strong>: {l.desktopNotificationInfo}</li>
                </ul>
            </Forms.FormText>
            <Select
                placeholder={l.style}
                options={[
                    { label: l.onlyWhenUnfocused, value: "not-focused", default: true },
                    { label: l.alwaysDesktopNotif, value: "always" },
                    { label: l.alwaysVencordNotif, value: "never" },
                ] satisfies Array<{ value: typeof settings["useNative"]; } & Record<string, any>>}
                closeOnSelect={true}
                select={v => settings.useNative = v}
                isSelected={v => v === settings.useNative}
                serialize={identity}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>{l.notificationPosition}</Forms.FormTitle>
            <Select
                isDisabled={settings.useNative === "always"}
                placeholder={l.notificationPosition}
                options={[
                    { label: l.posBottomRight, value: "bottom-right", default: true },
                    { label: l.posTopRight, value: "top-right" },
                ] satisfies Array<{ value: typeof settings["position"]; } & Record<string, any>>}
                select={v => settings.position = v}
                isSelected={v => v === settings.position}
                serialize={identity}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>{l.timeoutNotif}</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>{l.timeoutNotifInfo}</Forms.FormText>
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

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>{l.logNotifLimit}</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>
                {formatWithReactComponent(l.logNotifInfo, { code0: <code>0</code>, infinity: <code>∞</code> })}
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

export function openNotificationSettingsModal() {
    openModal(props => (
        <ModalRoot {...props} size={ModalSize.MEDIUM}>
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>{langData.VencordSettings.NotificationSettings.notifSettings}</Text>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>

            <ModalContent>
                <NotificationSettings />
            </ModalContent>
        </ModalRoot>
    ));
}
