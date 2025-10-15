import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Enable member list resizing",
        default: true
    },
    defaultWidth: {
        type: OptionType.NUMBER,
        description: "Default width of the member list in pixels",
        default: 240,
        min: 200,
        max: 400
    },
    rememberWidth: {
        type: OptionType.BOOLEAN,
        description: "Remember the width between sessions",
        default: true
    }
});

export default definePlugin({
    name: "MemberListResizer",
    description: "Makes the member list resizable by dragging, similar to the channel list",
    authors: [Devs.Ven],

    settings,

    patches: [
        {
            find: "{isSidebarVisible:",
            replacement: {
                match: /membersWrap_c8ffbb/,
                replace: "membersWrap_c8ffbb members-resizable"
            },
            predicate: () => settings.store?.enabled ?? true
        }
    ],

    observer: null as MutationObserver | null,

    start() {
        if (settings.store?.enabled ?? true) {
            this.setupObserver();
        }
    },

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.removeResizeHandler();
        this.saveCurrentWidth();
    },

    setupObserver() {
        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const element = node as Element;
                            if (element.classList?.contains('membersWrap_c8ffbb') ||
                                element.getAttribute?.('aria-label')?.toLowerCase().includes('members') ||
                                element.querySelector?.('[aria-label*="members"]') ||
                                element.querySelector?.('.membersWrap_c8ffbb')) {
                                console.log('MemberListResizer: Member list container detected, adding resize handler');
                                setTimeout(() => this.addResizeHandler(), 100);
                                setTimeout(() => this.applySavedWidth(), 200);
                            }
                        }
                    });
                }
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            this.addResizeHandler();
            this.applySavedWidth();
        }, 1000);

        let currentUrl = window.location.href;
        setInterval(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                console.log('MemberListResizer: Navigation detected, re-applying resize handler');
                setTimeout(() => {
                    this.addResizeHandler();
                    this.applySavedWidth();
                }, 500);
            }
        }, 1000);
    },


    addResizeHandler() {
        let memberList = document.querySelector('[role="list"][aria-label*="Mitglieder"], [role="list"][aria-label*="Members"]') as HTMLElement;

        if (memberList) {
            const membersWrap = memberList.closest('.membersWrap_c8ffbb') as HTMLElement;
            if (membersWrap) {
                memberList = membersWrap;
            }
        }

        if (!memberList) {
            console.log('MemberListResizer: Could not find member list element');
            setTimeout(() => this.addResizeHandler(), 2000);
            return;
        }

        console.log('MemberListResizer: Found member list element', memberList, 'aria-label:', memberList.getAttribute('aria-label'));

        memberList.style.position = 'relative';
        memberList.style.minWidth = '200px';
        memberList.style.maxWidth = '400px';
        memberList.style.width = '240px';
        memberList.style.flexShrink = '0';
        memberList.style.flexGrow = '0';
        memberList.style.flexBasis = '240px';
        memberList.style.overflow = 'visible';

        const innerContent = memberList.querySelector('.members_c8ffbb') as HTMLElement;
        if (innerContent) {
            innerContent.style.width = '100%';
        }

        this.updateContentStyling(memberList, 240);

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        const handleMouseDown = (e: MouseEvent) => {
            if (e.offsetX > 10) return;

            isResizing = true;
            startX = e.clientX;
            startWidth = memberList!.offsetWidth;
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
            e.stopPropagation();
            console.log('MemberListResizer: Started resizing');
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const deltaX = e.clientX - startX;
            const newWidth = startWidth - deltaX;
            const clampedWidth = Math.max(200, Math.min(400, newWidth));
            memberList!.style.width = `${clampedWidth}px`;
            memberList!.style.flexBasis = `${clampedWidth}px`;

            this.updateContentStyling(memberList!, clampedWidth);

            e.preventDefault();
            e.stopPropagation();
        };

        const handleMouseUp = () => {
            if (!isResizing) return;
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            if (settings.store?.rememberWidth ?? true) {
                this.saveCurrentWidth();
            }
            console.log('MemberListResizer: Finished resizing');
        };

        const handleMouseMoveOnList = (e: MouseEvent) => {
            if (isResizing) return;
            if (e.offsetX <= 10) {
                document.body.style.cursor = 'ew-resize';
            } else {
                document.body.style.cursor = '';
            }
        };

        memberList.addEventListener('mousedown', handleMouseDown);
        memberList.addEventListener('mousemove', handleMouseMoveOnList);
        memberList.addEventListener('mouseleave', () => {
            if (!isResizing) document.body.style.cursor = '';
        });

        console.log('MemberListResizer: Resize handler added');
    },


    removeResizeHandler() {
        const memberList = document.querySelector('.members-resizable');
        if (memberList) {
            const handle = memberList.querySelector('.member-list-resize-handle');
            if (handle) handle.remove();
        }
    },

    applySavedWidth() {
        if (!(settings.store?.rememberWidth ?? true)) return;
        try {
            const savedWidth = window.localStorage?.getItem('memberListWidth');
            if (savedWidth) {
                const memberList = document.querySelector('.membersWrap_c8ffbb') as HTMLElement;
                if (memberList) {
                    const width = Math.max(200, Math.min(400, parseInt(savedWidth)));
                    memberList.style.width = `${width}px`;
                    this.updateContentStyling(memberList, width);
                }
            }
        } catch (e) {
            console.log('MemberListResizer: Could not access localStorage', e);
        }
    },

    updateContentStyling(memberList: HTMLElement, width: number) {
        let widthClass = 'medium';
        if (width <= 240) {
            widthClass = 'narrow';
        } else if (width >= 320) {
            widthClass = 'wide';
        }

        memberList.setAttribute('data-width', widthClass);
    },

    saveCurrentWidth() {
        try {
            const memberList = document.querySelector('.membersWrap_c8ffbb') as HTMLElement;
            if (memberList) {
                window.localStorage?.setItem('memberListWidth', memberList.clientWidth.toString());
            }
        } catch (e) {
            console.log('MemberListResizer: Could not save to localStorage', e);
        }
    }
});