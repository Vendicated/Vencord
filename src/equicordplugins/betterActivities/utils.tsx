/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@api/Styles";
import { Activity, Application } from "@vencord/discord-types";
import { findByPropsLazy, findComponentByCodeLazy, findStoreLazy } from "@webpack";

import { settings } from "./settings";
import { ActivityViewProps, ApplicationIcon } from "./types";

const ApplicationStore: {
    getApplication: (id: string) => Application | null;
} = findStoreLazy("ApplicationStore");

const { fetchApplication }: {
    fetchApplication: (id: string) => Promise<Application | null>;
} = findByPropsLazy("fetchApplication");

const fetchedApplications = new Map<string, Application | null>();

const xboxUrl = "https://discord.com/assets/9a15d086141be29d9fcd.png"; // TODO: replace with "renderXboxImage"?

export const ActivityView = findComponentByCodeLazy<ActivityViewProps>('location:"UserProfileActivityCard",');

export const cl = classNameFactory("vc-bactivities-");

export function getActivityApplication(activity: Activity | null) {
    if (!activity) return undefined;
    const { application_id } = activity;
    if (!application_id) return undefined;
    let application = ApplicationStore.getApplication(application_id);
    if (!application && fetchedApplications.has(application_id)) {
        application = fetchedApplications.get(application_id) ?? null;
    }
    return application ?? undefined;
}

export function getApplicationIcons(activities: Activity[], preferSmall = false): ApplicationIcon[] {
    const applicationIcons: ApplicationIcon[] = [];
    const applications = activities.filter(activity => activity.application_id || activity.platform || activity?.id?.startsWith("spotify:"));

    for (const activity of applications) {
        const { assets, application_id, platform, id } = activity;
        if (!application_id && !platform && !id.startsWith("spotify:")) continue;

        if (assets) {
            const { small_image, small_text, large_image, large_text } = assets;
            const smallText = small_text ?? "Small Text";
            const largeText = large_text ?? "Large Text";

            const addImage = (image: string, alt: string) => {
                if (image.startsWith("mp:")) {
                    const discordMediaLink = `https://media.discordapp.net/${image.replace(/mp:/, "")}`;
                    if (settings.store.renderGifs || !discordMediaLink.endsWith(".gif")) {
                        applicationIcons.push({
                            image: { src: discordMediaLink, alt },
                            activity
                        });
                    }
                } else if (image.startsWith("spotify:")) {
                    const url = `https://i.scdn.co/image/${image.split(":")[1]}`;
                    applicationIcons.push({
                        image: { src: url, alt },
                        activity
                    });
                } else {
                    const src = `https://cdn.discordapp.com/app-assets/${application_id}/${image}.png`;
                    applicationIcons.push({
                        image: { src, alt },
                        activity
                    });
                }
            };

            if (preferSmall) {
                if (small_image) {
                    addImage(small_image, smallText);
                } else if (large_image) {
                    addImage(large_image, largeText);
                }
            } else {
                if (large_image) {
                    addImage(large_image, largeText);
                } else if (small_image) {
                    addImage(small_image, smallText);
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
                    }).catch(console.error);
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
            } else if (platform === "xbox") {
                applicationIcons.push({
                    image: { src: xboxUrl, alt: "Xbox" },
                    activity
                });
            }
        } else if (platform === "xbox") {
            applicationIcons.push({
                image: { src: xboxUrl, alt: "Xbox" },
                activity
            });
        }
    }

    return applicationIcons;
}
