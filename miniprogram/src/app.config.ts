export default defineAppConfig({
  pages: [
    'pages/login/index',
    'pages/index/index',
    'pages/record/index',      // 我们稍后创建：核心记录流程
    'pages/my-records/index'   // 我们稍后创建：我的记录列表
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '现场通', //
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#9ca3af',
    selectedColor: '#f57c00', // 选中时的橘红色
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '记录',
      },
      {
        pagePath: 'pages/my-records/index',
        text: '管理',
      }
    ]
  }
})