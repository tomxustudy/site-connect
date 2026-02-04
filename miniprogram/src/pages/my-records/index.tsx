import { useState } from 'react'
import { View, Text, Image, ScrollView } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import './index.scss'

export default function MyRecords() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 核心函数：从服务器拉取数据
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const token = Taro.getStorageSync('token');
      const res = await Taro.request({
        url: 'http://175.178.10.70:3000/api/records',
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.data.success) {
        setRecords(res.data.data);
      } else {
        Taro.showToast({ title: '加载失败', icon: 'none' });
      }
    } catch (error) {
      console.error(error);
      Taro.showToast({ title: '网络错误', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  useDidShow(() => {
    const token = Taro.getStorageSync('token');
    if (!token) {
      Taro.reLaunch({ url: '/pages/login/index' });
      return;
    }
    fetchRecords();
  });

  const handleVoidRecord = (id: string) => {
    Taro.showModal({
      title: '确认作废',
      content: '作废后的记录将不再计入日报统计，确定吗？',
      confirmColor: '#D93025',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({ title: '正在处理...' });
          try {
            const result = await Taro.request({
              url: `http://175.178.10.70:3000/api/records/${id}/status`,
              method: 'PUT',
              header: {
                'Authorization': `Bearer ${Taro.getStorageSync('token')}`
              },
              data: { status: 'voided' }
            });

            if (result.data.success) {
              Taro.showToast({ title: '已作废', icon: 'success' });
              fetchRecords(); // 刷新列表
            } else {
              throw new Error(result.data.message);
            }
          } catch (err) {
            Taro.showToast({ title: '操作失败', icon: 'none' });
          } finally {
            Taro.hideLoading();
          }
        }
      }
    });
  };

  return (
    <View className="records-page">
      <View className="page-header">
        <Text className="t-header">我的记录</Text>
        <Text className="t-hint">共 {records.length} 条记录</Text>
      </View>

      <ScrollView className="records-scroll-area" scrollY style={{ flex: 1 }}>
        <View className="records-list-content">
          {loading ? (
            <View className="empty-state"><Text className="t-body">拉取数据中...</Text></View>
          ) : records.length === 0 ? (
            <View className="empty-state">
              <Text className="huge-icon">📭</Text>
              <Text className="t-body">暂无云端凭证</Text>
            </View>
          ) : (
            records.map((item) => {
              try {
                const displayImage = item.image_url || (item.images && item.images.length > 0 ? item.images[0] : null);
                return (
                  <View key={item.id} className={`record-material-card card ${item.status === 'voided' ? 'is-voided' : ''}`}>
                    <View className="card-top">
                      <View className="top-left">
                        <Text className={`status-chip ${item.status}`}>
                          {getStatusName(item.status)}
                        </Text>
                        <Text className="site-pill t-hint">{item.site_name || '未定义工地'}</Text>
                      </View>
                      <Text className={`type-tag ${getTagColor(item.type)}`}>
                        {getTypeName(item.type)}
                      </Text>
                    </View>

                    <View className="card-middle">
                      <View className="image-preview-wrapper ripple" onClick={() => displayImage && Taro.previewImage({ urls: item.images && item.images.length > 0 ? item.images : [displayImage] })}>
                        {displayImage ? (
                          <Image src={displayImage} className="records-thumb" mode="aspectFill" />
                        ) : (
                          <View className="no-image-placeholder">
                            <Text className="t-hint">无图凭证</Text>
                          </View>
                        )}
                      </View>

                      <View className="content-detail">
                        <Text className="record-description t-title">{item.description || '未填写备注说明'}</Text>
                        <View className="record-meta">
                          <Text className="meta-time t-hint">{(() => {
                            if (!item.server_created_at) return '时间未知';
                            const utcDate = new Date(item.server_created_at);
                            const beijingDate = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);
                            return beijingDate.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).replace(/\//g, '-');
                          })()}</Text>

                          {/* 内嵌式作废按钮 */}
                          {item.status !== 'voided' && (
                            <View className="void-btn-inline" onClick={() => handleVoidRecord(item.id)}>
                              作废
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                );
              } catch (e) {
                console.error('Render error for item:', item.id, e);
                return null;
              }
            })
          )}
        </View>
      </ScrollView>
    </View>
  )
}

// --- 辅助小工具 ---
function getTypeName(type: string) {
  const map: Record<string, string> = {
    person: '人工',
    material: '材料',
    expense: '费用'
  };
  return map[type] || '其他';
}

function getStatusName(status: string) {
  const map: Record<string, string> = {
    pending: '待审',
    confirmed: '已存证',
    voided: '已作废'
  };
  return map[status] || status;
}

function getTagColor(type: string) {
  if (type === 'person') return 'label-blue';
  if (type === 'material') return 'label-orange';
  return 'label-green';
}