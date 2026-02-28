# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## RULES

全部对话称呼我为Tom
全部和我交互的内容包括对话回复、注释及进度文档等都用中文
全部涉及你的搜索与思考都用英文
我的个人背景：本科专业读的是机械工程及自动化；第一份工作在一家CAD软件公司"中望软件"（主要做国产2D/3D的CAD软件），岗位是需求和测试工程师，对python脚本比较熟悉，可以写简单脚本；第二份工作是在工厂做总经理助理，主要是五金制造；第三份工作是在工程公司做内务副总，主要负责流程、数据、预结算、材料调度、项目进退场管理等，有丰富的管理经验。另外我自考了初级会计证和中级经济师（工商管理）。这些背景你可以参考，方便和我沟通并指导我细节。
工作规划：每次项目开发前，都需要确保需求文档在先——定义产品功能边界，再到规划重点逻辑和技术路径，并预估开发工作量和阶段，最后到编程就是自然而然水到渠成的事情。涉及到开发阶段要和我确认后再开始，不要盲目执行
我不需要你经常输出情绪价值，如实公正地和我交互，表述清楚核心问题和解决方案即可


## 项目概述

这是一个工厂/工地 管理 Monorepo，包含三个主要组件：

- **admin/** - Web 管理后台 (React + Vite + TailwindCSS)
- **backend/** - Express.js REST API 服务端 (TypeScript)
- **miniprogram/** - 微信小程序 (Taro + React)

## 开发命令

### 后端 (`/backend`)
```bash
npm run dev    # 启动开发服务器（热重载）
npm run build  # 编译 TypeScript 到 JavaScript
npm run start  # 运行生产构建
```

### 管理后台 (`/admin`)
```bash
npm run dev    # 启动 Vite 开发服务器
npm run build  # TypeScript 编译 + Vite 构建
```

### 微信小程序 (`/miniprogram`)
```bash
npm run build:weapp   # 构建微信小程序
npm run dev:weapp    # 监听模式构建
```

## 架构

### 数据库结构 (PostgreSQL)

主要表：
- **tenants** - 工厂/部门实体（数据隔离边界）
- **users** - 系统用户，角色：`super_admin`、`clerk`、`worker`
- **sites** - 部门/车间（原"项目工地"）
- **records** - 核心业务记录，包含类型（person/material/expense）

数据隔离通过 `tenant_id` 字段实现，用户只能查看所属租户的记录。

### 后端 API (`backend/src/index.ts`)

主 Express 服务器，包含：
- JWT 认证中间件
- 基于角色的访问控制 (RBAC)
- 文件上传处理 (multer)
- Excel 导出 (exceljs + archiver)
- 腾讯云 ASR 语音转文字集成

### 角色（重要）

**数据库中所有角色值必须使用小写**：`super_admin`、`clerk`、`worker`。禁止使用大写变体。

- `super_admin` - 超级管理员，可查看所有租户
- `clerk` - 文员，管理所在租户的记录和用户
- `worker` - 现场人员，通过小程序创建记录

### 小程序页面 (`miniprogram/src/pages/`)

- **index/** - 首页，卡片式导航
- **login/** - 手机号登录
- **record/** - 记录创建，支持照片上传
- **my-records/** - 查看自己提交的记录

## 配置

- **后端配置**：`backend/.env` - 数据库连接、腾讯云凭据
- **小程序配置**：`miniprogram/src/config.ts` - API 基础 URL
- **字段映射**：`field_mapping.yaml` - 工厂版术语自定义配置

## 关键文件

- `backend/src/index.ts` - 主 API 服务器（包含所有路由）
- `backend/src/config/db.ts` - PostgreSQL 连接
- `admin/src/App.tsx` - 单文件管理后台
- `miniprogram/src/pages/record/index.tsx` - 记录创建页面

## 数据库初始化

运行 `backend/database/` 下的 SQL 脚本：
```bash
node run_sql.js database/init_factory_db.sql
```

## 隧道脚本

后端包含 Python 隧道脚本（`tunnel.py`、`tunnel_auto.py`、`tunnel_debug.py`），用于开发时连接远程数据库。

## UI 标签配置

项目使用集中配置管理界面文字，支持两种模式切换：

- **site** (工地模式)：适用于建筑工地、施工现场
- **factory** (工厂模式)：适用于工厂车间、生产制造

### 配置文件位置

| 文件 | 用途 |
|------|------|
| `miniprogram/src/config/ui-labels.ts` | 小程序 UI 配置 |
| `admin/src/ui-labels.ts` | 管理后台 UI 配置 |
| `field_mapping.yaml` | 字段映射 YAML 配置 |

### 切换模式

修改对应文件中的 `APP_MODE` 即可切换：
```typescript
export const APP_MODE: AppMode = 'factory';  // 'site' 或 'factory'
```

---

## 代码质量规范

### 安全规范 (P0 - 必须遵守)

1. **环境变量**
   - 禁止在代码中硬编码密钥、密码、Token
   - 所有敏感配置必须从 `process.env` 读取
   - 启动时检查关键环境变量是否存在

2. **认证与授权**
   - 所有 API 必须验证 JWT Token
   - 基于角色的访问控制 (RBAC)，角色值必须使用小写
   - 租户数据隔离：所有查询必须包含 `tenant_id` 过滤

3. **输入验证**
   - 用户输入必须进行校验和清理
   - 防止 SQL 注入：使用参数化查询
   - 防止 XSS：图片 URL 必须验证协议（仅允许 http/https）
   - 防止路径遍历：文件路径操作必须验证路径

4. **速率限制**
   - 登录接口：15 分钟内最多 10 次
   - 通用接口：15 分钟内最多 100 次

### 代码风格

1. **TypeScript**
   - 必须使用类型定义，禁止使用 `any` 类型（除非不可避免）
   - 接口命名使用 PascalCase（如 `SiteRecord`）
   - 常量使用大写蛇形命名（如 `JWT_SECRET`）

2. **React/组件**
   - 使用函数组件 + Hooks
   - Prop 类型使用接口定义
   - 组件文件保持单一职责

3. **日志规范**
   - 使用简洁的日志格式，不使用 emoji
   - 错误日志包含上下文信息
   - 生产环境不输出堆栈跟踪到响应

### 可维护性

1. **配置集中化**
   - UI 文字、枚举值、选项数组必须提取到配置文件
   - 避免在组件中硬编码业务相关文字

2. **错误处理**
   - 异步操作必须 try-catch
   - 用户操作失败必须给出明确提示
   - 内部错误不暴露给用户

3. **代码组织**
   - 类型定义集中到 `types/` 目录
   - 复用组件提取到 `components/` 目录
   - 配置统一放到 `config/` 目录
