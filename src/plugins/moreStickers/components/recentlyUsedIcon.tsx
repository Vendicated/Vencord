import { findByCodeLazy } from "@webpack";

const RecentlyUsedIconOrg = findByCodeLazy("M12 2C6.4764 2 2 6.4764 2 12C2 17.5236 6.4764 22 12 22C17.5236");

export function RecentlyUsedIcon() {
    return (
        <RecentlyUsedIconOrg
            style={{
                color: 'var(--interactive-active)',
                width: '24px',
                height: '24px',
                overflow: 'hidden',
                overflowClipMargin: 'content-box',
            }}
        />
    );
}