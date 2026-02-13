import { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { config } from '../../config';
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
        // 注意：生产环境此处需通过 e.detail.code 由后端换取手机号
        // 当前为演示逻辑，直接使用 Mock 或提示
        performWechatLogin('13800138000');
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

    return (
        <View className="login-container">
            <View className="login-header">
                <Text className="main-title">工地助手</Text>
                <Text className="sub-title">三步快速完成记录</Text>
            </View>

            <View className="login-form">
                <View className="auth-section">
                    <Button
                        className="wechat-btn"
                        openType="getPhoneNumber"
                        onGetPhoneNumber={handleWechatAuthLogin}
                        loading={loading}
                    >
                        <Text className="icon">微信</Text> 快捷验证
                    </Button>
                </View>

                <View className="divider">
                    <Text className="divider-text">或者手动输入</Text>
                </View>

                <View className="input-group">
                    <Input
                        className="input-field"
                        type="number"
                        maxlength={11}
                        placeholder="输入您的手机号"
                        value={phoneNumber}
                        onInput={(e) => setPhoneNumber(e.detail.value)}
                    />
                </View>

                <Button
                    className="manual-btn"
                    onClick={handleManualPhoneLogin}
                    loading={loading}
                >
                    快速记录
                </Button>
            </View>

            <View className="login-footer">
                <Text className="footer-text">如需开通权限，请联系管理员。</Text>
            </View>
        </View>
    );
};

export default LoginPage;
