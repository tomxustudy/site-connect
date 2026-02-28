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
    appName: '工地通管理系统',
    appNameShort: '工地通 Admin',
    navInbox: '收件箱',
    navExport: '导出数据',
    navSettings: '工地设置',
    filterAllSites: '所有工地',
    filterAllTypes: '全部类型',
    typePerson: '人员',
    typeMaterial: '材料',
    typeExpense: '费用',
    colTypeSite: '类型/工地',
    colSite: '工地',
    colRecorder: '记录人',
    colRecorderName: '外部人员',
    formNewSite: '新增工地',
    formSubmitBtn: '提交工地项目',
    roleSuperAdmin: '超级管理员',
    roleClerk: '客户文员',
    roleWorker: '现场人员',
    workerRequiredPhone: '现场人员必须填写手机号',
    noDescription: '现场工作人员未补充描述数据...',
  },
  factory: {
    appName: '工厂管理系统',
    appNameShort: '工厂 Admin',
    navInbox: '收件箱',
    navExport: '导出数据',
    navSettings: '部门设置',
    filterAllSites: '所有部门',
    filterAllTypes: '全部类型',
    typePerson: '人员',
    typeMaterial: '材料',
    typeExpense: '费用',
    colTypeSite: '类型/部门',
    colSite: '部门',
    colRecorder: '记录人',
    colRecorderName: '外部人员',
    formNewSite: '新增部门',
    formSubmitBtn: '提交部门项目',
    roleSuperAdmin: '超级管理员',
    roleClerk: '客户文员',
    roleWorker: '现场人员',
    workerRequiredPhone: '现场人员必须填写手机号',
    noDescription: '现场工作人员未补充描述数据...',
  },
};

export const getAdminLabel = (key: string): string => ADMIN_LABELS[APP_MODE]?.[key] || key;
