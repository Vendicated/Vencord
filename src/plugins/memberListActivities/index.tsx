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
import { moment, React, Tooltip, useMemo } from "@webpack/common";
import { User } from "discord-types/general";

import { SpotifyIcon } from "./components/SpotifyIcon";
import { TwitchIcon } from "./components/TwitchIcon";
import { Activity, ActivityListIcon, Application, ApplicationIcon, Timestamp } from "./types";

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

const cl = classNameFactory("vc-mla-");

const ApplicationStore: {
    getApplication: (id: string) => Application | null;
} = findStoreLazy("ApplicationStore");

const { fetchApplication }: {
    fetchApplication: (id: string) => Promise<Application | null>;
} = findByPropsLazy("fetchApplication");

const TimeBar: React.ComponentType<React.PropsWithChildren<{
    start: number;
    end: number;
    themed: boolean;
    className: string;
}>> = findComponentByCodeLazy("isSingleLine");

// if discord one day decides to change their icon this needs to be updated
const DefaultActivityIcon = findComponentByCodeLazy("M6,7 L2,7 L2,6 L6,6 L6,7 Z M8,5 L2,5 L2,4 L8,4 L8,5 Z M8,3 L2,3 L2,2 L8,2 L8,3 Z M8.88888889,0 L1.11111111,0 C0.494444444,0 0,0.494444444 0,1.11111111 L0,8.88888889 C0,9.50253861 0.497461389,10 1.11111111,10 L8.88888889,10 C9.50253861,10 10,9.50253861 10,8.88888889 L10,1.11111111 C10,0.494444444 9.5,0 8.88888889,0 Z");

const fetchedApplications = new Map<string, Application | null>();

const xboxUrl = "https://discord.com/assets/9a15d086141be29d9fcd.png"; // TODO: replace with "renderXboxImage"?

function getActivityImage(activity: Activity, application?: Application): string | undefined {
    if (activity.type === 2 && activity.name === "Spotify") {
        // get either from large or small image
        const image = activity.assets?.large_image ?? activity.assets?.small_image;
        // image needs to replace 'spotify:'
        if (image?.startsWith("spotify:")) {
            // spotify cover art is always https://i.scdn.co/image/ID
            return image.replace("spotify:", "https://i.scdn.co/image/");
        }
    }
    if (activity.type === 1 && activity.name === "Twitch") {
        const image = activity.assets?.large_image;
        // image needs to replace 'twitch:'
        if (image?.startsWith("twitch:")) {
            // twitch images are always https://static-cdn.jtvnw.net/previews-ttv/live_user_USERNAME-RESOLTUON.jpg
            return `${image.replace("twitch:", "https://static-cdn.jtvnw.net/previews-ttv/live_user_")}-108x60.jpg`;
        }
    }
    // TODO: we could support other assets here
}

function getValidTimestamps(activity: Activity): Required<Timestamp> | null {
    if (activity.timestamps?.start !== undefined && activity.timestamps?.end !== undefined) {
        return activity.timestamps as Required<Timestamp>;
    }
    return null;
}

function getValidStartTimeStamp(activity: Activity): number | null {
    if (activity.timestamps?.start !== undefined) {
        return activity.timestamps.start;
    }
    return null;
}

const customFormat = (momentObj: moment.Moment): string => {
    const hours = momentObj.hours();
    const formattedTime = momentObj.format("mm:ss");
    return hours > 0 ? `${momentObj.format("HH:")}${formattedTime}` : formattedTime;
};

function formatElapsedTime(startTime: moment.Moment, endTime: moment.Moment): string {
    const duration = moment.duration(endTime.diff(startTime));
    return `${customFormat(moment.utc(duration.asMilliseconds()))} elapsed`;
}

const ActivityTooltip = ({ activity, application }: Readonly<{ activity: Activity, application?: Application }>) => {
    const image = useMemo(() => {
        const activityImage = getActivityImage(activity, application);
        if (activityImage) {
            return activityImage;
        }
        const icon = getApplicationIcons([activity], true)[0];
        return icon?.image.src;
    }, [activity]);
    const timestamps = useMemo(() => getValidTimestamps(activity), [activity]);
    const startTime = useMemo(() => getValidStartTimeStamp(activity), [activity]);

    const hasDetails = activity.details ?? activity.state;
    return (
        <ErrorBoundary>
            <div className={cl("activity")}>
                {image && <img className={cl("activity-image")} src={image} alt="Activity logo" />}
                <div className={cl("activity-title")}>{activity.name}</div>
                {hasDetails && <div className={cl("activity-divider")} />}
                <div className={cl("activity-details")}>
                    <div>{activity.details}</div>
                    <div>{activity.state}</div>
                    {!timestamps && startTime &&
                        <div className={cl("activity-time-bar")}>
                            {formatElapsedTime(moment(startTime), moment())}
                        </div>
                    }
                </div>
                {timestamps && <TimeBar start={timestamps.start} end={timestamps.end} themed={false} className={cl("activity-time-bar")}/> }
            </div>
        </ErrorBoundary>
    );
};

function getApplicationIcons(activities: Activity[], preferSmall = false) {
    const applicationIcons: ApplicationIcon[] = [];
    const applications = activities.filter(activity => activity.application_id || activity.platform);

    for (const activity of applications) {
        const { assets, application_id, platform } = activity;
        if (!application_id && !platform) {
            continue;
        }
        if (assets) {

            const addImage = (image: string, alt: string) => {
                if (image.startsWith("mp:")) {
                    const discordMediaLink = `https://media.discordapp.net/${image.replace(/mp:/, "")}`;
                    if (settings.store.renderGifs || !discordMediaLink.endsWith(".gif")) {
                        applicationIcons.push({
                            image: { src: discordMediaLink, alt },
                            activity
                        });
                    }
                } else {
                    const src = `https://cdn.discordapp.com/app-assets/${application_id}/${image}.png`;
                    applicationIcons.push({
                        image: { src, alt },
                        activity
                    });
                }
            };

            const smallImage = assets.small_image;
            const smallText = assets.small_text ?? "Small Text";
            const largeImage = assets.large_image;
            const largeText = assets.large_text ?? "Large Text";
            if (preferSmall) {
                if (smallImage) {
                    addImage(smallImage, smallText);
                } else if (largeImage) {
                    addImage(largeImage, largeText);
                }
            } else {
                if (largeImage) {
                    addImage(largeImage, largeText);
                } else if (smallImage) {
                    addImage(smallImage, smallText);
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
                if (application.icon) {
                    const src = `https://cdn.discordapp.com/app-icons/${application.id}/${application.icon}.png`;
                    applicationIcons.push({
                        image: { src, alt: application.name },
                        activity,
                        application
                    });
                } else if (platform === "xbox") {
                    applicationIcons.push({
                        image: { src: xboxUrl, alt: "Xbox" },
                        activity,
                        application
                    });
                }
            }
        } else {
            if (platform === "xbox") {
                applicationIcons.push({
                    image: { src: xboxUrl, alt: "Xbox" },
                    activity
                });
            }
        }
    }

    return applicationIcons;
}

export default definePlugin({
    name: "MemberListActivities",
    description: "Shows activity icons in the member list",
    authors: [Devs.D3SOX],
    tags: ["activity"],

    settings,

    patchActivityList: ({ activities, user }: { activities: Activity[], user: User }): JSX.Element | null => {
        const icons: ActivityListIcon[] = [];

        const spotifyActivity = activities.find(({ name }) => name === "Spotify");
        if (spotifyActivity) {
            icons.push({
                iconElement: <SpotifyIcon />,
                tooltip: <ActivityTooltip activity={spotifyActivity} />
            });
        }
        const twitchActivity = activities.find(({ name }) => name === "Twitch");
        if (twitchActivity) {
            icons.push({
                iconElement: <TwitchIcon />,
                tooltip: <ActivityTooltip activity={twitchActivity} />
            });
        }

        const applicationIcons = getApplicationIcons(activities);
        if (applicationIcons.length) {
            const compareImageSource = (a: ApplicationIcon, b: ApplicationIcon) => {
                return a.image.src === b.image.src;
            };
            const uniqueIcons = applicationIcons.filter((element, index, array) => {
                return array.findIndex(el => compareImageSource(el, element)) === index;
            });
            for (const appIcon of uniqueIcons) {
                icons.push({
                    iconElement: <img {...appIcon.image} />,
                    tooltip: <ActivityTooltip activity={appIcon.activity} application={appIcon.application} />
                });
            }
        }

        if (icons.length) {
            return <ErrorBoundary noop>
                <div className={cl("row")}>
                    {icons.map(({ iconElement, tooltip }, i) => (
                        <div key={i} className={cl("icon")} style={{
                            width: `${settings.store.iconSize}px`,
                            height: `${settings.store.iconSize}px`
                        }}>
                            {tooltip ? <Tooltip text={tooltip}>
                                {({ onMouseEnter, onMouseLeave }) => (
                                    <div
                                        onMouseEnter={onMouseEnter}
                                        onMouseLeave={onMouseLeave}>
                                        {iconElement}
                                    </div>
                                )}
                            </Tooltip> : iconElement}
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
                replace: "$self.patchActivityList(e),false?"
            }
        },
    ],
});
