import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TravelPlan from './pages/TravelPlan';
import CreatePlan from './pages/CreatePlan';
import './App.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate Supabase credentials
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 配置缺失:');
  console.error('  VITE_SUPABASE_URL:', supabaseUrl || '未设置');
  console.error('  VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '已设置' : '未设置');
  console.error('请在构建 Docker 镜像时设置这些环境变量（通过 GitHub Secrets 或 --build-arg）');
}

// Create Supabase client
// Use placeholder values if credentials are missing to prevent crash
// The app will show an error message instead
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key-please-configure-vite-supabase-url-and-vite-supabase-anon-key'
    );

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      setConfigError('Supabase 配置缺失。请检查环境变量 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。');
      setLoading(false);
      return;
    }

    // Check active session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Supabase session error:', error);
        // Don't show error for missing config, just set user to null
        if (!error.message.includes('placeholder')) {
          setConfigError('无法连接到 Supabase。请检查配置。');
        }
      }
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div>加载中...</div>
      </div>
    );
  }

  // Show configuration error if Supabase is not configured
  if (configError) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        padding: '20px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h1 style={{ color: '#e74c3c', marginBottom: '20px' }}>❌ 配置错误</h1>
        <p style={{ color: '#333', marginBottom: '10px', fontSize: '16px' }}>{configError}</p>
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '5px',
          textAlign: 'left',
          fontSize: '14px'
        }}>
          <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>解决方案：</p>
          <ol style={{ marginLeft: '20px', lineHeight: '1.8' }}>
            <li>在 GitHub Secrets 中配置以下环境变量：
              <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                <li><code>VITE_SUPABASE_URL</code></li>
                <li><code>VITE_SUPABASE_ANON_KEY</code></li>
              </ul>
            </li>
            <li>触发 GitHub Actions 重新构建 Docker 镜像</li>
            <li>拉取新镜像并重启容器</li>
          </ol>
          <p style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
            详细说明请查看: <code>DOCKER_FRONTEND_ENV.md</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        <Route path="/create-plan" element={user ? <CreatePlan /> : <Navigate to="/login" />} />
        <Route path="/plan/:id" element={user ? <TravelPlan /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;

