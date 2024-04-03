const { override, addWebpackAlias, addLessLoader } = require('customize-cra');
const path = require('path');

module.exports = override(
  addWebpackAlias({
    // 如果需要别名配置，可以在这里添加
    // 例如：["@": path.resolve(__dirname, 'src')],
  }),
  addLessLoader({
    javascriptEnabled: true,
    modifyVars: {
      // 自定义主题变量覆盖（如果需要）
      '@primary-color': '#1DA57A',
      // 其他主题变量...
    },
  }),
);