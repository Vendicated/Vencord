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
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { CloudDownloadIcon, CloudUploadIcon } from "@components/Icons";
import { Link } from "@components/Link";
import { Notice } from "@components/Notice";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { localStorage } from "@utils/localStorage";
import { Margins } from "@utils/margins";
import { useForceUpdater } from "@utils/react";
import { findComponentByCodeLazy } from "@webpack";
import { Alerts, SearchableSelect, Select, useState } from "@webpack/common";

const ICON_STYLE: React.CSSProperties = { width: 20, height: 20, borderRadius: 4, verticalAlign: "middle" };

function EquicordIcon() {
    return <img src="https://equicord.org/assets/favicon.png" alt="Equicord" style={ICON_STYLE} />;
}

function VencordIcon() {
    return <img src="https://equicord.org/assets/icons/vencord/icon-light.png" alt="Vencord" style={ICON_STYLE} />;
}

const RefreshIcon = findComponentByCodeLazy("M4 12a8 8 0 0 1 14.93-4H15");
const TrashIcon = findComponentByCodeLazy("2.81h8.36a3");
const SkullIcon = findComponentByCodeLazy("m13.47 1 .07.04c.45.06");

function validateUrl(url: string) {
    try {
        new URL(url);
        return true;
    } catch {
        return "Invalid URL";
    }
}

const cloudBackendOptions = [
    { label: "Equicord Cloud", value: "https://cloud.equicord.org/" },
    { label: "Vencord Cloud", value: "https://api.vencord.dev/" }
];

const syncDirectionOptions = [
    { label: "Two-way sync (changes go both directions)", value: "both" },
    { label: "This device is the source (upload only)", value: "push" },
    { label: "The cloud is the source (download only)", value: "pull" },
    { label: "Do not sync automatically (manual sync via buttons below only)", value: "manual" }
];

function CloudTab() {
    const settings = useSettings(["cloud.authenticated", "cloud.url", "cloud.settingsSync"]);
    const [inputKey, setInputKey] = useState(0);
    const forceUpdate = useForceUpdater();

    const { cloud } = settings;
    const isAuthenticated = cloud.authenticated;
    const syncEnabled = isAuthenticated && cloud.settingsSync;

    async function changeUrl(url: string) {
        cloud.url = url;
        cloud.authenticated = false;

        await deauthorizeCloud();
        await authorizeCloud();

        setInputKey(prev => prev + 1);
    }

    return (
        <SettingsTab>
            <Heading className={Margins.top16}>Cloud Integration</Heading>
            <Paragraph className={Margins.bottom16}>
                Equicord's cloud integration allows you to sync your settings across multiple devices and Discord installations. Your data is securely stored and can be easily restored at any time.
            </Paragraph>

            <Notice.Info className={Margins.bottom16}>
                We use our own <Link href="https://github.com/Equicord/Equicloud">Equicloud backend</Link> with enhanced features.
                View our <Link href="https://equicord.org/cloud/policy">privacy policy</Link> to see what we store and how we use your data.
                Equicloud is BSD 3.0 licensed, so you can self-host if preferred.
            </Notice.Info>

            <FormSwitch
                title="Enable Cloud Integration"
                description="Connect to the cloud backend for settings synchronization. This will request authorization if you haven't set up cloud integration yet."
                value={isAuthenticated}
                onChange={v => {
                    if (v)
                        authorizeCloud();
                    else
                        cloud.authenticated = v;
                }}
                hideBorder
            />

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>Cloud Backend</Heading>
            <Paragraph className={Margins.bottom16}>
                Choose which cloud backend to use for storing your settings. You can switch between Equicord's and Vencord's cloud services, or use a self-hosted instance.
            </Paragraph>

            <SearchableSelect
                options={cloudBackendOptions}
                value={cloudBackendOptions.find(o => o.value === cloud.url)}
                onChange={v => changeUrl(v)}
                className={Margins.bottom16}
                closeOnSelect={true}
                renderOptionPrefix={o => o?.value?.includes("equicord") ? <EquicordIcon /> : <VencordIcon />}
            />

            <Flex gap="8px" alignItems="center">
                <div style={{ flex: 1 }}>
                    <CheckedTextInput
                        key={`backendUrl-${inputKey}`}
                        value={cloud.url}
                        onChange={async v => {
                            cloud.url = v;
                            cloud.authenticated = false;
                            await deauthorizeCloud();
                        }}
                        validate={validateUrl}
                    />
                </div>
                <Button
                    disabled={!isAuthenticated}
                    onClick={async () => {
                        cloud.authenticated = false;
                        await deauthorizeCloud();
                        await authorizeCloud();
                    }}
                >
                    <Flex gap="8px" alignItems="center">
                        <RefreshIcon color="currentColor" />
                        Reauthorize
                    </Flex>
                </Button>
            </Flex>

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>Settings Sync</Heading>
            <Paragraph className={Margins.bottom16}>
                Synchronize your Equicord settings to the cloud. This makes it easy to keep your configuration consistent across multiple devices without manual import/export.
            </Paragraph>

            <FormSwitch
                title="Enable Settings Sync"
                description="When enabled, your settings can be synced to and from the cloud. Use the actions below to manually sync."
                value={cloud.settingsSync}
                onChange={v => { cloud.settingsSync = v; }}
                disabled={!isAuthenticated}
                hideBorder
            />

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>Sync Rules for This Device</Heading>
            <Paragraph className={Margins.bottom16}>
                This setting controls how settings move between <strong>this device</strong> and the cloud. You can let changes flow both ways, or choose one place to be the main source of truth.
            </Paragraph>

            <Select
                options={syncDirectionOptions}
                isSelected={v => v === (localStorage.Vencord_cloudSyncDirection ?? "both")}
                select={v => {
                    localStorage.Vencord_cloudSyncDirection = v;
                    forceUpdate();
                }}
                serialize={v => v}
                isDisabled={!syncEnabled}
            />

            <Flex gap="8px" className={Margins.top16}>
                <Button
                    style={{ flex: 1 }}
                    disabled={!syncEnabled}
                    onClick={() => putCloudSettings(true)}
                >
                    <Flex gap="8px" alignItems="center">
                        <CloudUploadIcon />
                        Sync to Cloud
                    </Flex>
                </Button>
                <Button
                    style={{ flex: 1 }}
                    disabled={!syncEnabled}
                    onClick={() => getCloudSettings(true, true)}
                >
                    <Flex gap="8px" alignItems="center">
                        <CloudDownloadIcon />
                        Sync from Cloud
                    </Flex>
                </Button>
            </Flex>

            {!isAuthenticated && (
                <Notice.Warning className={Margins.top8}>
                    Enable cloud integration above to use settings sync features.
                </Notice.Warning>
            )}

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>Danger Zone</Heading>
            <Paragraph className={Margins.bottom16}>
                Permanently delete all your data from the cloud. This action cannot be undone and will remove all synced settings and any other data stored on the cloud backend.
            </Paragraph>

            <Flex gap="8px">
                <Button
                    variant="dangerPrimary"
                    size="medium"
                    disabled={!syncEnabled}
                    onClick={() => deleteCloudSettings()}
                >
                    <Flex gap="8px" alignItems="center">
                        <TrashIcon color="currentColor" />
                        Delete Cloud Settings
                    </Flex>
                </Button>
                <Button
                    variant="dangerSecondary"
                    size="medium"
                    disabled={!isAuthenticated}
                    onClick={() => Alerts.show({
                        title: "Delete Cloud Account",
                        body: "Are you sure you want to permanently delete your cloud account and all associated data? This action cannot be undone.",
                        onConfirm: eraseAllCloudData,
                        confirmText: "Delete Account",
                        confirmColor: "vc-cloud-erase-data-danger-btn",
                        cancelText: "Cancel"
                    })}
                >
                    <Flex gap="8px" alignItems="center">
                        <SkullIcon color="currentColor" />
                        Delete Cloud Account
                    </Flex>
                </Button>
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(CloudTab, "Cloud");
