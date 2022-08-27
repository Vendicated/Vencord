
let webpackCache;
const subscriptions = new Map();

function init(instance) {
    if (webpackCache !== void 0) throw "no.";

    webpackCache = instance.push([[Symbol()], {}, (r) => r.c]);
    instance.pop();

    // Abandon Hope All Ye Who Enter Here
    // ...
    // ...
    // I warned you
    // ...
    // are u sure you wanna do this....
    // Here be dragons

    // Needs to be here to not cause circular import issues
    const { startAll } = require("../patches");
    subscribe("getCurrentUser", UserStore => {
        if (UserStore.getCurrentUser()) return startAll();

        subscribe(["_processingWaitQueue", "subscribe"], FluxDispatcher => {
            // Might be logged in now? :)
            if (UserStore.getCurrentUser()) return startAll();

            const cb = () => {
                startAll();
                FluxDispatcher.unsubscribe("CONNECTION_OPEN", cb);
            };
            FluxDispatcher.subscribe("CONNECTION_OPEN", cb);
        });
    });
}

function find(filter, getDefault = true) {
    if (typeof filter !== "function")
        throw new Error("Invalid filter. Expected a function got", filter);

    for (const key in webpackCache) {
        const mod = webpackCache[key];
        if (mod?.exports && filter(mod.exports))
            return mod.exports;
        if (mod?.exports?.default && filter(mod.exports.default))
            return getDefault ? mod.exports.default : mod.exports;
    }

    return null;
}

function findAll(filter, getDefault = true) {
    if (typeof filter !== "function") throw new Error("Invalid filter. Expected a function got", filter);

    const ret = [];
    for (const key in webpackCache) {
        const mod = webpackCache[key];
        if (mod?.exports && filter(mod.exports)) ret.push(mod.exports);
        if (mod?.exports?.default && filter(mod.exports.default)) ret.push(getDefault ? mod.exports.default : mod.exports);
    }

    return ret;
}

const filters = {
    byProps: (props) =>
        props.length === 1
            ? m => m[props[0]] !== void 0
            : m => props.every(p => m[p] !== void 0),
    byDisplayName: deezNuts => m => m.default?.displayName === deezNuts
};

function findByProps(...props) {
    return find(filters.byProps(props));
}

function findAllByProps(...props) {
    return findAll(filters.byProps(props));
}

function findByDisplayName(deezNuts) {
    return find(filters.byDisplayName(deezNuts));
}

function subscribe(filter, callback) {
    if (typeof filter === "string") filter = filters.byProps([filter]);
    else if (Array.isArray(filter)) filter = filters.byProps(filter);
    else if (typeof filter !== "function") throw new Error("filter must be a string, string[] or function, got", filter);

    const existing = find(filter);
    if (existing) return void callback(existing);

    subscriptions.set(filter, callback);
}

module.exports = {
    init,
    filters,
    find,
    findAll,
    findByProps,
    findAllByProps,
    findByDisplayName,
    subscriptions,
    subscribe
};
