import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Barcode, Save, RefreshCw, ArrowLeft, Image as ImageIcon, Loader2 } from 'lucide-react';
import { SCANNER_CONFIG } from '../constants';
import { InboundRecord } from './Operation';

type Step = 'PHOTO' | 'WEIGHT' | 'INBOUND_SCAN' | 'EDIT_OVERVIEW';

const Detail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { mid: string, source: string, record?: InboundRecord } | null;

  // --- State ---
  const [currentStep, setCurrentStep] = useState<Step>(state?.record ? 'EDIT_OVERVIEW' : 'PHOTO');
  const [capturedImage, setCapturedImage] = useState<string | null>(state?.record?.image || null);
  const [weight, setWeight] = useState<string>(state?.record?.weight || '');
  const [inboundCode, setInboundCode] = useState<string>(state?.record?.inboundCode || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);
  const scanBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  // --- Logic ---
  const saveRecord = (code?: string) => {
    setIsSaving(true);
    const finalCode = code || inboundCode;
    
    // Simulate Network Request Delay
    setTimeout(() => {
        const existingHistoryStr = localStorage.getItem('inbound_history');
        let history: InboundRecord[] = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
        
        // SIMULATION: Randomly fail (50% chance) to demonstrate "Network Error" feature
        // In production, this would be the result of a try/catch on fetch()
        const isSuccess = Math.random() > 0.5;

        const newRecord: InboundRecord = {
          id: state?.record?.id || Date.now().toString(),
          mid: state?.mid || 'Unknown',
          weight: weight,
          inboundCode: finalCode,
          image: capturedImage,
          timestamp: state?.record?.timestamp || Date.now(),
          syncStatus: isSuccess ? 'SUCCESS' : 'FAILED' // Simulate status
        };

        if (state?.record) {
          history = history.map(item => item.id === state.record!.id ? newRecord : item);
        } else {
          history.push(newRecord);
        }

        localStorage.setItem('inbound_history', JSON.stringify(history));
        
        setIsSaving(false);
        // Pass the result back to Operation page to display the banner
        navigate('/operation', { state: { lastResult: newRecord } });
    }, 600);
  };

  // --- Camera Logic ---
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (currentStep === 'PHOTO') {
      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) { console.error(err); }
      };
      startCamera();
    }
    return () => { if (stream) stream.getTracks().forEach(track => track.stop()); };
  }, [currentStep]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
        
        if (state?.record) setCurrentStep('EDIT_OVERVIEW');
        else setCurrentStep('WEIGHT');
      }
    }
  };

  // --- Interaction ---
  const handleWeightEnter = () => {
     if (state?.record) {
         weightInputRef.current?.blur();
     } else {
         if (weight.trim().length > 0) setCurrentStep('INBOUND_SCAN');
     }
  };

  // --- Keyboard ---
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (isSaving) return; // Block input while saving
      
      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;
      lastKeyTime.current = now;

      if (currentStep === 'PHOTO' && e.key === 'Enter') {
        e.preventDefault();
        capturePhoto();
        return;
      }

      if (currentStep === 'INBOUND_SCAN') {
        if (e.key === 'Enter') {
           if (scanBuffer.current.length >= SCANNER_CONFIG.MIN_SCAN_LENGTH && timeDiff <= SCANNER_CONFIG.BURST_THRESHOLD * 5) {
            e.preventDefault();
            const val = scanBuffer.current;
            scanBuffer.current = '';
            
            if (state?.record) {
                setInboundCode(val);
                setCurrentStep('EDIT_OVERVIEW');
            } else {
                saveRecord(val);
            }
            return;
          }
          scanBuffer.current = '';
        } else {
          if (timeDiff < SCANNER_CONFIG.BURST_THRESHOLD) {
            if (e.key.length === 1) scanBuffer.current += e.key;
          } else {
            if (e.key.length === 1) scanBuffer.current = e.key;
            else scanBuffer.current = '';
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [currentStep, weight, capturedImage, state, isSaving]);

  useEffect(() => {
    if (currentStep === 'WEIGHT') setTimeout(() => weightInputRef.current?.focus(), 100);
  }, [currentStep]);

  // --- Renderers ---

  const renderPhotoStep = () => (
    <div className="flex-1 flex flex-col w-full h-full bg-black relative">
       <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
       <div className="absolute bottom-6 w-full flex justify-center gap-4 px-4">
         <div className="bg-black/60 text-white text-sm font-bold py-3 px-6 rounded-full border border-white/50 backdrop-blur-sm animate-pulse">
            按物理键 [Enter] 拍照
         </div>
       </div>
       <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  const renderWeightStep = () => (
    <div className="flex-1 flex flex-col p-4 items-center w-full">
      <div className="w-full h-40 bg-slate-800 rounded overflow-hidden mb-6 border-2 border-slate-300 relative shrink-0 shadow-inner">
        {capturedImage && (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover opacity-80" />
        )}
        <div className="absolute top-2 right-2">
            <button onClick={() => setCurrentStep('PHOTO')} className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70 active:scale-95 transition-all">
                <RefreshCw size={20}/>
            </button>
        </div>
      </div>
      
      <label className="text-xl font-bold text-slate-700 mb-2 self-start">输入重量 (g)</label>
      <div className="relative w-full mb-4">
        <input
          ref={weightInputRef}
          type="tel" 
          pattern="[0-9]*"
          value={weight}
          onChange={(e) => setWeight(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => { if (e.key === 'Enter') handleWeightEnter(); }}
          className="w-full px-4 py-4 text-5xl font-mono font-black border-4 border-blue-600 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300 text-center shadow-lg"
          placeholder="0"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl select-none">g</div>
      </div>
      <p className="text-slate-500 text-sm font-bold bg-slate-200 px-3 py-1 rounded-full">输入完成按回车</p>
    </div>
  );

  const renderScanStep = () => (
    <div className="flex-1 flex flex-col p-4 items-center justify-center w-full bg-slate-50">
      {isSaving ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
             <Loader2 size={64} className="text-blue-600 animate-spin mb-4" />
             <h2 className="text-xl font-bold text-slate-700">正在提交数据...</h2>
          </div>
      ) : (
          <>
            <div className="flex gap-2 mb-8 w-full">
                <div className="flex-1 bg-white p-3 rounded border border-slate-300 shadow-sm">
                    <span className="block text-slate-400 text-[10px] uppercase font-bold">MID</span>
                    <span className="block text-xl font-bold truncate">{state?.mid}</span>
                </div>
                <div className="w-1/3 bg-white p-3 rounded border border-slate-300 shadow-sm text-right">
                    <span className="block text-slate-400 text-[10px] uppercase font-bold">重量</span>
                    <span className="block text-xl font-black truncate text-blue-700">{weight}<span className="text-sm text-slate-400 ml-1">g</span></span>
                </div>
            </div>
            <div className="animate-pulse mb-6 p-6 bg-white rounded-full shadow-lg border-4 border-blue-100">
                <Barcode size={80} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-800 text-center mb-2">请扫描入库码</h1>
            <p className="text-xs text-slate-500 text-center bg-slate-200 px-4 py-1 rounded-full">
                等待扫描枪输入...
            </p>
          </>
      )}
    </div>
  );

  const renderEditOverview = () => (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-slate-100">
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Image */}
            <div className="w-full bg-white rounded-lg p-2 shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-2 px-1">
                    <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                        <ImageIcon size={12}/> 包裹照片
                    </label>
                    <button onClick={() => setCurrentStep('PHOTO')} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200 font-bold active:bg-blue-100">
                        重拍照片
                    </button>
                </div>
                <div className="w-full h-48 bg-slate-800 rounded overflow-hidden flex items-center justify-center relative">
                    {capturedImage ? (
                        <img src={capturedImage} alt="Pkg" className="w-full h-full object-contain" />
                    ) : (
                        <span className="text-slate-500 text-sm">无照片</span>
                    )}
                </div>
            </div>
            {/* Weight */}
            <div className="w-full bg-white rounded-lg p-3 shadow-sm border border-slate-200">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">包裹重量 (g)</label>
                <div className="flex items-center gap-2">
                    <input
                        type="tel"
                        pattern="[0-9]*"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 text-3xl font-black text-slate-800 border-b-2 border-slate-300 focus:border-blue-600 outline-none py-1 bg-transparent font-mono"
                    />
                    <span className="text-slate-400 font-bold">g</span>
                </div>
            </div>
            {/* Code */}
            <div className="w-full bg-white rounded-lg p-3 shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">入库条码</label>
                    <button 
                        onClick={() => { scanBuffer.current = ''; setCurrentStep('INBOUND_SCAN'); }}
                        className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded border border-orange-200 font-bold active:bg-orange-100"
                    >
                        重新扫描
                    </button>
                </div>
                <div className="font-mono text-xl font-bold text-slate-700 break-all bg-slate-50 p-2 rounded border border-slate-100 min-h-[3rem] flex items-center">
                    {inboundCode || <span className="text-slate-300 italic">点击重新扫描...</span>}
                </div>
            </div>
            <div className="h-10"></div>
        </div>

        <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <button 
                onClick={() => saveRecord()}
                disabled={isSaving}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-3 rounded-lg shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                {isSaving ? '正在保存...' : '保存修改'}
            </button>
        </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-100">
      <div className="h-12 bg-slate-900 flex items-center px-3 justify-between text-white shrink-0 shadow-md">
        <div className="flex items-center gap-2 overflow-hidden">
            {currentStep === 'EDIT_OVERVIEW' && (
                <button onClick={() => navigate(-1)} className="p-1 -ml-2 text-slate-300 hover:text-white">
                    <ArrowLeft size={20} />
                </button>
            )}
            <span className="font-mono text-sm font-bold truncate">
                {state?.record ? '修改订单详情' : `MID: ${state?.mid}`}
            </span>
        </div>
        {!state?.record && (
            <div className="flex space-x-1.5">
               <div className={`w-2 h-2 rounded-full ${currentStep === 'PHOTO' ? 'bg-yellow-400' : 'bg-green-500'}`} />
               <div className={`w-2 h-2 rounded-full ${currentStep === 'WEIGHT' ? 'bg-yellow-400' : (currentStep === 'PHOTO' ? 'bg-slate-600' : 'bg-green-500')}`} />
               <div className={`w-2 h-2 rounded-full ${currentStep === 'INBOUND_SCAN' ? 'bg-yellow-400' : 'bg-slate-600'}`} />
            </div>
        )}
      </div>

      {currentStep === 'PHOTO' && renderPhotoStep()}
      {currentStep === 'WEIGHT' && renderWeightStep()}
      {currentStep === 'INBOUND_SCAN' && renderScanStep()}
      {currentStep === 'EDIT_OVERVIEW' && renderEditOverview()}
    </div>
  );
};

export default Detail;