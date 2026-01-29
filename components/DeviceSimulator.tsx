import React, { ReactNode } from 'react';

interface DeviceSimulatorProps {
  children: ReactNode;
}

const DeviceSimulator: React.FC<DeviceSimulatorProps> = ({ children }) => {

  // Function to simulate physical key presses
  const handleKeyPress = (key: string, code: string, keyCode: number) => {
    const event = new KeyboardEvent('keydown', {
      key: key,
      code: code,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    const target = document.activeElement || document.body;
    target.dispatchEvent(event);

    if (key.length === 1 && target instanceof HTMLInputElement) {
       const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
       if (nativeInputValueSetter) {
          const nextValue = target.value + key;
          nativeInputValueSetter.call(target, nextValue);
          target.dispatchEvent(new Event('input', { bubbles: true }));
       }
    }
  };

  const handleManualClick = (key: string, code: string, keyCode: number, e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    handleKeyPress(key, code, keyCode);
  };

  const handleRightSideScan = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const hash = window.location.hash;
    let textToScan = "";

    if (hash.includes("/operation")) {
      textToScan = "295827572958";
    } else if (hash.includes("/detail")) {
      textToScan = "YG-gjeh8sgh";
    } else {
      handleKeyPress('Enter', 'Enter', 13);
      return;
    }

    for (let i = 0; i < textToScan.length; i++) {
      const char = textToScan[i];
      handleKeyPress(char, `Key${char.toUpperCase()}`, char.charCodeAt(0));
    }
    handleKeyPress('Enter', 'Enter', 13);
  };

  return (
    <div className="relative flex flex-col items-center select-none scale-100 sm:scale-90 md:scale-100">
      {/* --- Device Body (Resized for 4-inch screen feel) --- */}
      {/* Width: ~340px, Height: ~720px creates a rugged handheld look */}
      <div 
        className="bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl border-4 border-slate-700 flex flex-col relative"
        style={{ width: '340px', height: '720px' }} 
      >
        
        {/* === LEFT SIDE TRIGGER === */}
        <button
           onMouseDown={(e) => handleManualClick('Enter', 'Enter', 13, e)}
           className="absolute -left-[12px] top-[160px] w-[14px] h-24 bg-yellow-400 rounded-l-md border-l-2 border-y-2 border-yellow-600 shadow-md active:translate-x-1 transition-all flex items-center justify-center cursor-pointer z-0"
        >
          <div className="w-[1px] h-8 bg-yellow-600/40 rounded-full"></div>
        </button>

        {/* === RIGHT SIDE TRIGGER === */}
        <button
           onMouseDown={handleRightSideScan}
           className="absolute -right-[12px] top-[160px] w-[14px] h-24 bg-yellow-400 rounded-r-md border-r-2 border-y-2 border-yellow-600 shadow-md active:-translate-x-1 transition-all flex items-center justify-center cursor-pointer z-0"
        >
           <div className="w-[1px] h-8 bg-yellow-600/40 rounded-full"></div>
        </button>
        
        {/* --- Brand Area --- */}
        <div className="h-8 flex items-center justify-center shrink-0 space-x-2 relative z-10 mb-1">
           <div className="w-10 h-1.5 bg-slate-700 rounded-full opacity-50"></div>
           <div className="text-slate-600 font-bold text-[10px] tracking-widest">SEUIC</div>
        </div>

        {/* --- Screen Area (4-inch approx viewport) --- */}
        <div className="bg-black w-full flex-1 rounded overflow-hidden border-2 border-slate-800 relative shadow-inner z-10">
           {children}
        </div>

        {/* --- Physical Controls Area (Compact) --- */}
        <div className="h-[280px] pt-3 pb-4 px-1 shrink-0 flex flex-col relative z-10">
          
          {/* Function Bar */}
          <div className="flex justify-between items-end mb-3 px-1">
             <button className="w-10 h-8 bg-slate-700 rounded shadow active:bg-slate-600 border-b-2 border-slate-800"></button>
             {/* Main Scan Button */}
             <button 
               onMouseDown={(e) => handleManualClick('Enter', 'Enter', 13, e)}
               className="w-28 h-12 bg-yellow-400 hover:bg-yellow-300 rounded-xl shadow-[0_3px_0_rgb(161,98,7)] active:shadow-none active:translate-y-0.5 transition-all border border-yellow-600 flex items-center justify-center"
             >
                <div className="w-8 h-1 bg-yellow-600/50 rounded-full"></div>
             </button>
             <button className="w-10 h-8 bg-slate-700 rounded shadow active:bg-slate-600 border-b-2 border-slate-800"></button>
          </div>

          {/* D-Pad (Visual) */}
          <div className="flex justify-center mb-3 space-x-4 items-center opacity-40 scale-90">
             <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600"></div>
             <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
                <div className="text-slate-500 text-[10px]">OK</div>
             </div>
             <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600"></div>
          </div>

          {/* Keypad Grid (Tighter) */}
          <div className="grid grid-cols-3 gap-2 px-3">
             {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
               <button 
                 key={num}
                 onMouseDown={(e) => handleManualClick(num.toString(), `Digit${num}`, 48 + num, e)}
                 className="h-8 bg-slate-800 text-white font-bold rounded shadow border-b-2 border-black active:border-b-0 active:translate-y-px transition-all flex flex-col items-center justify-center leading-none"
               >
                 <span className="text-base">{num}</span>
               </button>
             ))}
             <button className="h-8 bg-slate-800 text-white font-bold rounded shadow border-b-2 border-black active:border-b-0 active:translate-y-px transition-all flex items-center justify-center">
                <span className="text-[10px] text-orange-400">Fn</span>
             </button>
             <button 
                onMouseDown={(e) => handleManualClick('0', 'Digit0', 48, e)}
                className="h-8 bg-slate-800 text-white font-bold rounded shadow border-b-2 border-black active:border-b-0 active:translate-y-px transition-all flex flex-col items-center justify-center leading-none"
             >
                <span className="text-base">0</span>
             </button>
             <button 
               onMouseDown={(e) => handleManualClick('.', 'Period', 190, e)}
               className="h-8 bg-slate-800 text-white font-bold rounded shadow border-b-2 border-black active:border-b-0 active:translate-y-px transition-all flex items-center justify-center"
             >
                <span className="text-base">.</span>
             </button>
          </div>

          {/* Bottom P1/Power */}
          <div className="mt-3 flex justify-between px-3">
             <button className="w-8 h-6 bg-blue-900 rounded text-[10px] text-white flex items-center justify-center shadow">P1</button>
             <button 
                onMouseDown={(e) => { e.preventDefault(); window.location.reload(); }}
                className="w-8 h-6 bg-red-600 rounded-full flex items-center justify-center shadow border-b border-red-800 active:translate-y-px"
             >
                <div className="w-2 h-2 border border-white rounded-full border-t-transparent -rotate-45"></div>
             </button>
          </div>

        </div>
      </div>
      
      {/* Table Shadow */}
      <div className="w-[260px] h-3 bg-black/30 blur-lg rounded-[100%] mt-2"></div>
    </div>
  );
};

export default DeviceSimulator;