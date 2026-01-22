# 飞书 AI 机器人

基于飞书开放平台的智能机器人，具备 AI 能力，可以根据用户指令执行各种飞书操作。

开发文档：https://open.feishu.cn/document/uAjLw4CM/uMzNwEjLzcDMx4yM3ATM/develop-an-echo-bot/introduction

## 功能特性

### 基础功能
- 接收和回复用户消息
- 支持私聊和群聊

### AI 增强功能
- 🤖 智能理解用户指令
- 📄 创建和搜索飞书文档
- 📊 创建和管理多维表格
- 👥 群组管理
- 🔐 权限管理

## 使用示例

```
@机器人 帮我创建一个项目进度表
@机器人 搜索包含"预算"的文档
@机器人 创建一个名为"团队会议"的文档
```

## 环境配置

需要设置以下环境变量：

- `APP_ID`: 飞书应用 ID
- `APP_SECRET`: 飞书应用密钥
- `DEEPSEEK_API_KEY`: DeepSeek AI API 密钥（可选，不设置则禁用 AI 功能）

## 启动项目

macOS/Linux： 
```bash
APP_ID=<app_id> APP_SECRET=<app_secret> DEEPSEEK_API_KEY=<api_key> ./bootstrap.sh
```

Windows： 
```cmd
set APP_ID=<app_id>&set APP_SECRET=<app_secret>&set DEEPSEEK_API_KEY=<api_key>&bootstrap.bat
```
