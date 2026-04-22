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
      // Check for Super Admin
      if (formData.name === 'Admin' && formData.password === 'SheenAdmin123') {
        onTeacherLogin({ id: 'super-admin-001', full_name: 'Super Admin', role: 'superadmin' });
        setLoading(false);
        return;
      }

      // Check for regular teacher in profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('full_name', formData.name)
        .eq('password', formData.password)
        .eq('role', 'teacher')
        .single();

      if (error || !data) {
        alert('Invalid teacher name or password. Please ask the Admin to create your account.');
      } else {
        onTeacherLogin(data);
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
              <div className="form-group">
                <label>Teacher Name</label>
                <input 
                  type="text" 
                  name="name" 
                  placeholder="e.g. Mr. Smith" 
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
                  placeholder="••••••••" 
                  value={formData.password}
                  onChange={handleInputChange}
                  required 
                />
              </div>
              <button type="submit" className="btn btn-secondary" disabled={loading}>
                {loading ? 'Processing...' : 'Teacher Login'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
