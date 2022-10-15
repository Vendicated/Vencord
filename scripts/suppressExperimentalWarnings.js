process.emit = (originalEmit => function (name, data) {
    if (name === "warning" && data?.name === "ExperimentalWarning")
        return false;

    return originalEmit.apply(process, arguments);
})(process.emit);
