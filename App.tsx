import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Operation from './pages/Operation';
import Detail from './pages/Detail';
import DeviceSimulator from './components/DeviceSimulator';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen w-full bg-neutral-200 flex items-center justify-center py-10">
        <DeviceSimulator>
          {/* Internal App Container: 100% size of the screen area */}
          <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/operation" element={<Operation />} />
              <Route path="/detail" element={<Detail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </DeviceSimulator>
      </div>
    </HashRouter>
  );
};

export default App;