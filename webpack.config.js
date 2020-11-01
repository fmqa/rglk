const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
    entry: './src/app.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.(png|gif)$/i,
                use: 'file-loader'
            },
            {
                test: /\.ya?ml$/,
                loader: 'yaml-loader',
                type: 'json',
                options:     {
                    asJSON: true
                }
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    output: {
        filename: 'app.js',
        path: path.resolve(__dirname, 'dist')
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            title: "rglk"
        })
    ],
    devtool: 'source-map',
    mode: 'development',
    devServer: {
        contentBase: [path.resolve(__dirname, 'dist')],
        watchContentBase: true
    }
};
