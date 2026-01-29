import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length > 0 && password.trim().length > 0) {
      // Save the operator name for display in Operation page
      localStorage.setItem('operator_name', username);
      navigate('/operation');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-slate-200">
      <div className="w-full bg-white p-6 rounded-lg shadow-lg border border-slate-300">
        <h1 className="text-2xl font-bold mb-6 text-center text-slate-800 uppercase tracking-wide">
          系统登录
        </h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1 text-slate-600">账号</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2.5 text-lg border border-slate-300 rounded focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-200"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="操作员ID"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 text-slate-600">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
              <input
                type="password"
                className="w-full pl-10 pr-3 py-2.5 text-lg border border-slate-300 rounded focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white text-xl font-bold py-3 rounded shadow active:scale-[0.98] transition-all mt-6"
          >
            进入系统
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;