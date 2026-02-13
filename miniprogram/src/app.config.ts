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
    navigationBarTitleText: '',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    custom: true,
    color: '#9ca3af',
    selectedColor: '#1976d2', // 工厂蓝
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