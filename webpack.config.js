const path = require("path");

const configActionDeterminism = {
  entry: {
    configActionDeterminism: "./src/webviews/actionDeterminism/index.tsx"
  },
  output: {
    path: path.resolve(__dirname, "configActionDeterminism"),
    filename: "configActionDeterminism.js"
  },
  devtool: "eval-source-map",
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".json"]
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: "ts-loader",
        options: {}
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader"
          }
        ]
      }
    ]
  },
  performance: {
    hints: false
  }
};

const configPropertiesCreator = {
  entry: {
    configActionDeterminism: "./src/webviews/propertiesCreator/index.tsx"
  },
  output: {
    path: path.resolve(__dirname, "configPropertiesCreator"),
    filename: "configPropertiesCreator.js"
  },
  devtool: "eval-source-map",
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".json"]
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        loader: "ts-loader",
        options: {}
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: "style-loader"
          },
          {
            loader: "css-loader"
          }
        ]
      }
    ]
  },
  performance: {
    hints: false
  }
};
module.exports = [configActionDeterminism,configPropertiesCreator];