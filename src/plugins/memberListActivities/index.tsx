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
            const { assets } = activity;
            if (assets) {

                const addImage = (image: string, alt: string) => {
                    if (image.startsWith("mp:")) {
                        const discordMediaLink = `https://media.discordapp.net/${image.replace(/mp:/, "")}`;
                        icons.push(<img src={discordMediaLink} alt={alt}/>);
                    } else {
                        const src = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${image}.png`;
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
                match: /(\i).some\((\i).default\)\?/,
                replace: "$&$self.patchActivityList(l,d,_)?$self.patchActivityList(l,d,_):"
            }
        },
    ],
});
