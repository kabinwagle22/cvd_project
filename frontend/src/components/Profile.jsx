import React, { useState, useEffect } from 'react';
import { User, Lock, ChevronLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const Profile = ({ token, onBack }) => {
  const [username, setUsername] = useState(localStorage.getItem('userName') || '');
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [remainingDays, setRemainingDays] = useState(0);

  const getRemainingDays = (lastChange) => {
    if (!lastChange) return 0;
    const last = new Date(lastChange).getTime();
    const diffMs = Date.now() - last;
    const msPer15Days = 15 * 24 * 60 * 60 * 1000;
    if (diffMs >= msPer15Days) return 0;
    return Math.ceil((msPer15Days - diffMs) / (24 * 60 * 60 * 1000));
  };

  const loadProfile = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5001/api/profile', {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        }
      });
      const data = await res.json();
      if (data.success && data.data.last_password_change) {
        setRemainingDays(getRemainingDays(data.data.last_password_change));
      }
    } catch (err) {
      // ignore load failure here; password changes will still be validated by backend
    }
  };

  useEffect(() => {
    loadProfile();
  }, [token]);

  // Helper to show status and auto-hide
  const showStatus = (type, msg) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus({ type: '', msg: '' }), 4000);
  };

  const handleUpdateUsername = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5001/api/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ name: username }) // Matches 'name' field in app.py
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('userName', username);
        showStatus('success', 'Profile name updated!');
      } else {
        showStatus('error', data.error || 'Update failed');
      }
    } catch (err) {
      showStatus('error', 'Connection to server failed');
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (remainingDays > 0) {
      showStatus('error', `Please wait ${remainingDays} more day${remainingDays > 1 ? 's' : ''} before changing your password again.`);
      return;
    }
    if (passwords.new !== passwords.confirm) {
      showStatus('error', 'New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5001/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          current_password: passwords.current, 
          new_password: passwords.new 
        })
      });
      const data = await res.json();
      if (data.success) {
        showStatus('success', 'Password changed successfully!');
        setPasswords({ current: '', new: '', confirm: '' });
        setRemainingDays(15);
      } else {
        showStatus('error', data.error || 'Incorrect current password');
      }
    } catch (err) {
      showStatus('error', 'Server connection error');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors">
          <ChevronLeft size={20} className="text-slate-400" />
        </button>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Account Settings</h2>
      </div>

      {status.msg && (
        <div className={`mb-6 p-4 rounded-2xl border flex items-center gap-3 animate-in slide-in-from-top-2 ${
          status.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
          <span className="text-xs font-bold uppercase tracking-widest">{status.msg}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Username Section */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <div className="p-3 bg-blue-50 w-fit rounded-2xl mb-4 text-blue-600"><User size={24}/></div>
          <h3 className="font-bold text-slate-800 mb-4">Display Name</h3>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 mb-6 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all" 
          />
          <button 
            onClick={handleUpdateUsername} 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" size={18}/> : 'Save Changes'}
          </button>
        </div>

        {/* Password Section */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
          <div className="p-3 bg-orange-50 w-fit rounded-2xl mb-4 text-orange-600"><Lock size={24}/></div>
          <h3 className="font-bold text-slate-800 mb-4">Security</h3>
          <p className="text-sm text-slate-500 mb-4">
            Password changes are limited to once every 15 days.
            {remainingDays > 0 && ` Next update available in ${remainingDays} day${remainingDays > 1 ? 's' : ''}.`}
          </p>
          <input 
            type="password" 
            placeholder="Current Password" 
            value={passwords.current}
            onChange={(e) => setPasswords({...passwords, current: e.target.value})} 
            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 mb-2 font-bold text-slate-700" 
          />
          <input 
            type="password" 
            placeholder="New Password" 
            value={passwords.new}
            onChange={(e) => setPasswords({...passwords, new: e.target.value})} 
            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 mb-2 font-bold text-slate-700" 
          />
          <input 
            type="password" 
            placeholder="Confirm New" 
            value={passwords.confirm}
            onChange={(e) => setPasswords({...passwords, confirm: e.target.value})} 
            className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 mb-6 font-bold text-slate-700" 
          />
          <button 
            onClick={handleUpdatePassword} 
            disabled={loading || remainingDays > 0}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex justify-center items-center gap-2 ${remainingDays > 0 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {loading ? <Loader2 className="animate-spin" size={18}/> : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;