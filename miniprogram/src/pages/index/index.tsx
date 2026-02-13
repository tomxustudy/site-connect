import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

export default function Index() {

  const [user, setUser] = useState<any>(null);

  Taro.useDidShow(() => {
    const token = Taro.getStorageSync('token');
    const userData = Taro.getStorageSync('user');
    if (!token || !userData) {
      Taro.reLaunch({ url: '/pages/login/index' });
    } else {
      setUser(userData);
    }
  });

  Taro.useDidShow(() => {
    const page = Taro.getCurrentInstance().page;
    const tabBar = page?.getTabBar?.();
    if (tabBar) {
      tabBar.setData({
        selected: 0
      })
    }
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '晚上好！';
    if (hour < 12) return '上午好！';
    if (hour < 18) return '下午好！';
    return '晚上好！';
  }

  const startRecord = (type: string) => {
    Taro.navigateTo({
      url: `/pages/record/index?type=${type}`
    });
  }

  return (
    <View className="index-page">
      {/* 极简欢迎栏 */}
      <View className="welcome-header">
        <View className="user-profile">
          <Text className="t-header">{user?.name || '管理员'}，{getGreeting()}</Text>
        </View>
      </View>

      <View className="main-actions">
        {/* Removed section title as requested */}

        {/* 人员卡片 - 采用 Google Blue */}
        <View className="action-card blue-ripple" onClick={() => startRecord('person')}>
          <View className="card-left">
            <Text className="card-icon">👷</Text>
            <View className="card-info">
              <Text className="card-label t-title">生产报工</Text>
              <Text className="card-desc t-body">考勤、报到</Text>
            </View>
          </View>
          <Text className="arrow">➔</Text>
        </View>

        {/* 材料卡片 - 采用 Google Amber/Orange */}
        <View className="action-card orange-ripple" onClick={() => startRecord('material')}>
          <View className="card-left">
            <Text className="card-icon">🧱</Text>
            <View className="card-info">
              <Text className="card-label t-title">物料管理</Text>
              <Text className="card-desc t-body">入库/领料/盘点</Text>
            </View>
          </View>
          <Text className="arrow">➔</Text>
        </View>

        {/* 费用卡片 - 采用 Google Green */}
        <View className="action-card green-ripple" onClick={() => startRecord('expense')}>
          <View className="card-left">
            <Text className="card-icon">¥</Text>
            <View className="card-info">
              <Text className="card-label t-title">费用支出</Text>
              <Text className="card-desc t-body">零星采购/临时费用</Text>
            </View>
          </View>
          <Text className="arrow">➔</Text>
        </View>
      </View>

      <View className="system-footer">
        <View className="sync-box">
          {/* Removed sync text as requested */}
        </View>
      </View>
    </View>
  )
}