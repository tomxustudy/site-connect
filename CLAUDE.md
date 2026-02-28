# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## RULES

全部对话称呼我为Tom
全部和我交互的内容包括对话回复、注释及进度文档等都用中文
全部涉及你的搜索与思考都用英文
我的个人背景：本科专业读的是机械工程及自动化；第一份工作在一家CAD软件公司"中望软件"（主要做国产2D/3D的CAD软件），岗位是需求和测试工程师，对python脚本比较熟悉，可以写简单脚本；第二份工作是在工厂做总经理助理，主要是五金制造；第三份工作是在工程公司做内务副总，主要负责流程、数据、预结算、材料调度、项目进退场管理等，有丰富的管理经验。另外我自考了初级会计证和中级经济师（工商管理）。这些背景你可以参考，方便和我沟通并指导我细节。
工作规划：每次项目开发前，都需要确保需求文档在先——定义产品功能边界，再到规划重点逻辑和技术路径，并预估开发工作量和阶段，最后到编程就是自然而然水到渠成的事情。涉及到开发阶段要和我确认后再开始，不要盲目执行
我不需要你经常输出情绪价值，如实公正地和我交互，表述清楚核心问题和解决方案即可


## Project Overview

This is a factory management monorepo containing three main components:

- **admin/** - Web admin dashboard (React + Vite + TailwindCSS)
- **backend/** - Express.js REST API server (TypeScript)
- **miniprogram/** - WeChat miniprogram (Taro framework with React)

## Development Commands

### Backend (`/backend`)
```bash
npm run dev    # Start development server with hot reload (nodemon)
npm run build  # Compile TypeScript to JavaScript
npm run start  # Run production build from dist/
```

### Admin Dashboard (`/admin`)
```bash
npm run dev    # Start Vite dev server
npm run build  # TypeScript compile + Vite build
```

### WeChat Miniprogram (`/miniprogram`)
```bash
npm run build:weapp   # Build for WeChat mini program
npm run dev:weapp    # Build with watch mode
```

## Architecture

### Database Schema (PostgreSQL)

Key tables:
- **tenants** - Factory/department entities (data isolation boundary)
- **users** - System users with roles: `super_admin`, `clerk`, `worker`
- **sites** - Departments/workshops (originally "projects")
- **records** - Core business records with type (person/material/expense)

Data isolation is implemented via `tenant_id` column - users can only see records belonging to their tenant.

### Backend API (`backend/src/index.ts`)

The main Express server with:
- JWT authentication middleware
- Role-based access control (RBAC)
- File upload handling (multer)
- Excel export (exceljs + archiver)
- Tencent Cloud ASR integration for voice transcription

### Roles (Important)

**All role values in database must be lowercase**: `super_admin`, `clerk`, `worker`. Do not use uppercase variants.

- `super_admin` - Full system access, can view all tenants
- `clerk` - Administrative staff, manages records and users within their tenant
- `worker` - Field workers, creates records via miniprogram

### Miniprogram Pages (`miniprogram/src/pages/`)

- **index/** - Dashboard with card-based navigation
- **login/** - Phone-based authentication
- **record/** - Record creation with photo upload
- **my-records/** - View own submitted records

## Configuration

- **Backend config**: `backend/.env` - Database connection, Tencent Cloud credentials
- **Miniprogram config**: `miniprogram/src/config.ts` - API base URL
- **Field mappings**: `field_mapping.yaml` - Terminology customization for factory version

## Key Files

- `backend/src/index.ts` - Main API server (25KB, contains all routes)
- `backend/src/config/db.ts` - PostgreSQL connection
- `admin/src/App.tsx` - Single-file admin dashboard (65KB)
- `miniprogram/src/pages/record/index.tsx` - Record creation UI

## Database Initialization

Run SQL scripts in `backend/database/`:
```bash
node run_sql.js database/init_factory_db.sql
```

## Tunnel Scripts

The backend has Python tunnel scripts (`tunnel.py`, `tunnel_auto.py`, `tunnel_debug.py`) for development connectivity to remote database.
