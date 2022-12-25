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


import { useSettings } from "@api/settings";
import DonateButton from "@components/DonateButton";
import ErrorBoundary from "@components/ErrorBoundary";
import IpcEvents from "@utils/IpcEvents";
import { useAwaiter } from "@utils/misc";
import { Button, Card, Forms, Margins, React, Switch } from "@webpack/common";

const st = (style: string) => `vcSettings${style}`;

const DEFAULT_DONATE_IMAGE = "https://cdn.discordapp.com/emojis/1026533090627174460.png";
const SHIGGY_DONATE_IMAGE = "https://media.discordapp.net/stickers/1039992459209490513.png";

function VencordSettings() {
    const [settingsDir, , settingsDirPending] = useAwaiter(() => VencordNative.ipc.invoke<string>(IpcEvents.GET_SETTINGS_DIR), {
        fallbackValue: "Loading..."
    });
    const settings = useSettings();

    const donateImage = React.useMemo(() => Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE, []);

    return (
        <React.Fragment>
            <DonateCard image={donateImage} />
            <Forms.FormSection title="Quick Actions">
                <Card className={st("QuickActionCard")}>
                    {IS_WEB ? (
                        <Button
                            onClick={() => require("../Monaco").launchMonacoEditor()}
                            size={Button.Sizes.SMALL}
                            disabled={settingsDir === "Loading..."}>
                            Open QuickCSS File
                        </Button>
                    ) : (
                        <React.Fragment>
                            <Button
                                onClick={() => window.DiscordNative.app.relaunch()}
                                size={Button.Sizes.SMALL}>
                                Restart Client
                            </Button>
                            <Button
                                onClick={() => VencordNative.ipc.invoke(IpcEvents.OPEN_MONACO_EDITOR)}
                                size={Button.Sizes.SMALL}
                                disabled={settingsDir === "Loading..."}>
                                Open QuickCSS File
                            </Button>
                            <Button
                                onClick={() => window.DiscordNative.fileManager.showItemInFolder(settingsDir)}
                                size={Button.Sizes.SMALL}
                                disabled={settingsDirPending}>
                                Open Settings Folder
                            </Button>
                            <Button
                                onClick={() => VencordNative.ipc.invoke(IpcEvents.OPEN_EXTERNAL, "https://github.com/Vendicated/Vencord")}
                                size={Button.Sizes.SMALL}
                                disabled={settingsDirPending}>
                                Open in GitHub
                            </Button>
                        </React.Fragment>
                    )}
                </Card>
            </Forms.FormSection>

            <Forms.FormDivider />

            <Forms.FormSection title="Settings">
                <Forms.FormText className={Margins.marginBottom20}>
                    Hint: You can change the position of this settings section in the settings of the "Settings" plugin!
                </Forms.FormText>
                <Switch
                    value={settings.useQuickCss}
                    onChange={(v: boolean) => settings.useQuickCss = v}
                    note="Loads styles from your QuickCSS file">
                    Use QuickCSS
                </Switch>
                {!IS_WEB && (
                    <React.Fragment>
                        <Switch
                            value={settings.enableReactDevtools}
                            onChange={(v: boolean) => settings.enableReactDevtools = v}
                            note="Requires a full restart">
                            Enable React Developer Tools
                        </Switch>
                        <Switch
                            value={settings.notifyAboutUpdates}
                            onChange={(v: boolean) => settings.notifyAboutUpdates = v}
                            note="Shows a toast on startup">
                            Get notified about new updates
                        </Switch>
                    </React.Fragment>
                )}

            </Forms.FormSection>
        </React.Fragment>
    );
}


interface DonateCardProps {
    image: string;
}

function DonateCard({ image }: DonateCardProps) {
    return (
        <Card className={st("Donate")}>
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
                style={{ marginLeft: "auto", transform: image === DEFAULT_DONATE_IMAGE ? "rotate(10deg)" : "" }}
            />
        </Card>
    );
}

export default ErrorBoundary.wrap(VencordSettings);
