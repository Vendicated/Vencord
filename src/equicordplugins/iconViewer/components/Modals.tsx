/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BaseText } from "@components/BaseText";
import { CodeBlock } from "@components/CodeBlock";
import { Flex } from "@components/Flex";
import { HeadingSecondary } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { TooltipContainer } from "@components/TooltipContainer";
import { copyWithToast, getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { saveFile } from "@utils/web";
import { Icon, RenderModalProps } from "@vencord/discord-types";
import { findComponentByCodeLazy } from "@webpack";
import {
    Clickable,
    ContextMenuApi,
    FluxDispatcher,
    Menu,
    Modal,
    openModal,
    useCallback,
    useEffect,
    useMemo,
    useState
} from "@webpack/common";

import { cssColors, getCssColorKeys, iconSizes, iconSizesInPx } from "../utils";

const logger = new Logger("IconViewer");
const BugIcon = findComponentByCodeLazy("1.1.27.1.37 0a6.66 6.6");

const FORMAT_EXTENSIONS: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/avif": "avif"
};

function useColorNavigation(initialColor: number) {
    const [color, setColor] = useState(initialColor);

    const onKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            setColor(c => {
                const next = c + (e.key === "ArrowLeft" ? -1 : 1);
                const max = getCssColorKeys().length;
                return next < 0 ? max - 1 : next >= max ? 0 : next;
            });
        }
    }, []);

    const onColorChange = useCallback((e: { color: string; }) => {
        const keys = getCssColorKeys();
        const idx = keys.indexOf(e.color);
        if (idx !== -1) setColor(idx);
    }, []);

    useEffect(() => {
        document.addEventListener("keydown", onKeyDown);
        FluxDispatcher.subscribe("ICONVIEWER_COLOR_CHANGE", onColorChange);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            FluxDispatcher.unsubscribe("ICONVIEWER_COLOR_CHANGE", onColorChange);
        };
    }, [onKeyDown, onColorChange]);

    return [color, setColor] as const;
}

function ColorContextMenu({ colorKeys }: { colorKeys: string[]; }) {
    const [query, setQuery] = useState("");
    const filtered = colorKeys.filter(k =>
        !query || k.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <Menu.Menu
            navId="vc-ic-colors-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Icon Viewer Colors"
        >
            <Menu.MenuControlItem
                id="vc-ic-colors-search"
                control={(props, ref) => (
                    <Menu.MenuSearchControl
                        {...props}
                        query={query}
                        onChange={setQuery}
                        ref={ref}
                        placeholder={getIntlMessage("SEARCH")}
                        autoFocus
                    />
                )}
            />
            <Menu.MenuSeparator />
            {filtered.map(colorKey => (
                <Menu.MenuItem
                    key={colorKey}
                    id={colorKey}
                    label={colorKey}
                    action={() => FluxDispatcher.dispatch({ type: "ICONVIEWER_COLOR_CHANGE", color: colorKey })}
                />
            ))}
        </Menu.Menu>
    );
}

function saveIcon(iconName: string, icon: Element, color: number, size: number, type: string) {
    const colorName = cssColors[color]?.name ?? "unknown";
    const ext = FORMAT_EXTENSIONS[type] ?? "png";
    const filename = `${iconName}-${colorName}-${size}px.${ext}`;

    const svg = icon.cloneNode(true) as Element;
    for (const el of svg.children) {
        const fill = el.getAttribute("fill");
        if (fill?.startsWith("var(")) {
            el.setAttribute("fill", getComputedStyle(icon).getPropertyValue(fill.slice(4, -1)));
        }
    }
    const data = new XMLSerializer().serializeToString(svg);

    if (type === "image/svg+xml") {
        saveFile(new File([data], filename, { type }));
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0, size, size);
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL(type);
        link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(data)}`;
}

function OtherContextMenu({ iconName, Icon, color }: { iconName: string; Icon: Icon; color: number; }) {
    const handleSave = (type: string) => {
        const iconEl = document.querySelector(".vc-ic-icon-preview .vc-ic-icon-large");
        if (iconEl) saveIcon(iconName, iconEl, color, iconSizesInPx.lg, type);
    };

    return (
        <Menu.Menu
            navId="vc-ic-other-menu"
            onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
            aria-label="Icon Options"
        >
            <Menu.MenuItem
                id="log-console"
                label="Log to Console"
                icon={BugIcon}
                leadingAccessory={{ type: "icon", icon: BugIcon }}
                action={() => logger.info(Icon)}
            />
            <Menu.MenuItem id="save" label="Save As...">
                <Menu.MenuItem
                    id="save-png"
                    label="PNG"
                    action={() => handleSave("image/png")}
                />
                <Menu.MenuItem
                    id="save-svg"
                    label="SVG"
                    action={() => handleSave("image/svg+xml")}
                />
                <Menu.MenuItem
                    id="save-jpeg"
                    label="JPEG"
                    action={() => handleSave("image/jpeg")}
                />
                <Menu.MenuItem
                    id="save-webp"
                    label="WEBP"
                    action={() => handleSave("image/webp")}
                />
                <Menu.MenuItem
                    id="save-gif"
                    label="GIF"
                    action={() => handleSave("image/gif")}
                />
                <Menu.MenuItem
                    id="save-avif"
                    label="AVIF"
                    action={() => handleSave("image/avif")}
                />
            </Menu.MenuItem>
        </Menu.Menu>
    );
}

function IconModal({ iconName, Icon, onClose, transitionState }: { iconName: string; Icon: Icon; } & RenderModalProps) {
    const [color, setColor] = useColorNavigation(209);
    const colorData = cssColors[color];
    const colorKeys = useMemo(() => getCssColorKeys(), []);

    const fill = iconName === "CircleShieldIcon" ? "var(--background-base-low)" : colorData?.css;
    const findCode = `const ${iconName} = findExportedComponentLazy("${iconName}")`;

    const openColorMenu = (e: React.MouseEvent) => {
        ContextMenuApi.openContextMenu(e, () => <ColorContextMenu colorKeys={colorKeys} />);
    };

    const onWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const max = colorKeys.length;
        setColor(c => {
            const next = c + (e.deltaY > 0 ? 1 : -1);
            return next < 0 ? max - 1 : next >= max ? 0 : next;
        });
    }, [colorKeys.length, setColor]);

    const openOtherMenu = (e?: React.MouseEvent) => {
        if (e) ContextMenuApi.openContextMenu(e, () => (
            <OtherContextMenu iconName={iconName} Icon={Icon} color={color} />
        ));
    };

    return (
        <Modal
            transitionState={transitionState}
            onClose={onClose}
            size="md"
            title={iconName}
            actions={[
                {
                    text: "Actions",
                    variant: "primary",
                    onClick: openOtherMenu
                }
            ]}
        >
            <Flex className="vc-ic-modal-main">
                <div
                    className="vc-ic-icon-preview"
                    aria-label={colorData?.name}
                    onContextMenu={openColorMenu}
                    onWheel={onWheel}
                >
                    <Icon className="vc-ic-icon-large" color={colorData?.css} fill={fill} />
                </div>
                <Flex flexDirection="column" className="vc-ic-icon-info">
                    <Flex className="vc-ic-icon-sizes">
                        {iconSizes.map(size => (
                            <TooltipContainer text={size} key={size}>
                                <Icon size={size} color={colorData?.css} fill={fill} />
                            </TooltipContainer>
                        ))}
                    </Flex>
                    <TooltipContainer text="Right-click icon to change">
                        <BaseText size="sm" color="text-muted" className="vc-ic-color-label">
                            {colorData?.name}
                        </BaseText>
                    </TooltipContainer>
                </Flex>
            </Flex>
            <div className="vc-ic-use-as">
                <BaseText size="md" weight="semibold">Usage</BaseText>
                <BaseText size="sm" color="text-muted">Click to copy</BaseText>
            </div>
            {/* for some reason i cant make this shit codeblock full width, FF 15 */}
            <Clickable className="vc-ic-codeblock-wrapper" onClick={() => copyWithToast(findCode, "Copied!")}>
                <CodeBlock content={findCode} lang="ts" />
            </Clickable>
        </Modal>
    );
}

export function openIconModal(iconName: string, Icon: Icon) {
    openModal(props => <IconModal iconName={iconName} Icon={Icon} {...props} />);
}

export function SettingsAbout() {
    return (
        <>
            <HeadingSecondary>Features</HeadingSecondary>
            <Paragraph>
                <ul className="vc-ic-unordered-list">
                    <li>Preview icons</li>
                    <li>Copy icon names and CSS variables</li>
                    <li>Download icons in different formats (SVG, PNG, GIF, etc.)</li>
                    <li>Copy pre-made icon finds for your plugins</li>
                    <li>Find icons by function context</li>
                    <li>Search for colors by right-clicking the color name</li>
                </ul>
            </Paragraph>
            <HeadingSecondary>Special thanks</HeadingSecondary>
            <Paragraph>
                <ul className="vc-ic-unordered-list">
                    <li>krystalskullofficial._.</li>
                    <li>davr1</li>
                    <li>suffocate</li>
                </ul>
            </Paragraph>
        </>
    );
}
