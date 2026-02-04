import { useState, useEffect, useMemo, useRef } from 'react'
import { View, Text, Image, Textarea, Button, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { RecordType } from '../../types'
import GIcon from '../../components/GIcon'
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

  const API_BASE_URL = 'http://127.0.0.1:3000';
  const hasRecorderError = useRef(false);
  const recorderManager = useMemo(() => Taro.getRecorderManager(), []);

  // --- 3. 语音识别核心逻辑 ---
  useEffect(() => {
    recorderManager.onStart(() => {
      console.log('🚀 [V1330] Recorder Started');
      hasRecorderError.current = false;
    });

    recorderManager.onError((err) => {
      console.error('❌ [V1330] Recorder Error:', err);
      hasRecorderError.current = true;
      setIsRecording(false);
      Taro.hideLoading();

      Taro.showModal({
        title: '录音设备异常',
        content: `微信报错: ${err.errMsg || '未知'}\n\n建议重新进入小程序并检查麦克风权限。`,
        showCancel: false
      });
    });

    recorderManager.onStop(async (res) => {
      const { tempFilePath, duration } = res;
      console.log('📦 [V1330] Record Stopped', res);

      if (hasRecorderError.current) return;
      if (duration < 500) {
        Taro.showToast({ title: '录音太短', icon: 'none' });
        setIsRecording(false);
        Taro.hideLoading();
        return;
      }

      try {
        Taro.showLoading({ title: '语音识别中...', mask: true });

        const doUpload = () => {
          return new Promise((resolve, reject) => {
            Taro.uploadFile({
              url: `${API_BASE_URL}/api/asr`,
              filePath: tempFilePath,
              name: 'voice',
              formData: { 'scene': 'construction' },
              timeout: 60000,
              success: (r) => resolve(r),
              fail: (e) => reject(e)
            });
          });
        };

        const uploadRes: any = await doUpload();
        if (uploadRes.statusCode !== 200) throw new Error(`HTTP ${uploadRes.statusCode}`);

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
        console.error('❌ [V1330] ASR Final Error:', err);
        Taro.showModal({
          title: '识别未成功',
          content: err.errMsg === 'uploadFile:fail timeout' ? '网络连接超时' : `原因: ${err.message || '网络异常'}`,
          showCancel: false
        });
      } finally {
        setIsRecording(false);
        Taro.hideLoading();
      }
    });
  }, [recorderManager]);

  const startRecording = () => {
    Taro.vibrateShort({ type: 'medium' });
    setIsRecording(true);
    recorderManager.start({
      duration: 60000,
      sampleRate: 44100, // 保持高规格
      numberOfChannels: 1,
      encodeBitRate: 128000,
      format: 'mp3',
    });
  };

  const stopRecording = () => {
    recorderManager.stop();
  };

  // --- 4. 其他交互逻辑 ---
  const handleTakePhoto = () => {
    Taro.vibrateShort({ type: 'medium' });
    Taro.chooseMedia({
      count: 9,
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
    Taro.vibrateShort({ type: 'light' });
    setRecordData(prev => ({
      ...prev,
      tempImagePaths: prev.tempImagePaths.filter((_, i) => i !== index)
    }));
  };

  const goStep = (s: number) => {
    Taro.vibrateShort({ type: 'light' });
    setStep(s);
  };

  const handleSubmit = async () => {
    Taro.vibrateShort({ type: 'medium' });
    if (!recordData.siteName || recordData.tags.length === 0 || !recordData.description) {
      Taro.showToast({ title: '内容不完整', icon: 'none' });
      return;
    }

    try {
      Taro.showLoading({ title: '保存中...', mask: true });
      const uploadedUrls: string[] = [];
      for (const path of recordData.tempImagePaths) {
        const res = await Taro.uploadFile({
          url: `${API_BASE_URL}/api/upload`,
          filePath: path,
          name: 'photo'
        });
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
          images: uploadedUrls,
          amount: 0,
          unit_price: 0
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
    <View className="record-container">
      {/* 🚀 版本核对标志 */}
      <View style={{ background: '#f5f5f5', padding: '10rpx', textAlign: 'center' }}>
        <Text style={{ fontSize: '20rpx', color: '#999' }}>V1330-STABLE-20260204</Text>
      </View>

      <View className="modern-header card">
        <View className="step-indicator">
          {[1, 2, 3].map(i => (
            <View key={i} className={`step-dot ${step >= i ? 'active' : ''}`}>
              <Text className="dot-text">{i}</Text>
            </View>
          ))}
        </View>
        <Text className="header-title">第三步：补充备注</Text>

        <View className="nav-actions">
          <View className="nav-btn prev" onClick={() => (step > 1 ? goStep(step - 1) : Taro.navigateBack())}>
            <GIcon type="arrow-left" size={28} />
            <Text className="ml-1">{step === 1 ? '退出' : '上一步'}</Text>
          </View>

          {step < 3 ? (
            <Button
              className={`nav-btn next ${((step === 1 && recordData.tempImagePaths.length === 0) || (step === 2 && (!recordData.siteName || recordData.tags.length === 0))) ? 'disabled' : ''}`}
              onClick={() => goStep(step + 1)}
            >
              下一步 <GIcon type="arrow-right" size={28} />
            </Button>
          ) : (
            <Button className="nav-btn next submit" onClick={handleSubmit}>
              提交云端 <GIcon type="check" size={28} />
            </Button>
          )}
        </View>
      </View>

      <View className="record-card-container card">
        <ScrollView scrollY style={{ maxHeight: '65vh' }}>
          <View key={step} className="animate-fade-in-right">
            {step === 1 && (
              <View className="camera-section">
                <View className="image-grid">
                  {recordData.tempImagePaths.map((path, idx) => (
                    <View key={path} className="image-item">
                      <Image src={path} className="grid-img" mode="aspectFill" onClick={() => Taro.previewImage({ urls: recordData.tempImagePaths, current: path })} />
                      <View className="delete-badge" onClick={() => removeImage(idx)}>
                        <GIcon type="trash" size={24} color="#fff" />
                      </View>
                    </View>
                  ))}
                  {recordData.tempImagePaths.length < 9 && (
                    <View className="camera-trigger-small" onClick={handleTakePhoto}>
                      <GIcon type="plus" size={40} color="var(--primary)" />
                    </View>
                  )}
                </View>
                {recordData.tempImagePaths.length === 0 && (
                  <View className="empty-photo-tip" onClick={handleTakePhoto}>
                    <GIcon type="camera" size={64} color="var(--primary)" />
                    <Text className="t-title mt-2">点击拍摄现场照片</Text>
                  </View>
                )}
              </View>
            )}

            {step === 2 && (
              <View className="combined-section">
                <Text className="section-hint t-title">确认项目工地</Text>
                <View className="site-chips">
                  {MOCK_SITES.map(site => (
                    <View key={site} className={`site-chip ${recordData.siteName === site ? 'selected' : ''}`} onClick={() => setRecordData(prev => ({ ...prev, siteName: site }))}>
                      {site}
                    </View>
                  ))}
                </View>
                <View className="divider-h" />
                <Text className="section-hint t-title">选择记录标签</Text>
                <View className="tag-grid">
                  {(TAG_OPTIONS[recordType] || []).map(tag => (
                    <View key={tag} className={`tag-pill ${recordData.tags.includes(tag) ? 'selected' : ''}`} onClick={() => setRecordData(prev => ({ ...prev, tags: [tag] }))}>
                      <Text>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {step === 3 && (
              <View className="final-section">
                <Textarea
                  className="google-textarea"
                  placeholder="手动输入文字描述... (必填)"
                  value={recordData.description}
                  onInput={(e) => setRecordData(prev => ({ ...prev, description: e.detail.value }))}
                />
                <View className="voice-control">
                  <View className={`google-voice-btn ${isRecording ? 'recording' : ''}`} onLongPress={startRecording} onTouchEnd={stopRecording}>
                    <GIcon type="mic" size={40} color="#fff" />
                    <Text className="mic-text">{isRecording ? '录音中...' : '按住说话'}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  )
}