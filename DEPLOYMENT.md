# 部署指南 - Vercel + Render

本文档说明如何将 Melo 项目部署到 Vercel (前端) 和 Render (后端)。

## 架构概览

```
前端 (Vercel) → HTTPS → 后端 (Render) → MongoDB Atlas
```

## 部署前准备

### 1. MongoDB Atlas 设置

1. 访问 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. 创建免费集群 (M0)
3. 创建数据库用户
4. 配置网络访问：
   - 添加 IP 地址：`0.0.0.0/0` (允许所有 IP，或添加 Render 的 IP 范围)
5. 获取连接字符串，格式如下：
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/melo?retryWrites=true&w=majority
   ```

### 2. OAuth 应用配置

#### Google OAuth
- 访问 [Google Cloud Console](https://console.cloud.google.com/)
- 创建 OAuth 2.0 客户端 ID
- 添加授权重定向 URI：`https://your-vercel-url.vercel.app` (部署后更新)

#### Twitter OAuth
- 访问 [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- 创建应用并获取 API Key 和 API Secret
- 设置回调 URL：`https://your-render-url.onrender.com/api/twitter/callback` (部署后更新)

#### LinkedIn OAuth
- 访问 [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
- 创建应用并获取 Client ID 和 Client Secret
- 设置重定向 URI：`https://your-render-url.onrender.com/linkedin/callback` (部署后更新)

## 部署步骤

### 步骤 1: 部署后端到 Render

1. 访问 [Render Dashboard](https://dashboard.render.com/)
2. 点击 "New +" → "Web Service"
3. 连接你的 GitHub 仓库
4. 配置服务：
   - **Name**: `melo-backend`
   - **Environment**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (或选择付费计划)

5. 在 "Environment Variables" 部分添加以下变量：

#### Render 后端环境变量

```env
# 基础配置
NODE_ENV=production
PORT=10000  # Render 会自动设置，但可以显式指定

# 数据库
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/melo?retryWrites=true&w=majority

# JWT 认证
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here

# Twitter OAuth
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_CALLBACK_URL=https://your-render-url.onrender.com/api/twitter/callback

# LinkedIn OAuth
LI_CLIENT_ID=your_linkedin_client_id
LI_CLIENT_SECRET=your_linkedin_client_secret
LI_REDIRECT_URI=https://your-render-url.onrender.com/linkedin/callback

# 前端 URL (部署前端后更新)
CLIENT_URL=https://your-vercel-url.vercel.app
FRONTEND_URL=https://your-vercel-url.vercel.app

# 后端 URL (部署后获取)
BACKEND_URL=https://your-render-url.onrender.com
```

6. 点击 "Create Web Service"
7. 等待部署完成，记录后端 URL (例如: `https://melo-backend.onrender.com`)

### 步骤 2: 更新 OAuth 回调 URL

部署后端后，更新以下 OAuth 应用的回调 URL：

1. **Twitter Developer Portal**: 更新回调 URL 为 `https://your-render-url.onrender.com/api/twitter/callback`
2. **LinkedIn Developer Portal**: 更新重定向 URI 为 `https://your-render-url.onrender.com/linkedin/callback`
3. 在 Render 环境变量中更新 `TWITTER_CALLBACK_URL` 和 `LI_REDIRECT_URI`

### 步骤 3: 部署前端到 Vercel

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New..." → "Project"
3. 导入你的 GitHub 仓库
4. 配置项目：
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (自动检测)
   - **Output Directory**: `dist` (自动检测)
   - **Install Command**: `npm install` (自动检测)

5. 在 "Environment Variables" 部分添加以下变量：

#### Vercel 前端环境变量

```env
# 后端 API URL (使用步骤 1 中获取的 Render URL)
VITE_API_URL=https://your-render-url.onrender.com

# Google OAuth Client ID
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
```

6. 点击 "Deploy"
7. 等待部署完成，记录前端 URL (例如: `https://melo-frontend.vercel.app`)

### 步骤 4: 更新后端环境变量

部署前端后，返回 Render Dashboard，更新后端环境变量：

1. 更新 `CLIENT_URL` 为你的 Vercel 前端 URL
2. 更新 `FRONTEND_URL` 为你的 Vercel 前端 URL
3. 重新部署后端服务（Render 会自动检测环境变量更改）

### 步骤 5: 更新 Google OAuth 重定向 URI

1. 访问 Google Cloud Console
2. 更新 OAuth 2.0 客户端 ID 的授权重定向 URI 为你的 Vercel 前端 URL
3. 例如: `https://melo-frontend.vercel.app`

## 环境变量完整列表

### Render (后端) 环境变量

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|------|
| `NODE_ENV` | 环境模式 | 是 | `production` |
| `PORT` | 端口号 | 否 | Render 自动设置 |
| `MONGODB_URI` | MongoDB 连接字符串 | 是 | `mongodb+srv://...` |
| `JWT_SECRET` | JWT 密钥 | 是 | 随机字符串 |
| `JWT_EXPIRE` | JWT 过期时间 | 否 | `7d` |
| `GEMINI_API_KEY` | Gemini API 密钥 | 是 | 从 Google AI Studio 获取 |
| `GEMINI_MODEL` | Gemini 模型名称 | 否 | `gemini-2.5-flash` |
| `GEMINI_IMAGE_MODEL` | Gemini 图片模型 | 否 | `gemini-2.5-flash-image` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | 是 | 从 Google Cloud Console 获取 |
| `TWITTER_API_KEY` | Twitter API Key | 是 | 从 Twitter Developer Portal 获取 |
| `TWITTER_API_SECRET` | Twitter API Secret | 是 | 从 Twitter Developer Portal 获取 |
| `TWITTER_CALLBACK_URL` | Twitter 回调 URL | 是 | `https://your-render-url.onrender.com/api/twitter/callback` |
| `LI_CLIENT_ID` | LinkedIn Client ID | 是 | 从 LinkedIn Developer Portal 获取 |
| `LI_CLIENT_SECRET` | LinkedIn Client Secret | 是 | 从 LinkedIn Developer Portal 获取 |
| `LI_REDIRECT_URI` | LinkedIn 重定向 URI | 是 | `https://your-render-url.onrender.com/linkedin/callback` |
| `CLIENT_URL` | 前端 URL | 是 | `https://your-vercel-url.vercel.app` |
| `FRONTEND_URL` | 前端 URL | 是 | `https://your-vercel-url.vercel.app` |
| `BACKEND_URL` | 后端 URL | 是 | `https://your-render-url.onrender.com` |

### Vercel (前端) 环境变量

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|------|
| `VITE_API_URL` | 后端 API URL | 是 | `https://your-render-url.onrender.com` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | 是 | 从 Google Cloud Console 获取 |

## 验证部署

### 1. 检查后端健康状态

访问: `https://your-render-url.onrender.com/api/health`

应该返回:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### 2. 检查前端

访问你的 Vercel URL，应该能看到应用首页。

### 3. 测试功能

1. 注册/登录用户
2. 测试 API 调用
3. 测试文件上传
4. 测试 OAuth 登录

## 常见问题

### Render 服务休眠

Render 免费层服务在 15 分钟无活动后会休眠。首次请求可能需要 30-60 秒来唤醒服务。

**解决方案**:
- 使用 Render 付费计划（始终在线）
- 使用外部监控服务定期 ping 你的服务
- 接受首次请求延迟

### 文件上传丢失

Render 的文件系统是临时的，服务重启后文件会丢失。

**当前状态**: 使用临时文件系统（仅用于测试）

**生产环境建议**:
- 使用云存储服务（AWS S3, Cloudinary, 等）
- 使用 Render Disk（付费功能）

### CORS 错误

如果遇到 CORS 错误：

1. 检查后端 `CLIENT_URL` 和 `FRONTEND_URL` 环境变量是否正确
2. 确保前端 URL 与后端配置的允许来源匹配
3. 检查浏览器控制台的错误信息

### 环境变量未生效

1. **Vercel**: 环境变量更改后需要重新部署
2. **Render**: 环境变量更改后会自动重新部署
3. 确保环境变量名称正确（区分大小写）

## 文件存储说明

当前实现使用 Render 的临时文件系统存储上传的文件。这意味着：

- ✅ 文件可以正常上传和使用
- ⚠️ 服务重启后文件会丢失
- ⚠️ 多个实例之间文件不共享

**仅用于测试环境**。生产环境建议迁移到云存储服务。

## 后续优化

1. **文件存储**: 迁移到 AWS S3 或 Cloudinary
2. **CDN**: 为静态资源配置 CDN
3. **监控**: 添加错误监控和性能监控
4. **CI/CD**: 配置自动部署流程
5. **域名**: 配置自定义域名

## 支持

如有问题，请检查：
- Render 服务日志
- Vercel 部署日志
- 浏览器控制台错误
- 网络请求状态

