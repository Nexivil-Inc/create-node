function replaceMap(data) {
    return data.replace(
        `//# sourceMappingURL=bundle.js.map`,
        `//# sourceMappingURL=http://localhost:8999/bundle.js.map`
    );
}

module.exports = {
    replaceMap,
};
