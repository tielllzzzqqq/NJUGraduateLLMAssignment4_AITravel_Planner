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
        console.error(`LLM API Error (attempt ${attempt + 1}/${maxRetries + 1}):`, {
          message: error.message,
          status: error.response?.status,
          statusText: error.response?.statusText,
          code: error.code,
          data: error.response?.data,
          config: {
            url: error.config?.url,
            method: error.config?.method
          }
        });
        
        // Don't retry for authentication errors
        if (error.response?.status === 401) {
          throw new Error('API Key authentication failed. Please check your DASHSCOPE_API_KEY');
        } else if (error.response?.status === 429) {
          throw new Error('API rate limit exceeded. Please try again later');
        }
        
        // Retry on timeout or network errors
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message === 'Network Error') {
          if (attempt < maxRetries) {
            console.log('Timeout/network error, will retry...');
            continue; // Retry
          } else {
            throw new Error('Request timeout after retries. The API took too long to respond. Please try again or check your network connection.');
          }
        }
        
        // For other errors, don't retry
        throw new Error('Failed to generate travel plan: ' + (error.response?.data?.error?.message || error.message));
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
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return this.validateAndFormatPlan(parsed, request);
      }
      
      // Fallback: generate a basic plan structure
      return this.generateFallbackPlan(request);
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
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

