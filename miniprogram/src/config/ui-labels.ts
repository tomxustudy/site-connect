/**
 * UI 文字标签配置
 * 用于切换 "site-connect" (工地) 和 "factory" (工厂) 两种模式
 *
 * 使用方式:
 * import { UI_LABELS, APP_MODE } from './ui-labels';
 * const labels = UI_LABELS[APP_MODE];
 */

// ==================== 模式切换 ====================
// 可选值: 'site' | 'factory'
export type AppMode = 'site' | 'factory';
export const APP_MODE: AppMode = 'factory'; // 修改这里切换模式

// ==================== 首页卡片 ====================
export interface CardConfig {
  title: string;
  desc: string;
}

export const DASHBOARD_CARDS: Record<string, CardConfig> = {
  person: {
    site: { title: '生产报工', desc: '考勤、报到' },
    factory: { title: '人员管理', desc: '考勤、报到、离职申请' },
  },
  material: {
    site: { title: '物料管理', desc: '入库/领料/盘点' },
    factory: { title: '材料动态', desc: '进场验收、领用盘点' },
  },
  expense: {
    site: { title: '费用支出', desc: '零星采购/临时费用' },
    factory: { title: '费用支出', desc: '零星采购、机械租赁费' },
  },
};

// ==================== 记录页标签 ====================
export interface RecordLabels {
  step1: string;
  step2: string;
  step3: string;
  siteLabel: string;
  tagsLabel: string;
  descPlaceholder: string;
  btnSubmit: string;
}

export const RECORD_LABELS: Record<AppMode, RecordLabels> = {
  site: {
    step1: '第一步：现场拍照',
    step2: '第二步：选择部门与标签',
    step3: '第三步：填写备注',
    siteLabel: '确认项目工地 *',
    tagsLabel: '选择记录标签 *',
    descPlaceholder: '手动输入文字描述... (必填)',
    btnSubmit: '提交云端',
  },
  factory: {
    step1: '第一步：现场拍照',
    step2: '第二步：选择部门与标签',
    step3: '第三步：填写备注',
    siteLabel: '选择部门 *',
    tagsLabel: '选择标签 *',
    descPlaceholder: '手动输入描述... (必填)',
    btnSubmit: '提交云端',
  },
};

// ==================== 业务标签选项 ====================
export const TAG_OPTIONS: Record<string, Record<AppMode, string[]>> = {
  person: {
    site: ['工人报到', '当日考勤', '请假/离职', '其他'],
    factory: ['当日考勤', '新工人报到', '其他'],
  },
  material: {
    site: ['进场', '退场', '领用', '盘点'],
    factory: ['入库', '领料', '盘点'],
  },
  expense: {
    site: ['零星采购', '机械租赁', '生活费', '招待费'],
    factory: ['零星采购', '临时费用', '其他'],
  },
};

// ==================== 核心概念 ====================
export const CORE_CONCEPTS: Record<AppMode, Record<string, string>> = {
  site: {
    site: '工地',
    record: '记录',
  },
  factory: {
    site: '部门',
    record: '记录',
  },
};

// ==================== 登录页 ====================
export interface LoginLabels {
  mainTitle: string;
  subTitle: string;
  wechatBtn: string;
  dividerText: string;
  phonePlaceholder: string;
  manualBtn: string;
  footerText: string;
}

export const LOGIN_LABELS: Record<AppMode, LoginLabels> = {
  site: {
    mainTitle: '工地助手',
    subTitle: '三步快速完成记录',
    wechatBtn: '快捷验证',
    dividerText: '或者手动输入',
    phonePlaceholder: '输入您的手机号',
    manualBtn: '快速记录',
    footerText: '如需开通权限，请联系管理员。',
  },
  factory: {
    mainTitle: '记录助手',
    subTitle: '三步快速完成记录',
    wechatBtn: '快捷验证',
    dividerText: '或者手动输入',
    phonePlaceholder: '输入您的手机号',
    manualBtn: '快速记录',
    footerText: '如需开通权限，请联系管理员。',
  },
};

// ==================== Admin 后台 ====================
export const ADMIN_LABELS: Record<AppMode, Record<string, string>> = {
  site: {
    appName: '工地通 Admin',
    navSiteSettings: '工地设置',
    filterAllSites: '所有工地',
    colTypeSite: '类型/工地',
  },
  factory: {
    appName: '工厂管理 Admin',
    navSiteSettings: '部门设置',
    filterAllSites: '所有部门',
    colTypeSite: '类型/部门',
  },
};

// ==================== Excel 导出 ====================
export const EXCEL_HEADERS: Record<AppMode, Record<string, string>> = {
  site: {
    site: '工地',
    tags: '标签',
    desc: '描述',
    recorder: '记录人',
  },
  factory: {
    site: '部门',
    tags: '标签',
    desc: '描述',
    recorder: '记录人',
  },
};

// ==================== 便捷访问 ====================
// 获取当前模式的配置
export const getCardConfig = (type: string): CardConfig => DASHBOARD_CARDS[type]?.[APP_MODE] || DASHBOARD_CARDS[type]?.site;
export const getRecordLabels = (): RecordLabels => RECORD_LABELS[APP_MODE];
export const getTagOptions = (type: string): string[] => TAG_OPTIONS[type]?.[APP_MODE] || TAG_OPTIONS[type]?.site || [];
export const getCoreConcept = (key: string): string => CORE_CONCEPTS[APP_MODE]?.[key] || key;
export const getAdminLabels = (): Record<string, string> => ADMIN_LABELS[APP_MODE];
export const getExcelHeaders = (): Record<string, string> => EXCEL_HEADERS[APP_MODE];
export const getLoginLabels = (): LoginLabels => LOGIN_LABELS[APP_MODE];
