var path = require("path");

module.exports = {
    entry: "./src/main.js",
    output: {
        path: path.resolve(__dirname, "dist/"),
        filename: "[name].bundle.js",  // 使用入口名作为文件名
        clean: true
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                jsonVendor: {
                    test: /[\\/]data[\\/].*\.json$/,
                    name: 'json-vendor',
                    chunks: 'all',
                    priority: 10
                }
            }
        }
    },
    mode: "development"
};
