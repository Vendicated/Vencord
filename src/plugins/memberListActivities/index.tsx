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

import { classNameFactory } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";

import { SpotifyIcon } from "./components/SpotifyIcon";
import { TwitchIcon } from "./components/TwitchIcon";

interface Activity {
    created_at: number;
    id: string;
    name: string;
    state: string;
    type: number;
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

const fetchedApplications = new Map<string, Application | null>();

export default definePlugin({
    name: "MemberListActivities",
    description: "Shows activity icons in the member list",
    authors: [Devs.D3SOX],
    tags: ["activity"],

    patchActivityList: (activities: Activity[]) => {
        const icons: JSX.Element[] = [];

        if (activities.some(activity => activity.name === "Spotify")) {
            icons.push(<SpotifyIcon />);
        }

        if (activities.some(activity => activity.name === "Twitch")) {
            icons.push(<TwitchIcon />);
        }

        const applications = activities.filter(activity => activity.application_id);
        applications.forEach(activity => {
            const { assets, application_id } = activity;
            if (!application_id) {
                return;
            }
            if (assets) {

                const addImage = (image: string, alt: string) => {
                    if (image.startsWith("mp:")) {
                        const discordMediaLink = `https://media.discordapp.net/${image.replace(/mp:/, "")}`;
                        icons.push(<img src={discordMediaLink} alt={alt}/>);
                    } else {
                        const src = `https://cdn.discordapp.com/app-assets/${application_id}/${image}.png`;
                        icons.push(<img src={src} alt={alt}/>);
                    }
                };

                // Prefer small image
                const smallImage = assets.small_image;
                if (smallImage) {
                    addImage(smallImage, assets.small_text ?? "Small Text");
                } else {
                    const largeImage = assets.large_image;
                    if (largeImage) {
                        addImage(largeImage, assets.large_text ?? "Large Text");
                    }
                }

            } else {
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
                    icons.push(<img src={src} alt={application.name}/>);
                }
            }
        });

        if (icons.length) {
            return <ErrorBoundary noop>
                <div className={cl("row")}>
                    {icons.map((icon, i) => (
                        <div key={i} className={cl("icon")}>
                            {icon}
                        </div>
                    ))}
                </div>
            </ErrorBoundary>;
        }

        return false;
    },

    patches: [
        {
            // Patch activity icons
            find: "default.getHangStatusActivity():null!",
            replacement: {
                match: /null!=(\i)&&(\i).some\((\i).default\)\?/,
                replace: "$self.patchActivityList($1),false?"
            }
        },
    ],
});
