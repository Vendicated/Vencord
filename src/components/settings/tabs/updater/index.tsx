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

import { useSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Divider } from "@components/Divider";
import { Flex } from "@components/Flex";
import { FormSwitch } from "@components/FormSwitch";
import { Heading, HeadingSecondary } from "@components/Heading";
import { Link } from "@components/Link";
import { Paragraph } from "@components/Paragraph";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { useAwaiter } from "@utils/react";
import { getRepo, isNewer, UpdateLogger } from "@utils/updater";
import { React } from "@webpack/common";

import gitHash from "~git-hash";

import { HashLink, Newer, Updatable } from "./Components";

interface CommonProps {
    repo: string;
    repoPending: boolean;
}

function EquibopSection() {
    if (!IS_EQUIBOP) return null;

    const [isEquibopOutdated] = useAwaiter<boolean>(VesktopNative.app.isOutdated, { fallbackValue: false });

    return (
        <Flex className={Margins.bottom20} flexDirection="column" gap="1em">
            <Card variant="brand">
                <HeadingSecondary>Equibop & Equicord</HeadingSecondary>
                <Paragraph>Equibop and Equicord are two separate things. This updater is for Equicord.</Paragraph>
                <Paragraph className={Margins.top8}>
                    You receive separate popups for Equibop updates. You can also manually update by installing the <Link href="https://equibop.org/install">latest version</Link>.
                </Paragraph>
            </Card>

            {isEquibopOutdated && (
                <Card variant="warning">
                    <HeadingSecondary>Equibop Outdated</HeadingSecondary>
                    <Flex flexDirection="column" gap="0.5em">
                        <Paragraph>Your version of Equibop is outdated!</Paragraph>
                        <Button variant="link" onClick={() => VesktopNative.app.openUpdater()}>Open Equibop Updater</Button>
                    </Flex>
                </Card>
            )}
        </Flex>
    );
}

function Updater() {
    const settings = useSettings(["autoUpdate", "autoUpdateNotification"]);

    const [repo, err, repoPending] = useAwaiter(getRepo, { fallbackValue: "Loading..." });

    React.useEffect(() => {
        if (err)
            UpdateLogger.error("Failed to retrieve repo", err);
    }, [err]);

    const commonProps: CommonProps = {
        repo,
        repoPending
    };

    return (
        <SettingsTab>
            <EquibopSection />
            <Heading className={Margins.top16}>Update Preferences</Heading>
            <Paragraph className={Margins.bottom20}>
                Control how Equicord keeps itself up to date. You can choose to update automatically in the background or be notified when new updates are available.
            </Paragraph>

            <FormSwitch
                title="Automatically update"
                description="When enabled, Equicord will automatically download and install updates in the background without asking for confirmation. You'll need to restart Discord to apply the changes."
                value={settings.autoUpdate}
                onChange={(v: boolean) => settings.autoUpdate = v}
                hideBorder
            />
            <FormSwitch
                value={settings.autoUpdateNotification}
                onChange={(v: boolean) => settings.autoUpdateNotification = v}
                title="Get notified when an automatic update completes"
                description="Receive a notification when Equicord finishes downloading an update in the background, so you know when to restart Discord."
                disabled={!settings.autoUpdate}
                hideBorder
            />

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>Repository</Heading>
            <Paragraph className={Margins.bottom8}>
                This is the GitHub repository where Equicord fetches updates from.
            </Paragraph>
            <Paragraph color="text-subtle">
                {repoPending
                    ? repo
                    : err
                        ? "Failed to retrieve - check console"
                        : (
                            <Link href={repo}>
                                {repo.split("/").slice(-2).join("/")}
                            </Link>
                        )
                }
                {" "}(<HashLink hash={gitHash} repo={repo} disabled={repoPending} />)
            </Paragraph>

            <Divider className={Margins.top20} />

            <Heading className={Margins.top20}>Updates</Heading>
            {isNewer ? <Newer {...commonProps} /> : <Updatable {...commonProps} />}
        </SettingsTab>
    );
}

export default IS_UPDATER_DISABLED
    ? null
    : wrapTab(Updater, "Updater");
