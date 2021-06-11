exports.generatedDate = function () {
    return new Date().toUTCString();
};

exports.outputSplit = function (name, options) {
    const data =
        /^(?<name>.[^\ ]*)(?:\ +)?(?<desc>.*)?$/.exec(String(name.description))
            .groups || {};
    data.type = name.type;
    return options.fn(data);
};
