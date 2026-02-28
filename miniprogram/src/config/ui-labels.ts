/**
 * UI 文字标签配置
 * 用于切换 "site" (工地) 和 "factory" (工厂) 两种模式
 *
 * 切换方式: 修改下方的 APP_MODE 值后重新构建
 * - site:     工地模式
 * - factory:  工厂模式
 */

// ==================== 模式切换 ====================
// ⚠️ 构建前必须修改此值！
// site: 工地模式 (用于 site-demo)
// factory: 工厂模式 (用于 factory-demo)
export type AppMode = 'site' | 'factory';
export const APP_MODE: AppMode = 'factory'; // ⚠️ 改为 'site' 构建工地版本

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
    appName: '工地管理后台',
    navSiteSettings: '工地设置',
    filterAllSites: '所有工地',
    colTypeSite: '类型/工地',
  },
  factory: {
    appName: '工厂管理后台',
    navSiteSettings: '部门设置',
    filterAllSites: '所有部门',
    colTypeSite: '类型/部门',
  },
};

// ==================== 记录类型 ====================
export const RECORD_TYPE_LABELS: Record<AppMode, Record<string, string>> = {
  site: {
    person: '人工',
    material: '材料',
    expense: '费用',
  },
  factory: {
    person: '人工',
    material: '材料',
    expense: '费用',
  },
};

// ==================== 记录状态 ====================
export const RECORD_STATUS_LABELS: Record<AppMode, Record<string, string>> = {
  site: {
    pending: '待审',
    confirmed: '已归档',
    voided: '已作废',
  },
  factory: {
    pending: '待审',
    confirmed: '已归档',
    voided: '已作废',
  },
};

// ==================== 我的记录页 ====================
export interface MyRecordsLabels {
  title: string;
  emptySite: string;
  emptyDesc: string;
  unknownTime: string;
  confirmVoid: string;
  voidContent: string;
  processing: string;
  voided: string;
  loadFailed: string;
  networkError: string;
}

export const MY_RECORDS_LABELS: Record<AppMode, MyRecordsLabels> = {
  site: {
    title: '我的记录',
    emptySite: '未定义工地',
    emptyDesc: '未填写备注说明',
    unknownTime: '时间未知',
    confirmVoid: '确认作废',
    voidContent: '作废后的记录将不再计入日报统计，确定吗？',
    processing: '正在处理...',
    voided: '已作废',
    loadFailed: '加载失败',
    networkError: '网络错误',
  },
  factory: {
    title: '我的记录',
    emptySite: '未定义部门',
    emptyDesc: '未填写备注说明',
    unknownTime: '时间未知',
    confirmVoid: '确认作废',
    voidContent: '作废后的记录将不再计入统计，确定吗？',
    processing: '正在处理...',
    voided: '已作废',
    loadFailed: '加载失败',
    networkError: '网络错误',
  },
};

// ==================== 记录页交互提示 ====================
export interface RecordToastLabels {
  recorderError: string;
  recordTooShort: string;
  recognizing: string;
  parseError: string;
  recognizeSuccess: string;
  resultEmpty: string;
  recognizeFailed: string;
  identityTitle: string;
  identityContent: string;
  saving: string;
  submitSuccess: string;
  submitFailed: string;
  recording: string;
  pressToSpeak: string;
}

export const RECORD_TOAST_LABELS: Record<AppMode, RecordToastLabels> = {
  site: {
    recorderError: '录音设备异常',
    recordTooShort: '录音太短',
    recognizing: '语音识别中...',
    parseError: '响应解析失败',
    recognizeSuccess: '识别成功',
    resultEmpty: '结果为空',
    recognizeFailed: '识别失败',
    identityTitle: '身份提示',
    identityContent: '您的手机号未对应客户名称，请联系管理员！是否继续提交？',
    saving: '保存中...',
    submitSuccess: '提交成功',
    submitFailed: '提交失败',
    recording: '正在识别',
    pressToSpeak: '按住说话',
  },
  factory: {
    recorderError: '录音设备异常',
    recordTooShort: '录音太短',
    recognizing: '语音识别中...',
    parseError: '响应解析失败',
    recognizeSuccess: '识别成功',
    resultEmpty: '结果为空',
    recognizeFailed: '识别失败',
    identityTitle: '身份提示',
    identityContent: '您的手机号未对应客户名称，请联系管理员！是否继续提交？',
    saving: '保存中...',
    submitSuccess: '提交成功',
    submitFailed: '提交失败',
    recording: '正在识别',
    pressToSpeak: '按住说话',
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
export const getRecordTypeLabel = (type: string): string => RECORD_TYPE_LABELS[APP_MODE]?.[type] || type;
export const getRecordStatusLabel = (status: string): string => RECORD_STATUS_LABELS[APP_MODE]?.[status] || status;
export const getMyRecordsLabels = (): MyRecordsLabels => MY_RECORDS_LABELS[APP_MODE];
export const getRecordToastLabels = (): RecordToastLabels => RECORD_TOAST_LABELS[APP_MODE];
