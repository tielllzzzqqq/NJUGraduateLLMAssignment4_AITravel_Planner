import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import VoiceInput from '../components/VoiceInput';
import '../App.css';

export default function CreatePlan() {
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState('');
  const [budget, setBudget] = useState('');
  const [travelers, setTravelers] = useState('');
  const [preferences, setPreferences] = useState('');
  const [voiceText, setVoiceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleVoiceResult = (text: string) => {
    setVoiceText(text);
    // Try to parse voice input
    parseVoiceInput(text);
  };

  const parseVoiceInput = (text: string) => {
    console.log('Parsing voice input:', text);
    
    // 改进的目的地匹配 - 支持更多表达方式
    const destinationPatterns = [
      /(?:去|到|前往|想去|计划去|准备去)([^，,，\d天万元人]+?)(?:，|,|$|\d|天|万|元|人)/,
      /(?:目的地是|要去)([^，,，\d天万元人]+?)(?:，|,|$|\d|天|万|元|人)/,
      /^([^，,，\d天万元人]+?)(?:，|,|$|\d|天|万|元|人)/, // 如果开头就是地名
    ];
    
    for (const pattern of destinationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const dest = match[1].trim();
        // 过滤掉常见的中文词汇
        if (dest && !['我', '想', '要', '准备', '计划', '带', '喜欢', '和', '的'].includes(dest)) {
          setDestination(dest);
          break;
        }
      }
    }

    // 改进的天数匹配
    const daysPatterns = [
      /(\d+)\s*天/,
      /(\d+)\s*日/,
      /(\d+)\s*晚/,
      /玩\s*(\d+)\s*天/,
      /待\s*(\d+)\s*天/,
    ];
    
    for (const pattern of daysPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const days = parseInt(match[1]);
        if (days > 0 && days < 365) {
          setDays(days.toString());
          break;
        }
      }
    }

    // 改进的预算匹配
    const budgetPatterns = [
      /(\d+)\s*万\s*元?/,
      /(\d+)\s*万元/,
      /预算\s*(\d+)\s*[万元元]/,
      /(\d+)\s*元/,
      /(\d{4,})\s*块/,
    ];
    
    for (const pattern of budgetPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const amount = parseInt(match[1]);
        if (amount > 0) {
          // 判断单位
          if (match[0].includes('万')) {
            setBudget((amount * 10000).toString());
          } else if (amount < 1000) {
            // 可能是万元，但没说"万"
            setBudget((amount * 10000).toString());
          } else {
            setBudget(amount.toString());
          }
          break;
        }
      }
    }

    // 改进的人数匹配
    const travelersPatterns = [
      /(\d+)\s*人/,
      /(\d+)\s*个\s*人/,
      /(\d+)\s*位/,
      /(\d+)\s*名/,
      /带\s*(\d+)\s*个/,
      /(\d+)\s*个\s*朋友/,
    ];
    
    for (const pattern of travelersPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const travelers = parseInt(match[1]);
        if (travelers > 0 && travelers < 100) {
          setTravelers(travelers.toString());
          break;
        }
      }
    }

    // 改进的偏好提取
    const preferences: string[] = [];
    
    // 美食相关
    if (text.match(/美食|吃|餐厅|小吃|特色菜|料理|火锅|烧烤|海鲜/)) {
      preferences.push('美食');
    }
    
    // 动漫相关
    if (text.match(/动漫|动画|二次元|手办|秋叶原|动漫展/)) {
      preferences.push('动漫');
    }
    
    // 带孩子
    if (text.match(/孩子|儿童|小朋友|小孩|亲子|带娃/)) {
      preferences.push('带孩子');
    }
    
    // 购物
    if (text.match(/购物|买|shopping|商场|免税店/)) {
      preferences.push('购物');
    }
    
    // 自然风景
    if (text.match(/自然|风景|山水|海滩|海岛|公园/)) {
      preferences.push('自然风景');
    }
    
    // 历史文化
    if (text.match(/历史|文化|古迹|博物馆|寺庙|古建筑/)) {
      preferences.push('历史文化');
    }
    
    // 娱乐
    if (text.match(/娱乐|游乐园|主题公园|表演|演出/)) {
      preferences.push('娱乐');
    }
    
    if (preferences.length > 0) {
      setPreferences(preferences.join('，'));
    }
    
    // 注意：这里不能直接使用state变量，因为它们可能还没更新
    // 解析结果会通过setState更新，可以在下次渲染时看到
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Submitting travel plan:', {
        destination,
        days: parseInt(days),
        budget: parseFloat(budget),
        travelers: parseInt(travelers),
        preferences: preferences || voiceText || undefined,
      });

      const { data } = await apiClient.post('/travel/plan', {
        destination,
        days: parseInt(days),
        budget: parseFloat(budget),
        travelers: parseInt(travelers),
        preferences: preferences || voiceText || undefined,
        voiceInput: voiceText || undefined,
      });

      console.log('Travel plan created:', data);
      navigate(`/plan/${data.plan.id}`);
    } catch (err: any) {
      console.error('Error creating travel plan:', err);
      console.error('Error response:', err.response);
      
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.details || 
                          err.message || 
                          '创建计划失败';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          ← 返回
        </button>
      </div>

      <div className="card">
        <h1 style={{ marginBottom: '30px', color: '#333' }}>创建旅行计划</h1>

        <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '15px', color: '#666' }}>语音输入</h3>
          <VoiceInput onResult={handleVoiceResult} />
          {voiceText && (
            <p style={{ marginTop: '15px', color: '#666', fontStyle: 'italic' }}>
              识别结果：{voiceText}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>目的地 *</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              placeholder="例如：日本、北京、上海"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="input-group">
              <label>天数 *</label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                required
                min="1"
                placeholder="例如：5"
              />
            </div>

            <div className="input-group">
              <label>预算（元）*</label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                required
                min="0"
                placeholder="例如：10000"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="input-group">
              <label>同行人数 *</label>
              <input
                type="number"
                value={travelers}
                onChange={(e) => setTravelers(e.target.value)}
                required
                min="1"
                placeholder="例如：2"
              />
            </div>
          </div>

          <div className="input-group">
            <label>旅行偏好</label>
            <textarea
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="例如：喜欢美食和动漫，带孩子"
            />
          </div>

          {error && (
            <div className="error" style={{ 
              whiteSpace: 'pre-line', 
              lineHeight: '1.6',
              padding: '15px',
              marginTop: '15px',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c33'
            }}>
              <strong>错误：</strong>
              <div style={{ marginTop: '8px' }}>{error}</div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? '生成计划中...' : '生成旅行计划'}
          </button>
        </form>
      </div>
    </div>
  );
}

