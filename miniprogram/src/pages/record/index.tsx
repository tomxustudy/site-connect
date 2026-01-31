import { useState, useEffect } from 'react'
import { View, Text, Image, Textarea, Button, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { RecordType } from '../../types'
import './index.scss'

// --- 1. 模拟数据 ---
const MOCK_SITES = ['万科A项目', '碧桂园B项目', '恒大C项目'];

const TAG_OPTIONS: Record<string, string[]> = {
  person: ['工人报到', '当日考勤', '请假/离职', '其他'],
  material: ['进场', '退场', '领用', '盘点'],
  expense: ['零星采购', '机械租赁', '生活费', '招待费']
};

export default function RecordPage() {
  const router = useRouter();
  const recordType = (router.params.type || 'person') as RecordType;

  // --- 2. 状态管理 ---
  const [step, setStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordData, setRecordData] = useState({
    siteName: '',
    tags: [] as string[],
    description: '',
    tempImagePaths: [] as string[] // 改为数组支持多图
  });

  useEffect(() => {
    // 如果只有一个工地，默认选中，但步骤依然保留（用户反馈需要补充回来）
    if (MOCK_SITES.length === 1) {
      setRecordData(prev => ({ ...prev, siteName: MOCK_SITES[0] }));
    }
  }, []);

  // --- 3. 核心逻辑 ---

  const handleTakePhoto = () => {
    Taro.chooseMedia({
      count: 9, // 支持最多9张
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      sizeType: ['compressed'],
      success: (res) => {
        const newPaths = res.tempFiles.map(f => f.tempFilePath);
        setRecordData(prev => ({
          ...prev,
          tempImagePaths: [...prev.tempImagePaths, ...newPaths].slice(0, 9)
        }));
      }
    });
  };

  const removeImage = (index: number) => {
    setRecordData(prev => ({
      ...prev,
      tempImagePaths: prev.tempImagePaths.filter((_, i) => i !== index)
    }));
  };

  const startRecording = () => {
    Taro.vibrateShort();
    setIsRecording(true);
    Taro.showToast({ title: '录音识别中...', icon: 'none' });
  };

  const stopRecording = () => {
    setTimeout(() => {
      setRecordData(prev => ({ ...prev, description: prev.description + '[语音识别模拟结果]' }));
      setIsRecording(false);
    }, 500);
  };

  const handleSubmit = async () => {
    if (!recordData.siteName) {
      Taro.showToast({ title: '请选择工地', icon: 'none' });
      setStep(2);
      return;
    }
    if (recordData.tags.length === 0) {
      Taro.showToast({ title: '请选择标签', icon: 'none' });
      setStep(2);
      return;
    }
    if (!recordData.description) {
      Taro.showToast({ title: '请输入备注', icon: 'none' });
      return;
    }

    try {
      Taro.showLoading({ title: '上传中...', mask: true });

      // 1. 循环上传图片
      const uploadedUrls: string[] = [];
      for (const path of recordData.tempImagePaths) {
        const uploadRes = await Taro.uploadFile({
          url: 'http://175.178.10.70:3000/api/upload',
          filePath: path,
          name: 'photo',
        });

        const resData = JSON.parse(uploadRes.data);
        if (resData.success) {
          uploadedUrls.push(resData.url);
        }
      }

      Taro.showLoading({ title: '保存记录...', mask: true });

      // 2. 提交记录数据
      const postData = {
        type: recordType,
        site_name: recordData.siteName,
        tags: recordData.tags,
        description: recordData.description,
        image_url: uploadedUrls[0] || '', // 兼容旧字段
        images: uploadedUrls,           // 新增：完整多图数组
        origin_voice_text: '', // 预留语音原始文本
        amount: 0,
        unit_price: 0
      };

      const result = await Taro.request({
        url: 'http://175.178.10.70:3000/api/records',
        method: 'POST',
        data: postData,
      });

      Taro.hideLoading();

      if (result.data.success) {
        Taro.showToast({ title: '同步云端成功', icon: 'success' });
        setTimeout(() => {
          const pages = Taro.getCurrentPages();
          if (pages.length > 1) {
            Taro.navigateBack();
          } else {
            Taro.switchTab({ url: '/pages/my-records/index' });
          }
        }, 1500);
      } else {
        Taro.showToast({ title: '保存失败: ' + (result.data.message || '未知错误'), icon: 'none' });
      }

    } catch (err) {
      Taro.hideLoading();
      console.error('Submission error:', err);
      Taro.showToast({ title: '提交异常，请检查网络', icon: 'none' });
    }
  };

  return (
    <View className="record-page">
      {/* 3步走分步进度 */}
      <View className="stepper-header">
        <View className="stepper-track">
          {[1, 2, 3].map(i => (
            <View key={i} className={`step-dot ${step >= i ? 'active' : ''}`}>
              <Text className="dot-num">{i}</Text>
            </View>
          ))}
        </View>
        <Text className="step-indicator-text t-title">
          {step === 1 && '第一步：拍摄照片'}
          {step === 2 && '第二步：选择工地与标签'}
          {step === 3 && '第三步：补充备注'}
        </Text>

        {/* 顶部导航控制区 */}
        <View className="nav-actions-top">
          <View
            className={`nav-btn back ${step === 1 ? 'hidden' : ''}`}
            hoverClass="btn-hover"
            onClick={() => step > 1 && setStep(step - 1)}
          >
            ← 上一步
          </View>

          {step < 3 ? (
            <Button
              className={`nav-btn next ${((step === 1 && recordData.tempImagePaths.length === 0) || (step === 2 && (!recordData.siteName || recordData.tags.length === 0))) ? 'disabled' : ''}`}
              hoverClass="btn-hover"
              disabled={(step === 1 && recordData.tempImagePaths.length === 0) || (step === 2 && (!recordData.siteName || recordData.tags.length === 0))}
              onClick={() => setStep(step + 1)}
            >
              下一步 →
            </Button>
          ) : (
            <Button
              className={`nav-btn next submit ${!recordData.description ? 'disabled' : ''}`}
              hoverClass="btn-hover"
              disabled={!recordData.description}
              onClick={handleSubmit}
            >
              提交云端 ✔
            </Button>
          )}
        </View>
      </View>

      <View className="record-card-container card">
        <ScrollView scrollY style={{ maxHeight: '65vh' }}>
          {/* Step 1: 多图拍摄 */}
          {step === 1 && (
            <View className="camera-section">
              <View className="image-grid">
                {recordData.tempImagePaths.map((path, idx) => (
                  <View key={path} className="image-item">
                    <Image src={path} className="grid-img" mode="aspectFill" onClick={() => Taro.previewImage({ urls: recordData.tempImagePaths, current: path })} />
                    <View className="delete-badge" onClick={() => removeImage(idx)}>×</View>
                  </View>
                ))}
                {recordData.tempImagePaths.length < 9 && (
                  <View className="camera-trigger-small" hoverClass="ripple" onClick={handleTakePhoto}>
                    <Text className="plus-icon">+</Text>
                    <Text className="t-hint">添加图片</Text>
                  </View>
                )}
              </View>
              {recordData.tempImagePaths.length === 0 && (
                <View className="empty-photo-tip" onClick={handleTakePhoto}>
                  <Text className="huge-icon">📷</Text>
                  <Text className="t-title">点击拍摄现场照片</Text>
                  <Text className="t-hint">必须提供至少1张照片</Text>
                </View>
              )}
            </View>
          )}

          {/* Step 2: 工地与标签合并 */}
          {step === 2 && (
            <View className="combined-section">
              <Text className="section-hint t-title">确认项目工地 <Text className="required">*</Text></Text>
              <View className="site-chips">
                {MOCK_SITES.map(site => (
                  <View
                    key={site}
                    className={`site-chip ${recordData.siteName === site ? 'selected' : ''}`}
                    onClick={() => setRecordData(prev => ({ ...prev, siteName: site }))}
                  >
                    {site}
                  </View>
                ))}
              </View>

              <View className="divider-h" />

              <Text className="section-hint t-title">选择记录标签 <Text className="required">*</Text></Text>
              <View className="tag-grid">
                {(TAG_OPTIONS[recordType] || []).map(tag => (
                  <View
                    key={tag}
                    className={`tag-pill ${recordData.tags.includes(tag) ? 'selected' : ''}`}
                    hoverClass="ripple"
                    onClick={() => setRecordData(prev => ({ ...prev, tags: [tag] }))}
                  >
                    <Text className="t-body">{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Step 3: 说明与语音 */}
          {step === 3 && (
            <View className="final-section">
              <View className="input-group">
                <Textarea
                  className="google-textarea t-body"
                  placeholder="手动输入文字描述... (必填)"
                  value={recordData.description}
                  onInput={(e) => setRecordData(prev => ({ ...prev, description: e.detail.value }))}
                />
              </View>

              <View className="voice-control">
                <View
                  className={`google-voice-btn ${isRecording ? 'recording' : ''}`}
                  hoverClass="btn-hover"
                  onLongPress={startRecording}
                  onTouchEnd={stopRecording}
                >
                  <Text className="mic-icon">🎤</Text>
                  <Text className="mic-text">{isRecording ? '正在识别' : '按住说话'}</Text>
                </View>
              </View>

              <View className="submit-tip t-hint" style={{ textAlign: 'center', marginTop: '40rpx', paddingBottom: '40rpx' }}>
                * 请核对上方信息后点击右上角“提交云端”
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  )
}