import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../App';
import apiClient from '../api/client';
import '../App.css';

interface TravelPlan {
  id: string;
  destination: string;
  days: number;
  budget: number;
  travelers: number;
  created_at: string;
}

export default function Dashboard() {
  const [plans, setPlans] = useState<TravelPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const { data } = await apiClient.get('/travel/plans');
      setPlans(data.plans || []);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async (planId: string, destination: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发卡片的点击事件
    
    if (!window.confirm(`确定要删除 "${destination}" 的旅行计划吗？此操作无法撤销。`)) {
      return;
    }

    try {
      await apiClient.delete(`/travel/plans/${planId}`);
      // 删除成功后刷新列表
      setPlans(plans.filter(plan => plan.id !== planId));
    } catch (error: any) {
      console.error('Failed to delete plan:', error);
      alert(error.response?.data?.error || '删除失败，请重试');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('supabase.auth.token');
    navigate('/login');
  };

  if (loading) {
    return <div className="container" style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: 'white' }}>我的旅行计划</h1>
        <div>
          <button className="btn btn-primary" onClick={() => navigate('/create-plan')} style={{ marginRight: '10px' }}>
            创建新计划
          </button>
          <button className="btn btn-secondary" onClick={handleLogout}>
            退出登录
          </button>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
            还没有旅行计划，<a href="#" onClick={() => navigate('/create-plan')} style={{ color: '#667eea' }}>立即创建一个</a>
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {plans.map((plan) => (
            <div 
              key={plan.id} 
              className="card" 
              style={{ cursor: 'pointer', position: 'relative' }}
              onClick={() => navigate(`/plan/${plan.id}`)}
            >
              <button
                onClick={(e) => handleDeletePlan(plan.id, plan.destination, e)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: '#ff4757',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  zIndex: 10,
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#ff3838'}
                onMouseOut={(e) => e.currentTarget.style.background = '#ff4757'}
                title="删除计划"
              >
                删除
              </button>
              <h2 style={{ marginBottom: '15px', color: '#333', paddingRight: '60px' }}>{plan.destination}</h2>
              <p style={{ color: '#666', marginBottom: '10px' }}>
                <strong>天数：</strong>{plan.days} 天
              </p>
              <p style={{ color: '#666', marginBottom: '10px' }}>
                <strong>预算：</strong>¥{plan.budget.toLocaleString()}
              </p>
              <p style={{ color: '#666', marginBottom: '10px' }}>
                <strong>人数：</strong>{plan.travelers} 人
              </p>
              <p style={{ color: '#999', fontSize: '14px', marginTop: '15px' }}>
                {new Date(plan.created_at).toLocaleDateString('zh-CN')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

