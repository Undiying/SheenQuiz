import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, ShieldCheck, UserPlus } from 'lucide-react';

const SuperAdminDashboard = ({ profile, onLogout }) => {
  const [loading, setLoading] = useState(false);
  const [teacherData, setTeacherData] = useState({ name: '', password: '' });
  const [message, setMessage] = useState('');

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .insert({
        full_name: teacherData.name,
        password: teacherData.password,
        role: 'teacher'
      });

    if (error) {
      setMessage('Error creating teacher: ' + error.message);
    } else {
      setMessage(`Success! Teacher account for "${teacherData.name}" has been created.`);
      setTeacherData({ name: '', password: '' });
    }
    
    setLoading(false);
  };

  return (
    <div className="screen animate-in" style={{justifyContent: 'flex-start', padding: '2rem'}}>
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Super Admin Dashboard</h2>
          <p style={{color: 'var(--danger)'}}>Master Control Panel</p>
        </div>
        <button className="btn btn-outline" style={{width: 'auto'}} onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <div className="auth-card" style={{maxWidth: '500px', margin: '4rem auto'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--primary)'}}>
          <ShieldCheck size={24} />
          <h3 style={{margin: 0}}>Create Teacher Account</h3>
        </div>
        
        <p style={{color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem'}}>
          This tool directly creates teacher profiles in the database, bypassing email confirmations.
        </p>

        {message && (
          <div style={{
            padding: '1rem', 
            borderRadius: '8px', 
            marginBottom: '1.5rem',
            background: message.includes('Success') ? 'rgba(38, 137, 12, 0.2)' : 'rgba(226, 27, 60, 0.2)',
            border: `1px solid ${message.includes('Success') ? 'var(--success)' : 'var(--danger)'}`,
            color: message.includes('Success') ? 'var(--success)' : 'var(--danger)'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleCreateTeacher}>
          <div className="form-group">
            <label>Teacher Name</label>
            <input 
              type="text" 
              placeholder="e.g. Mr. Smith" 
              value={teacherData.name}
              onChange={(e) => setTeacherData({...teacherData, name: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Login Password</label>
            <input 
              type="text" 
              placeholder="e.g. scienceRocks123" 
              value={teacherData.password}
              onChange={(e) => setTeacherData({...teacherData, password: e.target.value})}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <UserPlus size={18} /> {loading ? 'Creating...' : 'Create Teacher'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
