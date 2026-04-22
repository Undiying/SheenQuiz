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
    
    try {
      if (authMode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        if (error) {
          alert('Login Error: ' + error.message);
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
          alert('Signup Error: ' + error.message);
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
            alert('Account created, but failed to set teacher role. Contact admin. Error: ' + pError.message);
          } else {
            alert('Account created successfully! You can now log in.');
            setAuthMode('login');
          }
        }
      }
    } catch (err) {
      console.error('Unexpected Auth Error:', err);
      alert('An unexpected error occurred: ' + err.message);
    } finally {
      setLoading(false);
    }
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
              
              {/* FORCING REBUILD: Sign-up logic is confirmed. */}
              <div style={{marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', textAlign: 'center'}}>
                <p style={{marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                  {authMode === 'login' ? "New teacher?" : "Already have an account?"}
                </p>
                <button 
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="btn btn-outline"
                  style={{fontSize: '0.8rem', padding: '0.5rem 1rem'}}
                >
                  {authMode === 'login' ? 'CREATE TEACHER ACCOUNT' : 'BACK TO LOGIN'}
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
