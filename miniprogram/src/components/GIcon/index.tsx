import Taro from '@tarojs/taro'
import { View } from '@tarojs/components'
import './index.scss'

export type IconType = 'camera' | 'mic' | 'arrow-right' | 'arrow-left' | 'check' | 'plus' | 'trash' | 'user' | 'clock';

interface GIconProps {
    type: IconType;
    size?: number;
    color?: string;
    className?: string;
    onClick?: () => void;
}

export default function GIcon({ type, size = 32, color = 'currentColor', className = '', onClick }: GIconProps) {
    const icons: Record<IconType, string> = {
        camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
        mic: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z M19 10v1a7 7 0 0 1-14 0v-1 M12 18v3 M8 23h8',
        'arrow-right': 'M5 12h14 M12 5l7 7-7 7',
        'arrow-left': 'M19 12H5 M12 19l-7-7 7-7',
        check: 'M20 6L9 17l-5-5',
        plus: 'M12 5v14 M5 12h14',
        trash: 'M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
        user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
        clock: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2'
    };

    // 为微信小程序提供最稳定的 Base64 图标渲染方案
    const getIconDataUri = (svgPath: string, strokeColor: string) => {
        // 将颜色 HEX 转换为符合 SVG url 编码的格式
        const cleanColor = strokeColor.startsWith('#') ? `%23${strokeColor.slice(1)}` : strokeColor;
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${cleanColor}' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round'>${svgPath}</svg>`;
        return `data:image/svg+xml;charset=utf8,${svg.replace(/"/g, "'")}`;
    };

    // 默认颜色 fallback 为工地橙或深灰
    let finalColor = color;
    if (color === 'var(--primary)' || color === 'currentColor') finalColor = '#f57c00';
    if (color === 'var(--text-muted)') finalColor = '#767676';
    if (color === '#fff') finalColor = 'white';

    const iconPath = icons[type];
    const dataUri = getIconDataUri(`<path d='${iconPath}'/>`, finalColor);

    return (
        <View
            className={`g-icon ${className}`}
            style={{
                width: Taro.pxTransform(size),
                height: Taro.pxTransform(size),
                backgroundImage: `url("${dataUri}")`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat'
            }}
            onClick={onClick}
        />
    )
}
