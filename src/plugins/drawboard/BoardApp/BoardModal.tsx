/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findByPropsLazy, waitFor } from "@webpack";
import { useRef } from "@webpack/common";

import MainBoard from "./MainBoard";

const easing = findByPropsLazy("Easing").Easing;
let reactSpring;
waitFor(["useSpring", "animated"], m => {
    reactSpring = m;
});


const BoardModal = modalProps => {
    const divref = useRef<HTMLDivElement>(null);

    const state = modalProps.transitionState === 0 || modalProps.transitionState === 1; // ModalTransitionState.ENTERING || ModalTransitionState.ENTERED
    const props = reactSpring.useSpring({
        opacity: state ? 1 : 0,
        config: {
            duration: 100,
            easing: easing.linear,
        }
    });

    return (
        <reactSpring.animated.div style={{ ...props, width: "100%", height: "100%", backgroundColor: "transparent", borderRadius: 0, pointerEvents: "all" }} ref={divref}>
            <MainBoard />
        </reactSpring.animated.div>
    );
};

export default BoardModal;
