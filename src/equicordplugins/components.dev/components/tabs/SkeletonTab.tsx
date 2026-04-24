/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Skeleton } from "@equicordplugins/components.dev";

import { ManaButton, useState } from "..";
import { DocPage, type PropDef } from "../DocPage";

const SKELETON_PROPS: PropDef[] = [
    { name: "withHeader", type: "boolean", default: "true", description: "Show a header placeholder row." },
    { name: "size", type: "number", default: "15", description: "Number of skeleton rows to display." },
];

function SkeletonDemo() {
    const [withHeader, setWithHeader] = useState(true);
    const [size, setSize] = useState(5);

    return (
        <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <ManaButton variant="secondary" text={withHeader ? "Hide Header" : "Show Header"} onClick={() => setWithHeader(!withHeader)} />
                <ManaButton variant="secondary" text="Fewer Items" onClick={() => setSize(Math.max(1, size - 1))} />
                <ManaButton variant="secondary" text="More Items" onClick={() => setSize(Math.min(20, size + 1))} />
            </div>
            <div className="full-motion">
                <Skeleton withHeader={withHeader} size={size} />
            </div>
        </div>
    );
}

export default function SkeletonTab() {
    return (
        <DocPage
            componentName="Skeleton"
            overview="Skeleton displays a loading placeholder with shimmer animation. Used in Discord's member list and other loading states. Renders rows of animated placeholder content with an optional header."
            importPath={'import { Skeleton } from "../components";'}
            sections={[
                {
                    title: "Interactive Demo",
                    description: "Toggle the header and adjust the number of skeleton rows.",
                    children: <SkeletonDemo />,
                    code: "<Skeleton withHeader={true} size={5} />",
                    relevantProps: ["withHeader", "size"],
                },
                {
                    title: "Header Only",
                    children: (
                        <div className="full-motion">
                            <Skeleton withHeader={true} size={0} />
                        </div>
                    ),
                },
                {
                    title: "No Header",
                    children: (
                        <div className="full-motion">
                            <Skeleton withHeader={false} size={3} />
                        </div>
                    ),
                },
            ]}
            props={SKELETON_PROPS}
        />
    );
}
