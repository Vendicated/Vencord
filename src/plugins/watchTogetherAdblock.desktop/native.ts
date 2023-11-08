/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";
import { getSettings } from "main/ipcMain";

const entrypoint = () => {
    const LOGO_ID = "block-youtube-ads-logo";
    const hiddenCSS = [
        "#__ffYoutube1",
        "#__ffYoutube2",
        "#__ffYoutube3",
        "#__ffYoutube4",
        "#feed-pyv-container",
        "#feedmodule-PRO",
        "#homepage-chrome-side-promo",
        "#merch-shelf",
        "#offer-module",
        '#pla-shelf > ytd-pla-shelf-renderer[class="style-scope ytd-watch"]',
        "#pla-shelf",
        "#premium-yva",
        "#promo-info",
        "#promo-list",
        "#promotion-shelf",
        "#related > ytd-watch-next-secondary-results-renderer > #items > ytd-compact-promoted-video-renderer.ytd-watch-next-secondary-results-renderer",
        "#search-pva",
        "#shelf-pyv-container",
        "#video-masthead",
        "#watch-branded-actions",
        "#watch-buy-urls",
        "#watch-channel-brand-div",
        "#watch7-branded-banner",
        "#YtKevlarVisibilityIdentifier",
        "#YtSparklesVisibilityIdentifier",
        ".carousel-offer-url-container",
        ".companion-ad-container",
        ".GoogleActiveViewElement",
        '.list-view[style="margin: 7px 0pt;"]',
        ".promoted-sparkles-text-search-root-container",
        ".promoted-videos",
        ".searchView.list-view",
        ".sparkles-light-cta",
        ".watch-extra-info-column",
        ".watch-extra-info-right",
        ".ytd-carousel-ad-renderer",
        ".ytd-compact-promoted-video-renderer",
        ".ytd-companion-slot-renderer",
        ".ytd-merch-shelf-renderer",
        ".ytd-player-legacy-desktop-watch-ads-renderer",
        ".ytd-promoted-sparkles-text-search-renderer",
        ".ytd-promoted-video-renderer",
        ".ytd-search-pyv-renderer",
        ".ytd-video-masthead-ad-v3-renderer",
        ".ytp-ad-action-interstitial-background-container",
        ".ytp-ad-action-interstitial-slot",
        ".ytp-ad-image-overlay",
        ".ytp-ad-overlay-container",
        ".ytp-ad-progress",
        ".ytp-ad-progress-list",
        '[class*="ytd-display-ad-"]',
        '[layout*="display-ad-"]',
        'a[href^="http://www.youtube.com/cthru?"]',
        'a[href^="https://www.youtube.com/cthru?"]',
        "ytd-action-companion-ad-renderer",
        "ytd-banner-promo-renderer",
        "ytd-compact-promoted-video-renderer",
        "ytd-companion-slot-renderer",
        "ytd-display-ad-renderer",
        "ytd-promoted-sparkles-text-search-renderer",
        "ytd-promoted-sparkles-web-renderer",
        "ytd-search-pyv-renderer",
        "ytd-single-option-survey-renderer",
        "ytd-video-masthead-ad-advertiser-info-renderer",
        "ytd-video-masthead-ad-v3-renderer",
        "YTM-PROMOTED-VIDEO-RENDERER",
    ];
    /**
     * Adds CSS to the page
     */
    const hideElements = () => {
        const selectors = hiddenCSS;
        if (!selectors) {
            return;
        }
        const rule = selectors.join(", ") + " { display: none!important; }";
        const style = document.createElement("style");
        style.innerHTML = rule;
        document.head.appendChild(style);
    };
    /**
     * Calls the "callback" function on every DOM change, but not for the tracked events
     * @param {Function} callback callback function
     */
    const observeDomChanges = callback => {
        const domMutationObserver = new MutationObserver(mutations => {
            callback(mutations);
        });
        domMutationObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
    };
    /**
     * This function is supposed to be called on every DOM change
     */
    const hideDynamicAds = () => {
        const elements = document.querySelectorAll("#contents > ytd-rich-item-renderer ytd-display-ad-renderer");
        if (elements.length === 0) {
            return;
        }
        elements.forEach(el => {
            if (el.parentNode && el.parentNode.parentNode) {
                const parent = el.parentNode.parentNode as HTMLElement;
                if (parent.localName === "ytd-rich-item-renderer") {
                    parent.style.display = "none";
                }
            }
        });
    };
    /**
     * This function checks if the video ads are currently running
     * and auto-clicks the skip button.
     */
    const autoSkipAds = () => {
        // If there's a video that plays the ad at this moment, scroll this ad
        if (document.querySelector(".ad-showing")) {
            const video = document.querySelector("video");
            if (video && video.duration) {
                video.currentTime = video.duration;
                // Skip button should appear after that,
                // now simply click it automatically
                setTimeout(() => {
                    const skipBtn = document.querySelector("button.ytp-ad-skip-button") as HTMLElement;
                    if (skipBtn) {
                        skipBtn.click();
                    }
                }, 100);
            }
        }
    };
    /**
     * This function overrides a property on the specified object.
     *
     * @param {object} obj object to look for properties in
     * @param {string} propertyName property to override
     * @param {*} overrideValue value to set
     */
    const overrideObject = (obj, propertyName, overrideValue) => {
        if (!obj) {
            return false;
        }
        let overriden = false;
        for (const key in obj) {
            // eslint-disable-next-line no-prototype-builtins
            if (obj.hasOwnProperty(key) && key === propertyName) {
                obj[key] = overrideValue;
                overriden = true;
                // eslint-disable-next-line no-prototype-builtins
            } else if (obj.hasOwnProperty(key) && typeof obj[key] === "object") {
                if (overrideObject(obj[key], propertyName, overrideValue)) {
                    overriden = true;
                }
            }
        }
        if (overriden) {
            console.log("found: " + propertyName);
        }
        return overriden;
    };
    /**
     * Overrides JSON.parse and Response.json functions.
     * Examines these functions arguments, looks for properties with the specified name there
     * and if it exists, changes it's value to what was specified.
     *
     * @param {string} propertyName name of the property
     * @param {*} overrideValue new value for the property
     */
    const jsonOverride = (propertyName, overrideValue) => {
        const nativeJSONParse = JSON.parse;
        JSON.parse = (...args) => {
            // @ts-ignore
            const obj = nativeJSONParse.apply(this, args);
            // Override it's props and return back to the caller
            overrideObject(obj, propertyName, overrideValue);
            return obj;
        };
        // Override Response.prototype.json
        const nativeResponseJson = Response.prototype.json;
        Response.prototype.json = new Proxy(nativeResponseJson, {
            apply(...args) {
                // Call the target function, get the original Promise
                // @ts-ignore
                const promise = Reflect.apply(args) as Promise;
                // Create a new one and override the JSON inside
                return new Promise((resolve, reject) => {
                    promise.then(data => {
                        overrideObject(data, propertyName, overrideValue);
                        resolve(data);
                    }).catch(error => reject(error));
                });
            },
        });
    };
    const addAdGuardLogoStyle = () => { };
    const addAdGuardLogo = () => {
        if (document.getElementById(LOGO_ID)) {
            return;
        }
        const logo = document.createElement("span");
        logo.innerHTML = "__logo_text__";
        logo.setAttribute("id", LOGO_ID);
        if (window.location.hostname === "m.youtube.com") {
            const btn = document.querySelector("header.mobile-topbar-header > button") as HTMLElement;
            if (btn) {
                btn.parentNode?.insertBefore(logo, btn.nextSibling);
                addAdGuardLogoStyle();
            }
        } else if (window.location.hostname === "www.youtube.com") {
            const code = document.getElementById("country-code");
            if (code) {
                code.innerHTML = "";
                code.appendChild(logo);
                addAdGuardLogoStyle();
            }
        } else if (window.location.hostname === "music.youtube.com") {
            const el = document.querySelector(".ytmusic-nav-bar#left-content");
            if (el) {
                el.appendChild(logo);
                addAdGuardLogoStyle();
            }
        } else if (window.location.hostname === "www.youtube-nocookie.com") {
            const code = document.querySelector("#yt-masthead #logo-container .content-region");
            if (code) {
                code.innerHTML = "";
                code.appendChild(logo);
                addAdGuardLogoStyle();
            }
        }
    };
    // Removes ads metadata from YouTube XHR requests
    jsonOverride("adPlacements", []);
    jsonOverride("playerAds", []);
    // Applies CSS that hides YouTube ad elements
    hideElements();
    // Some changes should be re-evaluated on every page change
    addAdGuardLogo();
    hideDynamicAds();
    autoSkipAds();
    observeDomChanges(() => {
        addAdGuardLogo();
        hideDynamicAds();
        autoSkipAds();
    });
};


app.on("browser-window-created", (_, win) => {
    win.webContents.on("frame-created", (_, { frame }) => {
        frame.once("dom-ready", () => {
            if (frame.url.startsWith("https://youtube.com")) {
                const settings = getSettings().plugins?.WatchTogetherAdblock;
                if (!settings?.enabled) return;

                frame.executeJavaScript(`(${entrypoint.toString()})();`);
            }
        });
    });
});
