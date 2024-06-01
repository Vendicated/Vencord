/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { Text, useEffect, UserStore, useState } from "@webpack/common";

const settings = definePluginSettings({
    showEquicordDonor: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Equicord Donor badges in chat.",
        hidden: true,
        default: true
    },
    EquicordDonorPosition: {
        type: OptionType.NUMBER,
        description: "The position of the Equicord Donor badges.",
        hidden: true,
        default: 0
    },
    showEquicordContributor: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Equicord Contributor badges in chat.",
        hidden: true,
        default: true
    },
    EquicordContributorPosition: {
        type: OptionType.NUMBER,
        description: "The position of the Equicord Contributor badge.",
        hidden: true,
        default: 1
    },
    showVencordDonor: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Vencord donor badges in chat.",
        hidden: true,
        default: true
    },
    VencordDonorPosition: {
        type: OptionType.NUMBER,
        description: "The position of the Vencord Donor badges.",
        hidden: true,
        default: 2
    },
    showVencordContributor: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Vencord contributor badges in chat.",
        hidden: true,
        default: true
    },
    VencordContributorPosition: {
        type: OptionType.NUMBER,
        description: "The position of the Vencord Contributor badge.",
        hidden: true,
        default: 3
    },
    showDiscordProfile: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Discord profile badges in chat.",
        hidden: true,
        default: true
    },
    DiscordProfilePosition: {
        type: OptionType.NUMBER,
        description: "The position of the Discord profile badges.",
        hidden: true,
        default: 4
    },
    showDiscordNitro: {
        type: OptionType.BOOLEAN,
        description: "Enable to show Discord Nitro badges in chat.",
        hidden: true,
        default: true
    },
    DiscordNitroPosition: {
        type: OptionType.NUMBER,
        description: "The position of the Discord Nitro badge.",
        hidden: true,
        default: 5
    },
    badgeSettings: {
        type: OptionType.COMPONENT,
        description: "Setup badge layout and visibility",
        component: () => <BadgeSettings />
    }
});

export default settings;

const BadgeSettings = () => {
    const [images, setImages] = useState([
        { src: "https://i.imgur.com/KsxHlbD.png", shown: settings.store.showEquicordDonor, title: "Equicord donor badges", key: "EquicordDonor", position: settings.store.EquicordDonorPosition },
        { src: "https://i.imgur.com/rJDRtUB.png", shown: settings.store.showEquicordContributor, title: "Equicord contributor badge", key: "EquicordContributer", position: settings.store.EquicordContributorPosition },
        { src: "https://cdn.discordapp.com/emojis/1026533070955872337.png", shown: settings.store.showVencordDonor, title: "Vencord donor badges", key: "VencordDonor", position: settings.store.VencordDonorPosition },
        { src: "https://vencord.dev/assets/favicon.png", shown: settings.store.showVencordContributor, title: "Vencord contributor badge", key: "VencordContributer", position: settings.store.VencordContributorPosition },
        { src: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png", shown: settings.store.showDiscordProfile, title: "Discord profile badges (HypeSquad, Discord Staff, Active Developer, etc.)", key: "DiscordProfile", position: settings.store.DiscordProfilePosition },
        { src: "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png", shown: settings.store.showDiscordNitro, title: "Nitro badge", key: "DiscordNitro", position: settings.store.DiscordNitroPosition }
    ]);

    useEffect(() => {
        images.forEach(image => {
            switch (image.key) {
                case "EquicordDonor":
                    settings.store.EquicordDonorPosition = image.position;
                    settings.store.showEquicordDonor = image.shown;
                    break;
                case "EquicordContributer":
                    settings.store.EquicordContributorPosition = image.position;
                    settings.store.showEquicordContributor = image.shown;
                    break;
                case "VencordDonor":
                    settings.store.VencordDonorPosition = image.position;
                    settings.store.showVencordDonor = image.shown;
                    break;
                case "VencordContributer":
                    settings.store.VencordContributorPosition = image.position;
                    settings.store.showVencordContributor = image.shown;
                    break;
                case "DiscordProfile":
                    settings.store.DiscordProfilePosition = image.position;
                    settings.store.showDiscordProfile = image.shown;
                    break;
                case "DiscordNitro":
                    settings.store.DiscordNitroPosition = image.position;
                    settings.store.showDiscordNitro = image.shown;
                    break;
                default:
                    break;
            }
        });
    }, [images]);

    const handleDragStart = (e: any, index: number) => {
        if (!images[index].shown) {
            e.preventDefault();
        } else {
            e.dataTransfer.setData("index", index);
        }
    };

    const handleDragOver = e => {
        e.preventDefault();
    };

    const handleDrop = (e: any, dropIndex: number) => {
        const dragIndex = e.dataTransfer.getData("index");
        const newImages = [...images];
        const draggedImage = newImages[dragIndex];

        newImages.splice(dragIndex, 1);
        newImages.splice(dropIndex, 0, draggedImage);

        newImages.forEach((image, index) => {
            image.position = index;
        });

        setImages(newImages);
    };

    const toggleDisable = (index: number) => {
        const newImages = [...images];
        newImages[index].shown = !newImages[index].shown;
        setImages(newImages);
    };

    return (
        <>
            <Text>Drag the badges to reorder them, you can click to enable/disable a specific badge type.</Text>
            <div className="vc-sbic-badge-settings">
                <img className="vc-sbic-settings-avatar" src={UserStore.getCurrentUser().getAvatarURL()}></img>
                <Text className="vc-sbic-settings-username">{(UserStore.getCurrentUser() as any).globalName}</Text>
                {images
                    .sort((a, b) => a.position - b.position)
                    .map((image, index) => (
                        <div
                            key={image.key}
                            className={`vc-sbic-image-container ${!image.shown ? "vc-sbic-disabled" : ""}`}
                            onDragOver={e => handleDragOver(e)}
                            onDrop={e => handleDrop(e, index)}
                            onClick={() => toggleDisable(index)}
                        >
                            <img
                                src={image.src}
                                draggable={image.shown}
                                onDragStart={e => handleDragStart(e, index)}
                                title={image.title}
                            />
                        </div>
                    ))
                }
            </div>
        </>
    );
};
