let webpackCache;
const onceLoadedListeners = [];

function init(instance) {
    if (webpackCache !== void 0) throw "no.";

    webpackCache = instance.push([[Symbol()], {}, (r) => r.c]);
    instance.pop();

    // TODO: Make this less cursed and not here lmao
    (async () => {
        let store, flux;
        do {
            store ??= findByProps("getCurrentUser");
            flux ??= findByProps("_currentDispatchActionType", "_processingWaitQueue", "subscribe");
            if (store && flux) break;
            await new Promise(r => setTimeout(r, 100));
        } while (true);

        if (store.getCurrentUser()) require("../patches").startAll();
        else flux.subscribe("CONNECTION_OPEN", require("../patches").startAll);
    })();

}

function onceLoaded(listener) {
    if (module.exports.hasLoaded) listener();
    else onceLoadedListeners.push(listener);
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

module.exports = {
    init,
    filters,
    find,
    findAll,
    findByProps,
    findAllByProps,
    findByDisplayName,
    onceLoaded,
    hasLoaded: false
};
