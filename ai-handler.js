import OpenAI from 'openai';
import * as Lark from '@larksuiteoapi/node-sdk';

class AIHandler {
  constructor(larkClient) {
    this.larkClient = larkClient;
    this.openai = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1'
    });
  }

  async processMessage(userMessage, chatId) {
    try {
      // 检查消息中是否包含飞书链接
      const linkMatch = this.extractFeishuLink(userMessage);
      if (linkMatch) {
        return await this.handleFeishuLink(linkMatch, userMessage, chatId);
      }

      // 构建系统提示，告诉 AI 可以使用的飞书功能
      const systemPrompt = `你是一个飞书机器人助手，具备真实的飞书操作能力：

1. **文档操作**：
   - 创建文档：{"action": "create_document", "params": {"title": "文档标题", "content": "markdown内容"}}
   - 读取文档：{"action": "read_document", "params": {"document_id": "文档ID", "search_keyword": "可选关键词"}}
   - 读取知识库：{"action": "read_wiki", "params": {"space_id": "空间ID", "node_token": "节点token", "search_keyword": "可选关键词"}}

2. **表格操作**：
   - 创建表格：{"action": "create_bitable", "params": {"name": "表格名称"}}

3. **智能分析**：
   - 当用户发送飞书链接时，自动读取并分析内容
   - 根据用户问题提取相关信息

请根据用户指令智能回复或返回JSON格式指令。`;

      const response = await this.openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      });

      const aiResponse = response.choices[0].message.content;
      
      // 尝试解析 AI 返回的指令
      try {
        const instruction = JSON.parse(aiResponse);
        return await this.executeInstruction(instruction, chatId);
      } catch {
        // 如果不是 JSON 指令，直接返回 AI 的回复
        return aiResponse;
      }
    } catch (error) {
      console.error('AI 处理错误:', error);
      return '抱歉，AI 处理出现错误，请稍后再试。';
    }
  }

  async executeInstruction(instruction, chatId) {
    const { action, params } = instruction;

    switch (action) {
      case 'create_document':
        return await this.createDocument(params, chatId);
      case 'read_document':
        return await this.readDocument(params, chatId);
      case 'read_wiki':
        return await this.readWiki(params, chatId);
      case 'create_bitable':
        return await this.createBitable(params, chatId);
      default:
        return `执行了操作: ${action}，参数: ${JSON.stringify(params)}`;
    }
  }

  async createDocument(params, chatId) {
    try {
      // 使用正确的文档导入 API 调用方式
      const response = await this.larkClient.request({
        method: 'POST',
        url: 'https://open.feishu.cn/open-apis/docx/builtin/import',
        data: {
          file_name: params.title || '测试文档',
          markdown: params.content || `# 测试文档

这是一个由 AI 机器人创建的测试文档。

## 文档内容

- 创建时间：${new Date().toLocaleString('zh-CN')}
- 创建者：飞书 AI 机器人
- 用途：功能测试

## 示例内容

这个文档可以用来测试机器人的文档创建功能。你可以：

1. 编辑文档内容
2. 添加更多信息
3. 与团队成员协作

**祝你使用愉快！** 🎉`
        }
      });
      
      if (response.data && response.data.document_id) {
        return `✅ 文档创建成功！\n📄 文档名称：${params.title || '测试文档'}\n🔗 文档链接：https://feishu.cn/docx/${response.data.document_id}`;
      } else {
        console.log('API 响应:', response);
        return '❌ 文档创建失败，API 返回异常。';
      }
    } catch (error) {
      console.error('创建文档失败详细错误:', error);
      
      // 详细的错误处理
      if (error.response) {
        console.log('错误响应:', error.response.data);
        return `❌ 创建文档失败：${error.response.data.msg || error.message}`;
      } else {
        return `❌ 创建文档失败：${error.message || '网络错误'}`;
      }
    }
  }

  async searchDocuments(params, chatId) {
    try {
      // 使用用户身份搜索文档
      const response = await this.larkClient.docx.builtin.search({
        data: {
          search_key: params.keyword,
          count: 5
        }
      });
      
      if (response.data.docs && response.data.docs.length > 0) {
        let result = `🔍 找到 ${response.data.docs.length} 个相关文档:\n\n`;
        response.data.docs.forEach((doc, index) => {
          result += `${index + 1}. ${doc.title}\n   ID: ${doc.document_id}\n\n`;
        });
        return result;
      } else {
        return `🔍 未找到包含"${params.keyword}"的文档。`;
      }
    } catch (error) {
      console.error('搜索文档失败:', error);
      return '❌ 搜索失败。机器人需要用户授权才能访问文档。请在飞书中手动查看文档，或将内容复制给我分析。';
    }
  }

  async createBitable(params, chatId) {
    try {
      // 创建多维表格应用
      const appResponse = await this.larkClient.bitable.v1.app.create({
        data: {
          name: params.name || '新建表格',
          folder_token: params.folder_token
        }
      });

      const appToken = appResponse.data.app.app_token;

      // 创建表格
      const tableResponse = await this.larkClient.bitable.v1.appTable.create({
        path: { app_token: appToken },
        data: {
          table: {
            name: params.table_name || '数据表',
            fields: params.fields || [
              { field_name: '标题', type: 1 },
              { field_name: '状态', type: 3 }
            ]
          }
        }
      });

      return `✅ 多维表格创建成功！\n表格链接: https://feishu.cn/base/${appToken}`;
    } catch (error) {
      console.error('创建表格失败:', error);
      return '❌ 创建表格失败，请检查权限设置。';
    }
  }

  async readDocument(params, chatId) {
    try {
      let documentId = params.document_id;
      
      if (documentId.includes('feishu.cn') || documentId.includes('larksuite.com')) {
        const match = documentId.match(/\/docx\/([^/?]+)/);
        if (match) {
          documentId = match[1];
        }
      }
      
      const response = await this.larkClient.docx.v1.document.rawContent({
        path: { document_id: documentId }
      });
      
      const content = response.data.content;
      
      if (params.search_keyword) {
        const lines = content.split('\n');
        const matchedLines = lines.filter(line => 
          line.toLowerCase().includes(params.search_keyword.toLowerCase())
        );
        
        if (matchedLines.length > 0) {
          return `📄 在文档中找到相关内容：\n\n${matchedLines.slice(0, 10).join('\n')}`;
        } else {
          return `📄 文档中未找到包含"${params.search_keyword}"的内容。`;
        }
      }
      
      const summary = content.length > 500 ? content.substring(0, 500) + '...' : content;
      return `📄 文档内容摘要：\n\n${summary}`;
      
    } catch (error) {
      console.error('读取文档失败:', error);
      return '❌ 无法读取文档。机器人只能访问明确共享给它的文档。建议：\n1. 将文档内容复制给我分析\n2. 在文档中添加机器人为协作者\n3. 使用我创建新的管理文档';
    }
  }

  async searchBitable(params, chatId) {
    try {
      // 搜索多维表格记录
      const response = await this.larkClient.bitable.v1.appTableRecord.search({
        path: { 
          app_token: params.app_token, 
          table_id: params.table_id 
        },
        data: {
          filter: params.filter,
          field_names: params.field_names
        }
      });
      
      if (response.data.items && response.data.items.length > 0) {
        let result = `📊 找到 ${response.data.items.length} 条记录：\n\n`;
        response.data.items.slice(0, 5).forEach((item, index) => {
          result += `${index + 1}. ${JSON.stringify(item.fields)}\n`;
        });
        return result;
      } else {
        return '📊 未找到匹配的记录。';
      }
    } catch (error) {
      console.error('搜索表格失败:', error);
      return '❌ 搜索表格失败，请检查参数或权限设置。';
    }
  }
}

// 提取飞书链接
AIHandler.prototype.extractFeishuLink = function(message) {
  const patterns = [
    /https:\/\/[^.]+\.feishu\.cn\/wiki\/([^/?]+)/,  // Wiki 链接
    /https:\/\/[^.]+\.feishu\.cn\/docx\/([^/?]+)/,  // 文档链接
    /https:\/\/[^.]+\.feishu\.cn\/base\/([^/?]+)/   // 多维表格链接
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const type = pattern.source.includes('wiki') ? 'wiki' : 
                  pattern.source.includes('docx') ? 'docx' : 'bitable';
      return { type, token: match[1], url: match[0] };
    }
  }
  return null;
};

// 处理飞书链接
AIHandler.prototype.handleFeishuLink = async function(linkInfo, userMessage, chatId) {
  try {
    let content = '';
    
    switch (linkInfo.type) {
      case 'wiki':
        content = await this.readWikiContent(linkInfo.token);
        break;
      case 'docx':
        content = await this.readDocumentContent(linkInfo.token);
        break;
      case 'bitable':
        content = await this.readBitableContent(linkInfo.token);
        break;
    }

    if (content) {
      // 让 AI 分析内容并回答用户问题
      const analysisPrompt = `用户分享了一个飞书${linkInfo.type === 'wiki' ? '知识库' : '文档'}，内容如下：

${content}

用户的问题或指令：${userMessage}

请根据文档内容回答用户的问题，如果用户没有具体问题，请提供文档的摘要。`;

      const response = await this.openai.chat.completions.create({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: analysisPrompt }],
        max_tokens: 1000,
        temperature: 0.7
      });

      return `📄 已读取文档内容：\n\n${response.choices[0].message.content}`;
    } else {
      return '❌ 无法读取文档内容，请检查链接或权限设置。';
    }
  } catch (error) {
    console.error('处理飞书链接失败:', error);
    return '❌ 处理文档链接时出现错误，请稍后重试。';
  }
};

// 读取知识库内容
AIHandler.prototype.readWikiContent = async function(nodeToken) {
  try {
    const response = await this.larkClient.wiki.v2.space.getNode({
      params: { token: nodeToken }
    });
    
    if (response.data && response.data.node) {
      return `标题: ${response.data.node.title}\n内容: ${response.data.node.content || '无文本内容'}`;
    }
    return null;
  } catch (error) {
    console.error('读取知识库失败:', error);
    return null;
  }
};

// 读取文档内容
AIHandler.prototype.readDocumentContent = async function(documentId) {
  try {
    const response = await this.larkClient.docx.v1.document.rawContent({
      path: { document_id: documentId }
    });
    
    return response.data.content;
  } catch (error) {
    console.error('读取文档失败:', error);
    return null;
  }
};

// 读取多维表格内容
AIHandler.prototype.readBitableContent = async function(appToken) {
  try {
    const tablesResponse = await this.larkClient.bitable.v1.appTable.list({
      path: { app_token: appToken }
    });
    
    if (tablesResponse.data.items && tablesResponse.data.items.length > 0) {
      const table = tablesResponse.data.items[0];
      const recordsResponse = await this.larkClient.bitable.v1.appTableRecord.search({
        path: { app_token: appToken, table_id: table.table_id },
        data: { page_size: 10 }
      });
      
      return `表格: ${table.name}\n记录数: ${recordsResponse.data.total}\n前几条记录: ${JSON.stringify(recordsResponse.data.items?.slice(0, 3) || [])}`;
    }
    return null;
  } catch (error) {
    console.error('读取表格失败:', error);
    return null;
  }
};

export default AIHandler;
