const path = require("path");

module.exports = {
  entry: "./src/main.ts", // ✅ Your game starts here
  output: {
    filename: "bundle.js", // ✅ Webpack will generate this in `dist/`
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.ts$/, // ✅ Compiles TypeScript
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"], // ✅ Allows imports without file extensions
  },
  mode: "production",
};
