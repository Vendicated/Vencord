/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { classNameFactory } from "@api/Styles";
import { OptionType } from "@utils/types";
import { Text, UserStore } from "@webpack/common";

export const cl = classNameFactory("vc-sbic-");

const settings = definePluginSettings({
    vencordDonor: {
        type: OptionType.CUSTOM,
        default: { order: 0, isEnabled: true },
    },
    vencordContributor: {
        type: OptionType.CUSTOM,
        default: { order: 1, isEnabled: true },
    },
    discordProfile: {
        type: OptionType.CUSTOM,
        default: { order: 2, isEnabled: true },
    },
    discordNitro: {
        type: OptionType.CUSTOM,
        default: { order: 3, isEnabled: true },
    },
    badgeSettings: {
        type: OptionType.COMPONENT,
        description: "Setup badge layout and visibility",
        component: () => (
            <>
                <Text>
                    Drag the badges to reorder them, you can click to
                    enable/disable a specific badge type.
                </Text>
                <BadgeSettings />
            </>
        ),
    },
});

function BadgeSettings() {
    const images = [
        {
            src: "https://cdn.discordapp.com/emojis/1026533070955872337.png",
            settings: settings.store.vencordDonor,
            title: "Vencord donor badges",
        },
        {
            src: "https://cdn.discordapp.com/emojis/1092089799109775453.png",
            settings: settings.store.vencordContributor,
            title: "Vencord contributor badge",
        },
        {
            src: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png",
            settings: settings.store.discordProfile,
            title: "Discord profile badges (HypeSquad, Discord Staff, Active Developer, etc.)",
        },
        {
            src: "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png",
            settings: settings.store.discordNitro,
            title: "Nitro badge",
        },
    ];

    function handleDragStart(e: any, index: number) {
        if (!images[index].settings.isEnabled) {
            e.preventDefault();
        } else {
            e.dataTransfer.setData("index", index);
        }
    }

    function handleDrop(e: any, dropIndex: number) {
        const dragIndex = e.dataTransfer.getData("index");
        const draggedImage = images[dragIndex];

        images.splice(dragIndex, 1);
        images.splice(dropIndex, 0, draggedImage);

        images.forEach((image, index) => {
            image.settings.order = index;
        });
    }

    return (
        <div className={cl("badge-settings")}>
            <img
                className={cl("settings-avatar")}
                src={UserStore.getCurrentUser().getAvatarURL(
                    void 0,
                    void 0,
                    false
                )}
            />
            <Text className={cl("settings-username")}>
                {(UserStore.getCurrentUser() as any).globalName}
            </Text>
            {images
                .sort((a, b) => a.settings.order - b.settings.order)
                .map((image, index) => (
                    <div
                        key={image.title}
                        className={cl("image-container")}
                        data-is-enabled={image.settings.isEnabled}
                        onDrop={e => handleDrop(e, index)}
                        onClick={() =>
                        (images[index].settings.isEnabled =
                            !images[index].settings.isEnabled)
                        }
                    >
                        <img
                            src={image.src}
                            draggable={image.settings.isEnabled}
                            onDragStart={e => handleDragStart(e, index)}
                            title={image.title}
                        />
                    </div>
                ))}
        </div>
    );
}

export default settings;
