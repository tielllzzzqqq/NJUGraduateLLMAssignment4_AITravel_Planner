# Docker 镜像推送到阿里云容器镜像服务配置指南

## 配置 GitHub Repository Secrets

### 步骤 1: 进入 GitHub 仓库设置

1. 打开你的 GitHub 仓库：https://github.com/tielllzzzqqq/NJUGraduateLLMAssignment4_AITravel_Planner
2. 点击 **Settings**（设置）
3. 在左侧菜单中找到 **Secrets and variables** → **Actions**
4. 点击 **New repository secret** 按钮

### 步骤 2: 配置所需的 Secrets

需要配置以下 **2 个 Repository secrets**：

#### 1. ALIBABA_CLOUD_USERNAME
- **Name**: `ALIBABA_CLOUD_USERNAME`
- **Value**: 你的完整阿里云账号名（例如：`aliyun4681828459`）
  - 注意：必须是完整的账号名，不是邮箱或手机号
  - 在阿里云控制台的右上角可以看到你的账号名

#### 2. ALIBABA_CLOUD_PASSWORD
- **Name**: `ALIBABA_CLOUD_PASSWORD`
- **Value**: 你的 Docker 登录密码
  - 这是在容器镜像服务中设置的 Docker 登录密码
  - 如果还没有设置，请访问：https://cr.console.aliyun.com/ → 访问凭证 → 设置 Docker 登录密码

> **注意**：命名空间（NAMESPACE）和镜像名称（IMAGE_NAME）现在直接在工作流文件中配置，无需在 Secrets 中设置。

## 获取阿里云容器镜像服务凭证

### 步骤 1: 登录阿里云控制台

1. 访问：https://cr.console.aliyun.com/
2. 使用你的阿里云账号登录

### 步骤 2: 确认命名空间和仓库

根据你提供的信息：
- **命名空间**: `aliyun_lzq`
- **仓库名称**: `travel_planner`
- **Registry 地址**: `crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com`

如果你的命名空间不同，需要修改 `.github/workflows/docker-build.yml` 文件中的 `NAMESPACE` 和 `IMAGE_NAME` 环境变量。

### 步骤 3: 获取访问凭证

有两种方式获取访问凭证：

#### 重要：个人版容器镜像服务的认证方式

对于个人版容器镜像服务，需要使用：
- **Username**: 你的**完整阿里云账号名**（例如：`aliyun4681828459`）
  - 不是邮箱，不是手机号，是完整的账号名
  - 可以在阿里云控制台右上角看到
- **Password**: 你的 **Docker 登录密码**
  - 这是在容器镜像服务中单独设置的密码
  - 访问：https://cr.console.aliyun.com/ → 点击右上角头像 → **访问凭证** → 设置 **Docker 登录密码**

> **注意**：如果还没有设置 Docker 登录密码，请先设置。这个密码与你的阿里云账号登录密码是分开的。

### 步骤 4: 确认 Registry 地址

- **个人版 Registry 地址**: `crpi-ds0j5gxjdmixc0v8.cn-hangzhou.personal.cr.aliyuncs.com`
  - 这是你的个人版容器镜像服务的公网地址
  - 每个用户的地址都不同
  - 可以在仓库的"操作指南"中看到

- **企业版 Registry 地址**: `registry.cn-hangzhou.aliyuncs.com`（仅适用于企业版）

> **重要**：工作流文件已经配置为使用个人版地址。如果你的地址不同，请修改 `.github/workflows/docker-build.yml` 文件中的 `REGISTRY` 环境变量。

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

### Q: 403 Forbidden 错误怎么办？

**A: 检查以下几点**

1. **Registry 地址是否正确**
   - 个人版使用：`crpi-xxxxx.cn-hangzhou.personal.cr.aliyuncs.com`
   - 企业版使用：`registry.cn-hangzhou.aliyuncs.com`
   - 确认工作流文件中的 `REGISTRY` 环境变量是正确的

2. **用户名是否正确**
   - 必须使用完整的阿里云账号名（例如：`aliyun4681828459`）
   - 不是邮箱，不是手机号
   - 在阿里云控制台右上角可以看到

3. **密码是否正确**
   - 必须使用 Docker 登录密码，不是阿里云账号登录密码
   - 在容器镜像服务控制台的"访问凭证"页面设置

4. **命名空间和仓库名称是否正确**
   - 确认工作流文件中的 `NAMESPACE` 和 `IMAGE_NAME` 与你的仓库配置一致

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

