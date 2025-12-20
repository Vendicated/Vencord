/*
 * EagleCord, a Vencord mod
 *
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import { Divider } from "@components/Divider";
import { FormSwitch } from "@components/FormSwitch";
import { Link } from "@components/Link";
import { SettingsTab, wrapTab } from "@components/settings/tabs/BaseTab";
import { Margins } from "@utils/margins";
import { useAwaiter } from "@utils/react";
import { getRepo, isNewer, UpdateLogger } from "@utils/updater";
import { Forms, React } from "@webpack/common";

import gitHash from "~git-hash";

import { CommonProps, HashLink, Newer, Updatable } from "./Components";

function Updater() {
    const settings = useSettings(["autoUpdate", "autoUpdateNotification"]);

    const [repo, err, repoPending] = useAwaiter(getRepo, {
        fallbackValue: "Loading...",
        onError: e => UpdateLogger.error("Failed to retrieve repo", err)
    });

    const commonProps: CommonProps = {
        repo,
        repoPending
    };

    return (
        <SettingsTab>
            <FormSwitch
                title="Automatically update"
                description="Automatically update Vencord without confirmation prompt"
                value={settings.autoUpdate}
                onChange={(v: boolean) => settings.autoUpdate = v}
            />
            <FormSwitch
                title="Get notified when an automatic update completes"
                description="Show a notification when Vencord automatically updates"
                value={settings.autoUpdateNotification}
                onChange={(v: boolean) => settings.autoUpdateNotification = v}
                disabled={!settings.autoUpdate}
            />

            <Forms.FormTitle tag="h5">Repo</Forms.FormTitle>

            <Forms.FormText>
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
                {" "}
                (<HashLink hash={gitHash} repo={repo} disabled={repoPending} />)
            </Forms.FormText>

            <Divider className={Margins.top8 + " " + Margins.bottom8} />

            <Forms.FormTitle tag="h5">Updates</Forms.FormTitle>

            {isNewer
                ? <Newer {...commonProps} />
                : <Updatable {...commonProps} />
            }
        </SettingsTab>
    );
}

export default IS_UPDATER_DISABLED
    ? null
    : wrapTab(Updater, "Updater");
