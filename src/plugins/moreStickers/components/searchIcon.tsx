import { findByCodeLazy } from "@webpack";

const SearchIconOrg = findByCodeLazy("M21.707 20.293L16.314 14.9C17.403");

export function SearchIcon() {
    return (
        <SearchIconOrg
            style={{
                boxSizing: 'border-box',
                position: 'absolute',
                top: '0',
                left: '0',
                opacity: '0.5',
                width: '100%',
                height: '100%',
                zIndex: '2',
                transition: 'transform .1s ease-out,opacity .1s ease-out,-webkit-transform .1s ease-out',
                color: 'var(--text-muted)',
                overflowClipMargin: 'content-box',
                overflow: 'hidden'
            }}
        />
    );
}