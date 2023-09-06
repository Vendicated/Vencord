/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export default function Spinner() {
    return <div className="spinner-2ID8f1 spinningCircle-3aZig-" role="img" aria-label="Loading">
        <div className="spinningCircleInner-YCEeSc inner-MGEKwh">
            <svg className="circular-2aZ0P_" viewBox="25 25 50 50">
                <circle className="path-_o_4bT path3-3TAamH" cx="50" cy="50" r="20" style={{ stroke: "currentColor", opacity: .3 }} />
                <circle className="path-_o_4bT path2-6i8gUh" cx="50" cy="50" r="20" style={{ stroke: "currentColor", opacity: .6 }} />
                <circle className="path-_o_4bT" cx="50" cy="50" r="20" style={{ stroke: "currentColor" }} />
            </svg>
        </div>
    </div>;
}
