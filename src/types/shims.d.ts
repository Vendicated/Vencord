// Broad shims for internal project aliases and other modules the repo imports.
// These are permissive "any"-typed modules to reduce noise during incremental type-fixing.

declare module "@webpack" {
    const anything: any;
    export = anything;
}

declare module "@webpack/*" {
    const anything: any;
    export = anything;
}

declare module "@components/*" {
    const anything: any;
    export = anything;
}

declare module "@main/*" {
    const anything: any;
    export = anything;
}

declare module "@shared/*" {
    const anything: any;
    export = anything;
}

declare module "plugins/*" {
    const anything: any;
    export = anything;
}

declare module "Vencord" {
    const anything: any;
    export = anything;
}

// Fallback for any other absolute-style imports not covered elsewhere
declare module "@*" {
    const anything: any;
    export = anything;
}
