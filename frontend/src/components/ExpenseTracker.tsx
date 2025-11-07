import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import VoiceInput from './VoiceInput';

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
}

interface ExpenseTrackerProps {
  travelPlanId: string;
  budget: number;
}

export default function ExpenseTracker({ travelPlanId, budget }: ExpenseTrackerProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState({ total: 0, byCategory: {} as Record<string, number>, count: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: 'transport',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [voiceText, setVoiceText] = useState('');

  useEffect(() => {
    loadExpenses();
  }, [travelPlanId]);

  const loadExpenses = async () => {
    try {
      const { data } = await apiClient.get(`/expense/expenses/${travelPlanId}`);
      setExpenses(data.expenses || []);
      setSummary(data.summary || { total: 0, byCategory: {}, count: 0 });
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceResult = (text: string) => {
    setVoiceText(text);
    // Try to parse amount from voice
    const amountMatch = text.match(/(\d+)/);
    if (amountMatch) {
      setNewExpense(prev => ({ ...prev, amount: amountMatch[1] }));
    }
    setNewExpense(prev => ({ ...prev, description: text }));
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/expense/expenses', {
        travel_plan_id: travelPlanId,
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        voiceInput: voiceText || undefined,
      });
      setNewExpense({
        category: 'transport',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setVoiceText('');
      setShowAddForm(false);
      loadExpenses();
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    try {
      await apiClient.delete(`/expense/expenses/${id}`);
      loadExpenses();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const remainingBudget = budget - summary.total;
  const budgetPercentage = (summary.total / budget) * 100;

  if (loading) {
    return <div>加载中...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>总预算：</span>
          <strong>¥{budget.toLocaleString()}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>已花费：</span>
          <strong style={{ color: '#e74c3c' }}>¥{summary.total.toLocaleString()}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>剩余：</span>
          <strong style={{ color: remainingBudget >= 0 ? '#27ae60' : '#e74c3c' }}>
            ¥{remainingBudget.toLocaleString()}
          </strong>
        </div>
        <div style={{ marginTop: '10px' }}>
          <div style={{ height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(budgetPercentage, 100)}%`,
                background: budgetPercentage > 100 ? '#e74c3c' : '#27ae60',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      </div>

      {Object.keys(summary.byCategory).length > 0 && (
        <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px' }}>
          <h4 style={{ marginBottom: '10px', color: '#666' }}>分类统计</h4>
          {Object.entries(summary.byCategory).map(([category, amount]) => (
            <div key={category} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>{category === 'transport' ? '交通' : category === 'food' ? '餐饮' : category === 'accommodation' ? '住宿' : category === 'attraction' ? '景点' : '其他'}</span>
              <span>¥{amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={() => setShowAddForm(!showAddForm)}
        style={{ width: '100%', marginBottom: '20px' }}
      >
        {showAddForm ? '取消' : '添加费用记录'}
      </button>

      {showAddForm && (
        <form onSubmit={handleAddExpense} style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '8px' }}>
          <div style={{ marginBottom: '15px' }}>
            <VoiceInput onResult={handleVoiceResult} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <select
              value={newExpense.category}
              onChange={(e) => setNewExpense(prev => ({ ...prev, category: e.target.value }))}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="transport">交通</option>
              <option value="food">餐饮</option>
              <option value="accommodation">住宿</option>
              <option value="attraction">景点</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="number"
              placeholder="金额"
              value={newExpense.amount}
              onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="描述"
              value={newExpense.description}
              onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="date"
              value={newExpense.date}
              onChange={(e) => setNewExpense(prev => ({ ...prev, date: e.target.value }))}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            添加
          </button>
        </form>
      )}

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {expenses.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>暂无费用记录</p>
        ) : (
          expenses.map((expense) => (
            <div
              key={expense.id}
              style={{
                padding: '12px',
                marginBottom: '10px',
                background: '#fff',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', color: '#333' }}>
                  ¥{expense.amount.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {expense.category === 'transport' ? '交通' :
                   expense.category === 'food' ? '餐饮' :
                   expense.category === 'accommodation' ? '住宿' :
                   expense.category === 'attraction' ? '景点' : '其他'} | {expense.date}
                </div>
                {expense.description && (
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                    {expense.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDeleteExpense(expense.id)}
                style={{
                  padding: '5px 10px',
                  background: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                删除
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

