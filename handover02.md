# Handover 02: Site Connect Cloud Deployment & isolation

## 🚀 当前状态 (Current State)
系统已成功部署至腾讯云服务器 **175.178.10.70**，后端进程由 PM2 管理。

- **管理后台**: `http://175.178.10.70:3000/`
- **超级管理员**: `admin` / `admin123`
- **小程序环境**: 已兼容新版后端授权与登录。

## ✅ 本次会话完成的关键改动
1. **角色与权限修复 (RBAC Refinement)**:
    - 解决了数据库角色值 (`super_admin`) 与代码检查值 (`SUPER_ADMIN`) 的大小写不匹配问题。
    - 后端中间件和前端登录逻辑均已实现角色归一化（统一转大写处理）。
2. **UI 命名规范化 (Nomenclature)**:
    - “租户管理” → **客户管理** (Customer Management)
    - “工地/项目” → **项目管理** (Project Management)
    - 模型及表单标签同步更新。
3. **数据隔离强化 (Data Isolation)**:
    - 文员 (`clerk`) 和 现场人员 (`worker`) 创建时必须选择所属客户。
    - 数据库 `records` 表已清空旧数据，后续记录将严格基于 `tenant_id` 物理隔离。
    - 手机号验证逻辑：文员可选，现场人员（小程序端）必填。
4. **服务器环境优化 (Deployment Fixes)**:
    - 修复了 Express 5 不支持 `*` 通配符路由导致的崩溃。
    - 配置了 PM2 的 `.nvm/nvm.sh` 环境加载，确保服务随系统自动重启。

## 🛠 数据库状态 (Database Status)
- **表结构变更**: `users` 表新增 `username` 和 `password_hash` 字段。
- **字段变更**: `users.phone` 设为 `NULLABLE`（数据库层）。
- **角色约束**: 数据库 `role` 使用小写格式 (`super_admin`, `clerk`, `worker`)。

## 📌 下一阶段任务建议 (Next Steps)
1. **小程序联调**: 验证现场人员通过手机号授权后，是否能正确获取所属客户下的项目列表。
2. **数据导出功能**: 完善导出模块，支持按客户维度筛选并一键打包照片与 Excel。
3. **安全加固**: 在 Tom 确认一切正常后，建议移除调试用的数据库重置按钮。

---
*Handover completed by Antigravity @ 2026-02-04*
