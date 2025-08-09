/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, Tooltip } from "@webpack/common";

import { CarouselControlsProps } from "../types";
import { cl } from "../utils";
import { Caret } from "./Caret";

export function CarouselControls({ activities, currentActivity, onActivityChange }: CarouselControlsProps) {
    const currentIndex = activities.indexOf(currentActivity);

    return (
        <div
            className={cl("controls")}
            style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
            }}
        >
            <Tooltip text="Left" tooltipClassName={cl("controls-tooltip")}>{({
                onMouseEnter,
                onMouseLeave
            }) => {
                return <span
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    onClick={() => {
                        if (currentIndex - 1 >= 0) {
                            onActivityChange(activities[currentIndex - 1]);
                        } else {
                            onActivityChange(activities[activities.length - 1]);
                        }
                    }}
                >
                    <Caret
                        disabled={currentIndex < 1}
                        direction="left" />
                </span>;
            }}</Tooltip>

            <div className="carousel">
                {activities.map((activity, index) => (
                    <div
                        key={"dot--" + index}
                        onClick={() => onActivityChange(activity)}
                        className={`dot ${currentActivity === activity ? "selected" : ""}`} />
                ))}
            </div>

            <Tooltip text="Right" tooltipClassName={cl("controls-tooltip")}>{({
                onMouseEnter,
                onMouseLeave
            }) => {
                return <span
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    onClick={() => {
                        if (currentIndex + 1 < activities.length) {
                            onActivityChange(activities[currentIndex + 1]);
                        } else {
                            onActivityChange(activities[0]);
                        }
                    }}
                >
                    <Caret
                        disabled={currentIndex >= activities.length - 1}
                        direction="right" />
                </span>;
            }}</Tooltip>
        </div>
    );
}
