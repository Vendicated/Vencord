/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const images = {
    cross: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADr8AAA6/ATgFUyQAAAMQSURBVHhe7dzhbRNBEMVxhwrSAekAOkg6gA4IFUAHSQl0EDqADkIqCFSQpIIkFZj37DWyIEievfN6bu//k0Zr/AEpenO7e+e1FwAAAAAAAAAAAOjXURm7tlwuTzQcqzbj6zK6zO9vjxt//3vlSMrLyevmD1HIm4Dfqt5svd4OehQ0QAIK3OGeqjyeqV68WveBBjiAcoW/V71TOfBRr+oIGqCREvoHlYN36CnQAHum4B22r/Rz1cGu9P+hAfakBH+hSnO1v4QGGJmC9wbuSpU6+I2eGuBVGQ/Ca7zqUi/vVJMIvzcH6+Qy3fuqb3b7NhZmgIEU/mcN16rJhd+b5p2s8L9q8K1dJk+l7L6Mtv3+H5oAPpaXk9esAbzea/imarnWOzwH+rOMLr/3oHpUPSvMfwKekyYNUML3lO/HtvvikDd1o7qfe7i7aNUAtxrGDt9X83fVD9UNYSel8L+oxvKoulD5QyBkp6AundoIrlWEPiUK7GQV3TAEP1UK7m4VYR1P9Z/Kf4WpUXhDpv5bFQ+IpsrhrWKsc6VK9/EvAkqINfy5AKZMIZ6tswwj/B4oSO/ao7xZZNqfOoVYs/Z7t8+GrwcKsmbt51avBwrSJ3uifAoIBzbWgRAf247yoRD0QFdzdPPnj4bRA4VZs/nLdiIItRTm+TrTnbH2JzLGHsDf4InwAQ70Qle07+Uj9nksDC05zHWmO2P6T2boEhA9rMH0n8zQBoge8fYhTiQytAGiz/F9XBs90Hoeffzro+FIZsgMEN3N+wsbSGZIA/iXuCJogISGNEB0/acBEmq5BPwqIxIZ0gCRY1xPfHcvp1YzANN/UlUNoFu66CFOrv6kamcANoCdqG0AZoBOtJoBtn93B4nUNoB/bz+CGSCp2gaIYgZIqtUS8FxGJNNkE8hDoLxaNADhJ9ZiD0ADJNZkCUBeLRqAO4DEWiwBSIwGmLnaBog+B0BSLWYA9gCJsQTMHA0wczTAzNEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC0sFj8BrrSs0hi4xkeAAAAAElFTkSuQmCC",
    deviceImage: {
        success:
            "https://github.com/nexpid/Themelings/raw/data/icons/images/native/img_remote_auth_succeeded.png",
        notFound:
            "https://github.com/nexpid/Themelings/raw/data/icons/images/native/img_remote_auth_not_found.png",
        loading:
            "https://github.com/nexpid/Themelings/raw/data/icons/images/native/img_remote_auth_loaded.png",
    },
} as const;

export let unload: () => void;
export function preload() {
    const elements = new Array<HTMLElement>();

    // Normally, we'd use link:preload (or link:prefetch), but
    // Discord blocks third party prefetch domains and link:preload
    // throws a warning, so we'll just put the images in the head
    const browse = (dir: Record<string, any>) => {
        for (const entry of Object.values(dir)) {
            if (typeof entry === "string") {
                const img = new Image();
                img.setAttribute("data-purpose", "prefetch");
                img.setAttribute("data-added-by", "LoginWithQR");
                img.src = entry;
                document.head.appendChild(img);
                elements.push(img);
            } else if (typeof entry === "object") browse(entry);
        }
    };
    browse(images);

    unload = () => elements.forEach(element => element.remove());
}
