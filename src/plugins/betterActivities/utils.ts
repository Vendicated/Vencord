/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy, findStoreLazy } from "@webpack";

import settings from "./settings";
import { Activity, Application, ApplicationIcon } from "./types";

const ApplicationStore: {
    getApplication: (id: string) => Application | null;
} = findStoreLazy("ApplicationStore");

const { fetchApplication }: {
    fetchApplication: (id: string) => Promise<Application | null>;
} = findByPropsLazy("fetchApplication");

const fetchedApplications = new Map<string, Application | null>();

export function getActivityApplication({ application_id }: Activity) {
    if (!application_id) return undefined;
    let application = ApplicationStore.getApplication(application_id);
    if (!application && fetchedApplications.has(application_id)) {
        application = fetchedApplications.get(application_id) ?? null;
    }
    return application ?? undefined;
}

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
