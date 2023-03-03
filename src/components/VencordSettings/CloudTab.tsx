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

import { useSettings } from "@api/settings";
import { CheckedTextInput } from "@components/CheckedTextInput";
import ErrorBoundary from "@components/ErrorBoundary";
import { authorizeCloud, deauthorizeCloud } from "@utils/cloud";
import { Margins } from "@utils/margins";
import { deleteCloudSettings as deleteCloudSettings, getCloudSettings, putCloudSettings } from "@utils/settingsSync";
import { Button, Card, Forms, React, Switch, Tooltip, useMemo } from "@webpack/common";

function validateUrl(url: string) {
    try {
        new URL(url);
        return true;
    } catch {
        return "Invalid URL";
    }
}

function SettingsSyncSection() {
    const settings = useSettings();
    const sectionEnabled = useMemo(
        () => settings.backend.enabled && settings.backend.settingsSync,
        [settings.backend.enabled, settings.backend.settingsSync]
    );

    return (
        <Forms.FormSection title="Settings Sync" className={Margins.top16}>
            <Forms.FormText variant="text-md/normal" className={Margins.bottom20}>
                Synchronize your settings to the cloud. This allows easy synchronization across multiple devices with
                minimal effort.
            </Forms.FormText>
            <Switch
                key="cloud-sync"
                disabled={!settings.backend.enabled}
                value={settings.backend.settingsSync}
                onChange={v => { settings.backend.settingsSync = v; }}
            >
                Settings Sync
            </Switch>
            <Card className="vc-settings-quick-actions-card">
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
            </Card>
        </Forms.FormSection>
    );
}

function CloudTab() {
    const settings = useSettings();


    return (
        <>
            <Forms.FormSection title="Cloud Settings" className={Margins.top16}>
                <Switch
                    key="backend"
                    value={settings.backend.enabled}
                    onChange={v => { v && authorizeCloud(); if (!v) settings.backend.enabled = v; }}
                    note="This will request authorization if you have not yet set up cloud integration."
                >
                    Enable Cloud Integrations
                </Switch>
                <Forms.FormTitle tag="h5">Backend URL</Forms.FormTitle>
                <Forms.FormText className={Margins.bottom8}>
                    Which backend to use when using cloud integration. Changing this value removes local authorization.
                </Forms.FormText>
                <CheckedTextInput
                    key="backendUrl"
                    value={settings.backend.url}
                    onChange={v => { settings.backend.url = v; settings.backend.enabled = false; deauthorizeCloud(); }}
                    validate={validateUrl}
                />
                <Forms.FormDivider className={Margins.top16} />
            </Forms.FormSection>
            <SettingsSyncSection />
        </>
    );
}

export default ErrorBoundary.wrap(CloudTab);
