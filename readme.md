# Newsender - 热搜获取并发送到飞书

一个简单易用的热搜获取工具，支持多个平台的热搜数据获取，并自动发送到飞书机器人。现已支持 HTTP API 接口和免费云部署。

## 功能特性

- ✅ 支持多个平台热搜获取（微博、抖音、知乎、Bilibili、快手、今日头条、豆瓣）
- ✅ AI 智能整理和分析热搜数据
- ✅ 自动整理并格式化数据
- ✅ 自动发送到飞书机器人
- ✅ HTTP API 接口，支持远程调用
- ✅ 请求重试机制
- ✅ 简洁的控制台输出
- ✅ 支持多种免费云平台部署（Render、Railway、Vercel）

## 安装

```bash
npm install
```

## 配置

### 环境变量配置（推荐）

支持通过环境变量配置，适合云部署：

```bash
# 飞书 Webhook 地址（必需）
FEISHU_WEBHOOK=https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_WEBHOOK_ID

# AI 配置（可选）
AI_ENABLED=true
AI_API_KEY=your_api_key
AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
AI_MODEL_NAME=qwen-vl-max-latest

# 其他配置（可选）
PORT=1575
TIMEOUT=10000
RETRY_TIMES=3
RETRY_DELAY=1000
```

### 本地配置文件

也可以编辑 `config.js` 文件进行配置。

## 使用方法

### 方式一：HTTP 服务（推荐）

启动 HTTP 服务器：

```bash
npm start
```

服务将在 `http://localhost:1575` 启动。

#### API 接口

- **GET /** - 查看 API 文档
- **GET /health** - 健康检查
- **GET /api/hotsearch** - 获取热搜数据（不发送到飞书）
- **GET /api/hotsearch/send** - 获取热搜数据并发送到飞书（使用 AI，如果启用）
- **GET /api/hotsearch/send/raw** - 获取热搜数据并发送原始信息到飞书（不使用 AI）
- **GET /api/run** - 运行完整流程（获取并发送）

#### 使用示例

```bash
# 获取热搜数据
curl http://localhost:1575/api/hotsearch

# 获取并发送到飞书（使用 AI，如果启用）
curl http://localhost:1575/api/hotsearch/send

# 获取并发送原始信息到飞书（不使用 AI 分析）
curl http://localhost:1575/api/hotsearch/send/raw

# 运行完整流程
curl http://localhost:1575/api/run

# 健康检查
curl http://localhost:1575/health
```

### 方式二：命令行运行

直接运行命令行脚本：

```bash
npm run cli
```

或

```bash
node main.js
```

## 支持的平台

- 微博热搜
- 抖音热搜
- 知乎热搜
- Bilibili热搜
- 快手热搜
- 今日头条热搜
- 豆瓣热搜

## 项目结构

```
newsender/
├── main.js              # 主脚本
├── config.js            # 配置文件
├── platforms.js         # 平台配置
├── platforms/           # 各平台解析器
│   ├── weibo.js
│   ├── douyin.js
│   ├── zhihu.js
│   └── bilibili.js
├── package.json
└── README.md
```

## 飞书机器人设置

1. 在飞书群聊中添加自定义机器人
2. 获取 Webhook 地址
3. 将地址配置到 `config.js` 中

## AI 整理功能

脚本支持使用 AI 对热搜数据进行智能整理和分析：
- 自动分析各平台热点
- 突出重要和有趣的热点
- 生成简洁易读的总结
- 保持原有数据结构和统计信息

AI 配置位于 `config.js` 中的 `ai` 对象，可以：
- 通过 `ai.enabled: false` 禁用 AI 整理
- 修改 `ai.modelName` 使用不同的模型
- 调整 `ai.temperature` 控制输出风格

## 免费云部署

### 方式一：Render.com（推荐）

1. 注册 [Render.com](https://render.com) 账号（免费）
2. 在 Dashboard 点击 "New +" → "Web Service"
3. 连接你的 GitHub 仓库
4. 配置如下：
   - **Name**: newsender
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. 在 Environment 中添加环境变量：
   - `FEISHU_WEBHOOK`: 你的飞书 Webhook 地址
   - `AI_API_KEY`: AI API Key（如果使用）
   - `PORT`: 10000（Render 会自动设置，可忽略）
6. 点击 "Create Web Service" 开始部署

部署完成后，你会得到一个类似 `https://newsender.onrender.com` 的地址。

**免费额度限制**：
- 15 分钟无请求后服务会休眠
- 下次请求时会自动唤醒（首次唤醒约需 30 秒）

### 方式二：Railway.app

1. 注册 [Railway.app](https://railway.app) 账号（提供 $5 免费额度）
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的仓库
4. Railway 会自动检测并部署
5. 在 Variables 标签页添加环境变量（同上）
6. 部署完成后获取访问地址

### 方式三：Vercel（Serverless）

1. 注册 [Vercel](https://vercel.com) 账号（免费）
2. 导入 GitHub 仓库
3. Vercel 会自动检测 `vercel.json` 配置
4. 在项目设置中添加环境变量
5. 部署完成

**注意**：Vercel 是 Serverless 模式，适合 API 调用，不适合长时间运行的服务。

### 定时触发

可以使用以下方式定时触发服务：

1. **GitHub Actions**（免费）
   - 创建 `.github/workflows/cron.yml` 定时调用 API

2. **Uptime Robot**（免费）
   - 每分钟检查服务健康状态
   - 也可以使用 HTTP 请求功能定时调用

3. **Cron-job.org**（免费）
   - 创建定时任务，调用你的 API 地址

#### GitHub Actions 示例

下面的工作流程会在仓库中直接运行 CLI 脚本，获取热搜并推送到飞书，不再依赖额外的 `API_URL` Secret：

```yaml
name: Hotsearch Every 2 Hours

on:
  schedule:
    - cron: '0 */2 * * *'  # 每两个小时运行一次（UTC 时间）
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v20
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run cli
```

现在你只需将仓库部署到支持 Node.js 的环境，即可直接使用上述定时任务。
## API 响应示例

### GET /api/hotsearch

```json
{
  "success": true,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "data": [
    {
      "platform": "weibo",
      "name": "微博热搜",
      "data": [...],
      "success": true
    }
  ],
  "summary": {
    "total": 7,
    "success": 6,
    "failed": 1,
    "duration": 1234
  }
}
```

### GET /api/hotsearch/send

```json
{
  "success": true,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": "热搜数据已成功发送到飞书",
  "data": [...],
  "summary": {
    "total": 7,
    "success": 6,
    "failed": 1,
    "duration": 1234
  }
}
```

## 注意事项

- 请确保网络连接正常
- 某些平台可能需要特定的请求头，如遇到问题请检查平台解析器配置
- AI 整理功能需要网络连接到 AI 服务，如失败会自动使用原始数据
- **重要**：部署时不要将敏感信息（如 API Key）提交到代码仓库，使用环境变量配置
- Render 免费版会在 15 分钟无请求后休眠，首次唤醒需要约 30 秒
- 建议使用定时任务定期调用 API，保持服务活跃或触发任务

## 项目结构

```
newsender/
├── server.js            # HTTP 服务器（新增）
├── main.js              # 主脚本（命令行模式）
├── config.js            # 配置文件
├── platforms.js         # 平台配置
├── platforms/           # 各平台解析器
│   ├── weibo.js
│   ├── douyin.js
│   ├── zhihu.js
│   └── bilibili.js
├── render.yaml          # Render 部署配置
├── railway.json         # Railway 部署配置
├── vercel.json          # Vercel 部署配置
├── package.json
└── README.md
```

## License

MIT
