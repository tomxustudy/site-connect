import { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { config } from '../../config';
import { getLoginLabels } from '../../config/ui-labels';
import './index.scss';

const LoginPage = () => {
    const [phoneNumber, setPhoneNumber] = useState(Taro.getStorageSync('lastPhoneNumber') || '');
    const [loading, setLoading] = useState(false);

    const API_BASE = config.baseUrl;

    const handleManualPhoneLogin = async () => {
        if (!phoneNumber || phoneNumber.length !== 11) {
            Taro.showToast({ title: '请输入正确的11位手机号', icon: 'none' });
            return;
        }
        performWechatLogin(phoneNumber);
    };

    const handleWechatAuthLogin = async (e) => {
        console.log('WeChat Auth Event:', e.detail);
        if (!e.detail.code) {
            const errMsg = e.detail.errMsg || '未知错误';
            Taro.showToast({ title: `授权失败: ${errMsg}`, icon: 'none' });
            console.error('WeChat Auth Failed:', errMsg);
            return;
        }
        // TODO: 生产环境需要通过 e.detail.code 调用后端接口换取手机号
        // 后端需要调用微信 API: https://api.weixin.qq.com/sns/jscode2session
        // 目前演示模式使用手动输入手机号
        Taro.showToast({ title: '请使用手机号登录', icon: 'none' });
    };

    const performWechatLogin = async (phone: string) => {
        setLoading(true);
        try {
            const res = await Taro.request({
                url: `${API_BASE}/api/wechat/login`,
                method: 'POST',
                data: { phoneNumber: phone },
            });

            if (res.data.success) {
                saveLoginSession(res.data.token, { ...res.data.user, isMatched: res.data.isMatched }, phone);
            } else {
                Taro.showToast({ title: res.data.message || '验证失败', icon: 'none' });
            }
        } catch (err) {
            Taro.showToast({ title: '网络连接失败', icon: 'none' });
        } finally {
            setLoading(false);
        }
    }

    const saveLoginSession = (token: string, user: any, phone?: string) => {
        Taro.setStorageSync('token', token);
        Taro.setStorageSync('user', user);
        if (phone) Taro.setStorageSync('lastPhoneNumber', phone);
        Taro.showToast({ title: '验证成功', icon: 'success' });
        setTimeout(() => {
            Taro.reLaunch({ url: '/pages/index/index' });
        }, 1500);
    }

    const labels = getLoginLabels();

    return (
        <View className="login-container">
            <View className="login-header">
                <Text className="main-title">{labels.mainTitle}</Text>
                <Text className="sub-title">{labels.subTitle}</Text>
            </View>

            <View className="login-form">
                <View className="auth-section">
                    <Button
                        className="wechat-btn"
                        openType="getPhoneNumber"
                        onGetPhoneNumber={handleWechatAuthLogin}
                        loading={loading}
                    >
                        <Text className="icon">微信</Text> {labels.wechatBtn}
                    </Button>
                </View>

                <View className="divider">
                    <Text className="divider-text">{labels.dividerText}</Text>
                </View>

                <View className="input-group">
                    <Input
                        className="input-field"
                        type="number"
                        maxlength={11}
                        placeholder={labels.phonePlaceholder}
                        value={phoneNumber}
                        onInput={(e) => setPhoneNumber(e.detail.value)}
                    />
                </View>

                <Button
                    className="manual-btn"
                    onClick={handleManualPhoneLogin}
                    loading={loading}
                >
                    {labels.manualBtn}
                </Button>
            </View>

            <View className="login-footer">
                <Text className="footer-text">{labels.footerText}</Text>
            </View>
        </View>
    );
};

export default LoginPage;
