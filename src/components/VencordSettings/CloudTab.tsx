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
import { Settings, useSettings } from "@api/Settings";
import { CheckedTextInput } from "@components/CheckedTextInput";
import { Link } from "@components/Link";
import { authorizeCloud, cloudLogger, deauthorizeCloud, getCloudAuth, getCloudUrl } from "@utils/cloud";
import { Margins } from "@utils/margins";
import { deleteCloudSettings, getCloudSettings, putCloudSettings } from "@utils/settingsSync";
import { $t, Translate } from "@utils/translation";
import { Alerts, Button, Forms, Switch, Tooltip } from "@webpack/common";

import { SettingsTab, wrapTab } from "./shared";

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
        headers: { Authorization: await getCloudAuth() }
    });

    if (!res.ok) {
        cloudLogger.error(`Failed to erase data, API returned ${res.status}`);
        showNotification({
            title: $t("vencord.cloudIntegrations"),
            body: $t("vencord.cloud.integrations.eraseError", { status: res.status }),
            color: "var(--red-360)"
        });
        return;
    }

    Settings.cloud.authenticated = false;
    await deauthorizeCloud();

    showNotification({
        title: $t("vencord.cloudIntegrations"),
        body: $t("vencord.cloud.integrations.eraseSuccess"),
        color: "var(--green-360)"
    });
}

function SettingsSyncSection() {
    const { cloud } = useSettings(["cloud.authenticated", "cloud.settingsSync"]);
    const sectionEnabled = cloud.authenticated && cloud.settingsSync;

    return (
        <Forms.FormSection title="Settings Sync" className={Margins.top16}>
            <Forms.FormText variant="text-md/normal" className={Margins.bottom20}>
                {$t("vencord.cloud.settings.description")}
            </Forms.FormText>
            <Switch
                key="cloud-sync"
                disabled={!cloud.authenticated}
                value={cloud.settingsSync}
                onChange={v => { cloud.settingsSync = v; }}
            >
                {$t("vencord.settingsSync")}
            </Switch>
            <div className="vc-cloud-settings-sync-grid">
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={!sectionEnabled}
                    onClick={() => putCloudSettings(true)}
                >{$t("vencord.cloud.settings.syncToCloud")}</Button>
                <Tooltip text={$t("vencord.cloud.settings.overwriteWarning")}>
                    {({ onMouseLeave, onMouseEnter }) => (
                        <Button
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.RED}
                            disabled={!sectionEnabled}
                            onClick={() => getCloudSettings(true, true)}
                        >{$t("vencord.cloud.settings.syncFromCloud")}</Button>
                    )}
                </Tooltip>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    disabled={!sectionEnabled}
                    onClick={() => deleteCloudSettings()}
                >{$t("vencord.cloud.settings.deleteCloudSettings")}</Button>
            </div>
        </Forms.FormSection>
    );
}

function CloudTab() {
    const settings = useSettings(["cloud.authenticated", "cloud.url"]);

    return (
        <SettingsTab title="Vencord Cloud">
            <Forms.FormSection title="Cloud Settings" className={Margins.top16}>
                <Forms.FormText variant="text-md/normal" className={Margins.bottom20}>
                    <Translate i18nKey="vencord.cloud.integrations.description">
                        <Link href="https://vencord.dev/cloud/privacy" />
                        <Link href="https://github.com/Vencord/Backend" />
                    </Translate>
                </Forms.FormText>
                <Switch
                    key="backend"
                    value={settings.cloud.authenticated}
                    onChange={v => { v && authorizeCloud(); if (!v) settings.cloud.authenticated = v; }}
                    note={$t("vencord.cloud.integrations.authorizationNote")}
                >
                    {$t("vencord.cloud.integrations.enable")}
                </Switch>
                <Forms.FormTitle tag="h5">{$t("vencord.cloud.integrations.backendUrl")}</Forms.FormTitle>
                <Forms.FormText className={Margins.bottom8}>
                    {$t("vencord.cloud.integrations.backendNote")}
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
                        title: $t("vencord.areYouSure"),
                        body: $t("vencord.cloud.integrations.eraseWarning"),
                        onConfirm: eraseAllData,
                        confirmText: $t("vencord.cloud.integrations.eraseIt"),
                        confirmColor: "vc-cloud-erase-data-danger-btn",
                        cancelText: $t("vencord.nevermind")
                    })}
                >{$t("vencord.cloud.integrations.eraseAllData")}</Button>
                <Forms.FormDivider className={Margins.top16} />
            </Forms.FormSection >
            <SettingsSyncSection />
        </SettingsTab>
    );
}

export default wrapTab(CloudTab, "Cloud");
