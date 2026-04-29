import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserPlus, Trash2, X, School, Users, ShieldCheck, Plus, Briefcase } from 'lucide-react';

const AcademyManager = ({ profile, onCancel }) => {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', password: '' });
  const [newClass, setNewClass] = useState('');
  const [activeTab, setActiveTab] = useState('teachers');

  useEffect(() => {
    fetchAcademyData();
  }, []);

  const fetchAcademyData = async () => {
    setLoading(true);
    try {
      // Fetch Teachers
      const { data: teacherData } = await supabase
        .from('profiles')
        .select('*')
        .eq('school_id', profile.school_id)
        .eq('role', 'teacher');
      
      if (teacherData) setTeachers(teacherData);

      // Fetch Classes
      const { data: classData } = await supabase
        .from('classes')
        .select('*')
        .eq('school_id', profile.school_id);
      
      if (classData) setClasses(classData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      // NOTE: Creating other teachers currently uses 'public.profiles' 
      // but in a production app, we would use Supabase Auth via Edge Functions.
      // For now, we'll create profiles that can login via the Name/Password fallback
      // OR we advise the Admin to have them sign up normally.
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          full_name: newTeacher.name,
          email: newTeacher.email,
          password: newTeacher.password,
          role: 'teacher',
          school_id: profile.school_id
        })
        .select()
        .single();

      if (error) throw error;
      setTeachers([...teachers, data]);
      setNewTeacher({ name: '', email: '', password: '' });
      alert('Teacher account created successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClass) return;
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({ name: newClass, school_id: profile.school_id })
        .select()
        .single();

      if (error) throw error;
      setClasses([...classes, data]);
      setNewClass('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm('Delete this class? This will also affect quizzes assigned to it.')) return;
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (!error) setClasses(classes.filter(c => c.id !== id));
  };

  return (
    <div className="screen animate-in" style={{justifyContent: 'flex-start', padding: '2rem'}}>
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Academy Management</h2>
          <p>Control Center for {profile.schools?.name}</p>
        </div>
        <button className="btn btn-outline" style={{width: 'auto'}} onClick={onCancel}><X size={18} /> Exit Manager</button>
      </div>

      <div className="auth-tabs" style={{margin: '2rem 0'}}>
        <button className={`tab-btn ${activeTab === 'teachers' ? 'active' : ''}`} onClick={() => setActiveTab('teachers')}>
          <Users size={18} /> Staff Teachers
        </button>
        <button className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>
          <School size={18} /> Academy Classes
        </button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem'}}>
        
        {/* LEFT COLUMN: FORMS */}
        <div className="auth-card" style={{height: 'fit-content'}}>
          {activeTab === 'teachers' ? (
            <>
              <h3><UserPlus size={20} /> Add Teacher</h3>
              <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem'}}>
                Teachers can log in using the Email and Password you set below.
              </p>
              <form onSubmit={handleAddTeacher}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={newTeacher.name} onChange={e => setNewTeacher({...newTeacher, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" value={newTeacher.email} onChange={e => setNewTeacher({...newTeacher, email: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Login Password</label>
                  <input type="text" value={newTeacher.password} onChange={e => setNewTeacher({...newTeacher, password: e.target.value})} required />
                </div>
                <button type="submit" className="btn btn-primary">Create Staff Account</button>
              </form>
            </>
          ) : (
            <>
              <h3><Plus size={20} /> New Class</h3>
              <form onSubmit={handleAddClass}>
                <div className="form-group">
                  <label>Class Name</label>
                  <input type="text" placeholder="e.g. Master Class" value={newClass} onChange={e => setNewClass(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary">Add to Academy</button>
              </form>
            </>
          )}
        </div>

        {/* RIGHT COLUMN: LISTS */}
        <div className="auth-card" style={{background: 'rgba(15, 23, 42, 0.4)'}}>
          {activeTab === 'teachers' ? (
            <>
              <h3>Active Staff ({teachers.length})</h3>
              <div style={{display: 'grid', gap: '1rem', marginTop: '1.5rem'}}>
                {teachers.map(t => (
                  <div key={t.id} style={{display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)'}}>
                    <div>
                      <div style={{fontWeight: 600}}>{t.full_name}</div>
                      <div style={{fontSize: '0.8rem', opacity: 0.6}}>{t.email || 'No email set'}</div>
                    </div>
                    <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                      <ShieldCheck size={18} color="var(--success)" />
                      <button className="btn-icon" style={{color: 'var(--danger)'}}><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3>Academy Classes ({classes.length})</h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem'}}>
                {classes.map(c => (
                  <div key={c.id} style={{background: 'var(--bg-dark)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--primary)', position: 'relative'}}>
                    <div style={{fontWeight: 700, marginBottom: '0.5rem'}}>{c.name}</div>
                    <div style={{fontSize: '0.7rem', opacity: 0.5}}>CLASS ID: {c.id.slice(0,8)}</div>
                    <button 
                      onClick={() => handleDeleteClass(c.id)}
                      style={{position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer'}}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcademyManager;
