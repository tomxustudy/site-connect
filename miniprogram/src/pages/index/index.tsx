import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { getCardConfig } from '../../config/ui-labels'
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

        {/* 人员卡片 */}
        <View className="action-card blue-ripple" onClick={() => startRecord('person')}>
          <View className="card-left">
            <Text className="card-icon">👷</Text>
            <View className="card-info">
              <Text className="card-label t-title">{getCardConfig('person').title}</Text>
              <Text className="card-desc t-body">{getCardConfig('person').desc}</Text>
            </View>
          </View>
          <Text className="arrow">➔</Text>
        </View>

        {/* 材料卡片 */}
        <View className="action-card orange-ripple" onClick={() => startRecord('material')}>
          <View className="card-left">
            <Text className="card-icon">🧱</Text>
            <View className="card-info">
              <Text className="card-label t-title">{getCardConfig('material').title}</Text>
              <Text className="card-desc t-body">{getCardConfig('material').desc}</Text>
            </View>
          </View>
          <Text className="arrow">➔</Text>
        </View>

        {/* 费用卡片 */}
        <View className="action-card green-ripple" onClick={() => startRecord('expense')}>
          <View className="card-left">
            <Text className="card-icon">¥</Text>
            <View className="card-info">
              <Text className="card-label t-title">{getCardConfig('expense').title}</Text>
              <Text className="card-desc t-body">{getCardConfig('expense').desc}</Text>
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