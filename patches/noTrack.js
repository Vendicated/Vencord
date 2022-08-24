const { findByProps } = require("../utils/webpack");

const DO_NOTHING = () => void 0;

module.exports = {
    name: "NoTrack",
    start() {
        findByProps("getSuperPropertiesBase64", "track").track = DO_NOTHING;
        findByProps("submitLiveCrashReport").submitLiveCrashReport = DO_NOTHING;
        findByProps("AnalyticsActionHandlers").AnalyticsActionHandlers.handleTrack = DO_NOTHING;

        const sentry = window.__SENTRY__;
        sentry.logger.disable();

        sentry.hub.addBreadcrumb = DO_NOTHING;
        sentry.hub.getClient().close(0);
        sentry.hub.getScope().clear();

        const c = console;
        for (const method in c) {
            if (c[method].__sentry_original__)
                c[method] = c[method].__sentry_original__;
            if (c[method].__REACT_DEVTOOLS_ORIGINAL_METHOD__?.__sentry_original__)
                c[method].__REACT_DEVTOOLS_ORIGINAL_METHOD__ = c[method].__REACT_DEVTOOLS_ORIGINAL_METHOD__.__sentry_original__;
        }
    }
};
