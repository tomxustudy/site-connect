import { useState, useEffect, useMemo, useRef } from 'react'
import { View, Text, Image, Textarea } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { RecordType } from '../../types'
import { config } from '../../config';
import { getRecordLabels, getTagOptions, getRecordToastLabels } from '../../config/ui-labels';
import './index.scss'

// --- 1. 静态配置 (使用 ui-labels 配置) ---
// 标签选项现在从 ui-labels.ts 动态获取

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

  const [sites, setSites] = useState<any[]>([]);
  const [recorders, setRecorders] = useState<any[]>([]);

  const API_BASE_URL = config.baseUrl;

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
      Taro.showModal({ title: getRecordToastLabels().recorderError, content: err.errMsg, showCancel: false });
    });

    recorderManager.onStop(async (res) => {
      const { tempFilePath, duration } = res;
      if (hasRecorderError.current) return;
      if (duration < 500) {
        Taro.showToast({ title: getRecordToastLabels().recordTooShort, icon: 'none' });
        setIsRecording(false);
        return;
      }

      try {
        Taro.showLoading({ title: getRecordToastLabels().recognizing, mask: true });
        const uploadRes: any = await new Promise((resolve, reject) => {
          Taro.uploadFile({
            url: `${API_BASE_URL}/api/asr`,
            filePath: tempFilePath,
            name: 'voice',
            header: {
              'Authorization': `Bearer ${Taro.getStorageSync('token')}`
            },
            success: resolve,
            fail: reject
          });
        });

        let resData;
        try {
          resData = JSON.parse(uploadRes.data);
        } catch (e) {
          console.error('JSON parse error:', e);
          throw new Error('响应解析失败');
        }
        if (resData.success && resData.text) {
          const text = resData.text.trim();
          setRecordData(prev => ({
            ...prev,
            description: prev.description ? `${prev.description}\n${text}` : text
          }));
          Taro.showToast({ title: getRecordToastLabels().recognizeSuccess, icon: 'success' });
        } else {
          throw new Error(resData.error || '结果为空');
        }
      } catch (err: any) {
        Taro.showToast({ title: getRecordToastLabels().recognizeFailed, icon: 'none' });
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

  const fetchDictionaries = async () => {
    try {
      const token = Taro.getStorageSync('token');
      const res = await Taro.request({
        url: `${API_BASE_URL}/api/dictionaries`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.data.success) {
        setSites(res.data.sites);
        setRecorders(res.data.recorders);
      }
    } catch (e) {
      console.error('Fetch dict error', e);
    }
  };

  useDidShow(() => {
    const token = Taro.getStorageSync('token');
    if (!token) {
      Taro.reLaunch({ url: '/pages/login/index' });
      return;
    }
    fetchDictionaries();
  });

  const removeImage = (index: number) => {
    setRecordData(prev => ({ ...prev, tempImagePaths: prev.tempImagePaths.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async () => {
    if (!recordData.description) return;

    const user = Taro.getStorageSync('user');
    if (user && user.isMatched === false) {
      const toastLabels = getRecordToastLabels();
      const confirm = await new Promise((resolve) => {
        Taro.showModal({
          title: toastLabels.identityTitle,
          content: toastLabels.identityContent,
          success: (res) => resolve(res.confirm)
        });
      });
      if (!confirm) return;
    }

    try {
      Taro.showLoading({ title: getRecordToastLabels().saving, mask: true });
      const token = Taro.getStorageSync('token');
      const uploadedUrls: string[] = [];
      for (const path of recordData.tempImagePaths) {
        const res = await Taro.uploadFile({
          url: `${API_BASE_URL}/api/upload`,
          filePath: path,
          name: 'photo',
          header: {
            'Authorization': `Bearer ${token}`
          }
        });
        let d;
        try {
          d = JSON.parse(res.data);
        } catch (e) {
          console.error('Upload response parse error:', e);
          continue; // 跳过此图片，继续上传其他图片
        }
        if (d.success && d.url) {
          uploadedUrls.push(d.url);
        } else {
          console.warn('Upload failed:', d.error);
        }
      }
      await Taro.request({
        url: `${API_BASE_URL}/api/records`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}`
        },
        data: {
          type: recordType,
          site_name: recordData.siteName,
          tags: recordData.tags,
          description: recordData.description,
          images: uploadedUrls
        }
      });
      Taro.showToast({ title: getRecordToastLabels().submitSuccess, icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1500);
    } catch (e) {
      Taro.showToast({ title: getRecordToastLabels().submitFailed, icon: 'none' });
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
          {step === 1 && getRecordLabels().step1}
          {step === 2 && getRecordLabels().step2}
          {step === 3 && getRecordLabels().step3}
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
          <View className="combined-section animate-slide-up">
            <Text className="section-hint">{getRecordLabels().siteLabel}</Text>
            <View className="site-grid">
              {sites.map(site => (
                <View
                  key={site.name}
                  className={`site-chip ${recordData.siteName === site.name ? 'selected' : ''}`}
                  onClick={() => setRecordData(prev => ({ ...prev, siteName: site.name }))}
                >
                  {site.name}
                </View>
              ))}
            </View>
            <View className="divider-h" />
            <Text className="section-hint">{getRecordLabels().tagsLabel}</Text>
            <View className="tag-grid">
              {getTagOptions(recordType).map(tag => (
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
                placeholder={getRecordLabels().descPlaceholder}
                value={recordData.description}
                onInput={(e) => setRecordData(prev => ({ ...prev, description: e.detail.value }))}
              />
            </View>
            <View className="voice-control">
              <View className={`google-voice-btn ${isRecording ? 'recording' : ''}`} onLongPress={startRecording} onTouchEnd={stopRecording}>
                <Image src="https://img.icons8.com/ios-filled/50/ffffff/microphone.png" className="mic-icon" />
                <Text className="mic-text">{isRecording ? getRecordToastLabels().recording : getRecordToastLabels().pressToSpeak}</Text>
              </View>
            </View>
            <Text className="submit-tip">* 请核对上方信息后点击右上角“提交云端”</Text>
          </View>
        )}
      </View>
    </View>
  )
}