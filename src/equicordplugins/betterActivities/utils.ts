/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy, findStoreLazy } from "@webpack";
import { moment } from "@webpack/common";

import settings from "./settings";
import { Activity, Application, ApplicationIcon, Timestamp } from "./types";

const ApplicationStore: {
    getApplication: (id: string) => Application | null;
} = findStoreLazy("ApplicationStore");

const { fetchApplication }: {
    fetchApplication: (id: string) => Promise<Application | null>;
} = findByPropsLazy("fetchApplication");

export function getActivityImage(activity: Activity, application?: Application): string | undefined {
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

const fetchedApplications = new Map<string, Application | null>();

// TODO: replace with "renderXboxImage"?
const xboxUrl = "https://discord.com/assets/9a15d086141be29d9fcd.png";

export function getApplicationIcons(activities: Activity[], preferSmall = false) {
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

export function getValidTimestamps(activity: Activity): Required<Timestamp> | null {
    if (activity.timestamps?.start !== undefined && activity.timestamps?.end !== undefined) {
        return activity.timestamps as Required<Timestamp>;
    }
    return null;
}

export function getValidStartTimeStamp(activity: Activity): number | null {
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

export function formatElapsedTime(startTime: moment.Moment, endTime: moment.Moment): string {
    const duration = moment.duration(endTime.diff(startTime));
    return `${customFormat(moment.utc(duration.asMilliseconds()))} elapsed`;
}
