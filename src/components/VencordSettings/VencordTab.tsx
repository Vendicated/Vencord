/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
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

import { openNotificationLogModal } from "@api/Notifications/notificationLog";
import { Settings, useSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import DonateButton from "@components/DonateButton";
import { ErrorCard } from "@components/ErrorCard";
import { Margins } from "@utils/margins";
import { identity } from "@utils/misc";
import { relaunch, showItemInFolder } from "@utils/native";
import { useAwaiter } from "@utils/react";
import { Button, Card, Forms, React, Select, Slider, Switch } from "@webpack/common";

import { SettingsTab, wrapTab } from "./shared";

const cl = classNameFactory("vc-settings-");

const DEFAULT_DONATE_IMAGE = "https://cdn.discordapp.com/emojis/1026533090627174460.png";
const SHIGGY_DONATE_IMAGE = "https://media.discordapp.net/stickers/1039992459209490513.png";

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function VencordSettings() {
    const [settingsDir, , settingsDirPending] = useAwaiter(VencordNative.settings.getSettingsDir, {
        fallbackValue: "Loading..."
    });
    const settings = useSettings();

    const donateImage = React.useMemo(() => Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE, []);

    const isWindows = navigator.platform.toLowerCase().startsWith("win");
    const isMac = navigator.platform.toLowerCase().startsWith("mac");

    const Switches: Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        note: string;
    }> =
        [
            {
                key: "useQuickCss",
                title: "Enable Custom CSS",
                note: "Loads your Custom CSS"
            },
            !IS_WEB && {
                key: "enableReactDevtools",
                title: "Enable React Developer Tools",
                note: "Requires a full restart"
            },
            !IS_WEB && (!IS_DISCORD_DESKTOP || !isWindows ? {
                key: "frameless",
                title: "Disable the window frame",
                note: "Requires a full restart"
            } : {
                key: "winNativeTitleBar",
                title: "Use Windows' native title bar instead of Discord's custom one",
                note: "Requires a full restart"
            }),
            !IS_WEB && false /* This causes electron to freeze / white screen for some people */ && {
                key: "transparent",
                title: "Enable window transparency",
                note: "Requires a full restart"
            },
            !IS_WEB && isWindows && {
                key: "winCtrlQ",
                title: "Register Ctrl+Q as shortcut to close Discord (Alternative to Alt+F4)",
                note: "Requires a full restart"
            },
            IS_DISCORD_DESKTOP && {
                key: "disableMinSize",
                title: "Disable minimum window size",
                note: "Requires a full restart"
            },
            IS_DISCORD_DESKTOP && isMac && {
                key: "macosTranslucency",
                title: "Enable translucent window",
                note: "Requires a full restart"
            }
        ];

    return (
        <SettingsTab title="Vencord Settings">
            <DonateCard image={donateImage} />
            <Forms.FormSection title="Quick Actions">
                <Card className={cl("quick-actions-card")}>
                    <React.Fragment>
                        {!IS_WEB && (
                            <Button
                                onClick={relaunch}
                                size={Button.Sizes.SMALL}>
                                Restart Client
                            </Button>
                        )}
                        <Button
                            onClick={() => VencordNative.quickCss.openEditor()}
                            size={Button.Sizes.SMALL}
                            disabled={settingsDir === "Loading..."}>
                            Open QuickCSS File
                        </Button>
                        {!IS_WEB && (
                            <Button
                                onClick={() => showItemInFolder(settingsDir)}
                                size={Button.Sizes.SMALL}
                                disabled={settingsDirPending}>
                                Open Settings Folder
                            </Button>
                        )}
                        <Button
                            onClick={() => VencordNative.native.openExternal("https://github.com/Vendicated/Vencord")}
                            size={Button.Sizes.SMALL}
                            disabled={settingsDirPending}>
                            Open in GitHub
                        </Button>
                    </React.Fragment>
                </Card>
            </Forms.FormSection>

            <Forms.FormDivider />

            <Forms.FormSection className={Margins.top16} title="Settings" tag="h5">
                <Forms.FormText className={Margins.bottom20}>
                    Hint: You can change the position of this settings section in the settings of the "Settings" plugin!
                </Forms.FormText>
                {Switches.map(s => s && (
                    <Switch
                        key={s.key}
                        value={settings[s.key]}
                        onChange={v => settings[s.key] = v}
                        note={s.note}
                    >
                        {s.title}
                    </Switch>
                ))}
            </Forms.FormSection>


            {typeof Notification !== "undefined" && <NotificationSection settings={settings.notifications} />}
        </SettingsTab>
    );
}

function NotificationSection({ settings }: { settings: typeof Settings["notifications"]; }) {
    return (
        <>
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

            <Button
                onClick={openNotificationLogModal}
                disabled={settings.logLimit === 0}
            >
                Open Notification Log
            </Button>
        </>
    );
}

interface DonateCardProps {
    image: string;
}

function DonateCard({ image }: DonateCardProps) {
    return (
        <Card className={cl("card", "donate")}>
            <div>
                <Forms.FormTitle tag="h5">Support the Project</Forms.FormTitle>
                <Forms.FormText>Please consider supporting the development of Vencord by donating!</Forms.FormText>
                <DonateButton style={{ transform: "translateX(-1em)" }} />
            </div>
            <img
                role="presentation"
                src={image}
                alt=""
                height={128}
                style={{
                    imageRendering: image === SHIGGY_DONATE_IMAGE ? "pixelated" : void 0,
                    marginLeft: "auto",
                    transform: image === DEFAULT_DONATE_IMAGE ? "rotate(10deg)" : void 0
                }}
            />
        </Card>
    );
}

export default wrapTab(VencordSettings, "Vencord Settings");
