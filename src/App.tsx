import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Zap, 
  Sparkles, 
  Code, 
  ArrowRight, 
  Check, 
  ChevronDown, 
  Github, 
  Twitter, 
  Linkedin,
  Menu,
  X,
  Search,
  BrainCircuit,
  Lightbulb,
  Shield,
  FileText,
  HelpCircle,
  Mail,
  Globe,
  Lock,
  User,
  Clock,
  Copy,
  Edit2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Battery,
  BatteryMedium,
  BatteryLow,
  BatteryFull
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// Safe API initialization helper
const getApiKey = () => {
  try {
    return (process as any).env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY || '';
  } catch (e) {
    try {
      return (import.meta as any).env.VITE_GEMINI_API_KEY || '';
    } catch (e2) {
      return '';
    }
  }
};

// --- Components ---

const Navbar = ({ onViewChange, currentView }: { onViewChange: (view: 'landing' | 'app') => void, currentView: string }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || currentView === 'app' ? 'bg-bg/80 backdrop-blur-md border-b border-border py-3 shadow-sm' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => onViewChange('landing')}>
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.4)] group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-xl font-bold tracking-tight text-text">Maria.ai</span>
            <span className="text-[8px] font-bold tracking-[2px] text-accent uppercase">Intelligence</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
          <button onClick={() => onViewChange('landing')} className={`hover:text-text transition-colors ${currentView === 'landing' ? 'text-text' : ''}`}>Home</button>
          <a href="#features" className="hover:text-text transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-text transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-text transition-colors">Pricing</a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          {currentView === 'landing' ? (
            <button 
              onClick={() => onViewChange('app')}
              className="bg-text text-bg text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-black/5"
            >
              Start Chatting
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-mono text-success bg-success/10 px-3 py-1.5 rounded-full border border-success/20">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              SYSTEM ACTIVE
            </div>
          )}
        </div>

        <button className="md:hidden text-text" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-card border-b border-border p-6 flex flex-col gap-4 md:hidden shadow-xl"
          >
            <button onClick={() => { onViewChange('landing'); setIsMobileMenuOpen(false); }} className="text-left text-lg font-medium text-text">Home</button>
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-text">Features</a>
            <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-text">How it works</a>
            <hr className="border-border" />
            <button onClick={() => { onViewChange('app'); setIsMobileMenuOpen(false); }} className="bg-text text-bg py-3 rounded-xl font-medium">Start Chatting</button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({ onLaunch }: { onLaunch: () => void }) => {
  return (
    <div className="bento-card col-span-1 md:col-span-1 flex flex-col justify-center bg-[radial-gradient(circle_at_top_right,var(--color-accent-glow),transparent)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="inline-block px-3 py-1 mb-4 text-[10px] font-bold tracking-widest uppercase bg-border rounded-full text-muted border border-border">
          Your Personal AI Partner
        </span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-[1.1] text-text">
          Meet <span className="text-accent">Maria</span>
        </h1>
        <p className="text-sm text-muted mb-6 max-w-md leading-relaxed">
          Your fast & intelligent AI companion for smart conversations and instant answers.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={onLaunch}
            className="bg-text text-bg px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 group shadow-xl"
          >
            Start Chatting
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-border border border-border text-text px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-card transition-all"
          >
            See Demo
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ChatPreview = ({ isFullApp = false }: { isFullApp?: boolean }) => {
  const [messages, setMessages] = useState([
    { id: 1, type: 'user', text: "Can you explain quantum entanglement like I'm five?", isEditing: false },
    { id: 2, type: 'ai', text: "Imagine you have two magical socks. If you put one on your left foot in London, the other instantly knows it's the right-foot sock, even if it's on Mars!", feedback: null },
    { id: 3, type: 'user', text: "That's perfect. Now write a Python script for it.", isEditing: false },
    { id: 4, type: 'ai', text: "class Particle:\n  def __init__(self):\n    self.state = None", isCode: true, feedback: null }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [battery, setBattery] = useState<number | null>(null);
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Refs for real-time data to be used in prompt injection
  const batteryRef = useRef<number | null>(null);
  const timeRef = useRef<string>("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTime(timeStr);
      timeRef.current = now.toLocaleString(); // More detailed for AI
    }, 1000);

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((batt: any) => {
        const updateBattery = () => {
          const level = Math.round(batt.level * 100);
          setBattery(level);
          batteryRef.current = level;
        };
        updateBattery();
        batt.addEventListener('levelchange', updateBattery);
      });
    }

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: 0, type: 'ai', text: "Hello! I'm Maria, your fast and intelligent AI companion. How can I help you today?", feedback: null }]);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg = { id: Date.now(), type: 'user', text: inputText, isEditing: false };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const currentBattery = batteryRef.current !== null ? `${batteryRef.current}%` : 'unknown';
      const currentTime = timeRef.current || new Date().toLocaleString();
      
      const aiClient = new GoogleGenAI({ apiKey: getApiKey() });
      const response = await aiClient.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: messages.concat(userMsg).map(m => ({
          role: m.type === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: `You are Maria, a fast and intelligent AI companion. Your tone is helpful, witty, and concise. Use markdown for code blocks. Keep responses brief and engaging. 
          
          CRITICAL REAL-TIME SYSTEM DATA:
          - Current Time: ${currentTime}
          - Device Battery: ${currentBattery}
          
          INSTRUCTIONS:
          1. If the user asks about the time, battery, or system status, use the data provided above.
          2. Do NOT say you don't have access to this data. You DO have access.
          3. Be precise. If the time is 15:21:11, say exactly that.`
        }
      });

      const aiText = response.text || "I'm sorry, I couldn't process that.";
      
      setMessages(prev => [...prev, { 
        id: Date.now() + 1, 
        type: 'ai', 
        text: aiText, 
        isCode: aiText.includes('```'),
        feedback: null 
      }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { id: Date.now() + 1, type: 'ai', text: "Oops, something went wrong. Make sure your API key is set in the environment variables.", feedback: null }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleFeedback = (id: number, type: 'up' | 'down') => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, feedback: type } : m));
  };

  const handleEdit = (id: number, newText: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text: newText, isEditing: false } : m));
  };

  const toggleEdit = (id: number) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isEditing: !m.isEditing } : m));
  };

  const handleRegenerate = async (id: number) => {
    const aiMsgIndex = messages.findIndex(m => m.id === id);
    if (aiMsgIndex === -1) return;
    
    const previousMessages = messages.slice(0, aiMsgIndex);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text: "Regenerating..." } : m));
    setIsLoading(true);

    try {
      const currentBattery = batteryRef.current !== null ? `${batteryRef.current}%` : 'unknown';
      const currentTime = timeRef.current || new Date().toLocaleString();

      const aiClient = new GoogleGenAI({ apiKey: getApiKey() });
      const response = await aiClient.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: previousMessages.map(m => ({
          role: m.type === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction: `You are Maria, a fast and intelligent AI companion. Your tone is helpful, witty, and concise. Use markdown for code blocks. Keep responses brief and engaging.
          
          CRITICAL REAL-TIME SYSTEM DATA:
          - Current Time: ${currentTime}
          - Device Battery: ${currentBattery}
          
          INSTRUCTIONS:
          1. If the user asks about the time, battery, or system status, use the data provided above.
          2. Do NOT say you don't have access to this data. You DO have access.
          3. Be precise.`
        }
      });

      const aiText = response.text || "I'm sorry, I couldn't process that.";

      setMessages(prev => prev.map(m => m.id === id ? { ...m, text: aiText, isCode: aiText.includes('```') } : m));
    } catch (error) {
      console.error("Regenerate Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getBatteryIcon = () => {
    if (battery === null) return <Battery className="w-3 h-3" />;
    if (battery > 80) return <BatteryFull className="w-3 h-3 text-success" />;
    if (battery > 30) return <BatteryMedium className="w-3 h-3 text-yellow-500" />;
    return <BatteryLow className="w-3 h-3 text-red-500" />;
  };

  return (
    <div id="chat-container" className={`bento-card ${isFullApp ? 'col-span-full h-[calc(100vh-180px)]' : 'col-span-1 md:col-span-2 md:row-span-2 h-[500px] md:h-full'} bg-black flex flex-col border-border overflow-hidden bg-[radial-gradient(circle_at_bottom_left,var(--color-accent-glow),transparent)] scroll-mt-24`}>
      <div className="text-[10px] uppercase tracking-[1px] text-muted mb-4 pb-2 border-b border-border flex items-center justify-between shrink-0 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
          <span className="truncate">Conversational Stream</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
          <div className="flex items-center gap-1 text-accent">
            <div className="w-1 h-1 rounded-full bg-accent animate-ping" />
            <span className="text-[9px] font-bold">LIVE</span>
          </div>
          <div className="w-[1px] h-2.5 bg-accent/20" />
          <div className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span className="font-mono">{time}</span>
          </div>
          <div className="w-[1px] h-2.5 bg-accent/20" />
          <div className="flex items-center gap-1">
            {getBatteryIcon()}
            <span>{battery !== null ? `${battery}%` : '--%'}</span>
          </div>
        </div>
      </div>
      
      <div ref={scrollRef} className="space-y-6 flex-grow overflow-y-auto pr-2 custom-scrollbar pb-4 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col gap-2 ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`relative group max-w-[90%] ${msg.type === 'user' ? 'bg-accent text-white rounded-2xl rounded-tr-none shadow-lg shadow-accent/20' : 'bg-border text-text rounded-2xl rounded-tl-none border border-border'} p-3 text-xs transition-all duration-200`}>
              {msg.isEditing ? (
                <textarea 
                  autoFocus
                  className="bg-transparent border-none outline-none w-full resize-none text-white min-h-[40px]"
                  defaultValue={msg.text}
                  onBlur={(e) => handleEdit(msg.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEdit(msg.id, e.currentTarget.value);
                    }
                  }}
                />
              ) : (
                <div className={`${msg.isCode ? 'font-mono whitespace-pre bg-black/30 p-2 rounded-lg mt-1 overflow-x-auto' : ''} break-words`}>
                  {msg.text}
                </div>
              )}

              <div className={`absolute -bottom-6 ${msg.type === 'user' ? 'right-0' : 'left-0'} flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pt-2 z-10`}>
                <button onClick={() => handleCopy(msg.text)} className="p-1 hover:text-accent transition-colors bg-black/50 rounded-md backdrop-blur-sm" title="Copy">
                  <Copy className="w-3 h-3" />
                </button>
                {msg.type === 'user' && (
                  <button onClick={() => toggleEdit(msg.id)} className="p-1 hover:text-accent transition-colors bg-black/50 rounded-md backdrop-blur-sm" title="Edit">
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
                {msg.type === 'ai' && (
                  <>
                    <button onClick={() => handleRegenerate(msg.id)} className="p-1 hover:text-accent transition-colors bg-black/50 rounded-md backdrop-blur-sm" title="Regenerate">
                      <RefreshCw className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleFeedback(msg.id, 'up')} 
                      className={`p-1 transition-colors bg-black/50 rounded-md backdrop-blur-sm ${msg.feedback === 'up' ? 'text-success' : 'hover:text-success'}`}
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleFeedback(msg.id, 'down')} 
                      className={`p-1 transition-colors bg-black/50 rounded-md backdrop-blur-sm ${msg.feedback === 'down' ? 'text-red-500' : 'hover:text-red-500'}`}
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="bg-border text-text p-3 rounded-2xl rounded-tl-none border border-border text-xs flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
              </div>
              Maria is thinking...
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-border shrink-0">
        <div className="bg-bg border border-border rounded-xl p-2 flex items-center gap-2 focus-within:border-accent transition-colors">
          <input 
            id="chat-input"
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Maria anything..." 
            className="bg-transparent border-none outline-none flex-grow text-xs px-2 text-text py-1"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !inputText.trim()}
            className={`bg-accent text-white p-1.5 rounded-lg transition-all ${isLoading || !inputText.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 hover:scale-105 active:scale-95'}`}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
const FeaturesGrid = () => {
  const features = [
    { icon: "✦", title: "Smart Chat", desc: "Natural AI conversations that understand context." },
    { icon: "⚡", title: "Instant Answers", desc: "Get precise information in milliseconds." },
    { icon: "✎", title: "Creative Effects", desc: "Generate ideas and copy with personality." },
    { icon: "</>", title: "Coding Help", desc: "Debug, write, and explain code instantly." }
  ];

  return (
    <div className="bento-card grid grid-cols-2 gap-4">
      {features.map((f, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="text-accent font-bold text-lg mb-1">{f.icon}</div>
          <div className="text-[13px] font-bold text-text">{f.title}</div>
          <div className="text-[11px] text-muted leading-tight">{f.desc}</div>
        </div>
      ))}
    </div>
  );
};

const PricingCard = () => {
  return (
    <div className="bento-card flex flex-col gap-3">
      <div className="text-sm font-bold text-text flex justify-between items-center">
        Pro Plan 
        <span className="bg-accent text-white text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
          Most Popular
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-text">$20</span>
        <span className="text-xs text-muted">/mo</span>
      </div>
      <ul className="flex flex-col gap-2">
        {["Unlimited messages", "Faster responses", "Advanced coding", "Priority access"].map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-[11px] text-muted">
            <div className="w-1 h-1 bg-accent rounded-full" />
            {f}
          </li>
        ))}
      </ul>
      <button className="mt-auto w-full py-2 bg-text text-bg rounded-lg text-xs font-bold hover:opacity-90 transition-all">
        Upgrade to Pro
      </button>
    </div>
  );
};

const HowItWorksCard = () => {
  return (
    <div id="how-it-works" className="bento-card flex flex-col justify-center scroll-mt-24">
      <div className="text-[11px] uppercase tracking-[1px] text-muted mb-4 border-b border-border pb-2">How it works</div>
      <div className="flex items-center justify-between gap-2">
        {[
          { icon: "?", label: "Ask" },
          { icon: "∞", label: "Think" },
          { icon: "!", label: "Solve" }
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-grow">
            <div className="flex flex-col items-center gap-1 flex-grow">
              <div className="w-8 h-8 bg-border border border-accent rounded-full flex items-center justify-center text-text text-xs font-bold">
                {s.icon}
              </div>
              <span className="text-[10px] text-muted">{s.label}</span>
            </div>
            {i < 2 && <span className="text-border text-lg">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

const FAQMini = () => {
  const questions = [
    "How does Maria.ai handle my data privacy?",
    "Can I integrate Maria.ai with my workflow?",
    "What makes Maria.ai different from other AIs?",
    "Is there a mobile app available?",
    "How do I cancel my Pro subscription?",
    "Does Maria.ai support multiple languages?",
    "Can Maria help with complex math problems?",
    "Is my conversation history saved?"
  ];

  return (
    <div className="bento-card flex flex-col gap-2" id="faq">
      <div className="text-[11px] uppercase tracking-[1px] text-muted mb-2 border-b border-border pb-2">Common Questions</div>
      <div className="overflow-y-auto custom-scrollbar max-h-[200px] pr-1">
        {questions.map((q, i) => (
          <div key={i} className="text-[11px] text-muted py-2 border-b border-border last:border-0 hover:text-text cursor-pointer transition-colors flex items-center justify-between group">
            <span>{q}</span>
            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </div>
  );
};

const PrivacyContent = () => (
  <div className="space-y-10">
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
          <Shield className="w-5 h-5" />
        </div>
        <h3 className="text-xl font-bold text-text">Privacy Overview</h3>
      </div>
      <p className="text-muted leading-relaxed">
        This Privacy Notice for <span className="text-text font-medium">Celestial Nexus</span> ("we", "us", or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services").
      </p>
    </section>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-5 rounded-2xl bg-bg border border-border">
        <h4 className="font-bold text-text mb-2 flex items-center gap-2">
          <User className="w-4 h-4 text-accent" />
          Data Collection
        </h4>
        <p className="text-xs text-muted leading-relaxed">
          We collect names, email addresses, and social media login data that you voluntarily provide during registration.
        </p>
      </div>
      <div className="p-5 rounded-2xl bg-bg border border-border">
        <h4 className="font-bold text-text mb-2 flex items-center gap-2">
          <BrainCircuit className="w-4 h-4 text-accent" />
          AI Processing
        </h4>
        <p className="text-xs text-muted leading-relaxed">
          Your data helps our AI provide personalized responses while maintaining high security standards.
        </p>
      </div>
    </div>

    <section className="space-y-4">
      <h3 className="text-lg font-bold text-text flex items-center gap-2">
        <div className="w-1.5 h-6 bg-accent rounded-full" />
        Key Information
      </h3>
      <div className="space-y-4">
        {[
          { title: "Authentication", desc: "We use your info to manage account creation and secure logins." },
          { title: "Service Delivery", desc: "Processing is necessary to deliver and improve our AI services." },
          { title: "Data Safety", desc: "We implement technical measures to protect your personal information." }
        ].map((item, i) => (
          <div key={i} className="flex gap-4">
            <div className="mt-1"><Check className="w-4 h-4 text-success" /></div>
            <div>
              <h5 className="font-bold text-text text-sm">{item.title}</h5>
              <p className="text-xs text-muted">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    <section className="p-6 rounded-2xl bg-accent/5 border border-accent/20">
      <h3 className="text-lg font-bold text-text mb-2">Contact Us</h3>
      <p className="text-sm text-muted mb-4">Questions about your privacy? Reach out to our data protection officer.</p>
      <div className="flex items-center gap-2 text-accent font-bold">
        <Mail className="w-4 h-4" />
        celestialnexus.dev@gmail.com
      </div>
    </section>
  </div>
);

const TermsContent = () => (
  <div className="space-y-10">
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
          <FileText className="w-5 h-5" />
        </div>
        <h3 className="text-xl font-bold text-text">Terms of Service</h3>
      </div>
      <p className="text-muted leading-relaxed">
        By accessing or using <span className="text-text font-medium">Maria.ai</span>, you agree to be bound by these Terms. These rules ensure a safe and productive environment for all users.
      </p>
    </section>

    <div className="space-y-6">
      {[
        { 
          icon: <User className="w-5 h-5" />, 
          title: "1. User Accounts", 
          desc: "You are responsible for your account security. You must be 18+ to use our services." 
        },
        { 
          icon: <BrainCircuit className="w-5 h-5" />, 
          title: "2. AI Content", 
          desc: "AI outputs are generated for assistance. Users should verify critical information independently." 
        },
        { 
          icon: <Lock className="w-5 h-5" />, 
          title: "3. Prohibited Use", 
          desc: "No illegal activities, generating harmful content, or interfering with service security." 
        }
      ].map((item, i) => (
        <div key={i} className="flex gap-5 p-5 rounded-2xl bg-bg border border-border hover:border-purple-500/30 transition-colors">
          <div className="text-purple-500">{item.icon}</div>
          <div>
            <h4 className="font-bold text-text mb-1">{item.title}</h4>
            <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>

    <section className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/20">
      <h3 className="text-lg font-bold text-text mb-2">Liability Disclaimer</h3>
      <p className="text-sm text-muted">
        Celestial Nexus is not liable for damages arising from your use of the Services. These terms are governed by the laws of Indonesia.
      </p>
    </section>
  </div>
);

const HelpContent = () => (
  <div className="space-y-10">
    <section className="text-center">
      <h3 className="text-2xl font-bold text-text mb-2">How can we help?</h3>
      <p className="text-muted">Search our knowledge base or get in touch with support.</p>
    </section>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        { icon: <Zap />, title: "Getting Started", color: "text-accent", bg: "bg-accent/10" },
        { icon: <Code />, title: "API & Dev", color: "text-success", bg: "bg-success/10" },
        { icon: <Sparkles />, title: "Pro Features", color: "text-purple-500", bg: "bg-purple-500/10" },
        { icon: <Shield />, title: "Security", color: "text-yellow-500", bg: "bg-yellow-500/10" }
      ].map((item, i) => (
        <button key={i} className="p-6 rounded-2xl bg-bg border border-border hover:border-text/30 transition-all flex flex-col items-center gap-3 group">
          <div className={`w-12 h-12 rounded-xl ${item.bg} ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
            {item.icon}
          </div>
          <span className="font-bold text-text">{item.title}</span>
        </button>
      ))}
    </div>

    <section className="space-y-4">
      <h4 className="text-lg font-bold text-text px-2">Top Questions</h4>
      <div className="space-y-2">
        {[
          "How accurate is the AI output?",
          "Can I use Maria.ai for commercial projects?",
          "How do I upgrade to the Pro plan?",
          "Is my data encrypted?"
        ].map((q, i) => (
          <div key={i} className="p-4 rounded-xl bg-bg border border-border flex items-center justify-between group cursor-pointer hover:bg-card transition-colors">
            <span className="text-sm text-muted group-hover:text-text">{q}</span>
            <ArrowRight className="w-4 h-4 text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
          </div>
        ))}
      </div>
    </section>

    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-grow p-6 rounded-2xl bg-accent text-white flex flex-col justify-center shadow-lg shadow-accent/20">
        <h4 className="font-bold mb-1">Live Support</h4>
        <p className="text-xs opacity-90 mb-4">Average response time: 5 minutes</p>
        <button className="bg-white text-accent py-2 rounded-lg font-bold text-sm hover:bg-opacity-90 transition-all">
          Start Chat
        </button>
      </div>
      <div className="flex-grow p-6 rounded-2xl bg-border border border-border flex flex-col justify-center">
        <h4 className="font-bold text-text mb-1">Email Us</h4>
        <p className="text-xs text-muted mb-4">For complex technical inquiries</p>
        <a href="mailto:support@maria.ai" className="text-accent font-bold text-sm hover:underline">
          support@maria.ai
        </a>
      </div>
    </div>
  </div>
);

const LegalModal = ({ isOpen, onClose, type }: { isOpen: boolean, onClose: () => void, type: 'privacy' | 'terms' | 'help' | null }) => {
  if (!isOpen || !type) return null;

  const config = {
    privacy: { title: "Privacy Policy", date: "March 08, 2026", component: <PrivacyContent /> },
    terms: { title: "Terms of Service", date: "April 15, 2024", component: <TermsContent /> },
    help: { title: "Help Center", date: "April 15, 2024", component: <HelpContent /> }
  };

  const active = config[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-bg/90 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 md:p-8 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-border flex items-center justify-center text-muted">
              {type === 'privacy' && <Shield className="w-6 h-6" />}
              {type === 'terms' && <FileText className="w-6 h-6" />}
              {type === 'help' && <HelpCircle className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-text tracking-tight">{active.title}</h2>
              <div className="flex items-center gap-2 text-[10px] text-muted uppercase tracking-widest mt-0.5">
                <Clock className="w-3 h-3" />
                Updated {active.date}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-border rounded-2xl transition-all text-muted hover:text-text group">
            <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>
        <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-grow">
          {active.component}
        </div>
        <div className="p-6 border-t border-border bg-card/50 flex justify-center">
          <button onClick={onClose} className="bg-text text-bg px-10 py-3 rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-black/20">
            Got it, thanks
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const CapabilitiesShowcase = () => {
  const capabilities = [
    {
      icon: <MessageSquare className="w-8 h-8 text-accent" />,
      title: "Smart Conversations",
      desc: "Experience natural, context-aware dialogues that feel human. Maria remembers past interactions to provide deeply personalized assistance that evolves with your needs over time.",
      gradient: "from-blue-500/10 to-transparent",
      height: "h-auto"
    },
    {
      icon: <Zap className="w-8 h-8 text-yellow-500" />,
      title: "Instant Answers",
      desc: "No more waiting. Get precise, data-driven answers to your most complex questions in real-time.",
      gradient: "from-yellow-500/10 to-transparent",
      height: "h-auto"
    },
    {
      icon: <Sparkles className="w-8 h-8 text-purple-500" />,
      title: "Creative Effects",
      desc: "Unlock your creative potential. From storytelling to marketing copy, Maria generates high-quality content that resonates. Whether you need a poem, a blog post, or a catchy slogan, Maria has you covered with endless inspiration.",
      gradient: "from-purple-500/10 to-transparent",
      height: "h-auto"
    },
    {
      icon: <Code className="w-8 h-8 text-success" />,
      title: "Coding Help",
      desc: "Your 24/7 pair programmer. Write, debug, and optimize code across 50+ languages with intelligent suggestions.",
      gradient: "from-success/10 to-transparent",
      height: "h-auto"
    },
    {
      icon: <Search className="w-8 h-8 text-orange-500" />,
      title: "Deep Research",
      desc: "Maria can scour the web to find the most relevant and up-to-date information, synthesizing complex topics into easy-to-digest summaries for your projects or personal curiosity.",
      gradient: "from-orange-500/10 to-transparent",
      height: "h-auto"
    },
    {
      icon: <BrainCircuit className="w-8 h-8 text-pink-500" />,
      title: "Logical Reasoning",
      desc: "Solve intricate logic puzzles and mathematical problems with step-by-step explanations that help you understand the 'why' behind every solution.",
      gradient: "from-pink-500/10 to-transparent",
      height: "h-auto"
    }
  ];

  return (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-4 mt-4 space-y-4">
      {capabilities.map((cap, i) => (
        <motion.div 
          key={i}
          whileHover={{ y: -5 }}
          className={`bento-card bg-gradient-to-br ${cap.gradient} flex flex-col gap-4 group break-inside-avoid mb-4`}
        >
          <div className="w-14 h-14 bg-bg border border-border rounded-xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-300">
            {cap.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-text mb-2">{cap.title}</h3>
            <p className="text-sm text-muted leading-relaxed">{cap.desc}</p>
          </div>
          <div className="mt-auto pt-4 flex items-center gap-2 text-xs font-bold text-accent opacity-0 group-hover:opacity-100 transition-opacity">
            Learn more <ArrowRight className="w-3 h-3" />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

const Footer = ({ onOpenLegal }: { onOpenLegal: (type: 'privacy' | 'terms' | 'help') => void }) => {
  return (
    <footer className="mt-8 pt-12 pb-8 border-t border-border flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-accent rounded-md flex items-center justify-center">
            <Sparkles className="text-white w-3.5 h-3.5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-text">Maria.ai</span>
        </div>
        
        <div className="flex flex-wrap gap-x-8 gap-y-4 text-[11px] font-medium text-muted">
          <span className="hover:text-text cursor-pointer transition-colors">GitHub</span>
          <span onClick={() => onOpenLegal('privacy')} className="hover:text-text cursor-pointer transition-colors">Privacy Policy</span>
          <span onClick={() => onOpenLegal('terms')} className="hover:text-text cursor-pointer transition-colors">Terms of Service</span>
          <span onClick={() => onOpenLegal('help')} className="hover:text-text cursor-pointer transition-colors">Help Center</span>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-muted/60 border-t border-border/50 pt-6">
        <div>&copy; {new Date().getFullYear()} Maria AI Systems. All rights reserved.</div>
        <div className="flex gap-4">
          <span>Status: <span className="text-success">Operational</span></span>
          <span>Version: 2.1.0</span>
        </div>
      </div>
    </footer>
  );
};

export default function App() {
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'help' | null>(null);
  const [view, setView] = useState<'landing' | 'app'>('landing');

  return (
    <div className="min-h-screen bg-bg text-text font-sans p-4 md:p-12 flex flex-col gap-8 selection:bg-accent selection:text-white">
      <Navbar onViewChange={setView} currentView={view} />
      
      <main className="mt-24 flex-grow max-w-7xl mx-auto w-full flex flex-col gap-8">
        {view === 'landing' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow">
              <ChatPreview />
              <Hero onLaunch={() => setView('app')} />
              <FAQMini />
              <PricingCard />
              <FeaturesGrid />
              <HowItWorksCard />
            </div>
            <CapabilitiesShowcase />
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Maria Workspace</h2>
                <p className="text-sm text-muted">Your dedicated AI environment</p>
              </div>
              <button 
                onClick={() => setView('landing')}
                className="text-xs font-medium px-4 py-2 border border-border rounded-lg hover:bg-card transition-colors"
              >
                Back to Home
              </button>
            </div>
            <ChatPreview isFullApp />
          </motion.div>
        )}
      </main>

      <Footer onOpenLegal={setActiveModal} />

      <AnimatePresence>
        {activeModal && (
          <LegalModal 
            isOpen={!!activeModal} 
            type={activeModal} 
            onClose={() => setActiveModal(null)} 
          />
        )}
      </AnimatePresence>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}
