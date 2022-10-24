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

import { useSettings } from "../api/settings";
import { ChangeList } from "../utils/ChangeList";
import IpcEvents from "../utils/IpcEvents";
import { useAwaiter } from "../utils/misc";
import { Alerts, Button, Forms, Margins, Parser, React, Switch } from "../webpack/common";
import ErrorBoundary from "./ErrorBoundary";
import { Flex } from "./Flex";
import { launchMonacoEditor } from "./Monaco";

export default ErrorBoundary.wrap(function Settings() {
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
        <Forms.FormSection tag="h1" title="Vencord">
            <Forms.FormTitle tag="h5">
                Settings
            </Forms.FormTitle>

            <Forms.FormText>
                Settings Directory: <code style={{ userSelect: "text", cursor: "text" }}>{settingsDir}</code>
            </Forms.FormText>

            {!IS_WEB && <Flex className={Margins.marginBottom20} style={{ marginTop: 8 }}>
                <Button
                    onClick={() => window.DiscordNative.app.relaunch()}
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.GREEN}
                >
                    Reload
                </Button>
                <Button
                    onClick={() => window.DiscordNative.fileManager.showItemInFolder(settingsDir)}
                    size={Button.Sizes.SMALL}
                    disabled={settingsDirPending}
                >
                    Launch Directory
                </Button>
                <Button
                    onClick={() => VencordNative.ipc.invoke(IpcEvents.OPEN_MONACO_EDITOR)}
                    size={Button.Sizes.SMALL}
                    disabled={settingsDir === "Loading..."}
                >
                    Open QuickCSS File
                </Button>
            </Flex>}

            {IS_WEB && <Button
                onClick={launchMonacoEditor}
                size={Button.Sizes.SMALL}
                disabled={settingsDir === "Loading..."}
            >
                Open QuickCSS File
            </Button>}

            <Forms.FormDivider />
            <Switch
                value={settings.useQuickCss}
                onChange={(v: boolean) => settings.useQuickCss = v}
                note="Loads styles from your QuickCss file"
            >
                Use QuickCss
            </Switch>
            {!IS_WEB && <Switch
                value={settings.enableReactDevtools}
                onChange={(v: boolean) => settings.enableReactDevtools = v}
                note="Requires a full restart"
            >
                Enable React Developer Tools
            </Switch>}
            {!IS_WEB && <Switch
                value={settings.notifyAboutUpdates}
                onChange={(v: boolean) => settings.notifyAboutUpdates = v}
                note="Shows a Toast on StartUp"
            >
                Get notified about new Updates
            </Switch>}
        </Forms.FormSection >
    );
});
