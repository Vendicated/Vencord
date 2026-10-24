/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import { CloseButton } from "@utils/modal";
import { filters, findComponentByCodeLazy, findCssClassesLazy, mapMangledModuleLazy } from "@webpack";
import { Clickable } from "@webpack/common";
import type { MouseEvent, ReactNode } from "react";

import { Native, playerNames, useStatusStore } from "./store";
import { mediaKey } from "./utils";

const cl = classNameFactory("vc-external-player-");

const PlayIcon = findComponentByCodeLazy("M9.25 3.35C7.87 2.45");
const PauseIcon = findComponentByCodeLazy("M6 4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H6ZM15");
const MediaClasses = findCssClassesLazy("videoControls", "videoButton", "controlIcon", "durationTimeWrapper", "durationTimeDisplay", "durationTimeSeparator");
const MediaPlayer = mapMangledModuleLazy("renderControls(){", {
    formatTime: filters.byCode('.padStart(2,"0")')
});

export const Status = ErrorBoundary.wrap(({ src }: { src: string; }) => {
    const status = useStatusStore(s => s.statuses[mediaKey(src)]);
    if (!status) return null;

    const { paused, player, time, duration, controllable } = status;
    const Icon = paused ? PauseIcon : PlayIcon;

    return (
        <Clickable
            className={cl("status", { controllable })}
            onClick={e => {
                e.stopPropagation();
                if (controllable) Native.togglePause(src);
            }}
        >
            <CloseButton
                className={cl("close")}
                onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    Native.close(src);
                }}
            />
            <div className={cl("center")}>
                <div className={cl("button")}>
                    <Icon size="md" color="currentColor" />
                </div>
                <BaseText size="sm" weight="medium" className={cl("caption")}>
                    {paused ? "Paused" : "Playing"} in {playerNames[player]}
                </BaseText>
            </div>
            {controllable && time != null && duration ? (
                <div className={classes(MediaClasses.videoControls, cl("controls"))}>
                    <div className={MediaClasses.videoButton}>
                        <Icon size="xs" color="currentColor" className={MediaClasses.controlIcon} />
                    </div>
                    <div className={MediaClasses.durationTimeWrapper}>
                        <span className={MediaClasses.durationTimeDisplay}>{MediaPlayer.formatTime(time)}</span>
                        <span className={MediaClasses.durationTimeSeparator}>/</span>
                        <span className={MediaClasses.durationTimeDisplay}>{MediaPlayer.formatTime(duration)}</span>
                    </div>
                    <div
                        className={cl("bar")}
                        onClick={e => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            Native.seek(src, (e.clientX - rect.left) / rect.width);
                        }}
                    >
                        <div className={cl("track")}>
                            <div className={cl("fill")} style={{ width: `${time / duration * 100}%` }} />
                        </div>
                    </div>
                </div>
            ) : null}
        </Clickable>
    );
}, { noop: true });

export const HideWhileOpen = ErrorBoundary.wrap(({ src, children }: { src: string; children: ReactNode; }) => {
    const open = useStatusStore(s => !!s.statuses[mediaKey(src)]);
    return open ? null : <>{children}</>;
}, { noop: true });
