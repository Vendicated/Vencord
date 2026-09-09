/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import { useForceUpdater } from "@utils/react";
import definePlugin from "@utils/types";
import { Clickable, React, Tooltip } from "@webpack/common";

const cl = classNameFactory("vc-flip-profile-image-");

interface FlipTransform {
    readonly horizontal: boolean;
    readonly vertical: boolean;
}

interface FlipState extends FlipTransform {
    readonly enabled: boolean;
    readonly hasFlips: boolean;
    reset(): void;
    toggleHorizontal(): void;
    toggleVertical(): void;
}

interface StoredFlipTransform {
    flipHorizontal?: boolean;
    flipVertical?: boolean;
}

interface OutputTransform {
    imageRotation: number;
    flipHorizontal: boolean;
}

interface Position {
    x: number;
    y: number;
}

function useFlipState(initialTransform: StoredFlipTransform | undefined, enabled: boolean): FlipState {
    // Initialize flip state on mount and when enabled changes.
    const stateRef = React.useRef({
        enabled,
        horizontal: enabled && (initialTransform?.flipHorizontal ?? false),
        vertical: enabled && (initialTransform?.flipVertical ?? false)
    });
    const forceUpdate = useForceUpdater();

    if (stateRef.current.enabled !== enabled) {
        stateRef.current = {
            enabled,
            horizontal: enabled && (initialTransform?.flipHorizontal ?? false),
            vertical: enabled && (initialTransform?.flipVertical ?? false)
        };
    }

    function update(next: FlipTransform) {
        if (!stateRef.current.enabled) return;

        // Reset updates the preview in the same call, so it needs the new values immediately.
        stateRef.current = { ...stateRef.current, ...next };
        forceUpdate();
    }

    // Discord callbacks can retain an older returned object; getters keep its reads current.
    return {
        get enabled() {
            return stateRef.current.enabled;
        },
        get horizontal() {
            return stateRef.current.horizontal;
        },
        get vertical() {
            return stateRef.current.vertical;
        },
        get hasFlips() {
            return stateRef.current.enabled && (stateRef.current.horizontal || stateRef.current.vertical);
        },
        reset() {
            // Reset clears both axes, including flips restored from initialTransform.
            if (!stateRef.current.horizontal && !stateRef.current.vertical) return;
            update({ horizontal: false, vertical: false });
        },
        toggleHorizontal() {
            update({ horizontal: !stateRef.current.horizontal, vertical: stateRef.current.vertical });
        },
        toggleVertical() {
            update({ horizontal: stateRef.current.horizontal, vertical: !stateRef.current.vertical });
        }
    };
}

function normalizeRotation(rotation: number) {
    return ((rotation % 360) + 360) % 360;
}

// Flips use preview axes. Convert them to the cropper's rotation and horizontal-flip format.
function getOutputTransform(imageRotation: number, state: FlipTransform): OutputTransform {
    const rotation = normalizeRotation(imageRotation);

    if (state.horizontal && state.vertical)
        return { imageRotation: normalizeRotation(rotation + 180), flipHorizontal: false };

    if (state.horizontal)
        return { imageRotation: normalizeRotation(-rotation), flipHorizontal: true };

    if (state.vertical)
        return { imageRotation: normalizeRotation(180 - rotation), flipHorizontal: true };

    return { imageRotation: rotation, flipHorizontal: false };
}

function getPreviewTransform(position: Position, imageRotation: number, state: FlipTransform) {
    const transform = getOutputTransform(imageRotation, state);
    const horizontalFlip = transform.flipHorizontal ? " scaleX(-1)" : "";

    return `translate3d(${position.x}px, ${position.y}px, 0) rotate(${transform.imageRotation}deg)${horizontalFlip}`;
}

function getStoredTransform(state: FlipState): StoredFlipTransform {
    if (!state.enabled) return {};

    return {
        flipHorizontal: state.horizontal,
        flipVertical: state.vertical
    };
}

function FlipIcon({ vertical }: { vertical?: boolean; }) {
    return (
        <svg
            aria-hidden="true"
            className={vertical ? cl("icon-vertical") : undefined}
            height="24"
            viewBox="0 0 24 24"
            width="24"
        >
            <path fill="currentColor" d="M3 4h2v16H3V4Zm4 8 6-6v12l-6-6Zm8-6 6 6-6 6V6Z" />
        </svg>
    );
}

interface FlipButtonProps {
    active: boolean;
    buttonClassName: string;
    disabled: boolean;
    disabledClassName: string;
    label: string;
    onClick(): void;
    vertical?: boolean;
}

function FlipButton({ active, buttonClassName, disabled, disabledClassName, label, onClick, vertical }: FlipButtonProps) {
    return (
        <Tooltip text={label}>
            {tooltipProps => (
                <Clickable
                    {...tooltipProps}
                    aria-disabled={disabled}
                    aria-label={label}
                    aria-pressed={active}
                    className={classes(buttonClassName, disabled && disabledClassName, active && cl("button-active"))}
                    onClick={disabled ? undefined : onClick}
                    tabIndex={disabled ? -1 : 0}
                >
                    <FlipIcon vertical={vertical} />
                </Clickable>
            )}
        </Tooltip>
    );
}

interface FlipControlsProps {
    buttonClassName: string;
    disabled: boolean;
    disabledClassName: string;
    state: FlipState;
}

const FlipControls = ErrorBoundary.wrap(({ buttonClassName, disabled, disabledClassName, state }: FlipControlsProps) => {
    if (!state.enabled) return null;

    return (
        <>
            <FlipButton
                active={state.horizontal}
                buttonClassName={buttonClassName}
                disabled={disabled}
                disabledClassName={disabledClassName}
                label="Flip horizontally"
                onClick={state.toggleHorizontal}
            />
            <FlipButton
                active={state.vertical}
                buttonClassName={buttonClassName}
                disabled={disabled}
                disabledClassName={disabledClassName}
                label="Flip vertically"
                onClick={state.toggleVertical}
                vertical
            />
        </>
    );
}, { noop: true });

export default definePlugin({
    name: "FlipProfileImage",
    description: "Adds horizontal and vertical flip controls when editing your avatar or profile banner.",
    authors: [Devs.balaclava],
    tags: ["Media", "Utility"],

    patches: [{
        find: "#{intl::AVATAR_UPLOAD_EDIT_MEDIA}",
        group: true, // Roll back the whole group if any replacement fails.
        replacement: [
            {
                // This cropper is shared with other uploads; enable flips for avatars and profile banners.
                match: /(uploadType:(\i)=(\i\.\i)\.AVATAR,[^}]*?initialTransform:(\i),cropAspectRatio:\i}=\i),/,
                replace: (_, propsTail, uploadType, uploadTypes, initialTransform) =>
                    `${propsTail},vcFlipState=$self.useFlipState(${initialTransform},${uploadType}===${uploadTypes}.AVATAR||${uploadType}===${uploadTypes}.BANNER),`
            },
            {
                // Dragging, rotation and reset update the preview directly through its DOM ref.
                match: /((\i)\.current\.style\.transform=)`translate3d\(\$\{(\i)\.current\.x}px, \$\{\3\.current\.y}px, 0\) rotate\(\$\{(\i)\}deg\)`/,
                replace: "$1$self.getPreviewTransform($3.current,$4,vcFlipState)"
            },
            {
                // React renders the preview with the same transform as the direct updates.
                match: /(style:\{opacity:\+\(null!=\i\),transform:)`translate3d\(\$\{(\i)\.current\.x}px, \$\{\2\.current\.y}px, 0\) rotate\(\$\{(\i)\}deg\)`/,
                replace: "$1$self.getPreviewTransform($2.current,$3,vcFlipState)"
            },
            {
                // Apply the flip transform to both animated and static exports.
                match: /cropOriginCoordinates:(\i)\.current,maxDimensions:(\i),imageRotation:(\i)(?=})/g,
                replace: "cropOriginCoordinates:$1.current,maxDimensions:$2,...$self.getOutputTransform($3,vcFlipState)"
            },
            {
                // Save the original rotation with both flip flags so restoring them does not apply the flips twice.
                match: /transform:\{zoomRatio:(\i),imageRotation:(\i),(?=offsetRatio:)/,
                replace: "transform:{zoomRatio:$1,imageRotation:$2,...$self.getStoredTransform(vcFlipState),"
            },
            {
                // hasOriginalAsset:null!= anchors this to the call; the helper also destructures hasImageEdits.
                match: /hasImageEdits:(\i)(?=,hasOriginalAsset:null!=)/,
                replace: "hasImageEdits:$1||vcFlipState.hasFlips"
            },
            {
                // Enable reset when a flip is the only edit.
                match: /disabled:!(\i)(?=\}\),actions:\[)/,
                replace: "disabled:!$1&&!vcFlipState.hasFlips"
            },
            {
                // Clear flips before the cropper's reset callback updates the preview.
                match: /(\i=\i\.useCallback\(\(\)=>\{)(?=if\(null!=\i\.current&&null!=\i\)\{.{0,300}?type:"RESET")/,
                replace: "$1vcFlipState.reset();"
            },
            {
                // Reuse the controls container and rotation button classes from the same CSS module.
                match: /className:((\i)\.\i),children:\[(.{0,800}?\]\}\)),(?=.{0,300}className:\i\(\)\((\2\.\i),\{\[(\2\.\i)\]:(\i)\}\),onClick:\6\?void 0:)/,
                replace: (_, controlsClassName, _cssModule, zoomControls, buttonClassName, disabledClassName, controlsDisabled) =>
                    `className:$self.getControlsClass(${controlsClassName}),children:[${zoomControls},$self.renderControls(vcFlipState,${controlsDisabled},${buttonClassName},${disabledClassName}),`
            },
            {
                // Keep clockwise rotation consistent with the crop offset when mirrored.
                match: /\((\i)\+90\)%360/,
                replace: "($1+(vcFlipState.horizontal!==vcFlipState.vertical?270:90))%360"
            }
        ]
    }],

    getControlsClass(className: string) {
        return classes(className, cl("controls"));
    },
    getOutputTransform,
    getPreviewTransform,
    getStoredTransform,
    renderControls(state: FlipState, disabled: boolean, buttonClassName: string, disabledClassName: string) {
        return (
            <FlipControls
                buttonClassName={buttonClassName}
                disabled={disabled}
                disabledClassName={disabledClassName}
                state={state}
            />
        );
    },
    useFlipState
});
