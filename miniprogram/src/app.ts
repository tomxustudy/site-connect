import { PropsWithChildren } from 'react'
import Taro, { useLaunch } from '@tarojs/taro'
import { OfflineManager } from './utils/offline'

import './app.scss'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.')

    // 监听网络状态变化
    Taro.onNetworkStatusChange((res) => {
      if (res.isConnected) {
        OfflineManager.syncQueue();
      }
    });

    // 启动时也试着同步一次
    OfflineManager.syncQueue();
  })

  return children
}



export default App
