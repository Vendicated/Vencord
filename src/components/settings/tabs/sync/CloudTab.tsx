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
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { Grid } from "@components/Grid";
import { Heading } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { localStorage } from "@utils/localStorage";
import { Margins } from "@utils/margins";
import { Alerts, Select, Tooltip } from "@webpack/common";

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
            <Heading tag="h5">Settings Sync</Heading>

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
                hideBorder={true}
            />
            <div className="vc-cloud-settings-sync-grid">
                <Button
                    size={"small"}
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
                            size={"small"}
                            color={"red"}
                            disabled={!sectionEnabled}
                            onClick={() => getCloudSettings(true, true)}
                        >
                            Sync from Cloud
                        </Button>
                    )}
                </Tooltip>
                <Button
                    size={"small"}
                    color={"red"}
                    disabled={!sectionEnabled}
                    onClick={() => deleteCloudSettings()}
                >
                    Delete Cloud Settings
                </Button>
            </div>
            <Heading tag="h5" className={Margins.top16}>Automatic Sync Direction</Heading>
            <Paragraph className={Margins.bottom8}>
                Choose how settings are synchronized between you and the cloud.
            </Paragraph>
            <Select
                options={[
                    {
                        label: "Sync bidirectionally",
                        value: "both",
                        default: true,
                    },
                    {
                        label: "Push settings to cloud",
                        value: "push",
                    },
                    {
                        label: "Pull settings from cloud",
                        value: "pull",
                    },
                    {
                        label: "Disable automatic sync",
                        value: "manual",
                    }
                ]}
                isSelected={v => v === localStorage.Vencord_cloudSyncDirection}
                serialize={v => String(v)}
                select={v => { localStorage.Vencord_cloudSyncDirection = v; }}
                closeOnSelect={true}
            />
        </section>
    );
}

function CloudTab() {
    const settings = useSettings(["cloud.authenticated", "cloud.url"]);

    return (
        <SettingsTab>
            <section className={Margins.top16}>
                <Paragraph size="md" className={Margins.bottom20}>
                    Vencord comes with a cloud integration that adds goodies like settings sync across devices.
                    It <Link href="https://vencord.dev/cloud/privacy">respects your privacy</Link>, and
                    the <Link href="https://github.com/Vencord/Backend">source code</Link> is AGPL 3.0 licensed so you
                    can host it yourself.
                </Paragraph>
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
                <Heading tag="h5" className={Margins.top16}>Backend URL</Heading>
                <Paragraph className={Margins.bottom8}>
                    Which backend to use when using cloud integrations.
                </Paragraph>
                <CheckedTextInput
                    key="backendUrl"
                    value={settings.cloud.url}
                    onChange={async v => {
                        settings.cloud.url = v;
                        settings.cloud.authenticated = false;
                        deauthorizeCloud();
                    }}
                    validate={validateUrl}
                />

                <Grid columns={2} gap="1em" className={Margins.top8}>
                    <Button
                        size={"medium"}
                        disabled={!settings.cloud.authenticated}
                        onClick={async () => {
                            await deauthorizeCloud();
                            settings.cloud.authenticated = false;
                            await authorizeCloud();
                        }}
                    >
                        Reauthorise
                    </Button>
                    <Button
                        size={"medium"}
                        color={"red"}
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
                </Grid>

                <Divider className={Margins.top16} />
            </section >
            <SettingsSyncSection />
        </SettingsTab>
    );
}

export default wrapTab(CloudTab, "Cloud");
