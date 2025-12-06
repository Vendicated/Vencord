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

import { useSettings } from "@api/Settings";
import { authorizeCloud, deauthorizeCloud } from "@api/SettingsSync/cloudSetup";
import { deleteCloudSettings, eraseAllCloudData, getCloudSettings, putCloudSettings } from "@api/SettingsSync/cloudSync";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { Grid } from "@components/Grid";
import { Heading } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { Alerts, Tooltip, useState } from "@webpack/common";

function validateUrl(url: string) {
    try {
        new URL(url);
        return true;
    } catch {
        return "Invalid URL";
    }
}

function SettingsSyncSection() {
    const { cloud } = useSettings(["cloud.authenticated", "cloud.settingsSync"]);
    const sectionEnabled = cloud.authenticated && cloud.settingsSync;

    return (
        <section className={Margins.top16}>
            <Heading>Settings Sync</Heading>

            <Paragraph size="md" className={Margins.bottom20}>
                Synchronize your settings to the cloud. This allows easy synchronization across multiple devices with
                minimal effort.
            </Paragraph>
            <FormSwitch
                key="cloud-sync"
                title="Settings Sync"
                value={cloud.settingsSync}
                onChange={v => { cloud.settingsSync = v; }}
                disabled={!cloud.authenticated}
            />
            <div className="vc-cloud-settings-sync-grid">
                <Button
                    size="small"
                    disabled={!sectionEnabled}
                    onClick={() => putCloudSettings(true)}
                >
                    Sync to Cloud
                </Button>
                <Tooltip text="This will overwrite your local settings with the ones on the cloud. Use wisely!">
                    {({ onMouseLeave, onMouseEnter }) => (
                        <Button
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                            size="small"
                            variant="dangerPrimary"
                            disabled={!sectionEnabled}
                            onClick={() => getCloudSettings(true, true)}
                        >
                            Sync from Cloud
                        </Button>
                    )}
                </Tooltip>
                <Button
                    size="small"
                    variant="dangerPrimary"
                    disabled={!sectionEnabled}
                    onClick={() => deleteCloudSettings()}
                >
                    Delete Cloud Settings
                </Button>
            </div>
        </section>
    );
}

function CloudTab() {
    const settings = useSettings(["cloud.authenticated", "cloud.url"]);
    const [inputKey, setInputKey] = useState(0);

    async function changeUrl(url: string) {
        settings.cloud.url = url;
        settings.cloud.authenticated = false;

        await deauthorizeCloud();
        await authorizeCloud();

        setInputKey(prev => prev + 1);
    }

    return (
        <SettingsTab>
            <section className={Margins.top16}>
                <Card defaultPadding={true} className={Margins.bottom16}>
                    <Paragraph size="md">
                        Equicord comes with a cloud integration allowing settings to be synced across apps and devices.
                        <br />
                        We use our own <Link href="https://github.com/Equicord/Equicloud">Equicloud backend</Link> to provide our cloud instance with enhanced features.
                        <br />
                        Our <Link href="https://equicord.org/cloud/policy">privacy policy</Link> allows you to see what information we store, how we use it, and data retention.
                        <br />
                        Equicloud is BSD 3.0 licensed so you can host it yourself if you would like.
                        <br />
                        You can swap between Equicord and Vencord's different cloud instances below if needed.
                    </Paragraph>
                </Card>
                <FormSwitch
                    key="backend"
                    title="Enable Cloud Integrations"
                    description="This will request authorization if you have not yet set up cloud integrations."
                    value={settings.cloud.authenticated}
                    onChange={v => {
                        if (v)
                            authorizeCloud();
                        else
                            settings.cloud.authenticated = v;
                    }}
                />
                <Heading className={Margins.top16}>Backend URL</Heading>
                <Paragraph className={Margins.bottom8}>
                    Which backend to use when using cloud integrations.
                </Paragraph>
                <CheckedTextInput
                    key={`backendUrl-${inputKey}`}
                    value={settings.cloud.url}
                    onChange={async v => {
                        settings.cloud.url = v;
                        settings.cloud.authenticated = false;
                        await deauthorizeCloud();
                    }}
                    validate={validateUrl}
                />

                <Grid columns={2} gap="1em" className={Margins.top8}>
                    <Button
                        size="medium"
                        disabled={!settings.cloud.authenticated}
                        onClick={async () => {
                            settings.cloud.authenticated = false;
                            await deauthorizeCloud();
                            await authorizeCloud();
                        }}
                    >
                        Reauthorize
                    </Button>
                    <Button
                        size="medium"
                        variant="dangerPrimary"
                        disabled={!settings.cloud.authenticated}
                        onClick={() => Alerts.show({
                            title: "Are you sure?",
                            body: "Once your data is erased, we cannot recover it. There's no going back!",
                            onConfirm: eraseAllCloudData,
                            confirmText: "Erase it!",
                            confirmColor: "vc-cloud-erase-data-danger-btn",
                            cancelText: "Nevermind"
                        })}
                    >
                        Erase All Data
                    </Button>
                    <Button size="medium" onClick={() => changeUrl("https://cloud.equicord.org/")}>
                        Use Equicord's Cloud
                    </Button>
                    <Button size="medium" onClick={() => changeUrl("https://api.vencord.dev/")}>
                        Use Vencord's Cloud
                    </Button>
                </Grid>

                <Divider className={Margins.top16} />
            </section >
            <SettingsSyncSection />
        </SettingsTab>
    );
}

export default wrapTab(CloudTab, "Cloud");
