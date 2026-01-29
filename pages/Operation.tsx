import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Search, ChevronRight, PackageCheck, RefreshCw, CloudOff, CloudCheck, XCircle } from 'lucide-react';
import { MOCK_DB_MIDS, SCANNER_CONFIG } from '../constants';

export interface InboundRecord {
  id: string;
  mid: string;
  weight: string;
  inboundCode: string;
  image: string | null;
  timestamp: number;
  syncStatus: 'SUCCESS' | 'FAILED'; 
}

// Generate mock history
const generateMockHistory = (): InboundRecord[] => {
  return Array.from({ length: 5 }).map((_, i) => ({
    id: `mock-${i}`,
    mid: i % 2 === 0 ? "1001" : "A555",
    weight: (Math.floor(Math.random() * 5000) + 100).toString(),
    inboundCode: `PKG-${Date.now().toString().slice(-6)}-${i}`,
    image: null,
    timestamp: Date.now() - i * 1000000,
    syncStatus: 'SUCCESS'
  }));
};

const Operation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get last result specifically from navigation state to highlight it
  const lastResultState = location.state?.lastResult as InboundRecord | undefined;
  
  const inputRef = useRef<HTMLInputElement>(null);
  const [manualValue, setManualValue] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState('');
  const [history, setHistory] = useState<InboundRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [operatorName, setOperatorName] = useState('');
  
  // Retry Loading State
  const [isRetrying, setIsRetrying] = useState(false);

  const scanBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  // Load history & Operator Name
  useEffect(() => {
    setOperatorName(localStorage.getItem('operator_name') || '未登录');

    const saved = localStorage.getItem('inbound_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setHistory(parsed.sort((a: InboundRecord, b: InboundRecord) => b.timestamp - a.timestamp));
      } catch (e) { console.error(e); }
    } else {
      const mocks = generateMockHistory();
      setHistory(mocks);
      localStorage.setItem('inbound_history', JSON.stringify(mocks));
    }
  }, [location.state]);

  // Filter logic
  const filteredHistory = history.filter(item => {
    const term = searchTerm.toLowerCase();
    return item.mid.toLowerCase().includes(term) || 
           item.inboundCode.toLowerCase().includes(term);
  });

  const handleEdit = (record: InboundRecord) => {
    navigate('/detail', { state: { mid: record.mid, source: 'EDIT', record } });
  };

  // --- Network Retry Logic ---
  const handleRetry = (e: React.MouseEvent, recordId: string) => {
    e.stopPropagation(); 
    setIsRetrying(true);
    
    setTimeout(() => {
        const updatedHistory = history.map(item => {
            if (item.id === recordId) {
                return { ...item, syncStatus: 'SUCCESS' as const };
            }
            return item;
        });
        
        setHistory(updatedHistory);
        localStorage.setItem('inbound_history', JSON.stringify(updatedHistory));
        setIsRetrying(false);
        
        if (location.state && location.state.lastResult && location.state.lastResult.id === recordId) {
            location.state.lastResult.syncStatus = 'SUCCESS';
        }
    }, 1000);
  };

  const validateAndProceed = useCallback((input: string, source: 'SCAN' | 'MANUAL') => {
    // Reset status immediately on new check
    setStatus('IDLE');
    
    if (!input || input.trim() === '') {
      setStatus('ERROR');
      setStatusMessage('输入为空');
      setTimeout(() => inputRef.current?.focus(), 100);
      return;
    }

    const mid = input.trim();
    const found = MOCK_DB_MIDS.includes(mid);

    if (found) {
      setStatus('SUCCESS');
      const sourceCN = source === 'SCAN' ? '扫描' : '手动';
      setStatusMessage(`匹配: ${mid}`);
      setTimeout(() => {
        navigate('/detail', { state: { mid, source: sourceCN } });
      }, 100);
    } else {
      setStatus('ERROR');
      if (source === 'SCAN') {
          setStatusMessage('物流单号无对应订单\n请输入MID');
      } else {
          setStatusMessage(`MID无匹配: ${mid}`);
      }
      setManualValue('');
      // Keep focus on input so user can type immediately
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [navigate]);

  // --- Keyboard ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;
      lastKeyTime.current = now;

      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) return;

      if (e.key === 'Enter') {
        if (
          scanBuffer.current.length >= SCANNER_CONFIG.MIN_SCAN_LENGTH && 
          timeDiff <= SCANNER_CONFIG.BURST_THRESHOLD * 5
        ) {
          e.preventDefault();
          const scannedValue = scanBuffer.current;
          scanBuffer.current = '';
          validateAndProceed(scannedValue, 'SCAN'); 
          return;
        }
        scanBuffer.current = ''; 
        return;
      }

      if (timeDiff < SCANNER_CONFIG.BURST_THRESHOLD) {
        if (e.key.length === 1) scanBuffer.current += e.key;
      } else {
        if (e.key.length === 1) scanBuffer.current = e.key;
        else scanBuffer.current = '';
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [validateAndProceed]);

  useEffect(() => {
    inputRef.current?.focus();
    const handleBlur = () => {
      setTimeout(() => {
        // Ensure focus isn't stolen by the modal (since modal is pointer-events-none, it shouldn't, but just in case)
        if (document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "BUTTON") {
            inputRef.current?.focus();
        }
      }, 50);
    };
    const currentInput = inputRef.current;
    currentInput?.addEventListener('blur', handleBlur);
    return () => currentInput?.removeEventListener('blur', handleBlur);
  }, []);

  const handleManualKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (manualValue) validateAndProceed(manualValue, 'MANUAL');
      else { 
        setStatus('ERROR'); 
        setStatusMessage('请输入MID'); 
      }
    }
  };

  // --- Renderers ---

  // 1. Last Result Dashboard
  const renderLastResult = () => {
    if (!lastResultState) return null;

    const liveRecord = history.find(h => h.id === lastResultState.id) || lastResultState;
    const isSuccess = liveRecord.syncStatus === 'SUCCESS';

    return (
      <div className={`mb-3 rounded-lg shadow-md border-2 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300 ${isSuccess ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
         {/* Title Bar */}
         <div className={`px-3 py-2 flex items-center justify-between text-white ${isSuccess ? 'bg-green-600' : 'bg-red-600'}`}>
            <div className="flex items-center gap-2 font-bold text-lg">
                {isSuccess ? <CheckCircle2 size={24}/> : <CloudOff size={24}/>}
                <span>{isSuccess ? '上单入库成功' : '上传失败 (网络)'}</span>
            </div>
            {!isSuccess && (
                <button 
                    onClick={(e) => handleRetry(e, liveRecord.id)}
                    disabled={isRetrying}
                    className="bg-white text-red-600 px-3 py-1 rounded-full text-sm font-black shadow active:scale-95 flex items-center gap-1 disabled:opacity-50"
                >
                    {isRetrying ? <RefreshCw className="animate-spin" size={14}/> : <RefreshCw size={14}/>}
                    {isRetrying ? '重试中...' : '点击重试'}
                </button>
            )}
         </div>

         {/* Content */}
         <div className="p-3 flex justify-between items-center">
            <div>
                <div className="text-xs text-slate-500 font-bold uppercase mb-0.5">MID: {liveRecord.mid}</div>
                <div className="text-xl font-mono font-black text-slate-800 break-all leading-tight">
                    {liveRecord.inboundCode}
                </div>
            </div>
            <div className="text-right border-l pl-3 border-slate-300 shrink-0">
                 <div className="text-xs text-slate-400 font-bold uppercase">重量</div>
                 <div className={`text-2xl font-black font-mono ${isSuccess ? 'text-green-700' : 'text-red-700'}`}>
                    {liveRecord.weight}g
                 </div>
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 relative">
      
      {/* 
        ERROR POPUP: Centered, Non-blocking (pointer-events-none)
        This allows the user to see the error but still type in the input box immediately.
      */}
      {status === 'ERROR' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/10 backdrop-blur-[1px]">
          <div className="bg-white/95 p-6 rounded-2xl shadow-2xl border-4 border-red-500 flex flex-col items-center animate-in zoom-in-90 duration-200 max-w-[85%]">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
                <XCircle size={40} className="text-red-600" />
            </div>
            <h2 className="text-2xl font-black text-red-600 mb-2">匹配失败</h2>
            <p className="text-lg font-bold text-slate-800 text-center whitespace-pre-line leading-snug">
                {statusMessage}
            </p>
          </div>
        </div>
      )}

      {/* Header Area */}
      <div className="p-2 shrink-0 z-10 bg-slate-100">
        
        {renderLastResult()}

        {/* Input Area */}
        <div className="relative mb-2">
          <input
            ref={inputRef}
            type="text"
            className={`w-full px-3 py-3 text-2xl font-mono font-bold text-slate-900 bg-white border-4 rounded-lg shadow-inner outline-none transition-all placeholder-slate-400 ${status === 'ERROR' ? 'border-red-500 focus:border-red-500 ring-4 ring-red-200' : 'border-slate-300 focus:border-blue-500'}`}
            placeholder="请扫描或输入MID"
            value={manualValue}
            onChange={(e) => {
                setManualValue(e.target.value);
                // Dismiss popup immediately when user starts typing
                if (status === 'ERROR') setStatus('IDLE');
            }}
            onKeyDown={handleManualKeyDown}
            autoComplete="off"
          />
        </div>

        {/* Search */}
        <div className="relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
           <input 
              type="text"
              placeholder="搜索历史记录..."
              className="w-full pl-9 pr-2 py-2 text-sm bg-white border border-slate-300 rounded shadow-sm focus:border-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2 bg-slate-100">
        <div className="sticky top-0 bg-slate-100 py-1 z-0 flex justify-between items-center px-1 border-b border-slate-200">
            <h3 className="text-xs font-bold text-slate-500 tracking-wide flex items-center gap-2">
               <span>当日入库数 ({history.length})</span>
               <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
               <span>入库员 {operatorName}</span>
            </h3>
        </div>
        
        {filteredHistory.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400">
            <PackageCheck size={32} className="mb-2 opacity-50"/>
            <span className="text-sm">暂无数据</span>
          </div>
        ) : (
          filteredHistory.map((record) => {
            const isFailed = record.syncStatus === 'FAILED';
            
            return (
                <div 
                key={record.id}
                onClick={() => handleEdit(record)}
                className={`p-3 rounded-lg shadow-sm border border-slate-200 active:bg-blue-50 transition-all flex justify-between items-center group relative overflow-hidden bg-white`}
                >
                {isFailed && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>}
                
                <div className="flex flex-col overflow-hidden gap-1 pl-1">
                    <div className="flex items-center space-x-2">
                        <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded font-bold border border-slate-200">
                            MID: {record.mid}
                        </span>
                        {isFailed ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                <CloudOff size={10} /> 未同步
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                <CloudCheck size={10} /> 已同步
                            </span>
                        )}
                    </div>
                    <span className="text-base font-bold text-slate-800 font-mono truncate">{record.inboundCode}</span>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                    {isFailed && (
                        <button 
                            onClick={(e) => handleRetry(e, record.id)}
                            className="bg-red-100 text-red-600 p-2 rounded-full active:bg-red-200"
                        >
                            <RefreshCw size={16} />
                        </button>
                    )}
                    <div className="text-right">
                        <div className="text-lg font-black text-slate-700 font-mono">{record.weight}g</div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                </div>
                </div>
            )
          })
        )}
      </div>

    </div>
  );
};

export default Operation;