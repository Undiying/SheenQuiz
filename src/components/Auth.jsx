import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, GraduationCap, ShieldCheck, Globe, UserPlus } from 'lucide-react';

const Auth = ({ onTeacherLogin, onStudentLogin, onGuestLogin }) => {
  const [activeTab, setActiveTab] = useState('student');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup' (only for teachers)
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    schoolName: '',
    pin: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTeacherAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (authMode === 'signup') {
        // 1. SIGNUP ADMIN TEACHER (Supabase Auth)
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.name, role: 'admin_teacher' }
          }
        });

        if (authError) throw authError;

        // 2. CREATE SCHOOL (Step 1: Totally independent, no admin_id yet)
        const { data: school, error: schoolError } = await supabase
          .from('schools')
          .insert({ name: formData.schoolName })
          .select()
          .single();

        if (schoolError) throw schoolError;

        // 3. CREATE PROFILE (Step 2: Link to the school we just made)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: formData.name,
            email: formData.email,
            role: 'admin_teacher',
            school_id: school.id
          })
          .select()
          .single();

        if (profileError) throw profileError;

        // 4. UPDATE SCHOOL (Step 3: Now officially set you as the admin)
        await supabase
          .from('schools')
          .update({ admin_id: authData.user.id })
          .eq('id', school.id);
        
        alert('Academy Created! Please verify your email before logging in.');
        setAuthMode('login');
      } else {
        // LOGIN TEACHER
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (authError) throw authError;

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*, schools!profiles_school_id_fkey(name)')
          .eq('id', authData.user.id)
          .single();

        if (profileError) throw profileError;
        onTeacherLogin(profile);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*, schools!profiles_school_id_fkey(name)')
      .eq('full_name', formData.name)
      .eq('password', formData.password)
      .eq('role', 'student')
      .single();

    if (error || !data) {
      alert('Invalid student name or password.');
    } else {
      onStudentLogin(data);
    }
    setLoading(false);
  };

  const handleGuestJoin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find the session by PIN (must be Outreach mode)
      const { data: session, error } = await supabase
        .from('game_sessions')
        .select('*, quizzes(title)')
        .eq('pin', formData.pin)
        .eq('mode', 'outreach')
        .neq('status', 'finished')
        .single();

      if (error || !session) {
        alert('Active outreach session not found for this PIN.');
        return;
      }

      // Create a temporary guest profile
      const guestProfile = {
        id: crypto.randomUUID(),
        full_name: formData.name,
        display_name: formData.name,
        role: 'student',
        is_guest: true
      };

      onGuestLogin(session, guestProfile);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen animate-in">
      <div className="auth-container">
        <div className="brand">
          <div className="logo-icon"><Sparkles /></div>
          <h1>SheenQuiz Academy</h1>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`} onClick={() => setActiveTab('student')}>
              <GraduationCap size={18} /> Student
            </button>
            <button className={`tab-btn ${activeTab === 'guest' ? 'active' : ''}`} onClick={() => setActiveTab('guest')}>
              <Globe size={18} /> Public
            </button>
            <button className={`tab-btn ${activeTab === 'teacher' ? 'active' : ''}`} onClick={() => setActiveTab('teacher')}>
              <ShieldCheck size={18} /> Teacher
            </button>
          </div>

          {activeTab === 'student' && (
            <form onSubmit={handleStudentLogin}>
              <div className="form-group">
                <label>Student Name</label>
                <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Class Password</label>
                <input type="password" name="password" placeholder="Provided by teacher" value={formData.password} onChange={handleInputChange} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Joining...' : 'Enter Classroom'}</button>
            </form>
          )}

          {activeTab === 'guest' && (
            <form onSubmit={handleGuestJoin}>
              <div className="form-group">
                <label>Battle Nickname</label>
                <input type="text" name="name" placeholder="e.g. RoboChamp" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Game PIN</label>
                <input type="text" name="pin" placeholder="000 000" maxLength="6" value={formData.pin} onChange={handleInputChange} required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Joining...' : 'Join Outreach Battle'}</button>
            </form>
          )}

          {activeTab === 'teacher' && (
            <form onSubmit={handleTeacherAuth}>
              {authMode === 'signup' && (
                <div className="form-group">
                  <label>Academy / School Name</label>
                  <input type="text" name="schoolName" placeholder="e.g. Robotics Institute" value={formData.schoolName} onChange={handleInputChange} required />
                </div>
              )}
              <div className="form-group">
                <label>{authMode === 'signup' ? 'Admin Full Name' : 'Email Address'}</label>
                <input type={authMode === 'signup' ? 'text' : 'email'} name={authMode === 'signup' ? 'name' : 'email'} placeholder={authMode === 'signup' ? 'Full Name' : 'email@academy.com'} value={authMode === 'signup' ? formData.name : formData.email} onChange={handleInputChange} required />
              </div>
              {authMode === 'signup' && (
                <div className="form-group">
                  <label>Admin Email</label>
                  <input type="email" name="email" placeholder="email@academy.com" value={formData.email} onChange={handleInputChange} required />
                </div>
              )}
              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} required />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={loading}>
                {loading ? 'Processing...' : authMode === 'login' ? 'Teacher Login' : 'Create Academy'}
              </button>
              
              <div style={{marginTop: '1.5rem', textAlign: 'center'}}>
                <button type="button" className="btn-link" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem'}}>
                  {authMode === 'login' ? "Don't have an academy? Create one" : "Already have an account? Login"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
