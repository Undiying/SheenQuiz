import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles, GraduationCap, ShieldCheck } from 'lucide-react';

const Auth = ({ onTeacherLogin, onStudentLogin }) => {
  const [activeTab, setActiveTab] = useState('student');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTeacherAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (authMode === 'login') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      if (error) {
        alert(error.message);
      } else {
        onTeacherLogin(data.user.id);
      }
    } else {
      // Sign Up
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name
          }
        }
      });
      
      if (error) {
        alert(error.message);
      } else if (data.user) {
        // Manually create profile if trigger is missing
        const { error: pError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: formData.name,
            role: 'teacher'
          });
        
        if (pError) {
          console.error('Profile creation error:', pError);
        }
        
        alert('Account created! You can now log in.');
        setAuthMode('login');
      }
    }
    setLoading(false);
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Custom lookup for student
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
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

  return (
    <div className="screen animate-in">
      <div className="auth-container">
        <div className="brand">
          <div className="logo-icon">
            <Sparkles />
          </div>
          <h1>SheenQuiz</h1>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button 
              className={`tab-btn ${activeTab === 'student' ? 'active' : ''}`}
              onClick={() => setActiveTab('student')}
            >
              <GraduationCap size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/>
              Student
            </button>
            <button 
              className={`tab-btn ${activeTab === 'teacher' ? 'active' : ''}`}
              onClick={() => setActiveTab('teacher')}
            >
              <ShieldCheck size={18} style={{marginRight: '8px', verticalAlign: 'middle'}}/>
              Teacher
            </button>
          </div>

          {activeTab === 'student' ? (
            <form onSubmit={handleStudentLogin}>
              <div className="form-group">
                <label>Your Full Name</label>
                <input 
                  type="text" 
                  name="name" 
                  placeholder="Enter your real name" 
                  value={formData.name}
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  name="password" 
                  placeholder="Provided by teacher" 
                  value={formData.password}
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Joining...' : 'Join the Class'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleTeacherAuth}>
              {authMode === 'signup' && (
                <div className="form-group animate-in">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    name="name" 
                    placeholder="Enter your name" 
                    value={formData.name}
                    onChange={handleInputChange}
                    required 
                  />
                </div>
              )}
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  placeholder="admin@sheen.com" 
                  value={formData.email}
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  name="password" 
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={loading}>
                {loading ? 'Processing...' : (authMode === 'login' ? 'Admin Login' : 'Create Teacher Account')}
              </button>
              
              <p style={{marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button 
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  style={{background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginLeft: '5px', fontWeight: 600}}
                >
                  {authMode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
