const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  entry: {
    sharedworker: "./src/shared.js",
    handleclientrequest: "./src/handleClientRequest.js"
  },
  output: {
    library: 'perspectives-[name]',
    filename: 'perspectives-[name].js',
    path: path.join(__dirname, "dist"),
    libraryTarget: "umd"
  },
  watch: false,
  mode: "development",
  target: "webworker",
  plugins: [
    new CleanWebpackPlugin(), // Plugin to clear out the output directory
  ],
  externals: {
    "perspectives-core": {
      commonjs: "perspectives-core",
      commonjs2: "perspectives-core",
      amd: "perspectives-core",
      root: "perspectivesCore"
    },
    "perspectives-proxy": {
      amd: "perspectives-proxy",
      commonjs: "perspectives-proxy",
      commonjs2: "perspectives-proxy",
      root: "perspectives-proxy"
    },
    "url": {
      commonjs: "url",
      commonjs2: "url",
      amd: "url",
      root: "url"
    }
  }
};
