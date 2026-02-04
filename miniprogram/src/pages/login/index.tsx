import { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import './index.scss';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!username || !password) {
            Taro.showToast({ title: '请输入账号密码', icon: 'none' });
            return;
        }

        setLoading(true);
        try {
            const res = await Taro.request({
                url: 'http://175.178.10.70:3000/api/login',
                method: 'POST',
                data: { username, password },
            });

            if (res.data.success) {
                Taro.setStorageSync('token', res.data.token);
                Taro.setStorageSync('user', res.data.user);
                Taro.showToast({ title: '登录成功', icon: 'success' });
                setTimeout(() => {
                    Taro.reLaunch({ url: '/pages/index/index' });
                }, 1500);
            } else {
                Taro.showToast({ title: res.data.message || '登录失败', icon: 'none' });
            }
        } catch (err) {
            Taro.showToast({ title: '网络连接失败', icon: 'none' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="login-container">
            <View className="login-header">
                <View className="logo-placeholder">
                    <View className="logo-inner">SC</View>
                </View>
                <Text className="title">Site Connect</Text>
                <Text className="subtitle">现场通记录管理系统</Text>
            </View>

            <View className="login-form">
                <View className="input-group">
                    <Text className="label">账号</Text>
                    <Input
                        className="input-field"
                        placeholder="请输入您的账号"
                        value={username}
                        onInput={(e) => setUsername(e.detail.value)}
                    />
                </View>

                <View className="input-group">
                    <Text className="label">密码</Text>
                    <Input
                        className="input-field"
                        placeholder="请输入您的密码"
                        password
                        value={password}
                        onInput={(e) => setPassword(e.detail.value)}
                    />
                </View>

                <Button
                    className="login-btn"
                    onClick={handleLogin}
                    loading={loading}
                >
                    立即登录
                </Button>
            </View>

            <View className="login-footer">
                <Text className="footer-text">如需开通账号，请联系现场文员</Text>
            </View>
        </View>
    );
};

export default LoginPage;
