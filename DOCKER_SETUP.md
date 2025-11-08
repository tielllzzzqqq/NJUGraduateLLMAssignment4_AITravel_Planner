# Docker 镜像推送到阿里云容器镜像服务配置指南

## 配置 GitHub Repository Secrets

### 步骤 1: 进入 GitHub 仓库设置

1. 打开你的 GitHub 仓库：https://github.com/tielllzzzqqq/NJUGraduateLLMAssignment4_AITravel_Planner
2. 点击 **Settings**（设置）
3. 在左侧菜单中找到 **Secrets and variables** → **Actions**
4. 点击 **New repository secret** 按钮

### 步骤 2: 配置所需的 Secrets

需要配置以下 **3 个 Repository secrets**：

#### 1. ALIBABA_CLOUD_USERNAME
- **Name**: `ALIBABA_CLOUD_USERNAME`
- **Value**: 你的阿里云容器镜像服务用户名（通常是阿里云账号）

#### 2. ALIBABA_CLOUD_PASSWORD
- **Name**: `ALIBABA_CLOUD_PASSWORD`
- **Value**: 你的阿里云容器镜像服务密码（登录密码或访问凭证）

#### 3. ALIBABA_CLOUD_NAMESPACE
- **Name**: `ALIBABA_CLOUD_NAMESPACE`
- **Value**: 你的容器镜像服务命名空间（例如：`your-namespace`）

## 获取阿里云容器镜像服务凭证

### 步骤 1: 登录阿里云控制台

1. 访问：https://cr.console.aliyun.com/
2. 使用你的阿里云账号登录

### 步骤 2: 创建命名空间（如果还没有）

1. 点击左侧菜单 **命名空间**
2. 点击 **创建命名空间**
3. 输入命名空间名称（例如：`travel-planner`）
4. 选择地域（例如：`华东1（杭州）`）
5. 点击 **确定**

### 步骤 3: 获取访问凭证

有两种方式获取访问凭证：

#### 方式 1: 使用阿里云账号密码
- **Username**: 你的阿里云账号（通常是手机号或邮箱）
- **Password**: 你的阿里云账号登录密码

#### 方式 2: 使用访问凭证（推荐，更安全）

1. 在容器镜像服务控制台，点击右上角头像
2. 选择 **访问凭证**
3. 设置 **Docker 登录密码**（如果还没有设置）
4. 设置密码后，可以使用：
   - **Username**: 你的阿里云账号
   - **Password**: 你设置的 Docker 登录密码

### 步骤 4: 确认地域和 Registry 地址

- **Registry 地址**: `registry.cn-hangzhou.aliyuncs.com`（华东1-杭州）
- 如果你的命名空间在其他地域，需要修改工作流文件中的 `REGISTRY` 环境变量

## 验证配置

### 方式 1: 推送到 GitHub 触发构建

```bash
git commit --allow-empty -m "trigger docker build"
git push
```

### 方式 2: 手动触发工作流

1. 在 GitHub 仓库页面，点击 **Actions** 标签
2. 选择 **Build and Push Docker Image** 工作流
3. 点击 **Run workflow** 按钮
4. 选择分支（通常是 `main`）
5. 点击 **Run workflow**

### 检查构建状态

1. 在 **Actions** 页面查看工作流运行状态
2. 如果成功，应该看到：
   - ✅ 所有步骤都成功
   - Docker 镜像被推送到阿里云容器镜像服务

### 验证镜像

1. 访问阿里云容器镜像服务控制台
2. 进入你的命名空间
3. 应该能看到 `travel-planner:latest` 和 `travel-planner:<commit-sha>` 镜像

## 常见问题

### Q: Repository secrets 还是 Environment secrets？

**A: 使用 Repository secrets**

- **Repository secrets**: 适用于仓库级别的配置，所有工作流都可以使用
- **Environment secrets**: 适用于需要不同环境（如 dev/staging/prod）的场景，需要额外配置环境

对于这个项目，使用 **Repository secrets** 就足够了。

### Q: 如果我的命名空间在其他地域怎么办？

修改 `.github/workflows/docker-build.yml` 中的 `REGISTRY` 环境变量：

```yaml
env:
  REGISTRY: registry.cn-beijing.aliyuncs.com  # 北京
  # 或
  REGISTRY: registry.cn-shanghai.aliyuncs.com  # 上海
  # 等等
```

### Q: 如何修改镜像名称？

修改 `.github/workflows/docker-build.yml` 中的 `IMAGE_NAME` 环境变量：

```yaml
env:
  IMAGE_NAME: your-image-name
```

### Q: 构建失败怎么办？

1. 检查 Secrets 是否正确配置
2. 检查用户名和密码是否正确
3. 检查命名空间是否存在
4. 检查 Registry 地址是否正确
5. 查看 GitHub Actions 日志中的错误信息

## 安全建议

1. **不要将 Secrets 提交到代码仓库**
2. **使用访问凭证而不是账号密码**（更安全）
3. **定期轮换密码**
4. **限制命名空间的访问权限**

## 参考链接

- [阿里云容器镜像服务文档](https://help.aliyun.com/product/60716.html)
- [GitHub Actions Secrets 文档](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Docker Login Action 文档](https://github.com/docker/login-action)

