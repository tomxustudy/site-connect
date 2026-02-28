/**
 * Admin UI 文字标签配置
 * 用于切换 "site" (工地) 和 "factory" (工厂) 两种模式
 *
 * 使用方式:
 * import { APP_MODE, ADMIN_LABELS, getAdminLabel } from './ui-labels';
 */

// 复用小程序的模式配置
export type AppMode = 'site' | 'factory';
export const APP_MODE: AppMode = 'factory'; // 与小程序保持一致

export const ADMIN_LABELS: Record<AppMode, Record<string, string>> = {
  site: {
    // 系统名称
    appName: '工地管理后台',
    appNameShort: '管理后台',
    // 导航
    navInbox: '收件箱',
    navExport: '导出数据',
    navSettings: '工地设置',
    // 筛选
    filterAllSites: '所有工地',
    filterAllTypes: '全部类型',
    // 记录类型
    typePerson: '人员',
    typeMaterial: '材料',
    typeExpense: '费用',
    // 表格列
    colTypeSite: '类型/工地',
    colSite: '工地',
    colRecorder: '记录人',
    colRecorderName: '外部人员',
    // 表单
    formNewSite: '新增工地',
    formSubmitBtn: '提交工地项目',
    formResetPwd: '重置密码 (留空则不修改)',
    formInitPwd: '初始密码 (已预设 8888) *',
    formPhone: '手机号',
    formPhoneRequired: '手机号 *',
    formSubmitting: '提交中...',
    formSave: '保存修改',
    formConfirm: '确认创建',
    // 角色
    roleSuperAdmin: '超级管理员',
    roleClerk: '客户文员',
    roleWorker: '现场人员',
    // 验证消息
    workerRequiredPhone: '现场人员必须填写手机号',
    tenantRequired: '请选择所属客户',
    pwdNotMatch: '两次输入的新密码不一致',
    // 默认文字
    noDescription: '现场工作人员未补充描述数据...',
    noTag: '未分类记录',
    noSite: '未定义工地',
    // 错误提示
    opFailed: '操作失败',
    deleteFailed: '删除失败',
    exportExcelFailed: '导出 Excel 失败',
    exportPhotoFailed: '导出照片失败',
    createFailed: '创建失败',
    // 登录
    loginFailed: '登录失败，请检查网络或账号',
    firstLoginAlert: '为了您的账号安全，首次登录必须修改密码',
    pwdChangeSuccess: '密码修改成功，请记好您的新密码',
    btnLogin: '立即进入后台',
    // 详情页
    detailNoDesc: '现场该记录主要描述缺失，请结合照片核实。',
  },
  factory: {
    // 系统名称
    appName: '项目管理后台',
    appNameShort: '管理后台',
    // 导航
    navInbox: '收件箱',
    navExport: '导出数据',
    navSettings: '部门设置',
    // 筛选
    filterAllSites: '所有部门',
    filterAllTypes: '全部类型',
    // 记录类型
    typePerson: '人员',
    typeMaterial: '材料',
    typeExpense: '费用',
    // 表格列
    colTypeSite: '类型/部门',
    colSite: '部门',
    colRecorder: '记录人',
    colRecorderName: '外部人员',
    // 表单
    formNewSite: '新增部门',
    formSubmitBtn: '提交部门项目',
    formResetPwd: '重置密码 (留空则不修改)',
    formInitPwd: '初始密码 (已预设 8888) *',
    formPhone: '手机号',
    formPhoneRequired: '手机号 *',
    formSubmitting: '提交中...',
    formSave: '保存修改',
    formConfirm: '确认创建',
    // 角色
    roleSuperAdmin: '超级管理员',
    roleClerk: '客户文员',
    roleWorker: '现场人员',
    // 验证消息
    workerRequiredPhone: '现场人员必须填写手机号',
    tenantRequired: '请选择所属客户',
    pwdNotMatch: '两次输入的新密码不一致',
    // 默认文字
    noDescription: '现场工作人员未补充描述数据...',
    noTag: '未分类记录',
    noSite: '未定义部门',
    // 错误提示
    opFailed: '操作失败',
    deleteFailed: '删除失败',
    exportExcelFailed: '导出 Excel 失败',
    exportPhotoFailed: '导出照片失败',
    createFailed: '创建失败',
    // 登录
    loginFailed: '登录失败，请检查网络或账号',
    firstLoginAlert: '为了您的账号安全，首次登录必须修改密码',
    pwdChangeSuccess: '密码修改成功，请记好您的新密码',
    btnLogin: '立即进入后台',
    // 详情页
    detailNoDesc: '现场该记录主要描述缺失，请结合照片核实。',
  },
};

export const getAdminLabel = (key: string): string => ADMIN_LABELS[APP_MODE]?.[key] || key;
