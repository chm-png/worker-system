const path = require('path')
const CompressionPlugin = require('compression-webpack-plugin')
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')

const isProd = process.env.NODE_ENV === 'production'

module.exports = {
  publicPath: process.env.VUE_APP_PUBLIC_PATH || '/',
  outputDir: 'dist',
  assetsDir: 'static',
  lintOnSave: false,
  // 生产环境关闭 source-map，减少包体积
  productionSourceMap: false,
  // 明确指定入口文件路径
  pages: {
    index: {
      entry: './main.js'
    }
  },

  // 生成 gzip 文件（nginx / cdn 可直接托管）
  chainWebpack: config => {
    // 路由懒加载分包命名
    config.optimization.splitChunks({
      chunks: 'all',
      cacheGroups: {
        // Vue 全家桶单独一个 chunk
        vue: {
          name: 'chunk-vue',
          test: /[\\/]node_modules[\\/](vue|vuex|vue-router)[\\/]/,
          priority: 20,
          chunks: 'initial'
        },
        // Element-UI 单独一个 chunk
        elementUI: {
          name: 'chunk-element-ui',
          test: /[\\/]node_modules[\\/]element-ui[\\/]/,
          priority: 15,
          chunks: 'initial'
        },
        // Socket.io 单独一个 chunk
        socket: {
          name: 'chunk-socket',
          test: /[\\/]node_modules[\\/]socket\.io-client[\\/]/,
          priority: 10,
          chunks: 'initial'
        },
        // 剩余 vendor 公共 chunk
        vendors: {
          name: 'chunk-vendors',
          test: /[\\/]node_modules[\\/]/,
          priority: 5,
          chunks: 'initial',
          reuseExistingChunk: true
        },
        // 异步组件（页面级懒加载）
        default: {
          minChunks: 2,
          priority: -10,
          reuseExistingChunk: true
        }
      }
    })

    // 生产环境追加分析报告（npm run build:report 时启用）
    if (process.env.ANALYZE) {
      config.plugin('bundle-analyzer').use(BundleAnalyzerPlugin)
    }
  },

  configureWebpack: config => {
    // 生产环境追加 gzip 压缩
    if (isProd) {
      config.plugins.push(
        new CompressionPlugin({
          filename: '[path][base].gz',
          algorithm: 'gzip',
          test: /\.(js|css|html|svg|json)$/,
          threshold: 8192,        // > 8KB 才压缩
          minRatio: 0.8
        })
      )
    }

    config.resolve.alias['@'] = path.resolve(__dirname, '.')
  },

  devServer: {
    port: 8080,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        pathRewrite: { '^/api': '/api' }
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },

  css: {
    loaderOptions: {
      less: {
        lessOptions: { javascriptEnabled: true }
      }
    }
  }
}
