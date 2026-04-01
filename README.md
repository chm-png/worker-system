# 工人考勤与工作系统

基于 Vue 3 + Node.js + MongoDB + Socket.io 的实时考勤与任务管理系统。

## 项目简介

智工云系统是一套企业级考勤与工作协同平台，支持：
- 管理员端：考勤统计、任务派发、员工管理
- 员工端：打卡签到、任务接收与提交、即时通讯

## 技术栈

### 前端
- Vue 3 + Vite
- Element Plus (UI组件库)
- Pinia (状态管理)
- Axios (HTTP客户端)
- Socket.io-client (实时通信)

### 后端
- Node.js + Express
- MongoDB + Mongoose
- Socket.io
- JWT + bcrypt (认证加密)

## 项目结构

```
worker-system/
├── server/              # 后端服务
│   ├── config/          # 配置文件
│   ├── controllers/      # 控制器
│   ├── middleware/       # 中间件
│   ├── models/          # 数据库模型
│   ├── routes/          # 路由
│   ├── uploads/         # 文件上传
│   ├── utils/           # 工具函数
│   └── app.js          # 入口文件
│
└── src/                 # 前端
    ├── api/            # 接口封装
    ├── assets/         # 静态资源
    ├── components/     # 公共组件
    ├── router/        # 路由配置
    ├── store/         # 状态管理
    ├── views/         # 页面视图
    └── App.vue
```

## 快速开始

### 1. 安装依赖

```bash
# 后端依赖
cd server
npm install

# 前端依赖
cd ../src
npm install
```

### 2. 配置环境变量

在 server 目录创建 `.env` 文件：

```env
PORT=3000
MONGO_URL=mongodb://localhost:27017/worker_system
JWT_SECRET=your_secret_key_here
```

### 3. 启动服务

```bash
# 启动后端 (开发模式)
cd server
npm run dev

# 启动前端 (新终端)
cd src
npm run dev
```

## 功能模块

### 管理员端
- 考勤统计：实时查看员工打卡状态，支持手动修改
- 任务派发：向指定员工派发任务，设置截止时间
- 员工管理：查看/编辑员工信息

### 员工端
- 打卡签到：一键打卡，自动记录时间
- 任务中心：查看任务详情，提交工作报告
- 即时通讯：与同事实时聊天

## License

MIT
