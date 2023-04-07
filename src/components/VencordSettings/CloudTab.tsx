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

import { showNotification } from "@api/Notifications";
import { Settings, useSettings } from "@api/settings";
import { CheckedTextInput } from "@components/CheckedTextInput";
import ErrorBoundary from "@components/ErrorBoundary";
import { Link } from "@components/Link";
import { authorizeCloud, cloudLogger, deauthorizeCloud, getCloudAuth, getCloudUrl } from "@utils/cloud";
import { Margins } from "@utils/margins";
import { deleteCloudSettings, getCloudSettings, putCloudSettings } from "@utils/settingsSync";
import { Alerts, Button, Forms, Switch, Tooltip } from "@webpack/common";

function validateUrl(url: string) {
    try {
        new URL(url);
        return true;
    } catch {
        return "Invalid URL";
    }
}

async function eraseAllData() {
    const res = await fetch(new URL("/v1/", getCloudUrl()), {
        method: "DELETE",
        headers: new Headers({
            Authorization: await getCloudAuth()
        })
    });

    if (!res.ok) {
        cloudLogger.error(`Failed to erase data, API returned ${res.status}`);
        showNotification({
            title: "Cloud Integrations",
            body: `Could not erase all data (API returned ${res.status}), please contact support.`,
            color: "var(--red-360)"
        });
        return;
    }

    Settings.cloud.authenticated = false;
    await deauthorizeCloud();

    showNotification({
        title: "Cloud Integrations",
        body: "Successfully erased all data.",
        color: "var(--green-360)"
    });
}

function SettingsSyncSection() {
    const { cloud } = useSettings(["cloud.authenticated", "cloud.settingsSync"]);
    const sectionEnabled = cloud.authenticated && cloud.settingsSync;

    return (
        <Forms.FormSection title="Settings Sync" className={Margins.top16}>
            <Forms.FormText variant="text-md/normal" className={Margins.bottom20}>
                Synchronize your settings to the cloud. This allows easy synchronization across multiple devices with
                minimal effort.
            </Forms.FormText>
            <Switch
                key="cloud-sync"
                disabled={!cloud.authenticated}
                value={cloud.settingsSync}
                onChange={v => { cloud.settingsSync = v; }}
            >
                Settings Sync
            </Switch>
            <div className="vc-cloud-settings-sync-grid">
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={!sectionEnabled}
                    onClick={() => putCloudSettings()}
                >Sync to Cloud</Button>
                <Tooltip text="This will overwrite your local settings with the ones on the cloud. Use wisely!">
                    {({ onMouseLeave, onMouseEnter }) => (
                        <Button
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.RED}
                            disabled={!sectionEnabled}
                            onClick={() => getCloudSettings(true, true)}
                        >Sync from Cloud</Button>
                    )}
                </Tooltip>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    disabled={!sectionEnabled}
                    onClick={() => deleteCloudSettings()}
                >Delete Cloud Settings</Button>
            </div>
        </Forms.FormSection>
    );
}

function CloudTab() {
    const settings = useSettings(["cloud.authenticated", "cloud.url"]);

    return (
        <>
            <Forms.FormSection title="Cloud Settings" className={Margins.top16}>
                <Forms.FormText variant="text-md/normal" className={Margins.bottom20}>
                    Vencord comes with a cloud integration that adds goodies like settings sync across devices.
                    It <Link href="https://vencord.dev/cloud/privacy">respects your privacy</Link>, and
                    the <Link href="https://github.com/Vencord/Backend">source code</Link> is AGPL 3.0 licensed so you
                    can host it yourself.
                </Forms.FormText>
                <Switch
                    key="backend"
                    value={settings.cloud.authenticated}
                    onChange={v => { v && authorizeCloud(); if (!v) settings.cloud.authenticated = v; }}
                    note="This will request authorization if you have not yet set up cloud integrations."
                >
                    Enable Cloud Integrations
                </Switch>
                <Forms.FormTitle tag="h5">Backend URL</Forms.FormTitle>
                <Forms.FormText className={Margins.bottom8}>
                    Which backend to use when using cloud integrations.
                </Forms.FormText>
                <CheckedTextInput
                    key="backendUrl"
                    value={settings.cloud.url}
                    onChange={v => { settings.cloud.url = v; settings.cloud.authenticated = false; deauthorizeCloud(); }}
                    validate={validateUrl}
                />
                <Button
                    className={Margins.top8}
                    size={Button.Sizes.MEDIUM}
                    color={Button.Colors.RED}
                    disabled={!settings.cloud.authenticated}
                    onClick={() => Alerts.show({
                        title: "Are you sure?",
                        body: "Once your data is erased, we cannot recover it. There's no going back!",
                        onConfirm: eraseAllData,
                        confirmText: "Erase it!",
                        confirmColor: "vc-cloud-erase-data-danger-btn",
                        cancelText: "Nevermind"
                    })}
                >Erase All Data</Button>
                <Forms.FormDivider className={Margins.top16} />
            </Forms.FormSection >
            <SettingsSyncSection />
        </>
    );
}

export default ErrorBoundary.wrap(CloudTab);
