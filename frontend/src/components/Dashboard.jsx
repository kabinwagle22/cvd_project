import React, { useEffect, useState } from 'react';
import { 
    Clock, TrendingUp, ShieldAlert, CheckCircle, Activity, 
    Heart, Apple, Dumbbell, Calendar, ChevronRight, List, 
    ArrowUpRight, ArrowDownRight, X, Loader2, LogOut,
    Droplets, Thermometer, Zap, User 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip 
} from 'recharts';

// --- 1. NEW: PROFILE MODAL COMPONENT ---
const ProfileModal = ({ isOpen, onClose, token, currentName }) => {
  const [name, setName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('http://127.0.0.1:5001/api/profile', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ name: name })
      });

      if (response.ok) {
        localStorage.setItem('userName', name);
        setMessage("Profile updated!");
        setTimeout(() => {
            onClose();
            window.location.reload();
        }, 1000);
      }
    } catch (err) {
      setMessage("Connection error.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-10 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-slate-900">Account Settings</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
        </div>
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Full Name</label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full mt-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700" 
            />
          </div>
          {message && <p className="text-xs font-bold text-blue-600">{message}</p>}
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-3"
          >
            {isSaving ? <Loader2 className="animate-spin" size={18}/> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 2. SMART ANALYSIS MODAL COMPONENT ---
const AnalysisModal = ({ isOpen, onClose, token, hasHistory }) => {
  const [analysis, setAnalysis] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (isOpen && hasHistory) {
      setIsTyping(true);
      setAnalysis(""); 
      fetch('http://127.0.0.1:5001/api/chatbot', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: "Explain my latest cardiovascular risk report and suggest improvements based on my specific biometrics." })
      })
      .then(res => res.json())
      .then(data => {
        setAnalysis(data.response || "No analysis available.");
        setIsTyping(false);
      })
      .catch(err => {
        setAnalysis("Unable to reach the AI Assistant.");
        setIsTyping(false);
      });
    }
  }, [isOpen, token, hasHistory]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center p-8 pb-4 border-b border-slate-50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">AI Clinical Analysis</h3>
            <p className="text-[10px] text-blue-600 font-bold uppercase tracking-[0.2em] mt-1">Llama-3 Powered Insights</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
          {!hasHistory ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="bg-slate-100 p-6 rounded-full mb-4 text-slate-400">
                  <ShieldAlert size={40} />
              </div>
              <h4 className="text-lg font-bold text-slate-800">No Assessment Found</h4>
              <p className="text-sm text-slate-500 mt-2">Please complete your first health assessment to generate an AI clinical analysis.</p>
            </div>
          ) : isTyping ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-blue-600">
              <Loader2 className="animate-spin" size={40} />
              <p className="text-xs font-black uppercase tracking-widest animate-pulse">Analyzing Biometrics...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 rounded-[2rem] p-7 border border-slate-100 shadow-inner">
                <div className="prose prose-slate max-w-none">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                    {analysis.replaceAll('###', '').replaceAll('**', '').replaceAll('---', '_________________').trim()}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 p-5 rounded-2xl bg-amber-50 border border-amber-100 items-start">
                <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-1"/>
                <p className="text-[11px] text-amber-700 leading-normal font-medium">
                  <strong>Professional Disclaimer:</strong> This analysis is synthesized for demonstration. Always consult a medical professional for clinical decisions.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="p-8 pt-4 border-t border-slate-50">
          <button onClick={onClose} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs hover:bg-blue-600 transition-all shadow-xl uppercase tracking-[0.2em]">
            {hasHistory ? "Acknowledge & Close" : "Return to Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- 3. VITAL CARD COMPONENT ---
const VitalCard = ({ title, value, unit, icon: Icon, colorClass, trend }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl ${colorClass}`}>
        <Icon size={20} />
      </div>
      {trend && (
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${trend > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <h4 className="text-2xl font-black text-slate-900">{value}</h4>
        <span className="text-slate-400 text-xs font-bold">{unit}</span>
      </div>
    </div>
  </div>
);

// --- 4. RISK GAUGE COMPONENT ---
const RiskGauge = ({ score }) => {
  const data = [{ value: score }, { value: 100 - score }];
  const color = score < 30 ? '#22c55e' : score < 60 ? '#eab308' : '#ef4444';
  return (
    <div className="h-44 w-full relative flex items-center justify-center bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie 
            data={data} 
            cx="50%" cy="50%" 
            innerRadius={55} outerRadius={75} 
            paddingAngle={8} dataKey="value" 
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill={color} cornerRadius={10} />
            <Cell fill="#f1f5f9" cornerRadius={10} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute text-center">
        <p className="text-3xl font-black text-slate-800">{score}%</p>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">Risk Index</p>
      </div>
    </div>
  );
};

// --- 5. MAIN DASHBOARD COMPONENT ---
const Dashboard = ({ token, onNewTest, onLogout }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false); // NEW STATE
  const userName = localStorage.getItem('userName') || 'User';

  useEffect(() => {
    fetch('http://127.0.0.1:5001/history', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setHistory(data);
      setLoading(false);
    })
    .catch(err => {
      console.error("Error:", err);
      setLoading(false);
    });
  }, [token]);

  const chartData = [...history].reverse();
  const lastAssessment = history.length > 0 ? history[0] : null;
  const variance = history.length > 1 ? (history[0].risk_score - history[1].risk_score).toFixed(1) : 0;

  let vitals = { bp: "--/--", chol: "--", hr: "--", age: "--" };
  if (lastAssessment && lastAssessment.features_json) {
    try {
      const f = typeof lastAssessment.features_json === 'string' ? JSON.parse(lastAssessment.features_json) : lastAssessment.features_json;
      if (Array.isArray(f) && f.length >= 8) {
        vitals = { age: f[0], bp: `${f[3]} mmHg`, chol: `${f[4]} mg/dl`, hr: `${f[7]} bpm` };
      }
    } catch (e) { console.error("Parse Error:", e); }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-[#f8fafc] min-h-screen space-y-8">
      {/* ADDED MODALS */}
      <AnalysisModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        token={token} 
        hasHistory={history.length > 0} 
      />
      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        token={token} 
        currentName={userName} 
      />

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              Welcome, <span className="text-blue-600 capitalize">{userName}</span>
            </h2>
            <div className="h-8 w-px bg-slate-200 hidden md:block self-center mx-1"></div>
            
            {/* UPDATED BUTTON */}
            <button 
                onClick={() => setIsProfileOpen(true)} 
                className="p-3 bg-white border border-slate-100 text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-md transition-all rounded-2xl group relative"
            >
              <User size={22} />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Account Settings</span>
            </button>
          </div>
          <div className="text-slate-500 font-medium flex items-center gap-2 ml-1 text-sm">
            <div className={`w-2 h-2 rounded-full animate-pulse ${history.length > 0 ? 'bg-green-500' : 'bg-slate-300'}`}></div>
            <Calendar size={14} className="text-blue-500 ml-1"/> 
            Health Status: <span className="text-slate-700 font-bold">{lastAssessment?.status || 'No Records'}</span>
          </div>
        </div>
        <button onClick={onNewTest} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-200 transition-all flex items-center justify-center gap-3 active:scale-95 group">
          New Assessment <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform"/>
        </button>
      </div>

      {/* VITAL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <VitalCard title="Resting BP" value={vitals.bp} unit="" icon={Activity} colorClass="bg-red-50 text-red-500" />
        <VitalCard title="Cholesterol" value={vitals.chol} unit="" icon={Droplets} colorClass="bg-orange-50 text-orange-500" />
        <VitalCard title="Max Heart Rate" value={vitals.hr} unit="" icon={Zap} colorClass="bg-yellow-50 text-yellow-500" />
        <VitalCard title="Patient Age" value={vitals.age} unit="Years" icon={User} colorClass="bg-blue-50 text-blue-500" />
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* PROGRESS CHART */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Health Progression</h3>
                  <p className="text-slate-400 text-xs">Biometric risk variance over time</p>
                </div>
                {history.length > 1 && (
                  <div className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-black ${variance <= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {variance <= 0 ? <ArrowDownRight size={14}/> : <ArrowUpRight size={14}/>} {Math.abs(variance)}% CHANGE
                  </div>
                )}
              </div>
              <div className="h-64 w-full relative">
                {history.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="timestamp" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}} minTickGap={40} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 10}} />
                      <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '15px', color: '#fff'}} itemStyle={{color: '#3b82f6'}} />
                      <Area type="monotone" dataKey="risk_score" stroke="#3b82f6" strokeWidth={4} fill="url(#chartGradient)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">No Assessment Data Yet</div>
                )}
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] rounded-full"></div>
          </div>

          {/* FULL CLINICAL HISTORY TABLE */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><List size={18} className="text-blue-600"/> Clinical History</h3>
              <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-widest">Latest {history.length} Records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="px-8 py-5">Date & Time</th>
                    <th className="px-8 py-5 text-center">Risk Score</th>
                    <th className="px-8 py-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.length > 0 ? (
                    history.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all"><Clock size={14}/></div>
                            <span className="text-sm font-bold text-slate-700 tracking-tight">{item.timestamp}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center"><span className={`text-base font-black ${item.risk_score > 50 ? 'text-red-600' : 'text-green-600'}`}>{item.risk_score}%</span></td>
                        <td className="px-8 py-5"><span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${item.risk_score > 50 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>{item.status}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="3" className="px-8 py-10 text-center text-slate-400 text-sm font-bold uppercase tracking-widest">No assessments recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Current Risk Meter</h4>
            {lastAssessment ? <RiskGauge score={lastAssessment.risk_score} /> : <div className="h-44 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex items-center justify-center text-slate-300 text-xs font-bold uppercase">Pending Assessment</div>}
          </div>

          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
             <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Priority Actions</h4>
             <div className="space-y-8">
                <div className="flex gap-5">
                  <div className="bg-orange-50 text-orange-600 p-4 h-fit rounded-2xl"><Apple size={22}/></div>
                  <div>
                    <p className="font-bold text-sm text-slate-800 leading-none">DASH Diet</p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">Limit sodium to stabilize blood pressure.</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="bg-blue-50 text-blue-600 p-4 h-fit rounded-2xl"><Dumbbell size={22}/></div>
                  <div>
                    <p className="font-bold text-sm text-slate-800 leading-none">Activity</p>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">30m Zone-2 brisk walking daily.</p>
                  </div>
                </div>
             </div>
          </div>

          <div className={`rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden group transition-all duration-500 ${history.length > 0 ? 'bg-blue-600' : 'bg-slate-400 shadow-none'}`}>
            <div className="relative z-10">
              <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6"><Activity size={24}/></div>
              <h4 className="text-2xl font-black tracking-tight mb-2">CVD Assistant</h4>
              <p className="text-blue-100 text-sm leading-relaxed mb-8">
                {history.length > 0 
                  ? `Analyze your 13 medical factors to explain your ${lastAssessment?.risk_score}% risk.` 
                  : "Complete an assessment first to unlock AI clinical analysis of your biometrics."}
              </p>
              <button 
                onClick={() => { if (history.length > 0) setIsModalOpen(true); }} 
                className={`w-full py-5 rounded-2xl font-black text-xs transition-all shadow-lg active:scale-95 uppercase tracking-widest ${history.length > 0 ? 'bg-white text-blue-600 hover:bg-slate-50' : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'}`}
              >
                {history.length > 0 ? "Analyze Report" : "Feature Locked"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;