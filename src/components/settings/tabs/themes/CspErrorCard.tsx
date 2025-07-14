/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ErrorCard } from "@components/ErrorCard";
import { Link } from "@components/Link";
import { CspBlockedUrls, useCspErrors } from "@utils/cspViolations";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { relaunch } from "@utils/native";
import { useForceUpdater } from "@utils/react";
import { Alerts, Button, Forms } from "@webpack/common";

export function CspErrorCard() {
    if (IS_WEB) return null;

    const errors = useCspErrors();
    const forceUpdate = useForceUpdater();

    if (!errors.length) return null;

    const isImgurHtmlDomain = (url: string) => url.startsWith("https://imgur.com/");

    const allowUrl = async (url: string) => {
        const { origin: baseUrl, host } = new URL(url);

        const result = await VencordNative.csp.requestAddOverride(baseUrl, ["connect-src", "img-src", "style-src", "font-src"], "Vencord Themes");
        if (result !== "ok") return;

        CspBlockedUrls.forEach(url => {
            if (new URL(url).host === host) {
                CspBlockedUrls.delete(url);
            }
        });

        forceUpdate();

        Alerts.show({
            title: "Restart Required",
            body: "A restart is required to apply this change",
            confirmText: "Restart now",
            cancelText: "Later!",
            onConfirm: relaunch
        });
    };

    const hasImgurHtmlDomain = errors.some(isImgurHtmlDomain);

    return (
        <ErrorCard className="vc-settings-card">
            <Forms.FormTitle tag="h5">Blocked Resources</Forms.FormTitle>
            <Forms.FormText>Some images, styles, or fonts were blocked because they come from disallowed domains.</Forms.FormText>
            <Forms.FormText>It is highly recommended to move them to GitHub or Imgur. But you may also allow domains if you fully trust them.</Forms.FormText>
            <Forms.FormText>
                After allowing a domain, you have to fully close (from tray / task manager) and restart {IS_DISCORD_DESKTOP ? "Discord" : "Vesktop"} to apply the change.
            </Forms.FormText>

            <Forms.FormTitle tag="h5" className={classes(Margins.top16, Margins.bottom8)}>Blocked URLs</Forms.FormTitle>
            <div className="vc-settings-csp-list">
                {errors.map((url, i) => (
                    <div key={url}>
                        {i !== 0 && <Forms.FormDivider className={Margins.bottom8} />}
                        <div className="vc-settings-csp-row">
                            <Link href={url}>{url}</Link>
                            <Button color={Button.Colors.PRIMARY} onClick={() => allowUrl(url)} disabled={isImgurHtmlDomain(url)}>
                                Allow
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {hasImgurHtmlDomain && (
                <>
                    <Forms.FormDivider className={classes(Margins.top8, Margins.bottom16)} />
                    <Forms.FormText>
                        Imgur links should be direct links in the form of <code>https://i.imgur.com/...</code>
                    </Forms.FormText>
                    <Forms.FormText>To obtain a direct link, right-click the image and select "Copy image address".</Forms.FormText>
                </>
            )}
        </ErrorCard>
    );
}
