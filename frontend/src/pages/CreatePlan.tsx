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
    // Simple parsing logic - can be enhanced
    const destinationMatch = text.match(/(?:去|到|前往)([^，,，\d]+?)(?:，|,|$|\d)/);
    if (destinationMatch) setDestination(destinationMatch[1].trim());

    const daysMatch = text.match(/(\d+)\s*天/);
    if (daysMatch) setDays(daysMatch[1]);

    const budgetMatch = text.match(/(\d+)\s*[万元元]/);
    if (budgetMatch) {
      const amount = parseInt(budgetMatch[1]);
      setBudget((amount * (budgetMatch[0].includes('万') ? 10000 : 1)).toString());
    }

    const travelersMatch = text.match(/(\d+)\s*人/);
    if (travelersMatch) setTravelers(travelersMatch[1]);

    // Set preferences
    if (text.includes('美食') || text.includes('吃')) {
      setPreferences(prev => prev ? prev + '，美食' : '美食');
    }
    if (text.includes('动漫') || text.includes('动画')) {
      setPreferences(prev => prev ? prev + '，动漫' : '动漫');
    }
    if (text.includes('孩子') || text.includes('儿童')) {
      setPreferences(prev => prev ? prev + '，带孩子' : '带孩子');
    }
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

          {error && <div className="error">{error}</div>}

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

