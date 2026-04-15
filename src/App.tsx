import { useState, useEffect } from 'react';
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
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Components ---

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-bg/80 backdrop-blur-md border-b border-border py-3 shadow-sm' : 'bg-transparent py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-text">Maria.ai</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted">
          <a href="#features" className="hover:text-text transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-text transition-colors">How it works</a>
          <a href="#pricing" className="hover:text-text transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-text transition-colors">FAQ</a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <button className="text-sm font-medium px-4 py-2 text-muted hover:text-text transition-colors">Log in</button>
          <button className="bg-text text-bg text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 transition-all shadow-lg shadow-black/5">
            Start Chatting
          </button>
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
            <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-text">Features</a>
            <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-text">How it works</a>
            <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-text">Pricing</a>
            <a href="#faq" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-text">FAQ</a>
            <hr className="border-border" />
            <button className="bg-text text-bg py-3 rounded-xl font-medium">Start Chatting</button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  return (
    <div className="bento-card col-span-1 md:col-span-2 flex flex-col justify-center bg-[radial-gradient(circle_at_top_right,var(--color-accent-glow),transparent)]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="inline-block px-3 py-1 mb-4 text-[10px] font-bold tracking-widest uppercase bg-border rounded-full text-muted border border-border">
          Your Personal AI Partner
        </span>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 leading-[1.1] text-text">
          Meet Maria — Your Fast & <span className="text-muted">Intelligent AI Companion</span>
        </h1>
        <p className="text-base text-muted mb-8 max-w-md leading-relaxed">
          Experience the next generation of conversational intelligence. Maria AI delivers smart conversations, instant answers, and creative support in one clean interface.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button className="bg-text text-bg px-6 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 group shadow-xl">
            Start Chatting
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="bg-border border border-border text-text px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-card transition-all">
            See Demo
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ChatPreview = () => {
  return (
    <div className="bento-card col-span-1 md:row-span-2 bg-black flex flex-col border-border">
      <div className="text-[11px] uppercase tracking-[1px] text-muted mb-4 pb-2 border-b border-border flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
        Conversational Stream
      </div>
      
      <div className="space-y-4 flex-grow overflow-y-auto pr-2 custom-scrollbar">
        <div className="bg-accent text-white p-3 rounded-xl rounded-tr-none text-xs self-end ml-auto max-w-[90%] shadow-lg shadow-accent/20">
          Can you explain quantum entanglement like I'm five?
        </div>
        
        <div className="bg-border text-text p-3 rounded-xl rounded-tl-none text-xs self-start mr-auto max-w-[90%] border border-border">
          Imagine you have two magical socks. If you put one on your left foot in London, the other instantly knows it's the right-foot sock, even if it's on Mars!
        </div>

        <div className="bg-accent text-white p-3 rounded-xl rounded-tr-none text-xs self-end ml-auto max-w-[90%] shadow-lg shadow-accent/20">
          That's perfect. Now write a Python script for it.
        </div>

        <div className="bg-bg border border-border p-4 rounded-xl rounded-tl-none text-[10px] font-mono text-muted w-full overflow-x-auto">
          <span className="text-accent">class</span> <span className="text-success">Particle</span>:<br/>
          &nbsp;&nbsp;<span className="text-accent">def</span> <span className="text-success">__init__</span>(self):<br/>
          &nbsp;&nbsp;&nbsp;&nbsp;self.state = <span className="text-accent">None</span>
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
    <div className="bento-card flex flex-col justify-center">
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

const LegalModal = ({ isOpen, onClose, type }: { isOpen: boolean, onClose: () => void, type: 'privacy' | 'terms' | 'help' | null }) => {
  if (!isOpen || !type) return null;

  const content = {
    privacy: {
      title: "Privacy Policy",
      lastUpdated: "March 08, 2026",
      body: `
        <div className="space-y-6">
          <p>This Privacy Notice for Celestial Nexus ("we", "us", or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you visit our website at https://celestial-nexus.vercel.app or use our Maria.ai application.</p>
          
          <section>
            <h3 className="text-lg font-bold text-text mb-2">SUMMARY OF KEY POINTS</h3>
            <p className="text-muted mb-2">This summary provides key points from our Privacy Notice. You can find more detail about any of these topics by using our table of contents below.</p>
            <ul className="list-disc pl-5 space-y-1 text-muted">
              <li><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services.</li>
              <li><strong>Do we process any sensitive personal information?</strong> We do not process sensitive personal information.</li>
              <li><strong>Do we collect any information from third parties?</strong> We may collect information from public databases, marketing partners, social media platforms, and other outside sources.</li>
              <li><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-2">1. WHAT INFORMATION DO WE COLLECT?</h3>
            <p className="text-muted mb-2"><strong>Personal information you disclose to us:</strong> We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, or otherwise when you contact us.</p>
            <p className="text-muted mb-2">The personal information we collect may include:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted">
              <li>Names, email addresses, usernames, passwords, and contact preferences.</li>
              <li><strong>Social Media Login Data:</strong> We may provide you with the option to register with us using your existing social media account details, like your Facebook, X, or other social media account.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-2">2. HOW DO WE PROCESS YOUR INFORMATION?</h3>
            <p className="text-muted mb-2">We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted">
              <li>To facilitate account creation and authentication and otherwise manage user accounts.</li>
              <li>To deliver and facilitate delivery of services to the user.</li>
              <li>To respond to user inquiries/offer support to users.</li>
              <li>To send administrative information to you.</li>
              <li>To fulfill and manage your orders.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-2">3. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</h3>
            <p className="text-muted mb-2">We may share information in specific situations described in this section and/or with the following categories of third parties:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted">
              <li><strong>Vendors, Consultants, and Other Third-Party Service Providers:</strong> We may share your data with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf and require access to such information to do that work.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-2">4. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?</h3>
            <p className="text-muted mb-2">Yes, we offer products, features, or tools powered by artificial intelligence, machine learning, or similar technologies. As part of our Services, we offer products, features, or tools powered by artificial intelligence, machine learning, or similar technologies (collectively, "AI Products").</p>
            <p className="text-muted">All personal information processed using our AI Products is handled in line with our Privacy Notice and our agreement with third parties. This ensures high security and safeguards your personal information throughout the process, giving you peace of mind about your data's safety.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-2">5. HOW DO WE KEEP YOUR INFORMATION SAFE?</h3>
            <p className="text-muted">We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-2">6. CONTACT US</h3>
            <p className="text-muted">If you have questions or comments about this notice, you may email us at <strong>celestialnexus.dev@gmail.com</strong> or by post to:</p>
            <p className="text-muted mt-2">
              Celestial Nexus<br/>
              Jalan salak putih RT 003/012 Tangerang Selatan, Banten<br/>
              Kec. Serpong Utara, Kota Tangerang Selatan<br/>
              Kab. Tangerang, Banten 15333<br/>
              Indonesia
            </p>
          </section>
        </div>
      `
    },
    terms: {
      title: "Terms of Service",
      lastUpdated: "April 15, 2024",
      body: `
        <div className="space-y-6">
          <p>Welcome to Maria.ai. These Terms of Service ("Terms") govern your access to and use of Maria.ai's website, services, and applications. Please read these Terms carefully before using our Services.</p>
          
          <section>
            <h3 className="text-lg font-bold text-text mb-2">1. ACCEPTANCE OF TERMS</h3>
            <p className="text-muted">By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not access or use the Services.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-2">2. USER ACCOUNTS</h3>
            <p className="text-muted">To access certain features of the Services, you may be required to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-2">3. PROHIBITED CONDUCT</h3>
            <p className="text-muted mb-2">You agree not to engage in any of the following prohibited activities:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted">
              <li>Using the Services for any illegal purpose or in violation of any local, state, national, or international law.</li>
              <li>Violating, or encouraging others to violate, any right of a third party, including by infringing or misappropriating any third-party intellectual property right.</li>
              <li>Interfering with security-related features of the Services.</li>
              <li>Using the Services to generate harmful, offensive, or inappropriate content.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-2">4. AI CONTENT DISCLAIMER</h3>
            <p className="text-muted">Maria.ai uses advanced artificial intelligence models to generate responses. While we strive for accuracy, the AI may occasionally produce incorrect, biased, or incomplete information. You are solely responsible for verifying any information generated by the AI before relying on it.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-2">5. INTELLECTUAL PROPERTY</h3>
            <p className="text-muted">The Services, including all content, features, and functionality, are owned by Celestial Nexus, its licensors, or other providers of such material and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-2">6. LIMITATION OF LIABILITY</h3>
            <p className="text-muted">In no event will Celestial Nexus, its affiliates, or their licensors, service providers, employees, agents, officers, or directors be liable for damages of any kind, under any legal theory, arising out of or in connection with your use, or inability to use, the Services.</p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text mb-2">7. GOVERNING LAW</h3>
            <p className="text-muted">These Terms shall be governed by and construed in accordance with the laws of Indonesia, without regard to its conflict of law provisions.</p>
          </section>
        </div>
      `
    },
    help: {
      title: "Help Center",
      lastUpdated: "April 15, 2024",
      body: `
        <div className="space-y-8">
          <p className="text-center text-lg text-muted">Welcome to the Maria.ai Support Hub. Find answers, tips, and technical guidance.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-bg border border-border rounded-2xl hover:border-accent transition-colors group">
              <h4 className="font-bold text-text mb-2 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">1</span>
                Getting Started
              </h4>
              <p className="text-sm text-muted mb-3">New to Maria? Start here to learn about account setup, your first prompt, and basic features.</p>
              <ul className="text-xs space-y-1 text-accent/80">
                <li className="hover:underline cursor-pointer">Creating your account</li>
                <li className="hover:underline cursor-pointer">Writing effective prompts</li>
                <li className="hover:underline cursor-pointer">Customizing your profile</li>
              </ul>
            </div>
            <div className="p-5 bg-bg border border-border rounded-2xl hover:border-accent transition-colors group">
              <h4 className="font-bold text-text mb-2 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">2</span>
                Billing & Pro
              </h4>
              <p className="text-sm text-muted mb-3">Manage your subscription, payments, and explore the benefits of our Pro tier.</p>
              <ul className="text-xs space-y-1 text-yellow-500/80">
                <li className="hover:underline cursor-pointer">Pro vs Free features</li>
                <li className="hover:underline cursor-pointer">Updating payment methods</li>
                <li className="hover:underline cursor-pointer">Refund policy</li>
              </ul>
            </div>
            <div className="p-5 bg-bg border border-border rounded-2xl hover:border-accent transition-colors group">
              <h4 className="font-bold text-text mb-2 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">3</span>
                Technical Support
              </h4>
              <p className="text-sm text-muted mb-3">Encountering issues? Find solutions for common technical problems and API integrations.</p>
              <ul className="text-xs space-y-1 text-purple-500/80">
                <li className="hover:underline cursor-pointer">Browser compatibility</li>
                <li className="hover:underline cursor-pointer">API access & documentation</li>
                <li className="hover:underline cursor-pointer">Reporting a bug</li>
              </ul>
            </div>
            <div className="p-5 bg-bg border border-border rounded-2xl hover:border-accent transition-colors group">
              <h4 className="font-bold text-text mb-2 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center text-success">4</span>
                Safety & Privacy
              </h4>
              <p className="text-sm text-muted mb-3">Learn about our commitment to data security and how we handle your information.</p>
              <ul className="text-xs space-y-1 text-success/80">
                <li className="hover:underline cursor-pointer">Data encryption standards</li>
                <li className="hover:underline cursor-pointer">Privacy controls</li>
                <li className="hover:underline cursor-pointer">AI ethics & safety</li>
              </ul>
            </div>
          </div>

          <section>
            <h3 className="text-lg font-bold text-text mb-4">Detailed FAQ</h3>
            <div className="space-y-6">
              <div className="border-b border-border pb-4">
                <h5 className="font-bold text-text mb-2">How accurate is Maria.ai?</h5>
                <p className="text-sm text-muted">Maria is powered by the latest Gemini models, achieving high accuracy in most tasks. However, AI can occasionally hallucinate. We recommend verifying critical facts, especially for legal or medical advice.</p>
              </div>
              <div className="border-b border-border pb-4">
                <h5 className="font-bold text-text mb-2">Can I use Maria.ai offline?</h5>
                <p className="text-sm text-muted">Currently, Maria.ai requires an active internet connection to process requests through our high-performance cloud infrastructure.</p>
              </div>
              <div className="border-b border-border pb-4">
                <h5 className="font-bold text-text mb-2">Does Maria support voice input?</h5>
                <p className="text-sm text-muted">Voice-to-text input is available on our mobile-optimized web version and will be coming soon to the desktop interface.</p>
              </div>
              <div className="border-b border-border pb-4">
                <h5 className="font-bold text-text mb-2">How do I delete my data?</h5>
                <p className="text-sm text-muted">You can delete individual conversations or your entire account history through the 'Settings' panel in your dashboard. Once deleted, data is permanently removed from our active servers.</p>
              </div>
            </div>
          </section>

          <div className="p-6 bg-accent/5 border border-accent/20 rounded-2xl text-center">
            <h4 className="font-bold text-text mb-2">Still need help?</h4>
            <p className="text-sm text-muted mb-4">Our support team is available 24/7 to assist you with any questions or technical issues.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="mailto:support@maria.ai" className="bg-accent text-white px-8 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-accent/20">
                Email Support
              </a>
              <button className="bg-border border border-border text-text px-8 py-3 rounded-xl font-bold hover:bg-card transition-all">
                Live Chat
              </button>
            </div>
          </div>
        </div>
      `
    }
  };

  const activeContent = content[type];

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
        className="relative w-full max-w-2xl max-h-[80vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-text">{activeContent.title}</h2>
            <p className="text-xs text-muted mt-1">Last updated: {activeContent.lastUpdated}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-border rounded-full transition-colors text-muted hover:text-text">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar text-sm leading-relaxed text-text/80">
          <div dangerouslySetInnerHTML={{ __html: activeContent.body }} />
        </div>
        <div className="p-4 border-t border-border bg-card/50 text-center">
          <button onClick={onClose} className="bg-text text-bg px-6 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-all">
            Close
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
    <footer className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-muted">
      <div>&copy; 2024 Maria AI Systems. Built for high-performance teams.</div>
      <div className="flex gap-6">
        <span className="hover:text-text cursor-pointer transition-colors">GitHub</span>
        <span onClick={() => onOpenLegal('privacy')} className="hover:text-text cursor-pointer transition-colors">Privacy Policy</span>
        <span onClick={() => onOpenLegal('terms')} className="hover:text-text cursor-pointer transition-colors">Terms</span>
        <span onClick={() => onOpenLegal('help')} className="hover:text-text cursor-pointer transition-colors">Contact</span>
      </div>
    </footer>
  );
};

export default function App() {
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | 'help' | null>(null);

  return (
    <div className="min-h-screen bg-bg text-text font-sans p-6 md:p-8 flex flex-col gap-6 selection:bg-accent selection:text-white">
      <Navbar />
      
      <main className="mt-20 flex-grow max-w-7xl mx-auto w-full flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-grow">
          <Hero />
          <ChatPreview />
          <FAQMini />
          <PricingCard />
          <FeaturesGrid />
          <HowItWorksCard />
        </div>
        <CapabilitiesShowcase />
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
