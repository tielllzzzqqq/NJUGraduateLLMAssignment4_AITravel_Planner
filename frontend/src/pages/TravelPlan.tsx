import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import MapComponent from '../components/MapComponent';
import ExpenseTracker from '../components/ExpenseTracker';
import '../App.css';

interface Activity {
  time: string;
  type: 'transport' | 'attraction' | 'restaurant' | 'accommodation';
  name: string;
  location: string;
  description: string;
  cost?: number;
  coordinates?: { lat: number; lng: number };
}

interface DayPlan {
  day: number;
  date: string;
  activities: Activity[];
}

interface TravelPlanData {
  itinerary: DayPlan[];
  summary: {
    totalEstimatedCost: number;
    highlights: string[];
    tips: string[];
  };
}

export default function TravelPlan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<any>(null);
  const [planData, setPlanData] = useState<TravelPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    loadPlan();
  }, [id]);

  const loadPlan = async () => {
    try {
      const { data } = await apiClient.get(`/travel/plans/${id}`);
      setPlan(data.plan);
      setPlanData(data.plan.plan_data);
      if (data.plan.plan_data?.itinerary?.length > 0) {
        setSelectedDay(0);
      }
    } catch (error) {
      console.error('Failed to load plan:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ textAlign: 'center', padding: '50px' }}>加载中...</div>;
  }

  if (!plan || !planData) {
    return <div className="container" style={{ textAlign: 'center', padding: '50px' }}>计划不存在</div>;
  }

  const currentDay = planData.itinerary[selectedDay];

  return (
    <div className="container">
      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          ← 返回
        </button>
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <h1 style={{ marginBottom: '10px', color: '#333' }}>{plan.destination} 旅行计划</h1>
        <p style={{ color: '#666' }}>
          {plan.days} 天 | 预算：¥{plan.budget.toLocaleString()} | {plan.travelers} 人
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="card">
          <h2 style={{ marginBottom: '20px', color: '#333' }}>行程安排</h2>
          <div style={{ marginBottom: '20px' }}>
            {planData.itinerary.map((day, index) => (
              <button
                key={index}
                onClick={() => setSelectedDay(index)}
                className="btn"
                style={{
                  marginRight: '10px',
                  marginBottom: '10px',
                  background: selectedDay === index ? '#667eea' : '#f0f0f0',
                  color: selectedDay === index ? 'white' : '#333',
                }}
              >
                第 {day.day} 天
              </button>
            ))}
          </div>

          {currentDay && (
            <div>
              <h3 style={{ marginBottom: '15px', color: '#666' }}>
                第 {currentDay.day} 天 - {currentDay.date}
              </h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {currentDay.activities.map((activity, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '15px',
                      marginBottom: '10px',
                      background: '#f9f9f9',
                      borderRadius: '8px',
                      borderLeft: `4px solid ${
                        activity.type === 'attraction' ? '#3498db' :
                        activity.type === 'restaurant' ? '#e74c3c' :
                        activity.type === 'transport' ? '#2ecc71' :
                        '#9b59b6'
                      }`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <strong style={{ color: '#333' }}>{activity.time}</strong>
                      {activity.cost && (
                        <span style={{ color: '#e74c3c' }}>¥{activity.cost}</span>
                      )}
                    </div>
                    <div style={{ color: '#666', fontSize: '14px', marginBottom: '5px' }}>
                      {activity.type === 'attraction' ? '🏛️' :
                       activity.type === 'restaurant' ? '🍽️' :
                       activity.type === 'transport' ? '🚗' :
                       '🏨'} {activity.name}
                    </div>
                    <div style={{ color: '#999', fontSize: '12px' }}>{activity.location}</div>
                    {activity.description && (
                      <div style={{ color: '#666', fontSize: '13px', marginTop: '5px' }}>
                        {activity.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '20px', color: '#333' }}>地图导航</h2>
          <MapComponent
            activities={currentDay?.activities || []}
            destination={plan.destination}
            ref={mapRef}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div className="card">
          <h2 style={{ marginBottom: '20px', color: '#333' }}>费用预算</h2>
          <ExpenseTracker travelPlanId={id!} budget={plan.budget} />
        </div>

        <div className="card">
          <h2 style={{ marginBottom: '20px', color: '#333' }}>旅行亮点</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {planData.summary.highlights.map((highlight, index) => (
              <li key={index} style={{ padding: '10px', marginBottom: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
                ✨ {highlight}
              </li>
            ))}
          </ul>

          <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#333' }}>旅行建议</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {planData.summary.tips.map((tip, index) => (
              <li key={index} style={{ padding: '10px', marginBottom: '10px', background: '#f0f7ff', borderRadius: '8px' }}>
                💡 {tip}
              </li>
            ))}
          </ul>

          <div style={{ marginTop: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
            <strong>预估总费用：</strong>
            <span style={{ fontSize: '24px', color: '#e74c3c', fontWeight: 'bold' }}>
              ¥{planData.summary.totalEstimatedCost.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

