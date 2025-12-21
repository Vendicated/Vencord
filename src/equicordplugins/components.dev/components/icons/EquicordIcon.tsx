/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function EquicordIcon({ className, size, color }: { className?: string; size?: string; color?: string; }) {
    const dimension = size === "xs" ? 12 : size === "sm" ? 16 : size === "lg" ? 24 : 20;
    return (
        <svg className={className} viewBox="0 0 443 443" width={dimension} height={dimension}>
            <path fill={color || "currentColor"} d="M221.5.6C99.2.6,0,99.7,0,222.1s99.2,221.5,221.5,221.5,221.5-99.2,221.5-221.5S343.8.6,221.5.6ZM221.5,363.3c-78.3,0-141.8-63.5-141.8-141.8s63.5-141.8,141.8-141.8,141.8,63.5,141.8,141.8-63.5,141.8-141.8,141.8Z" />
            <path fill={color || "currentColor"} d="M438.3,175C421,90.1,354.7,23.1,269.9,5.1,145-21.3,33.1,57.6,6.2,169.5c-3.4,14.1,4.6,28.5,18.4,33.1l2.7.9c24.7,8.2,51.8-4.7,60.4-29.3,19.4-55.6,72.5-95.4,134.9-95,44.3.3,84.1,21.2,109.9,53.7l-63.3,29.5c-7.9-7-17.5-12.5-28.5-15.7-35.6-10.3-73.8,7.7-88.5,41.7-17.2,39.8,3.3,85.4,43.9,99.4,37.9,13,79.7-6.9,93.5-44.5,2.6-7.2,4.1-14.5,4.4-21.8l66-30.8c1.8,8.2,2.9,16.6,3.2,25.2,1.2,34-9.6,65.5-28.5,90.5-17.8,23.6-10.5,57.4,15.7,71.1l1.3.7c10.4,5.5,23.3,3.4,31.4-5.2,46.8-49.9,70.8-121.4,55.2-198Z" />
            <path fill={color || "currentColor"} transform="translate(319.7 -16.5) rotate(65)" d="M172.8,152.7h0c17.7,0,32,14.3,32,32v148h-64v-148c0-17.7,14.3-32,32-32Z" />
        </svg>
    );
}
