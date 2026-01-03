/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Animations, ManaButton, Paragraph, SpringConfigs, useSpring, useState, useTrail, useTransition } from "..";
import { SectionWrapper } from "../SectionWrapper";

const { animated } = Animations;

const TRAIL_ITEMS = ["Discord", "uses", "react-spring", "for", "animations"];

function SpringDemo() {
    const [toggled, setToggled] = useState(false);
    const [config, setConfig] = useState<keyof typeof SpringConfigs>("default");

    const spring = useSpring({
        opacity: toggled ? 1 : 0.3,
        transform: toggled ? "scale(1) rotate(0deg)" : "scale(0.8) rotate(-10deg)",
        backgroundColor: toggled ? "var(--brand-500)" : "var(--background-tertiary)",
        config: SpringConfigs[config]
    });

    return (
        <SectionWrapper title="useSpring">
            <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                Animate values with spring physics. Click the box or change config.
            </Paragraph>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {(Object.keys(SpringConfigs) as (keyof typeof SpringConfigs)[]).map(c => (
                    <ManaButton
                        key={c}
                        variant={config === c ? "primary" : "secondary"}
                        size="sm"
                        text={c}
                        onClick={() => setConfig(c)}
                    />
                ))}
            </div>
            <animated.div
                onClick={() => setToggled(!toggled)}
                style={{
                    ...spring,
                    width: 120,
                    height: 120,
                    borderRadius: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
            >
                <Paragraph color="text-strong">Click me</Paragraph>
            </animated.div>
        </SectionWrapper>
    );
}

function TransitionDemo() {
    const [items, setItems] = useState([1, 2, 3]);
    const [nextId, setNextId] = useState(4);

    const transitions = useTransition(items, {
        from: { opacity: 0, transform: "translateX(-20px) scale(0.9)" },
        enter: { opacity: 1, transform: "translateX(0px) scale(1)" },
        leave: { opacity: 0, transform: "translateX(20px) scale(0.9)" },
        keys: item => item,
        config: SpringConfigs.gentle
    });

    const addItem = () => {
        setItems([...items, nextId]);
        setNextId(nextId + 1);
    };

    const removeItem = (id: number) => {
        setItems(items.filter(i => i !== id));
    };

    return (
        <SectionWrapper title="useTransition">
            <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                Animate items entering and leaving a list.
            </Paragraph>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <ManaButton variant="primary" size="sm" text="Add Item" onClick={addItem} />
                <ManaButton
                    variant="secondary"
                    size="sm"
                    text="Clear All"
                    onClick={() => setItems([])}
                    disabled={items.length === 0}
                />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", minHeight: 50 }}>
                {transitions((style, item) => (
                    <animated.div
                        style={{
                            ...style,
                            padding: "8px 16px",
                            background: "var(--background-secondary)",
                            borderRadius: 8,
                            cursor: "pointer"
                        }}
                        onClick={() => removeItem(item)}
                    >
                        <Paragraph>Item {item}</Paragraph>
                    </animated.div>
                ))}
            </div>
        </SectionWrapper>
    );
}

function TrailDemo() {
    const [show, setShow] = useState(true);

    const trail = useTrail(TRAIL_ITEMS.length, {
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0px)" : "translateY(20px)",
        config: SpringConfigs.gentle
    }) as object[];

    return (
        <SectionWrapper title="useTrail">
            <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                Staggered animations for multiple items. Each item animates slightly after the previous.
            </Paragraph>
            <div style={{ marginBottom: 16 }}>
                <ManaButton
                    variant="secondary"
                    size="sm"
                    text={show ? "Hide" : "Show"}
                    onClick={() => setShow(!show)}
                />
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", minHeight: 40 }}>
                {trail.map((style, i) => (
                    <animated.div
                        key={i}
                        style={{
                            ...style,
                            padding: "8px 12px",
                            background: "var(--brand-500)",
                            borderRadius: 6
                        }}
                    >
                        <Paragraph color="text-strong">{TRAIL_ITEMS[i]}</Paragraph>
                    </animated.div>
                ))}
            </div>
        </SectionWrapper>
    );
}

function AnimatedElementsDemo() {
    const [hover, setHover] = useState(false);

    const hoverSpring = useSpring({
        scale: hover ? 1.05 : 1,
        boxShadow: hover
            ? "0 8px 24px rgba(0,0,0,0.3)"
            : "0 2px 8px rgba(0,0,0,0.1)",
        config: SpringConfigs.wobbly
    });

    return (
        <SectionWrapper title="animated Elements">
            <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                Use animated.div, animated.span, animated.svg, etc. for spring-animated elements.
            </Paragraph>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <animated.div
                    onMouseEnter={() => setHover(true)}
                    onMouseLeave={() => setHover(false)}
                    style={{
                        ...hoverSpring,
                        width: 100,
                        height: 100,
                        background: "var(--background-secondary)",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer"
                    }}
                >
                    <Paragraph color="text-muted" style={{ fontSize: 12 }}>Hover me</Paragraph>
                </animated.div>
            </div>
        </SectionWrapper>
    );
}

export default function AnimationsTab() {
    return (
        <div className="vc-compfinder-section">
            <SpringDemo />
            <TransitionDemo />
            <TrailDemo />
            <AnimatedElementsDemo />

            <SectionWrapper title="Spring Configs">
                <Paragraph color="text-muted" style={{ marginBottom: 8 }}>
                    Preset spring configurations for different animation feels.
                </Paragraph>
                <Paragraph color="text-muted">• default - Standard spring</Paragraph>
                <Paragraph color="text-muted">• gentle - Soft, slow spring</Paragraph>
                <Paragraph color="text-muted">• wobbly - Bouncy, playful spring</Paragraph>
                <Paragraph color="text-muted">• stiff - Quick, snappy spring</Paragraph>
                <Paragraph color="text-muted">• slow - Very slow spring</Paragraph>
                <Paragraph color="text-muted">• molasses - Extremely slow spring</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Available Hooks">
                <Paragraph color="text-muted">• useSpring - Single spring animation</Paragraph>
                <Paragraph color="text-muted">• useSprings - Multiple springs</Paragraph>
                <Paragraph color="text-muted">• useTransition - Enter/leave animations</Paragraph>
                <Paragraph color="text-muted">• useTrail - Staggered animations</Paragraph>
                <Paragraph color="text-muted">• useChain - Sequence animations</Paragraph>
            </SectionWrapper>

            <SectionWrapper title="Available Components">
                <Paragraph color="text-muted">• Transition - Declarative transitions</Paragraph>
                <Paragraph color="text-muted">• Spring - Declarative spring</Paragraph>
                <Paragraph color="text-muted">• Trail - Declarative trail</Paragraph>
                <Paragraph color="text-muted">• animated.* - Animated HTML/SVG elements</Paragraph>
            </SectionWrapper>
        </div>
    );
}
