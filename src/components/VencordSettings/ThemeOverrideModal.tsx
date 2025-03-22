/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type Settings, useSettings } from "@api/Settings";
import { PencilIcon, RestartIcon } from "@components/Icons";
import { Margins } from "@utils/margins";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Button, Card, Forms, React, Text, TextInput, useEffect, useState } from "@webpack/common";

interface CssRules {
    [selector: string]: {
        [property: string]: string;
    };
}

interface CssRuleCardProps {
    selector: string;
    properties: [string, string][];
    overrideRules: CssRules;
    setOverrideRules: React.Dispatch<React.SetStateAction<CssRules>>;
    settings: Settings;
    rawLink: string;
}

interface ThemeOverrideModalProps extends ModalProps {
    rawCssText: string;
    rawLink: string;
}

function getCssPropertyValue(style: CSSStyleDeclaration, prop: string): string | null {
    const value = style.getPropertyValue(prop);
    if (!value) return null;

    const priority = style.getPropertyPriority(prop);
    return `${value}${priority ? " !" + priority : ""}`;
}

function applyRulesToSheet(sheet: CSSStyleSheet, rules: CssRules) {
    Object.entries(rules).forEach(([sel, props]) => {
        const rule = `${sel} { ${Object.entries(props)
            .map(([p, v]) => `${p}: ${v}`)
            .join("; ")} }`;
        try {
            sheet.insertRule(rule);
        } catch (e) {
            console.error("Failed to insert rule:", rule, e);
        }
    });
}

function updateCssRule(rules: CssRules, selector: string, property: string, value: string) {
    const newRules = { ...rules };

    if (!value.trim()) {
        if (newRules[selector]) {
            delete newRules[selector][property];
            if (Object.keys(newRules[selector]).length === 0) {
                delete newRules[selector];
            }
        }
    } else {
        if (!newRules[selector]) {
            newRules[selector] = {};
        }
        newRules[selector][property] = value;
    }

    return newRules;
}

function updateThemeOverrides(settings: Settings, rawLink: string, rules: CssRules) {
    if (Object.keys(rules).length === 0) {
        delete settings.onlineThemeOverrides[rawLink];
    } else {
        const sheet = new CSSStyleSheet();
        applyRulesToSheet(sheet, rules);
        settings.onlineThemeOverrides[rawLink] = Array.from(sheet.cssRules)
            .map(rule => rule.cssText).join(" ");
    }
    settings.onlineThemeOverrides = { ...settings.onlineThemeOverrides };
}

function CssRuleCard({ selector, properties, overrideRules, setOverrideRules, settings, rawLink }: CssRuleCardProps) {
    const updateValue = (prop: string, value: string, shouldCommit = false) => {
        setOverrideRules(prev => {
            const newRules = updateCssRule(prev, selector, prop, value);
            if (shouldCommit) {
                updateThemeOverrides(settings, rawLink, newRules);
            }
            return newRules;
        });
    };

    return (
        <Card style={{ marginBottom: ".5em", paddingTop: ".2em", paddingBottom: ".5em" }}>
            <Forms.FormText style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: ".5em",
                marginBottom: ".5em",
                paddingLeft: ".5em",
                paddingRight: ".5em"
            }}>
                <code>{selector}</code>
                <div style={{ cursor: "pointer" }}
                    onClick={() => {
                        properties.forEach(([prop]) => updateValue(prop, "", true));
                    }}
                >
                    <RestartIcon width={16} height={16} />
                </div>
            </Forms.FormText>
            <div style={{ paddingLeft: "1.5em", paddingRight: "1.5em" }}>
                {properties.map(([prop, value], propIndex) => {
                    const inputRef = React.useRef<HTMLInputElement>(null);

                    return (
                        <Forms.FormText className={Margins.top8} key={propIndex}>
                            <code><b>{prop}</b>:</code>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                <TextInput
                                    inputRef={inputRef}
                                    value={overrideRules[selector]?.[prop] ?? ""}
                                    placeholder={value}
                                    onChange={v => updateValue(prop, v, false)}
                                    onBlur={e => updateValue(prop, e.currentTarget.value, true)}
                                    style={{
                                        fontFamily: "var(--font-code)",
                                        marginTop: ".5em",
                                        marginBottom: ".5em",
                                        flex: 1,
                                        minWidth: "200px",
                                        width: `${Math.max(200, value.length * 8)}px`
                                    }}
                                />
                                <div
                                    style={{ cursor: "pointer" }}
                                    onClick={() => {
                                        updateValue(prop, value, true);
                                        inputRef.current?.focus();
                                    }}
                                >
                                    <PencilIcon width={16} height={16} />
                                </div>
                                <div
                                    style={{ cursor: "pointer" }}
                                    onClick={() => {
                                        updateValue(prop, "", true);
                                        inputRef.current?.focus();
                                    }}
                                >
                                    <RestartIcon width={16} height={16} />
                                </div>
                            </div>
                        </Forms.FormText>
                    );
                })}
            </div>
        </Card >
    );
}

function ThemeOverrideModal({ rawCssText, rawLink, onClose, transitionState }: ThemeOverrideModalProps) {
    const settings = useSettings();
    const [cssRules, setCssRules] = useState<CSSRuleList | null>(null);
    const [overrideRules, setOverrideRules] = useState<CssRules>({});

    useEffect(() => {
        const themeSheet = new CSSStyleSheet();
        themeSheet.replaceSync(rawCssText);
        setCssRules(themeSheet.cssRules);

        if (settings.onlineThemeOverrides[rawLink]) {
            const savedOverrideSheet = new CSSStyleSheet();
            savedOverrideSheet.replaceSync(settings.onlineThemeOverrides[rawLink]);

            const savedOverrideRules: CssRules = {};
            const themeSelectors = new Set(Array.from(themeSheet.cssRules)
                .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
                .map(rule => rule.selectorText));

            Array.from(savedOverrideSheet.cssRules).forEach(rule => {
                if (!(rule instanceof CSSStyleRule)) return;

                const overrideSelector = rule.selectorText;
                if (!themeSelectors.has(overrideSelector)) return;

                const themeRule = Array.from(themeSheet.cssRules)
                    .find((r): r is CSSStyleRule =>
                        r instanceof CSSStyleRule && r.selectorText === overrideSelector
                    );
                if (!themeRule) return;

                const themeProperties = new Set(Array.from(themeRule.style));
                savedOverrideRules[overrideSelector] = {};

                for (const prop of rule.style) {
                    if (!themeProperties.has(prop)) continue;

                    const value = getCssPropertyValue(rule.style, prop);
                    if (value) {
                        savedOverrideRules[overrideSelector][prop] = value;
                    }
                }

                if (Object.keys(savedOverrideRules[overrideSelector]).length === 0) {
                    delete savedOverrideRules[overrideSelector];
                }
            });

            updateThemeOverrides(settings, rawLink, savedOverrideRules);
            setOverrideRules(savedOverrideRules);
        }
    }, [rawCssText]);

    if (!cssRules) return null;

    return (
        <ModalRoot transitionState={transitionState} size={ModalSize.LARGE} className="vc-text-selectable">
            <ModalHeader>
                <Text variant="heading-lg/semibold" style={{ flexGrow: 1 }}>Theme CSS Override</Text>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>
            <ModalContent>
                <Card className="vc-settings-card" style={{ marginTop: "1em" }}>
                    <Forms.FormText>{rawLink}</Forms.FormText>
                </Card>
                <Card style={{ padding: "1em", marginTop: "1em" }}>
                    <Button
                        color={Button.Colors.RED}
                        size={Button.Sizes.SMALL}
                        onClick={() => {
                            setOverrideRules({});
                            updateThemeOverrides(settings, rawLink, {});
                        }}
                    >
                        Remove All CSS Overrides
                    </Button>
                </Card>
                <Forms.FormSection className={Margins.top8}>
                    {Array.from(cssRules || []).map((rule, index) => {
                        if (!(rule instanceof CSSStyleRule)) return null;

                        const selector = rule.selectorText;
                        const properties: [string, string][] = [];

                        for (const prop of rule.style) {
                            const value = getCssPropertyValue(rule.style, prop);
                            if (value) {
                                properties.push([prop, value]);
                            }
                        }

                        return (
                            <CssRuleCard
                                key={index}
                                selector={selector}
                                properties={properties}
                                overrideRules={overrideRules}
                                setOverrideRules={setOverrideRules}
                                settings={settings}
                                rawLink={rawLink}
                            />
                        );
                    })}
                </Forms.FormSection>
            </ModalContent>
            <ModalFooter>
                <Button onClick={onClose} size={Button.Sizes.SMALL} color={Button.Colors.PRIMARY} look={Button.Looks.LINK}>
                    Close
                </Button>
            </ModalFooter>
        </ModalRoot>
    );
}

export function openThemeOverrideModal(rawCssText: string, rawLink: string) {
    openModal(modalProps => (
        <ThemeOverrideModal
            {...modalProps}
            rawCssText={rawCssText}
            rawLink={rawLink}
        />
    ));
}
