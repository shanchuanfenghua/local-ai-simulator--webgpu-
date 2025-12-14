import React, { useState, useRef } from 'react';
import WeChatUI from './components/WeChatUI';
import { initializeLocalModel, AVAILABLE_MODELS } from './services/geminiService';

function App() {
  const [personaName, setPersonaName] = useState('宝宝');
  const [trainingData, setTrainingData] = useState<string>('');
  const [showConfig, setShowConfig] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  
  // Local Model State
  const [selectedModelId, setSelectedModelId] = useState(AVAILABLE_MODELS[0].id);
  const [customModelId, setCustomModelId] = useState('');
  const [isModelReady, setIsModelReady] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleLoadModel = async () => {
    const modelToLoad = selectedModelId === 'custom' ? customModelId.trim() : selectedModelId;
    
    if (!modelToLoad) {
        alert("请输入有效的模型 ID");
        return;
    }

    setIsLoading(true);
    setLoadingStatus("准备加载...");
    // If switching models, mark as not ready until loaded
    if (isModelReady) setIsModelReady(false);

    try {
        await initializeLocalModel(modelToLoad, (progress) => {
            setLoadingStatus(progress);
        });
        setIsModelReady(true);
        setLoadingStatus("模型加载完毕！");
    } catch (e) {
        setLoadingStatus("加载失败，请刷新重试");
        setIsModelReady(false);
    } finally {
        setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        let processedText = text;

        // Special handling for CSV files to make them readable for the AI
        if (file.name.toLowerCase().endsWith('.csv')) {
            try {
                // Simple CSV parser: assumes "Sender,Message" or "Time,Sender,Message" format
                const lines = text.split('\n');
                const formattedLines = lines.map(line => {
                    // split by comma, handling potential quotes roughly
                    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/); 
                    
                    if (parts.length >= 3) {
                        // Assume: Date, Sender, Message (common export format)
                        const sender = parts[1].replace(/['"]/g, '').trim();
                        const msg = parts.slice(2).join(',').replace(/['"]/g, '').trim();
                        return `${sender}: ${msg}`;
                    } else if (parts.length === 2) {
                        // Assume: Sender, Message
                        const sender = parts[0].replace(/['"]/g, '').trim();
                        const msg = parts[1].replace(/['"]/g, '').trim();
                        return `${sender}: ${msg}`;
                    }
                    return line;
                });
                processedText = `[系统: 已自动优化 CSV 格式]\n` + formattedLines.join('\n');
            } catch (err) {
                console.warn("CSV formatting failed, using raw text", err);
            }
        }

        setTrainingData(prev => {
             const prefix = prev ? prev + '\n\n=== 导入的新文件 ===\n' : '';
             return prefix + processedText;
        });
        alert(`成功导入文件: ${file.name}\n${file.name.endsWith('.csv') ? '(已自动转换为对话格式)' : ''}`);
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') {
              setAvatarUrl(result);
          }
      };
      reader.readAsDataURL(file);

      if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  return (
    <div className="w-full h-screen bg-white flex overflow-hidden font-sans">
      
      {/* Sidebar / Configuration Panel */}
      <div className={`${showConfig ? 'flex' : 'hidden'} flex-col w-full md:w-[400px] bg-slate-50 border-r border-gray-200 h-full p-6 shrink-0 z-20 absolute md:relative shadow-xl md:shadow-none transition-all duration-300 ease-in-out`}>
        
        <div className="mb-4 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">本地 AI 训练台</h1>
            <p className="text-sm text-gray-500 mt-1">WebGPU 本地推理 / 断网可用</p>
          </div>
          {/* Close Sidebar Button */}
          <button 
            onClick={() => setShowConfig(false)}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition"
            title="隐藏侧边栏 (沉浸模式)"
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Model Loader Section */}
        <div className={`mb-6 p-4 rounded-lg border ${isModelReady ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <h3 className="font-bold text-sm text-gray-700 mb-2">1. 模型选择与状态</h3>
            
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">选择 AI 模型</label>
              <select 
                value={selectedModelId}
                onChange={(e) => {
                  setSelectedModelId(e.target.value);
                }}
                className="w-full p-2 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {AVAILABLE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.size})</option>
                ))}
                <option value="custom">🔍 自定义 (输入模型 ID)</option>
              </select>
            </div>

            {selectedModelId === 'custom' && (
                <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">输入 MLC 模型 ID</label>
                    <input 
                        type="text" 
                        value={customModelId}
                        onChange={(e) => setCustomModelId(e.target.value)}
                        placeholder="例: RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC"
                        className="w-full p-2 border border-blue-300 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                        需是 <a href="https://github.com/mlc-ai/web-llm/blob/main/src/config.ts#L309" target="_blank" rel="noreferrer" className="underline hover:text-blue-500">WebLLM 支持的模型 ID</a>
                    </p>
                </div>
            )}

            {!isModelReady ? (
                <div>
                    <p className="text-xs text-amber-700 mb-3">
                        首次使用需下载模型到缓存。请使用 Chrome/Edge 并确保显卡正常。
                    </p>
                    {loadingStatus && (
                        <div className="text-xs font-mono bg-white p-2 rounded border border-amber-100 mb-2 h-16 overflow-y-auto">
                            {loadingStatus}
                        </div>
                    )}
                    <button 
                        onClick={handleLoadModel}
                        disabled={isLoading}
                        className={`w-full py-2 rounded text-sm font-bold text-white transition ${isLoading ? 'bg-gray-400 cursor-wait' : 'bg-amber-600 hover:bg-amber-700'}`}
                    >
                        {isLoading ? '正在处理...' : '加载选定模型'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center text-green-700 text-sm bg-green-100 p-2 rounded">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                        <div className="overflow-hidden">
                          <div className="font-bold">模型已加载</div>
                          <div className="text-xs opacity-80 truncate" title={selectedModelId === 'custom' ? customModelId : AVAILABLE_MODELS.find(m => m.id === selectedModelId)?.name}>
                              {selectedModelId === 'custom' ? (customModelId || 'Custom') : AVAILABLE_MODELS.find(m => m.id === selectedModelId)?.name}
                          </div>
                        </div>
                    </div>
                    {/* Allow Reloading/Switching even if ready */}
                    <button 
                        onClick={handleLoadModel}
                        disabled={isLoading}
                        className={`w-full py-1.5 rounded text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition`}
                    >
                        {isLoading ? '切换中...' : '重新加载 / 切换模型'}
                    </button>
                </div>
            )}
        </div>

        <div className="space-y-4 flex-1 flex flex-col overflow-hidden opacity-100 transition-opacity">
          
          {/* Persona Settings */}
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <h3 className="font-bold text-sm text-gray-700 mb-3">2. 角色设定</h3>
            
            <div className="mb-3">
                <label className="block text-xs font-medium text-gray-500 mb-1">名称</label>
                <input 
                    type="text" 
                    value={personaName}
                    onChange={(e) => setPersonaName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="例如: 女友"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">头像</label>
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-300">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">默认</div>
                        )}
                    </div>
                    <button 
                        onClick={() => avatarInputRef.current?.click()}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded border border-gray-300 transition"
                    >
                        上传图片
                    </button>
                    <input 
                        type="file" 
                        ref={avatarInputRef}
                        onChange={handleAvatarUpload}
                        accept="image/*"
                        className="hidden"
                    />
                </div>
            </div>
          </div>

          {/* Training Data Input */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex justify-between items-end mb-1">
                <label className="block text-sm font-medium text-gray-700">3. 聊天记录 / 训练数据</label>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 text-blue-600 font-medium"
                >
                    📂 导入 txt/csv 文件
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".txt,.csv,.json,.log" 
                    className="hidden"
                />
            </div>
            
            <p className="text-[10px] text-gray-500 mb-2 leading-tight">
                * 注意：无法直接读取微信加密文件夹。请先将聊天记录导出为 <strong>.txt</strong> 或 <strong>.csv</strong> 文件，然后点击上方按钮导入。
            </p>

            <textarea
              value={trainingData}
              onChange={(e) => setTrainingData(e.target.value)}
              className="flex-1 w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-xs text-gray-600 leading-relaxed"
              placeholder="聊天记录会显示在这里...
你可以手动修改，也可以直接导入文件。"
            />
          </div>
          
          {/* Mobile: Explicit close button */}
           <button 
            onClick={() => setShowConfig(false)}
            className="md:hidden w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            完成设定，去聊天
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 h-full relative flex flex-col">
         {/* Toggle Button: Visible when config is hidden (on all screens now) */}
         {!showConfig && (
            <button 
              onClick={() => setShowConfig(true)}
              className="absolute top-4 left-4 z-50 bg-white/90 backdrop-blur border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm shadow-sm hover:bg-white hover:shadow-md transition flex items-center gap-2 group"
            >
              <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              设置 / 模型
            </button>
         )}
         
         <WeChatUI 
            personaName={personaName} 
            trainingData={trainingData} 
            isModelReady={isModelReady}
            customAvatar={avatarUrl}
         />
      </div>

    </div>
  );
}

export default App;