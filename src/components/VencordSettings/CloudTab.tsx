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
import { Grid } from "@components/Grid";
import { Link } from "@components/Link";
import { getLanguage } from "@languages/Language";
import { formatText, formatWithReactComponent } from "@languages/LanguageUtils";
import { authorizeCloud, cloudLogger, deauthorizeCloud, getCloudAuth, getCloudUrl } from "@utils/cloud";
import { Margins } from "@utils/margins";
import { deleteCloudSettings, getCloudSettings, putCloudSettings } from "@utils/settingsSync";
import { Alerts, Button, Forms, Switch, Tooltip } from "@webpack/common";

import { SettingsTab, wrapTab } from "./shared";

const langData = getLanguage("components");

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
    const l = langData.VencordSettings.CloudTab.eraseAllData;

    if (!res.ok) {
        cloudLogger.error(`Failed to erase data, API returned ${res.status}`);
        showNotification({
            title: l.cloudIntegrations,
            body: formatText(l.eraseFailed, { status: res.status }),
            color: "var(--red-360)"
        });
        return;
    }

    Settings.cloud.authenticated = false;
    await deauthorizeCloud();

    showNotification({
        title: l.cloudIntegrations,
        body: l.eraseSuccess,
        color: "var(--green-360)"
    });
}

function SettingsSyncSection() {
    const { cloud } = useSettings(["cloud.authenticated", "cloud.settingsSync"]);
    const sectionEnabled = cloud.authenticated && cloud.settingsSync;
    const l = langData.VencordSettings.CloudTab.SettingsSyncSection;

    return (
        <Forms.FormSection title={l.settingsSync} className={Margins.top16}>
            <Forms.FormText variant="text-md/normal" className={Margins.bottom20}>
                {l.syncInfo}
            </Forms.FormText>
            <Switch
                key="cloud-sync"
                disabled={!cloud.authenticated}
                value={cloud.settingsSync}
                onChange={v => { cloud.settingsSync = v; }}
            >
                {l.settingsSync}
            </Switch>
            <div className="vc-cloud-settings-sync-grid">
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={!sectionEnabled}
                    onClick={() => putCloudSettings(true)}
                >
                    {l.syncToCloud}
                </Button>
                <Tooltip text={l.overwriteSettings}>
                    {({ onMouseLeave, onMouseEnter }) => (
                        <Button
                            onMouseLeave={onMouseLeave}
                            onMouseEnter={onMouseEnter}
                            size={Button.Sizes.SMALL}
                            color={Button.Colors.RED}
                            disabled={!sectionEnabled}
                            onClick={() => getCloudSettings(true, true)}
                        >
                            {l.syncToCloud}
                        </Button>
                    )}
                </Tooltip>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    disabled={!sectionEnabled}
                    onClick={() => deleteCloudSettings()}
                >
                    {l.deleteSettings}
                </Button>
            </div>
        </Forms.FormSection>
    );
}

function CloudTab() {
    const settings = useSettings(["cloud.authenticated", "cloud.url"]);
    const l = langData.VencordSettings.CloudTab.CloudTab;

    return (
        <SettingsTab title={l.title}>
            <Forms.FormSection title={l.formTitle} className={Margins.top16}>
                <Forms.FormText variant="text-md/normal" className={Margins.bottom20}>
                    {formatWithReactComponent(l.integrationInfo,
                        {
                            privacyRespect: <Link href="https://vencord.dev/cloud/privacy">{l.respectsPrivacy}</Link>,
                            sourceCode: <Link href="https://github.com/Vencord/Backend">{l.sourceCode}</Link>
                        })}
                </Forms.FormText>
                <Switch
                    key="backend"
                    value={settings.cloud.authenticated}
                    onChange={v => {
                        if (v)
                            authorizeCloud();
                        else
                            settings.cloud.authenticated = v;
                    }}
                    note={l.authInfo}
                >
                    {l.enableIntegrations}
                </Switch>
                <Forms.FormTitle tag="h5">{l.backendUrl}</Forms.FormTitle>
                <Forms.FormText className={Margins.bottom8}>
                    {l.backedInfo}
                </Forms.FormText>
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
                        size={Button.Sizes.MEDIUM}
                        disabled={!settings.cloud.authenticated}
                        onClick={async () => {
                            await deauthorizeCloud();
                            settings.cloud.authenticated = false;
                            await authorizeCloud();
                        }}
                    >
                        {l.reauth}
                    </Button>
                    <Button
                        size={Button.Sizes.MEDIUM}
                        color={Button.Colors.RED}
                        disabled={!settings.cloud.authenticated}
                        onClick={() => Alerts.show({
                            title: l.areYouSure,
                            body: l.eraseWarning,
                            onConfirm: eraseAllData,
                            confirmText: l.eraseIt,
                            confirmColor: "vc-cloud-erase-data-danger-btn",
                            cancelText: l.nevermind
                        })}
                    >
                        {l.eraseAllData}
                    </Button>
                </Grid>

                <Forms.FormDivider className={Margins.top16} />
            </Forms.FormSection >
            <SettingsSyncSection />
        </SettingsTab>
    );
}

export default wrapTab(CloudTab, langData.VencordSettings.CloudTab.wrapTab);
