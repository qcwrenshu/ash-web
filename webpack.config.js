const path = require("path");

module.exports = {
    //entry: path.resolve(__dirname, "./web/public/scripts/ash/index.js"),
    entry: {
        "index": {
            import: path.resolve(__dirname, "./web/src/ash/index.js"),
            dependOn: "shared"
        },
        "navbar-manager": {
            import: path.resolve(__dirname, "./web/src/navbar-manager.js"),
            dependOn: "shared"
        },
        shared: ["react", "react-dom"]
    },
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: ["babel-loader"]
            }
        ]
    },
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, "./web/public/scripts")
    },
    mode: "production"
};