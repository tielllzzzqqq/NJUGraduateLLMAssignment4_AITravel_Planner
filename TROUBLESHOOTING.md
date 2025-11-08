# 故障排查指南

## API访问被拒绝错误 (Access denied)

如果遇到 "Access denied, please make sure your account is in good standing" 错误，请按照以下步骤排查：

### 1. 检查 API Key 配置

#### 检查 .env 文件
确保在项目根目录的 `.env` 文件中正确配置了 `DASHSCOPE_API_KEY`：

```bash
# 阿里云百炼平台 API Key
DASHSCOPE_API_KEY=your_api_key_here

# Base URL（可选，默认使用中国地域）
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型名称（可选，默认为 qwen-plus）
DASHSCOPE_MODEL=qwen-plus
```

#### 验证 API Key 格式
- API Key 应该是一个以 `sk-` 开头的字符串
- 确保没有多余的空格或引号
- 确保 API Key 完整（通常很长）

### 2. 检查 API Key 状态

#### 登录阿里云百炼平台
1. 访问 https://dashscope.aliyun.com/
2. 登录您的账户
3. 进入 "API-KEY 管理"
4. 检查您的 API Key 状态：
   - 是否已激活
   - 是否已过期
   - 是否有使用限制

### 3. 检查账户余额

1. 在阿里云百炼平台控制台查看账户余额
2. 确保账户有足够的余额调用 API
3. 检查是否有欠费或账户被暂停

### 4. 检查模型权限

1. 确认您的 API Key 有权限使用所选模型（默认：`qwen-plus`）
2. 某些模型可能需要特殊权限或付费计划
3. 可以尝试使用其他模型，如 `qwen-turbo`（更快但可能功能较少）

### 5. 检查网络连接

1. 确保服务器可以访问阿里云 API 端点
2. 检查防火墙设置
3. 如果在国内，确保使用中国地域的 API 地址：
   ```
   https://dashscope.aliyuncs.com/compatible-mode/v1
   ```

### 6. 验证环境变量加载

#### 检查后端日志
启动后端服务器后，查看控制台输出，应该看到：
```
LLM Service Configuration: {
  apiKeySet: true,
  apiKeyPrefix: 'sk-xxxxx...',
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model: 'qwen-plus'
}
```

如果 `apiKeySet: false`，说明环境变量没有正确加载。

#### 手动测试 API Key
可以使用 curl 命令测试 API Key：

```bash
curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-plus",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

如果返回 401 或 403 错误，说明 API Key 有问题。

### 7. 常见问题解决

#### 问题：API Key 未设置
**解决方案：**
- 检查 `.env` 文件是否存在
- 确保 `.env` 文件在项目根目录
- 重启后端服务器（环境变量只在启动时加载）

#### 问题：API Key 无效
**解决方案：**
- 在阿里云百炼平台重新生成 API Key
- 更新 `.env` 文件中的 `DASHSCOPE_API_KEY`
- 重启后端服务器

#### 问题：账户余额不足
**解决方案：**
- 在阿里云控制台充值
- 检查账户账单和消费记录

#### 问题：模型不可用
**解决方案：**
- 尝试使用其他模型，如 `qwen-turbo`
- 在 `.env` 文件中设置：
  ```
  DASHSCOPE_MODEL=qwen-turbo
  ```

### 8. 调试步骤

1. **查看后端日志**
   - 启动后端服务器
   - 查看控制台输出的错误信息
   - 检查 API 响应的详细信息

2. **检查 API 响应**
   - 查看错误日志中的 `status` 和 `data` 字段
   - 403 错误通常表示权限问题
   - 401 错误通常表示 API Key 无效

3. **测试 API 连接**
   - 使用上述 curl 命令测试
   - 或者使用 Postman 等工具测试

### 9. 联系支持

如果以上步骤都无法解决问题：
1. 检查阿里云百炼平台的公告和文档
2. 联系阿里云技术支持
3. 在项目 Issues 中报告问题（附上错误日志）

## 其他常见错误

### 超时错误
- 增加 API 超时时间
- 检查网络连接
- 简化请求内容

### JSON 解析错误
- 这通常是 API 返回格式问题
- 系统会自动使用备用方案生成计划

### 地图加载失败
- 检查高德地图 API Key 配置
- 确保 `VITE_AMAP_KEY` 在 `frontend/.env` 中正确设置

## 获取帮助

如果遇到其他问题，请：
1. 查看项目 README.md
2. 查看 CONFIGURATION_CHECKLIST.md
3. 在 GitHub Issues 中提问

