/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Card } from "@components/Card";
import ErrorBoundary from "@components/ErrorBoundary";
import { Switch } from "@components/Switch";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, RestAPI, showToast, useEffect, useState } from "@webpack/common";

const settings = definePluginSettings({
    defaultDisabled: {
        type: OptionType.BOOLEAN,
        description: "Disable 'Join servers for you' by default on authorization screens",
        default: true
    },
    showToastNotification: {
        type: OptionType.BOOLEAN,
        description: "Show a toast notification when the scope is blocked",
        default: true
    }
});

let isGuildsJoinAllowed = true;
let originalPost: typeof RestAPI.post | null = null;

function stripGuildsJoinScope(rawScope: unknown): unknown {
    if (Array.isArray(rawScope)) {
        return rawScope.filter(s => s !== "guilds.join");
    }
    if (typeof rawScope === "string") {
        return rawScope
            .split(/[ +]/)
            .filter(s => s && s !== "guilds.join")
            .join(" ");
    }
    return rawScope;
}

function cleanseAuthorizeUrl(urlString: string): string {
    try {
        const [base, query] = urlString.split("?");
        if (!query) return urlString;
        const params = new URLSearchParams(query);
        for (const key of ["scope", "scopes"]) {
            const scope = params.get(key);
            if (scope && scope.includes("guilds.join")) {
                const filtered = stripGuildsJoinScope(scope);
                if (typeof filtered === "string" && filtered.length > 0) {
                    params.set(key, filtered);
                } else {
                    params.delete(key);
                }
            }
        }
        return `${base}?${params.toString()}`;
    } catch {
        return urlString;
    }
}

function ScopeRowWithToggle({ Component, props }: { Component: any; props: any }) {
    const [allowed, setAllowed] = useState(isGuildsJoinAllowed);

    useEffect(() => {
        const initial = !settings.store.defaultDisabled;
        setAllowed(initial);
        isGuildsJoinAllowed = initial;
    }, []);

    const row = Component({ ...props, isFake: !allowed });

    return React.cloneElement(
        row,
        {
            style: {
                ...row.props.style,
                display: "flex",
                alignItems: "center",
                width: "100%"
            }
        },
        ...React.Children.toArray(row.props.children),
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                marginLeft: "auto",
                userSelect: "none"
            }}
            onClick={e => e.stopPropagation()}
        >
            <Switch
                checked={allowed}
                onChange={(val: boolean) => {
                    setAllowed(val);
                    isGuildsJoinAllowed = val;
                }}
            />
        </div>
    );
}

export default definePlugin({
    name: "NoJoinServers",
    description: "Adds a toggle to disable the 'Join servers for you' permission on Discord authorization screens.",
    authors: [Devs.berk404],
    settings,
    settingsAboutComponent: () => (
        <Card variant="warning">
            Keep in mind that some services strictly require this permission and will refuse to log you in if you block it. It sucks, but that check happens on their servers so there's nothing we can do about it. If you really need to use one of those apps, you can temporarily allow it and deauthorize the app later under User Settings &gt; Connected Apps &gt; Authorized Apps.
        </Card>
    ),

    patches: [
        {
            find: "accountScopes",
            replacement: {
                match: /\(0,\i\.jsx\)\((\i),(\{text:\i,error:[^}]+?\}),`\$\{(\i)\}-\$\{\i\}`\)/,
                replace: "$self.renderScopeRow($1,$2,$3)"
            }
        }
    ],

    renderScopeRow(Component: any, props: any, scope: string) {
        if (scope !== "guilds.join") {
            return <Component {...props} />;
        }

        return (
            <ErrorBoundary>
                <ScopeRowWithToggle
                    Component={Component}
                    props={props}
                />
            </ErrorBoundary>
        );
    },

    start() {
        isGuildsJoinAllowed = !settings.store.defaultDisabled;

        if (RestAPI && !originalPost) {
            originalPost = RestAPI.post;
            RestAPI.post = function (options: any) {
                if (options?.url && typeof options.url === "string" && options.url.includes("/oauth2/authorize")) {
                    if (!isGuildsJoinAllowed) {
                        options.url = cleanseAuthorizeUrl(options.url);
                        if (options.body && typeof options.body === "object") {
                            if ("scope" in options.body) {
                                options.body.scope = stripGuildsJoinScope(options.body.scope);
                            }
                            if ("scopes" in options.body) {
                                options.body.scopes = stripGuildsJoinScope(options.body.scopes);
                            }
                        }
                        if (settings.store.showToastNotification) {
                            showToast("Omitted 'guilds.join' from authorization", "message");
                        }
                    }
                }
                return originalPost!.apply(this, arguments as any);
            };
        }
    },

    stop() {
        if (originalPost && RestAPI) {
            RestAPI.post = originalPost;
            originalPost = null;
        }
        isGuildsJoinAllowed = true;
    }
});
