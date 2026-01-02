# MongoDB Atlas 连接配置

## 连接字符串格式

你的 MongoDB Atlas 连接 URI 应该是：

```
mongodb+srv://xingyuan0630_db_user:<db_password>@melo.qe7zv52.mongodb.net/melo?appName=Melo&retryWrites=true&w=majority
```

## 配置步骤

### 1. 创建 .env 文件

在 `backend/` 目录下创建 `.env` 文件（如果不存在）：

```bash
cd backend
touch .env
```

### 2. 添加 MongoDB URI

在 `.env` 文件中添加以下内容，**将 `<db_password>` 替换为你的实际数据库密码**：

```env
MONGODB_URI=mongodb+srv://xingyuan0630_db_user:YOUR_ACTUAL_PASSWORD@melo.qe7zv52.mongodb.net/melo?appName=Melo&retryWrites=true&w=majority
```

**重要提示**：
- 将 `YOUR_ACTUAL_PASSWORD` 替换为你的实际数据库密码
- 确保密码中没有特殊字符需要 URL 编码（如果有，需要进行 URL 编码）
- 数据库名称已设置为 `melo`

### 3. 密码 URL 编码

如果密码包含特殊字符，需要进行 URL 编码：

| 字符 | URL 编码 |
|------|----------|
| `@` | `%40` |
| `:` | `%3A` |
| `/` | `%2F` |
| `?` | `%3F` |
| `#` | `%23` |
| `[` | `%5B` |
| `]` | `%5D` |
| ` ` (空格) | `%20` |

例如，如果密码是 `p@ssw:rd`，应该编码为 `p%40ssw%3Ard`

### 4. 验证连接

启动后端服务器：

```bash
cd backend
npm run dev
```

如果连接成功，你应该看到：
```
MongoDB Atlas Connected successfully
Database: melo
```

如果连接失败，检查：
1. 密码是否正确
2. MongoDB Atlas 网络访问是否允许你的 IP 地址
3. 连接字符串格式是否正确

## MongoDB Atlas 网络访问配置

确保在 MongoDB Atlas 中配置了网络访问：

1. 登录 [MongoDB Atlas](https://cloud.mongodb.com/)
2. 进入你的集群
3. 点击 "Network Access"
4. 添加 IP 地址：
   - **开发环境**: 添加你的本地 IP 地址，或使用 `0.0.0.0/0`（允许所有 IP，仅用于开发）
   - **生产环境 (Render)**: 添加 Render 的 IP 地址范围，或使用 `0.0.0.0/0`（如果允许）

## 完整的 .env 文件示例

```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://xingyuan0630_db_user:YOUR_PASSWORD@melo.qe7zv52.mongodb.net/melo?appName=Melo&retryWrites=true&w=majority

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here

# Twitter OAuth
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_CALLBACK_URL=http://localhost:5000/api/twitter/callback
BACKEND_URL=http://localhost:5000

# LinkedIn OAuth
LI_CLIENT_ID=your_linkedin_client_id
LI_CLIENT_SECRET=your_linkedin_client_secret
LI_REDIRECT_URI=http://localhost:5000/linkedin/callback
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

## 故障排除

### 连接超时

如果遇到连接超时错误：
1. 检查网络访问配置
2. 确保防火墙没有阻止连接
3. 检查 MongoDB Atlas 集群状态

### 认证失败

如果遇到认证错误：
1. 验证用户名和密码是否正确
2. 检查数据库用户是否有正确的权限
3. 确保密码已正确 URL 编码

### 数据库不存在

如果遇到数据库不存在的错误：
- MongoDB Atlas 会在首次写入时自动创建数据库
- 或者可以在 URI 中指定不同的数据库名称

