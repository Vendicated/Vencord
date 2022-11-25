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


import { useSettings } from "../../api/settings";
import { ChangeList } from "../../utils/ChangeList";
import IpcEvents from "../../utils/IpcEvents";
import { useAwaiter } from "../../utils/misc";
import { Alerts, Button, Card, Forms, Parser, React, Switch } from "../../webpack/common";
import DonateButton from "../DonateButton";
import ErrorBoundary from "../ErrorBoundary";

const st = (style: string) => `vcSettings${style}`;

function VencordSettings() {
    const [settingsDir, , settingsDirPending] = useAwaiter(() => VencordNative.ipc.invoke<string>(IpcEvents.GET_SETTINGS_DIR), "Loading...");
    const settings = useSettings();
    const changes = React.useMemo(() => new ChangeList<string>(), []);

    React.useEffect(() => {
        return () => void (changes.hasChanges && Alerts.show({
            title: "Restart required",
            body: (
                <>
                    <p>The following plugins require a restart:</p>
                    <div>{changes.map((s, i) => (
                        <>
                            {i > 0 && ", "}
                            {Parser.parse("`" + s + "`")}
                        </>
                    ))}</div>
                </>
            ),
            confirmText: "Restart now",
            cancelText: "Later!",
            onConfirm: () => location.reload()
        }));
    }, []);

    return (
        <React.Fragment>
            <DonateCard />
            <Forms.FormSection title="Quick Actions">
                <Card className={st("QuickActionCard")}>
                    {IS_WEB ? (
                        <Button
                            onClick={() => require("./Monaco").launchMonacoEditor()}
                            size={Button.Sizes.SMALL}
                            disabled={settingsDir === "Loading..."}
                        >
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
                <Switch
                    value={settings.useQuickCss}
                    onChange={(v: boolean) => settings.useQuickCss = v}
                    note="Loads styles from your QuickCss file"
                >
                    Use QuickCss
                </Switch>
                {!IS_WEB && (
                    <React.Fragment>
                        <Switch
                            value={settings.enableReactDevtools}
                            onChange={(v: boolean) => settings.enableReactDevtools = v}
                            note="Requires a full restart"
                        >Enable React Developer Tools
                        </Switch>
                        <Switch
                            value={settings.notifyAboutUpdates}
                            onChange={(v: boolean) => settings.notifyAboutUpdates = v}
                            note="Shows a Toast on StartUp"
                        >Get notified about new Updates
                        </Switch>
                    </React.Fragment>
                )}

            </Forms.FormSection>
        </React.Fragment>
    );
}



function DonateCard() {
    return (
        <Card style={{
            padding: "1em",
            display: "flex",
            flexDirection: "row",
            marginBottom: "1em",
            marginTop: "1em"
        }}>
            <div>
                <Forms.FormTitle tag="h5">Support the Project</Forms.FormTitle>
                <Forms.FormText>
                    Please consider supporting the Development of Vencord by donating!
                </Forms.FormText>
                <DonateButton style={{ transform: "translateX(-1em)" }} />
            </div>
            <img
                role="presentation"
                src="https://cdn.discordapp.com/emojis/1026533090627174460.png"
                alt=""
                style={{ marginLeft: "auto", transform: "rotate(10deg)" }}
            />
        </Card>
    );
}

export default ErrorBoundary.wrap(VencordSettings);
