const path = require("path");

const fallback = config.resolve.fallback || {};
Object.assign(fallback, {
  crypto: require.resolve("crypto-browserify"),
  stream: require.resolve("stream-browserify"),
  assert: require.resolve("assert"),
  http: require.resolve("stream-http"),
  https: require.resolve("https-browserify"),
  os: require.resolve("os-browserify"),
  url: require.resolve("url"),
});

config.resolve.fallback = fallback;
module.exports = {

    node: {
        __dirname: false,
    },
    target: "electron-main",
    entry: "./src/electron/main.ts",
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: [{
                    loader: "ts-loader",
                    options: {
                        compilerOptions: {
                            noEmit: false
                        }
                    }
                }],
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: [".ts", ".js", ".json"],
        fallback: {
            "fs": require.resolve("fs"),
            "os": require.resolve("os-browserify/browser"),
            "path": require.resolve("path-browserify"),
            "buffer": require.resolve("buffer/")
        }
    },
    output: {
        filename: "main.js",
        path: path.resolve(__dirname, "../build")
    }
};
