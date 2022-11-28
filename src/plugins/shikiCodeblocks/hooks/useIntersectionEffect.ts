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

import { React } from "../../../webpack/common";

export const isInsterecting = (el: HTMLElement) => {
    const elementBox = el.getBoundingClientRect();
    const documentHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
    return !(elementBox.bottom < 0 || elementBox.top - documentHeight >= 0);
};

export const useIntersectionEffect = (
    elementRef: React.RefObject<HTMLElement>,
    callback: () => void,
    deps?: React.DependencyList | undefined,
    ready?: () => boolean | undefined,
) => {
    const observerRef = React.useRef<IntersectionObserver | null>(null);

    React.useEffect(() => {
        const destroy = () => {
            observerRef.current?.disconnect();
            observerRef.current = null;
        };
        const onIntersect = () => {
            callback();
            destroy();
        };
        if (ready?.() === false) return destroy;
        if (!elementRef.current) return destroy;

        if (isInsterecting(elementRef.current)) return onIntersect();

        observerRef.current = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting && entry.target === elementRef.current) {
                    onIntersect();
                    break;
                }
            }
        });

        observerRef.current.observe(elementRef.current);

        return destroy;
    }, deps);
};
