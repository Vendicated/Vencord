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

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";

import { PlaystationIcon } from "./components/PlaystationIcon";
import { SpotifyIcon } from "./components/SpotifyIcon";
import { TwitchIcon } from "./components/TwitchIcon";

const settings = definePluginSettings({
    iconSize: {
        type: OptionType.SLIDER,
        description: "Size of the activity icons",
        markers: [10, 15, 20],
        default: 20,
        stickToMarkers: false,
    },
    renderGifs: {
        type: OptionType.BOOLEAN,
        description: "Allow rendering GIFs",
        default: true,
        restartNeeded: false,
    },
});

interface Activity {
    created_at: number;
    id: string;
    name: string;
    type: number;
    emoji?: {
        animated: boolean;
        id: string;
        name: string;
    };
    state?: string;
    flags?: number;
    sync_id?: string;
    details?: string;
    application_id?: string;
    assets?: {
        large_text?: string;
        large_image?: string;
        small_text?: string;
        small_image?: string;
    };
    platform?: string;
}

const cl = classNameFactory("vc-mla-");

interface Application {
    id: string;
    name: string;
    icon: string;
    description: string;
    summary: string;
    type: number;
    hook: boolean;
    guild_id: string;
    executables: Executable[];
    verify_key: string;
    publishers: Developer[];
    developers: Developer[];
    flags: number;
}

interface Developer {
    id: string;
    name: string;
}

interface Executable {
    os: string;
    name: string;
    is_launcher: boolean;
}

const ApplicationStore: {
    getApplication: (id: string) => Application | null;
} = findStoreLazy("ApplicationStore");

const { fetchApplication }: {
    fetchApplication: (id: string) => Promise<Application | null>;
} = findByPropsLazy("fetchApplication");

// if discord one day decides changes their icon this needs to be updated
const DefaultActivityIcon = findComponentByCodeLazy("M6,7 L2,7 L2,6 L6,6 L6,7 Z M8,5 L2,5 L2,4 L8,4 L8,5 Z M8,3 L2,3 L2,2 L8,2 L8,3 Z M8.88888889,0 L1.11111111,0 C0.494444444,0 0,0.494444444 0,1.11111111 L0,8.88888889 C0,9.50253861 0.497461389,10 1.11111111,10 L8.88888889,10 C9.50253861,10 10,9.50253861 10,8.88888889 L10,1.11111111 C10,0.494444444 9.5,0 8.88888889,0 Z");

const fetchedApplications = new Map<string, Application | null>();

const xboxUrl = "https://discord.com/assets/9a15d086141be29d9fcd.png";

export default definePlugin({
    name: "MemberListActivities",
    description: "Shows activity icons in the member list",
    authors: [Devs.D3SOX, Devs.nyx],
    tags: ["activity"],

    settings,

    patchActivityList: (activities: Activity[]): JSX.Element | null => {
        if (activities === null) {
            return null;
        }

        const icons: JSX.Element[] = [];

        const pushIcon = (icon: JSX.Element | string, alt: string) => {
            if (typeof icon === "string")
                icons.push(<img src={icon} alt={alt} />);
            else
                icons.push(icon);
        };

        if (activities.some(activity => activity.name === "Spotify")) {
            icons.push(<SpotifyIcon />);
        }

        if (activities.some(activity => activity.name === "Twitch")) {
            icons.push(<TwitchIcon />);
        }

        const applications = activities.filter(activity => activity.application_id || activity.platform);
        applications.forEach(activity => {
            const { assets, application_id, platform } = activity;
            if (!application_id && !platform) {
                return;
            }
            if (platform) {
                if (platform === "xbox") {
                    pushIcon(xboxUrl, "XBox");
                } else if (platform === "ps4" || platform === "ps5") {
                    pushIcon(<PlaystationIcon />, "PlayStation");
                }
            } else if (assets) {
                const addImage = (image: string, alt: string) => {
                    if (image.startsWith("mp:")) {
                        const discordMediaLink = `https://media.discordapp.net/${image.replace(/mp:/, "")}`;
                        if (settings.store.renderGifs || !discordMediaLink.endsWith(".gif")) {
                            pushIcon(discordMediaLink, alt);
                        }
                    } else {
                        const src = `https://cdn.discordapp.com/app-assets/${application_id}/${image}.png`;
                        pushIcon(src, alt);
                    }
                };

                // Prefer large image
                const largeImage = assets.large_image;
                if (largeImage) {
                    addImage(largeImage, assets.large_text ?? "Large Text");
                } else {
                    const smallImage = assets.small_image;
                    if (smallImage) {
                        addImage(smallImage, assets.small_text ?? "Small Text");
                    }
                }
            } else if (application_id) {
                let application = ApplicationStore.getApplication(application_id);
                if (!application) {
                    if (fetchedApplications.has(application_id)) {
                        application = fetchedApplications.get(application_id) as Application | null;
                    } else {
                        fetchedApplications.set(application_id, null);
                        fetchApplication(application_id).then(app => {
                            fetchedApplications.set(application_id, app);
                        });
                    }
                }

                if (application) {
                    const src = `https://cdn.discordapp.com/app-icons/${application.id}/${application.icon}.png`;
                    if (application.icon === null)
                        pushIcon(<DefaultActivityIcon />, application.name);
                    else
                        pushIcon(src, application.name);
                }
            }
        });

        if (icons.length) {
            return <ErrorBoundary noop>
                <div className={cl("row")}>
                    {icons.map((icon, i) => (
                        <div key={i} className={cl("icon")} style={{ width: `${settings.store.iconSize}px`, height: `${settings.store.iconSize}px` }}>
                            {icon}
                        </div>
                    ))}
                </div>
            </ErrorBoundary>;
        } else {
            // Show default icon when there are no custom icons
            // We need to filter out custom statuses
            const shouldShow = activities.filter(a => a.type !== 4).length !== icons.length;
            if (shouldShow) {
                return <DefaultActivityIcon />;
            }
        }

        return null;
    },

    patches: [
        {
            // Patch activity icons
            find: "default.getHangStatusActivity():null!",
            replacement: {
                match: /null!=(\i)&&\i.some\(\i=>\(0,\i.default\)\(\i,\i\)\)\?/,
                replace: "$self.patchActivityList($1),false?"
            }
        },
    ],
});
