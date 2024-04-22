/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export default function ({ className }: { className?: string; }) {
    return <div className={"colorwaysBtn-spinner" + (className ? " " + className : "")} role="img" aria-label="Loading">
        <div className="colorwaysBtn-spinnerInner">
            <svg className="colorwaysBtn-spinnerCircular" viewBox="25 25 50 50" fill="currentColor">
                <circle className="colorwaysBtn-spinnerBeam colorwaysBtn-spinnerBeam3" cx="50" cy="50" r="20" />
                <circle className="colorwaysBtn-spinnerBeam colorwaysBtn-spinnerBeam2" cx="50" cy="50" r="20" />
                <circle className="colorwaysBtn-spinnerBeam" cx="50" cy="50" r="20" />
            </svg>
        </div>
    </div>;
}
