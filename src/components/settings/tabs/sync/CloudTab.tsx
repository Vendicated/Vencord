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
import { Alert } from "@components/Alert";
import { Button } from "@components/Button";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { QuickAction, QuickActionCard } from "@components/settings/QuickAction";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { findComponentByCodeLazy } from "@webpack";
import { Alerts, useState } from "@webpack/common";

const UploadIcon = findComponentByCodeLazy("M12.7 3.3a1 1 0 0 0-1.4 0l-5 5a1 1 0 0 0 1.4 1.4L11 6.42V20");
const DownloadIcon = findComponentByCodeLazy("M12.7 20.7a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4l3.3 3.29V4");
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

function CloudTab() {
    const settings = useSettings(["cloud.authenticated", "cloud.url", "cloud.settingsSync"]);
    const [inputKey, setInputKey] = useState(0);

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

            <Alert.Info className={Margins.bottom16} style={{ width: "100%" }}>
                We use our own <Link href="https://github.com/Equicord/Equicloud">Equicloud backend</Link> with enhanced features.
                View our <Link href="https://equicord.org/cloud/policy">privacy policy</Link> to see what we store and how we use your data.
                Equicloud is BSD 3.0 licensed, so you can self-host if preferred.
            </Alert.Info>

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
            <Paragraph className={Margins.bottom8}>
                Choose which cloud backend to use for storing your settings. You can switch between Equicord's and Vencord's cloud services, or use a self-hosted instance.
            </Paragraph>
            <Paragraph color="text-subtle" className={Margins.bottom16}>
                Current: <Link href={cloud.url}>{cloud.url}</Link>
            </Paragraph>

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

            <Flex gap="8px" className={Margins.top16} flexWrap="wrap">
                <Button
                    size="small"
                    disabled={!isAuthenticated}
                    onClick={async () => {
                        cloud.authenticated = false;
                        await deauthorizeCloud();
                        await authorizeCloud();
                    }}
                >
                    Reauthorize
                </Button>
                <Button
                    size="small"
                    variant="secondary"
                    onClick={() => changeUrl("https://cloud.equicord.org/")}
                >
                    Use Equicord Cloud
                </Button>
                <Button
                    size="small"
                    variant="secondary"
                    onClick={() => changeUrl("https://api.vencord.dev/")}
                >
                    Use Vencord Cloud
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

            {isAuthenticated && (
                <QuickActionCard columns={2}>
                    <QuickAction
                        Icon={UploadIcon}
                        text="Sync to Cloud"
                        action={() => putCloudSettings(true)}
                        disabled={!syncEnabled}
                    />
                    <QuickAction
                        Icon={DownloadIcon}
                        text="Sync from Cloud"
                        action={() => getCloudSettings(true, true)}
                        disabled={!syncEnabled}
                    />
                </QuickActionCard>
            )}

            {!isAuthenticated && (
                <Alert.Warning className={Margins.top8} style={{ width: "100%" }}>
                    Enable cloud integration above to use settings sync features.
                </Alert.Warning>
            )}

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>Danger Zone</Heading>
            <Paragraph className={Margins.bottom16}>
                Permanently delete all your data from the cloud. This action cannot be undone and will remove all synced settings and any other data stored on the cloud backend.
            </Paragraph>

            <Flex gap="8px" flexWrap="wrap">
                <Button
                    variant="dangerPrimary"
                    disabled={!syncEnabled}
                    onClick={() => deleteCloudSettings()}
                    style={{ display: "flex", alignItems: "center" }}
                >
                    <TrashIcon color="currentColor" style={{ marginRight: "8px" }} />
                    Delete Cloud Settings
                </Button>
                <Button
                    variant="dangerPrimary"
                    disabled={!isAuthenticated}
                    onClick={() => Alerts.show({
                        title: "Erase All Cloud Data",
                        body: "Are you sure you want to permanently delete all your cloud data? This action cannot be undone.",
                        onConfirm: eraseAllCloudData,
                        confirmText: "Erase All Data",
                        confirmColor: "vc-cloud-erase-data-danger-btn",
                        cancelText: "Cancel"
                    })}
                    style={{ display: "flex", alignItems: "center" }}
                >
                    <SkullIcon color="currentColor" style={{ marginRight: "8px" }} />
                    Erase All Cloud Data
                </Button>
            </Flex>
        </SettingsTab>
    );
}

export default wrapTab(CloudTab, "Cloud");
