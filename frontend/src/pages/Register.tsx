import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../App';
import '../App.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
          },
        },
      });

      if (error) throw error;

      // Store session if available
      const session = await supabase.auth.getSession();
      if (session.data.session) {
        localStorage.setItem('supabase.auth.token', JSON.stringify(session.data.session));
        navigate('/dashboard');
      } else {
        setError('注册成功！请检查邮箱验证链接。');
      }
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
          AI旅行规划助手
        </h1>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#666' }}>
          注册
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>姓名（可选）</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
            />
          </div>

          <div className="input-group">
            <label>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="请输入邮箱"
            />
          </div>

          <div className="input-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="请输入密码（至少6位）"
              minLength={6}
            />
          </div>

          {error && <div className={error.includes('成功') ? 'success' : 'error'}>{error}</div>}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '10px' }}
            disabled={loading}
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
          已有账号？ <Link to="/login" style={{ color: '#667eea' }}>立即登录</Link>
        </p>
      </div>
    </div>
  );
}

