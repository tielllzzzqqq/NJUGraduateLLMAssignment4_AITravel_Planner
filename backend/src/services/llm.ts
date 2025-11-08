import axios from 'axios';

interface TravelRequest {
  destination: string;
  days: number;
  budget: number;
  travelers: number;
  preferences?: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
  };
}

interface TravelPlan {
  itinerary: Array<{
    day: number;
    date: string;
    activities: Array<{
      time: string;
      type: 'transport' | 'attraction' | 'restaurant' | 'accommodation';
      name: string;
      location: string;
      description: string;
      cost?: number;
      coordinates?: { lat: number; lng: number };
    }>;
  }>;
  summary: {
    totalEstimatedCost: number;
    highlights: string[];
    tips: string[];
  };
}

export class LLMService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.DASHSCOPE_API_KEY || '';
    // 默认使用中国地域，如需使用新加坡地域，使用：https://dashscope-intl.aliyuncs.com/compatible-mode/v1
    this.baseUrl = process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.model = process.env.DASHSCOPE_MODEL || 'qwen-plus';
    
    // Log configuration status (without exposing full API key)
    console.log('LLM Service Configuration:', {
      apiKeySet: !!this.apiKey,
      apiKeyPrefix: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'NOT SET',
      baseUrl: this.baseUrl,
      model: this.model
    });
    
    if (!this.apiKey) {
      console.warn('⚠️  DASHSCOPE_API_KEY is not configured. Please set it in .env file.');
    }
  }

  async generateTravelPlan(request: TravelRequest): Promise<TravelPlan> {
    const prompt = this.buildTravelPrompt(request);
    
    if (!this.apiKey) {
      console.error('DASHSCOPE_API_KEY is not configured');
      throw new Error('API Key not configured. Please set DASHSCOPE_API_KEY in .env file');
    }

    if (!this.baseUrl) {
      console.error('DASHSCOPE_BASE_URL is not configured');
      throw new Error('Base URL not configured. Please set DASHSCOPE_BASE_URL in .env file');
    }

    console.log('Calling LLM API:', { baseUrl: this.baseUrl, model: this.model });
    console.log('Prompt length:', prompt.length);
    
    // Retry logic for timeout errors
    const maxRetries = 2;
    let lastError: any = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt}/${maxRetries}...`);
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
        
        const response = await axios.post<ChatCompletionResponse>(
          `${this.baseUrl}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: '你是一个专业的旅行规划助手，能够根据用户需求生成详细的旅行计划。请以JSON格式返回结果，确保返回的是有效的JSON对象。'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 2000 // Reduced for faster response
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 120000 // 120 seconds timeout for LLM generation
          }
        );

        console.log('LLM API response status:', response.status);
        console.log('LLM API response data keys:', Object.keys(response.data || {}));

        if (!response.data.choices || !response.data.choices[0]?.message?.content) {
          console.error('Invalid response format:', JSON.stringify(response.data, null, 2));
          throw new Error('Invalid response format from LLM API');
        }

        const content = response.data.choices[0].message.content;
        console.log('LLM response content length:', content.length);
        return this.parseTravelPlan(content, request);
      } catch (error: any) {
        lastError = error;
        
        // Extract detailed error information
        const errorStatus = error.response?.status;
        const errorData = error.response?.data;
        const errorMessage = errorData?.error?.message || errorData?.message || error.message;
        
        console.error(`LLM API Error (attempt ${attempt + 1}/${maxRetries + 1}):`, {
          message: errorMessage,
          status: errorStatus,
          statusText: error.response?.statusText,
          code: error.code,
          data: errorData,
          apiKey: this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'NOT SET',
          baseUrl: this.baseUrl,
          model: this.model,
          config: {
            url: error.config?.url,
            method: error.config?.method
          }
        });
        
        // Don't retry for authentication/authorization errors
        if (errorStatus === 401) {
          throw new Error('API Key认证失败。请检查您的 DASHSCOPE_API_KEY 是否正确配置，确保API Key有效且未过期。');
        } else if (errorStatus === 403) {
          // 403 Forbidden - Access denied
          const detailedMsg = errorMessage?.includes('Access denied') || errorMessage?.includes('account is in good standing')
            ? 'API访问被拒绝。请检查：1) API Key是否正确；2) 账户余额是否充足；3) 是否有权限使用该模型；4) 账户状态是否正常。'
            : `API访问被拒绝: ${errorMessage}`;
          throw new Error(detailedMsg);
        } else if (errorStatus === 429) {
          throw new Error('API请求频率超限，请稍后再试。');
        } else if (errorStatus === 400) {
          throw new Error(`API请求参数错误: ${errorMessage || '请检查请求参数格式'}`);
        } else if (errorStatus === 404) {
          throw new Error(`模型不存在或API端点错误。请检查模型名称(${this.model})和API地址(${this.baseUrl})是否正确。`);
        }
        
        // Retry on timeout or network errors
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message === 'Network Error' || error.code === 'ECONNRESET') {
          if (attempt < maxRetries) {
            console.log('Timeout/network error, will retry...');
            continue; // Retry
          } else {
            throw new Error('请求超时。API响应时间过长，请检查网络连接或稍后重试。');
          }
        }
        
        // For other errors, don't retry
        const friendlyMessage = errorMessage || error.message || '未知错误';
        throw new Error(`生成旅行计划失败: ${friendlyMessage}`);
      }
    }
    
    // Should not reach here, but just in case
    throw new Error('Failed to generate travel plan after retries: ' + (lastError?.message || 'Unknown error'));
  }

  private buildTravelPrompt(request: TravelRequest): string {
    // Simplified prompt for faster response
    return `请为以下旅行需求生成旅行计划，返回JSON格式：

目的地：${request.destination}
天数：${request.days}天
预算：${request.budget}元
人数：${request.travelers}人
偏好：${request.preferences || '无'}

返回JSON格式：
{
  "itinerary": [
    {
      "day": 1,
      "date": "2024-01-01",
      "activities": [
        {
          "time": "09:00",
          "type": "attraction",
          "name": "景点",
          "location": "地址",
          "description": "描述",
          "cost": 100
        }
      ]
    }
  ],
  "summary": {
    "totalEstimatedCost": 5000,
    "highlights": ["亮点"],
    "tips": ["建议"]
  }
}

要求：每天3-4个活动，费用合理，JSON格式正确。`;
  }

  private parseTravelPlan(content: string, request: TravelRequest): TravelPlan {
    try {
      // Clean the content - remove markdown code blocks if present
      let cleanedContent = content.trim();
      
      // Remove markdown code blocks
      cleanedContent = cleanedContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to extract JSON from the response - look for the first complete JSON object
      let jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        let jsonString = jsonMatch[0];
        
        // Try to fix common JSON issues
        // Remove trailing commas before closing brackets/braces
        jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
        
        // Try to fix incomplete JSON by finding the last complete structure
        let braceCount = 0;
        let lastValidIndex = -1;
        for (let i = 0; i < jsonString.length; i++) {
          if (jsonString[i] === '{') braceCount++;
          if (jsonString[i] === '}') braceCount--;
          if (braceCount === 0 && i > 0) {
            lastValidIndex = i;
            break;
          }
        }
        
        if (lastValidIndex > 0) {
          jsonString = jsonString.substring(0, lastValidIndex + 1);
        }
        
        try {
          const parsed = JSON.parse(jsonString);
          const validated = this.validateAndFormatPlan(parsed, request);
          console.log('✅ Successfully parsed LLM JSON response');
          return validated;
        } catch (parseError: any) {
          console.warn('JSON parse error, trying to fix:', parseError.message);
          console.warn('Problematic JSON (first 500 chars):', jsonString.substring(0, 500));
          
          // Try to extract just the essential parts
          try {
            // Try to find itinerary array
            const itineraryMatch = jsonString.match(/"itinerary"\s*:\s*\[([\s\S]*?)\]/);
            if (itineraryMatch) {
              // Use fallback but log the issue
              console.warn('Using fallback plan due to JSON parsing error');
              return this.generateFallbackPlan(request);
            }
          } catch (e) {
            // Ignore
          }
        }
      }
      
      // Fallback: generate a basic plan structure
      console.warn('No valid JSON found in LLM response, using fallback plan');
      return this.generateFallbackPlan(request);
    } catch (error: any) {
      console.error('Failed to parse LLM response:', error);
      console.error('Error details:', error.message);
      return this.generateFallbackPlan(request);
    }
  }

  private validateAndFormatPlan(plan: any, request: TravelRequest): TravelPlan {
    // Validate and format the plan structure
    if (!plan.itinerary || !Array.isArray(plan.itinerary)) {
      return this.generateFallbackPlan(request);
    }

    return {
      itinerary: plan.itinerary.map((day: any, index: number) => ({
        day: day.day || index + 1,
        date: day.date || new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        activities: Array.isArray(day.activities) ? day.activities : []
      })),
      summary: plan.summary || {
        totalEstimatedCost: request.budget,
        highlights: [],
        tips: []
      }
    };
  }

  private generateFallbackPlan(request: TravelRequest): TravelPlan {
    const itinerary = [];
    const startDate = new Date();
    
    for (let i = 0; i < request.days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      itinerary.push({
        day: i + 1,
        date: date.toISOString().split('T')[0],
        activities: [
          {
            time: '09:00',
            type: 'attraction' as const,
            name: `${request.destination} 主要景点`,
            location: request.destination,
            description: '探索当地主要景点',
            cost: Math.floor(request.budget / request.days / 3)
          },
          {
            time: '12:00',
            type: 'restaurant' as const,
            name: '当地特色餐厅',
            location: request.destination,
            description: '品尝当地美食',
            cost: Math.floor(request.budget / request.days / 5)
          },
          {
            time: '14:00',
            type: 'attraction' as const,
            name: '文化体验',
            location: request.destination,
            description: '体验当地文化',
            cost: Math.floor(request.budget / request.days / 4)
          }
        ]
      });
    }

    return {
      itinerary,
      summary: {
        totalEstimatedCost: request.budget * 0.8,
        highlights: [`探索${request.destination}的美丽风景`, '品尝当地美食'],
        tips: ['建议提前预订住宿', '注意天气变化']
      }
    };
  }

  async estimateBudget(destination: string, days: number, travelers: number, preferences?: string): Promise<number> {
    const prompt = `请估算以下旅行需求的大致预算：
目的地：${destination}
天数：${days}天
人数：${travelers}人
偏好：${preferences || '无特殊偏好'}

请只返回一个数字（单位：元），不要包含其他文字。`;

    try {
      const response = await axios.post<ChatCompletionResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 100
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.choices || !response.data.choices[0]?.message?.content) {
        return days * travelers * 500; // Fallback
      }

      const content = response.data.choices[0].message.content;
      const budget = parseInt(content.replace(/[^\d]/g, ''));
      return isNaN(budget) ? days * travelers * 500 : budget;
    } catch (error) {
      // Fallback calculation
      return days * travelers * 500;
    }
  }
}

export const llmService = new LLMService();

