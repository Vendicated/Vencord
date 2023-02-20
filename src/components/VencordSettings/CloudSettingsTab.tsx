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
import ErrorBoundary from "@components/ErrorBoundary";
import { Margins } from "@utils/margins";
import { authorizeCloud, deleteCloudData, syncFromCloud, syncToCloud } from "@utils/settingsSync";
import { Button, Card, Forms, Switch } from "@webpack/common";

function CloudSettingsTab() {
    const settings = useSettings();

    return (
        <Forms.FormSection title="Cloud Settings" className={Margins.top16}>
            <Forms.FormText variant="text-md/normal" className={Margins.bottom20}>
                Synchronize your settings to the cloud. This allows easy synchronization across multiple devices with
                minimal effort.
            </Forms.FormText>
            <Switch
                key="cloud-sync"
                value={settings.settingsSync}
                onChange={v => { settings.settingsSync = v; v && authorizeCloud(); }}
                note="This will request authorization if you have not yet set up cloud sync."
            >
                Settings Sync
            </Switch>
            <Card className="vc-settings-quick-actions-card">
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={!settings.settingsSync}
                    onClick={() => syncToCloud()}
                >Sync to Cloud</Button>
                <Button
                    size={Button.Sizes.SMALL}
                    disabled={!settings.settingsSync}
                    onClick={() => syncFromCloud(true, false)}
                >Sync from Cloud</Button>
                <Button
                    size={Button.Sizes.SMALL}
                    color={Button.Colors.RED}
                    disabled={!settings.settingsSync}
                    onClick={() => deleteCloudData()}
                >Delete Cloud Data</Button>
            </Card>
        </Forms.FormSection>
    );
}

export default ErrorBoundary.wrap(CloudSettingsTab);
