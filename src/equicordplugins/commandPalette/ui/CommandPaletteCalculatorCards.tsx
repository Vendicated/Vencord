/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import { classes } from "@utils/misc";
import { useEffect, useMemo, useRef, useState } from "@webpack/common";

import type { CalculatorGraphSeries, CalculatorResult, CalculatorViewMode } from "../calculator";

interface CommandPaletteCalculatorCardsProps {
    result: CalculatorResult;
    mode: CalculatorViewMode;
}

interface AutoFitLineProps {
    text: string;
    className: string;
    maxSize: number;
    minSize: number;
}

const cl = classNameFactory("vc-command-palette-");
const GRAPH_WIDTH = 760;
const GRAPH_HEIGHT = 320;
const GRAPH_PADDING_X = 34;
const GRAPH_PADDING_Y = 24;
const GRAPH_INNER_WIDTH = GRAPH_WIDTH - GRAPH_PADDING_X * 2;

const SUPERSCRIPT_MAP: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
    "+": "⁺",
    "-": "⁻",
    "(": "⁽",
    ")": "⁾"
};

function toSuperscript(value: string): string {
    return Array.from(value).map(char => SUPERSCRIPT_MAP[char] ?? char).join("");
}

function formatMathDisplayInput(value: string): string {
    return value
        .replace(/\*\*/g, "^")
        .replace(/\bpi\b/g, "π")
        .replace(/\btau\b/g, "τ")
        .replace(/\binfinity\b/g, "∞")
        .replace(/\*/g, "×")
        .replace(/\^([+-]?\d+)/g, (_, exponent: string) => toSuperscript(exponent));
}

function AutoFitLine({ text, className, maxSize, minSize }: AutoFitLineProps) {
    const ref = useRef<HTMLDivElement | null>(null);
    const [fontSize, setFontSize] = useState(maxSize);
    const [wrapped, setWrapped] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        let frame = 0;
        const fit = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                let next = maxSize;
                let nextWrapped = false;
                node.classList.remove(cl("calculator-value-wrapped"));
                node.style.fontSize = `${next}px`;

                while (next > minSize && node.scrollWidth > node.clientWidth) {
                    next -= 1;
                    node.style.fontSize = `${next}px`;
                }

                if (node.scrollWidth > node.clientWidth) {
                    nextWrapped = true;
                    node.classList.add(cl("calculator-value-wrapped"));
                }

                setFontSize(next);
                setWrapped(nextWrapped);
            });
        };

        fit();

        const observer = typeof ResizeObserver !== "undefined"
            ? new ResizeObserver(fit)
            : null;
        observer?.observe(node);
        window.addEventListener("resize", fit);

        return () => {
            cancelAnimationFrame(frame);
            observer?.disconnect();
            window.removeEventListener("resize", fit);
        };
    }, [maxSize, minSize, text]);

    return (
        <div
            ref={ref}
            className={classes(className, wrapped && cl("calculator-value-wrapped"))}
            style={{ fontSize }}
        >
            {text}
        </div>
    );
}

function formatHoverValue(value: number): string {
    if (Number.isNaN(value)) return "NaN";
    if (value === Number.POSITIVE_INFINITY) return "Infinity";
    if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
    const rounded = Number(value.toFixed(4));
    return String(rounded);
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function toSvgX(value: number, domain: [number, number]): number {
    const [min, max] = domain;
    if (max === min) return GRAPH_PADDING_X + GRAPH_INNER_WIDTH / 2;
    return GRAPH_PADDING_X + ((value - min) / (max - min)) * GRAPH_INNER_WIDTH;
}

function toSvgY(value: number, range: [number, number]): number {
    const [min, max] = range;
    const innerHeight = GRAPH_HEIGHT - GRAPH_PADDING_Y * 2;
    if (max === min) return GRAPH_PADDING_Y + innerHeight / 2;
    return GRAPH_PADDING_Y + innerHeight - ((value - min) / (max - min)) * innerHeight;
}

function buildPath(series: CalculatorGraphSeries, domain: [number, number], range: [number, number]): string {
    let path = "";
    let drawing = false;

    for (const point of series.points) {
        if (point.y == null) {
            drawing = false;
            continue;
        }

        const x = toSvgX(point.x, domain);
        const y = toSvgY(point.y, range);
        path += `${drawing ? "L" : "M"}${x} ${y} `;
        drawing = true;
    }

    return path.trim();
}

function resolveNearestPoint(series: CalculatorGraphSeries, x: number) {
    let nearest = series.points[0];
    for (const point of series.points) {
        if (Math.abs(point.x - x) < Math.abs(nearest.x - x)) {
            nearest = point;
        }
    }

    return nearest;
}

function GraphView({ result }: { result: CalculatorResult; }) {
    const { graph } = result;
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [hoverX, setHoverX] = useState<number | null>(null);

    const hoverSeries = useMemo(() => {
        if (!graph || hoverX == null) return [];
        return graph.series.map(series => ({
            series,
            point: resolveNearestPoint(series, hoverX)
        }));
    }, [graph, hoverX]);

    if (!graph) return null;

    const axisX = toSvgY(clamp(0, graph.range[0], graph.range[1]), graph.range);
    const axisY = toSvgX(clamp(0, graph.domain[0], graph.domain[1]), graph.domain);
    const crosshairX = hoverX == null ? null : toSvgX(hoverX, graph.domain);

    return (
        <section className={cl("calculator")}>
            <h3 className={cl("calculator-title")}>Calculator</h3>
            <div className={classes(cl("calculator-card"), cl("calculator-graph-card"))}>
                <div className={cl("calculator-graph-header")}>
                    <div className={cl("calculator-graph-title")}>
                        {formatMathDisplayInput(result.normalizedInput ?? result.displayInput)}
                    </div>
                    <div className={cl("calculator-graph-meta")}>
                        {hoverSeries.length > 0 ? hoverSeries.map(({ series, point }) => (
                            <div key={series.id} className={cl("calculator-graph-readout")}>
                                <span className={cl("calculator-graph-swatch")} style={{ backgroundColor: series.color }} />
                                <span>{series.label}</span>
                                <span className={cl("calculator-graph-readout-value")}>
                                    {point.y == null ? "undefined" : `(${formatHoverValue(point.x)}, ${formatHoverValue(point.y)})`}
                                </span>
                            </div>
                        )) : (
                            graph.series.map(series => (
                                <div key={series.id} className={cl("calculator-graph-readout")}>
                                    <span className={cl("calculator-graph-swatch")} style={{ backgroundColor: series.color }} />
                                    <span>{series.label}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className={cl("calculator-graph-surface")}>
                    <svg
                        ref={svgRef}
                        className={cl("calculator-graph-svg")}
                        viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                        onMouseLeave={() => setHoverX(null)}
                        onMouseMove={event => {
                            const bounds = svgRef.current?.getBoundingClientRect();
                            if (!bounds) return;
                            const scaleX = bounds.width / GRAPH_WIDTH;
                            const localX = (event.clientX - bounds.left) / scaleX;
                            const innerX = clamp(localX - GRAPH_PADDING_X, 0, GRAPH_INNER_WIDTH);
                            const clampedRatio = innerX / GRAPH_INNER_WIDTH;
                            const nextX = graph.domain[0] + (graph.domain[1] - graph.domain[0]) * clampedRatio;
                            setHoverX(nextX);
                        }}
                    >
                        <rect x="0" y="0" width={GRAPH_WIDTH} height={GRAPH_HEIGHT} rx="14" className={cl("calculator-graph-bg")} />
                        <line x1={GRAPH_PADDING_X} x2={GRAPH_WIDTH - GRAPH_PADDING_X} y1={axisX} y2={axisX} className={cl("calculator-graph-axis")} />
                        <line y1={GRAPH_PADDING_Y} y2={GRAPH_HEIGHT - GRAPH_PADDING_Y} x1={axisY} x2={axisY} className={cl("calculator-graph-axis")} />
                        {crosshairX != null && (
                            <line
                                y1={GRAPH_PADDING_Y}
                                y2={GRAPH_HEIGHT - GRAPH_PADDING_Y}
                                x1={crosshairX}
                                x2={crosshairX}
                                className={cl("calculator-graph-crosshair")}
                            />
                        )}
                        {graph.series.map(series => (
                            <path
                                key={series.id}
                                d={buildPath(series, graph.domain, graph.range)}
                                fill="none"
                                stroke={series.color}
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        ))}
                        {hoverSeries.map(({ series, point }) => point.y == null ? null : (
                            <circle
                                key={`${series.id}-hover`}
                                cx={toSvgX(point.x, graph.domain)}
                                cy={toSvgY(point.y, graph.range)}
                                r="4.5"
                                fill={series.color}
                                stroke="white"
                                strokeWidth="1.5"
                            />
                        ))}
                    </svg>
                </div>
                <div className={cl("calculator-graph-footer")}>
                    <span>{result.displayAnswer}</span>
                    <span>{result.secondaryText ?? "Graph"}</span>
                </div>
            </div>
        </section>
    );
}

function ResultView({ result }: { result: CalculatorResult; }) {
    const today = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    }).format(new Date());
    const leftLabel = result.tertiaryText
        ?? (result.kind === "number" ? "Expression" : result.kind === "unit" ? "Input" : today);
    const rightLabel = result.secondaryText ?? "Answer";
    const displayInput = result.kind === "number"
        ? formatMathDisplayInput(result.normalizedInput ?? result.displayInput)
        : result.displayInput;

    return (
        <section className={cl("calculator")}>
            <h3 className={cl("calculator-title")}>Calculator</h3>
            <div className={cl("calculator-card")}>
                <div className={classes(cl("calculator-section"), cl("calculator-section-left"))}>
                    <AutoFitLine text={displayInput} className={cl("calculator-value")} maxSize={38} minSize={18} />
                    <span className={cl("calculator-label")}>{leftLabel}</span>
                </div>
                <div className={cl("calculator-arrow")}>→</div>
                <div className={classes(cl("calculator-section"), cl("calculator-section-right"))}>
                    <AutoFitLine text={result.displayAnswer} className={cl("calculator-value")} maxSize={38} minSize={18} />
                    <span className={cl("calculator-label")}>{rightLabel}</span>
                </div>
            </div>
        </section>
    );
}

export function CommandPaletteCalculatorCards({ result, mode }: CommandPaletteCalculatorCardsProps) {
    if (mode === "graph" && result.graph) {
        return <GraphView result={result} />;
    }

    return <ResultView result={result} />;
}
