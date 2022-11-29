/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { React } from "@webpack/common";

export const checkIntersecting = (el: Element) => {
    const elementBox = el.getBoundingClientRect();
    const documentHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    return !(elementBox.bottom < 0 || elementBox.top - documentHeight >= 0);
};

export const useIntersection = () => {
    const observerRef = React.useRef<IntersectionObserver | null>(null);
    const [isIntersecting, setIntersecting] = React.useState(false);

    const refCallback = (element: Element | null) => {
        observerRef.current?.disconnect();
        observerRef.current = null;

        if (!element) return;

        if (checkIntersecting(element)) {
            setIntersecting(true);
            return;
        }

        observerRef.current = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting && entry.target === element) {
                    setIntersecting(true);
                    observerRef.current?.disconnect();
                    observerRef.current = null;
                    return;
                }
            }
        });
        observerRef.current.observe(element);
    };

    return [refCallback, isIntersecting] as const;
};
