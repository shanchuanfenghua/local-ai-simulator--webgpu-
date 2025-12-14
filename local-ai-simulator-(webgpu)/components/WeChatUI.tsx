import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { generateLocalResponse } from '../services/geminiService'; // Actually local service now

interface WeChatUIProps {
  personaName: string;
  trainingData: string;
  isModelReady: boolean;
  customAvatar?: string;
}

const WeChatUI: React.FC<WeChatUIProps> = ({ personaName, trainingData, isModelReady, customAvatar }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      text: '你好！我是运行在你本地显卡上的模型。请先在左侧点击“加载模型”，下载完成后，即使断网我也能陪你聊天。',
      sender: 'ai',
      timestamp: new Date(),
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const userAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=User';
  // Use custom avatar if provided, otherwise generate one based on name
  const aiAvatar = customAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${personaName || 'AI'}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    if (!isModelReady) {
        alert("请先在左侧面板点击加载模型！需要下载模型文件才能运行。");
        return;
    }

    const newUserMsg: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      avatar: userAvatar
    };

    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsTyping(true);

    // Prepare history for WebLLM (OpenAI format)
    // Map internal sender to role 'user' or 'assistant'
    const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
    }));
    // Add current message
    history.push({ role: 'user', content: newUserMsg.text });

    // Call Local LLM
    const aiResponseText = await generateLocalResponse(history, {
      personaName,
      trainingData
    });

    const newAiMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: aiResponseText,
      sender: 'ai',
      timestamp: new Date(),
      avatar: aiAvatar
    };

    setIsTyping(false);
    setMessages(prev => [...prev, newAiMsg]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-[#f5f5f5] relative">
      {/* Header */}
      <div className="h-14 bg-[#ededed] flex items-center justify-between px-4 border-b border-[#dcdcdc] shrink-0 z-10">
        <div className="flex items-center space-x-1 cursor-pointer">
          <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          <span className="text-black font-medium text-lg">消息</span>
        </div>
        <div className="flex flex-col items-center">
            <div className="font-semibold text-black text-lg">{personaName || "本地AI"}</div>
            <div className="text-[10px] text-gray-500 flex items-center">
                <div className={`w-2 h-2 rounded-full mr-1 ${isModelReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {isModelReady ? '本地运行中' : '模型未加载'}
            </div>
        </div>
        <div className="w-8 flex justify-end">
            <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#ededed]">
        {messages.map((msg, index) => {
          const showTime = index === 0 || (msg.timestamp.getTime() - messages[index - 1].timestamp.getTime() > 60000 * 5);
          return (
            <div key={msg.id}>
              {showTime && (
                <div className="flex justify-center mb-2">
                  <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">{formatTime(msg.timestamp)}</span>
                </div>
              )}
              <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} items-start space-x-2`}>
                {msg.sender === 'ai' && (
                   <img src={aiAvatar} alt="AI" className="w-10 h-10 rounded bg-gray-300 object-cover" />
                )}
                
                <div className={`max-w-[85%] sm:max-w-[70%] px-3 py-2 rounded-lg text-base shadow-sm break-words whitespace-pre-wrap ${
                  msg.sender === 'user' 
                    ? 'bg-[#95EC69] text-black mr-2' 
                    : 'bg-white text-black ml-2 border border-gray-200'
                }`}>
                  {msg.text}
                </div>

                {msg.sender === 'user' && (
                  <img src={userAvatar} alt="User" className="w-10 h-10 rounded bg-gray-300" />
                )}
              </div>
            </div>
          );
        })}
        {isTyping && (
           <div className="flex justify-start items-center space-x-2">
              <img src={aiAvatar} alt="AI" className="w-10 h-10 rounded bg-gray-300 object-cover" />
              <div className="bg-white px-3 py-2 rounded-lg border border-gray-200 ml-2">
                 <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                 </div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-[#f7f7f7] p-3 border-t border-[#dcdcdc] shrink-0">
        <div className="flex items-center space-x-3 mb-2">
           <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={!isModelReady}
              placeholder={isModelReady ? "" : "请先等待模型加载完毕..."}
              className="flex-1 bg-white h-10 rounded px-3 outline-none border border-gray-200 focus:border-green-500 text-black disabled:bg-gray-100"
           />
           <button 
              onClick={handleSend}
              className={`px-4 h-8 rounded text-white text-sm font-medium transition-colors ${inputText && isModelReady ? 'bg-[#95EC69] text-black hover:bg-[#86d65e]' : 'bg-gray-300 cursor-not-allowed'}`}
              disabled={!inputText || !isModelReady}
           >
             发送
           </button>
        </div>
      </div>
    </div>
  );
};

export default WeChatUI;