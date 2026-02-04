import { useState, useEffect, useMemo, useRef } from 'react'
import { View, Text, Image, Textarea } from '@tarojs/components'
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
    tempImagePaths: [] as string[]
  });

  const API_BASE_URL = 'http://175.178.10.70:3000';
  const hasRecorderError = useRef(false);
  const recorderManager = useMemo(() => Taro.getRecorderManager(), []);

  // --- 3. 语音识别核心逻辑 ---
  useEffect(() => {
    recorderManager.onStart(() => {
      console.log('🚀 Recorder Started');
      hasRecorderError.current = false;
    });

    recorderManager.onError((err) => {
      console.error('❌ Recorder Error:', err);
      hasRecorderError.current = true;
      setIsRecording(false);
      Taro.hideLoading();
      Taro.showModal({ title: '录音设备异常', content: err.errMsg, showCancel: false });
    });

    recorderManager.onStop(async (res) => {
      const { tempFilePath, duration } = res;
      if (hasRecorderError.current) return;
      if (duration < 500) {
        Taro.showToast({ title: '录音太短', icon: 'none' });
        setIsRecording(false);
        return;
      }

      try {
        Taro.showLoading({ title: '语音识别中...', mask: true });
        const uploadRes: any = await new Promise((resolve, reject) => {
          Taro.uploadFile({
            url: `${API_BASE_URL}/api/asr`,
            filePath: tempFilePath,
            name: 'voice',
            success: resolve,
            fail: reject
          });
        });

        const resData = JSON.parse(uploadRes.data);
        if (resData.success && resData.text) {
          const text = resData.text.trim();
          setRecordData(prev => ({
            ...prev,
            description: prev.description ? `${prev.description}\n${text}` : text
          }));
          Taro.showToast({ title: '识别成功', icon: 'success' });
        } else {
          throw new Error(resData.error || '结果为空');
        }
      } catch (err: any) {
        Taro.showToast({ title: '识别失败', icon: 'none' });
      } finally {
        setIsRecording(false);
        Taro.hideLoading();
      }
    });
  }, [recorderManager]);

  const startRecording = () => {
    Taro.vibrateShort({ type: 'medium' });
    setIsRecording(true);
    recorderManager.start({ duration: 60000, sampleRate: 44100, numberOfChannels: 1, encodeBitRate: 128000, format: 'mp3' });
  };

  const stopRecording = () => { recorderManager.stop(); };

  // --- 4. 其他交互逻辑 ---
  const handleTakePhoto = () => {
    Taro.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      success: (res) => {
        const newPaths = res.tempFiles.map(f => f.tempFilePath);
        setRecordData(prev => ({ ...prev, tempImagePaths: [...prev.tempImagePaths, ...newPaths].slice(0, 9) }));
      }
    });
  };

  const removeImage = (index: number) => {
    setRecordData(prev => ({ ...prev, tempImagePaths: prev.tempImagePaths.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async () => {
    if (!recordData.description) return;
    try {
      Taro.showLoading({ title: '保存中...', mask: true });
      const uploadedUrls: string[] = [];
      for (const path of recordData.tempImagePaths) {
        const res = await Taro.uploadFile({ url: `${API_BASE_URL}/api/upload`, filePath: path, name: 'photo' });
        const d = JSON.parse(res.data);
        if (d.success) uploadedUrls.push(d.url);
      }
      await Taro.request({
        url: `${API_BASE_URL}/api/records`,
        method: 'POST',
        data: {
          type: recordType,
          site_name: recordData.siteName,
          tags: recordData.tags,
          description: recordData.description,
          images: uploadedUrls
        }
      });
      Taro.showToast({ title: '提交成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (e) {
      Taro.showToast({ title: '提交失败', icon: 'none' });
    } finally {
      Taro.hideLoading();
    }
  };

  return (
    <View className="record-page">
      <View className="stepper-header">
        <View className="stepper-track">
          {[1, 2, 3].map(i => (
            <View key={i} className={`step-dot ${step === i ? 'active' : ''}`}>
              <Text className="dot-num">{i}</Text>
            </View>
          ))}
        </View>
        <Text className="step-indicator-text">
          {step === 1 && '第一步：拍摄照片'}
          {step === 2 && '第二步：选择工地与标签'}
          {step === 3 && '第三步：补充备注'}
        </Text>

        <View className="nav-actions-top">
          <View className={`nav-btn back ${step === 1 ? 'hidden' : ''}`} onClick={() => setStep(step - 1)}>
            ← 上一步
          </View>
          {step < 3 ? (
            <View
              className={`nav-btn next ${((step === 1 && recordData.tempImagePaths.length === 0) || (step === 2 && (!recordData.siteName || recordData.tags.length === 0))) ? 'disabled' : ''}`}
              onClick={() => step < 3 && setStep(step + 1)}
            >
              下一步 →
            </View>
          ) : (
            <View className={`nav-btn next submit ${!recordData.description ? 'disabled' : ''}`} onClick={handleSubmit}>
              提交云端 <Text style={{ fontSize: '34rpx', marginLeft: '8rpx', fontWeight: 'bold' }}>✓</Text>
            </View>
          )}
        </View>
      </View>

      <View className="record-card-container">
        {step === 1 && (
          <View className="camera-section">
            <View className="image-grid">
              {recordData.tempImagePaths.map((path, idx) => (
                <View key={path} className="image-item">
                  <Image src={path} className="grid-img" mode="aspectFill" />
                  <View className="delete-badge" onClick={() => removeImage(idx)}>×</View>
                </View>
              ))}
              {/* 小“+”号按钮 - 始终显示或在有图时显示，按照截图逻辑 */}
              <View className="camera-trigger-small" onClick={handleTakePhoto}>
                <View className="plus-icon-circle">
                  <Text className="plus-sign">+</Text>
                </View>
                <Text className="t-hint">添加图片</Text>
              </View>
            </View>

            {/* 大圆圈拍照按钮 - 一直显示 */}
            <View className="camera-trigger-central" onClick={handleTakePhoto}>
              <View className="huge-icon-wrapper">
                <Image src="https://img.icons8.com/ios/100/f57c00/camera--v1.png" className="huge-icon" />
              </View>
              <Text className="t-title">点击拍摄现场照片</Text>
              <Text className="t-hint">建议拍摄全景及细节</Text>
            </View>
          </View>
        )}

        {step === 2 && (
          <View className="combined-section">
            <Text className="section-hint">确认项目工地 *</Text>
            <View className="site-grid">
              {MOCK_SITES.map(site => (
                <View key={site} className={`site-chip ${recordData.siteName === site ? 'selected' : ''}`} onClick={() => setRecordData(prev => ({ ...prev, siteName: site }))}>
                  {site}
                </View>
              ))}
            </View>
            <View className="divider-h" />
            <Text className="section-hint">选择记录标签 *</Text>
            <View className="tag-grid">
              {(TAG_OPTIONS[recordType] || []).map(tag => (
                <View key={tag} className={`tag-pill ${recordData.tags.includes(tag) ? 'selected' : ''}`} onClick={() => setRecordData(prev => ({ ...prev, tags: [tag] }))}>
                  {tag}
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View className="final-section">
            <View className="input-group">
              <Textarea
                className="google-textarea"
                placeholder="手动输入文字描述... (必填)"
                value={recordData.description}
                onInput={(e) => setRecordData(prev => ({ ...prev, description: e.detail.value }))}
              />
            </View>
            <View className="voice-control">
              <View className={`google-voice-btn ${isRecording ? 'recording' : ''}`} onLongPress={startRecording} onTouchEnd={stopRecording}>
                <Image src="https://img.icons8.com/ios-filled/50/ffffff/microphone.png" className="mic-icon" />
                <Text className="mic-text">{isRecording ? '正在识别' : '按住说话'}</Text>
              </View>
            </View>
            <Text className="submit-tip">* 请核对上方信息后点击右上角“提交云端”</Text>
          </View>
        )}
      </View>
    </View>
  )
}