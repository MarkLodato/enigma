const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: ['./lib/main.ts', './scss/main.scss'],
  output: {
    path: __dirname,
    filename: 'bundle.js',
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.js', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'awesome-typescript-loader',
        options: {useBabel: true},
      },
      {
        test: /\.js$/,
        enforce: 'pre',
        exclude: /(node_modules|bower_components)/,
        loader: 'source-map-loader',
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        loader: 'babel-loader',
        query: {presets: ['env']},
      },
      {
        test: /\.(sass|scss)$/,
        use: [
          // fallback to style-loader in development
          // process.env.NODE_ENV !== 'production' ? 'style-loader' :
          //                                        MiniCssExtractPlugin.loader,
          MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'
        ],
      }
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'bundle.css',
    }),
  ],
};
