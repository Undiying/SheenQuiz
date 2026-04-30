import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Play, Users, LayoutDashboard, LogOut, Trash2, Rocket, Shield, Globe, School } from 'lucide-react';
import QuizCreator from './QuizCreator';
import StudentManager from './StudentManager';
import ClassProgress from './ClassProgress';
import AcademyManager from './AcademyManager';

export default function TeacherDashboard({ profile, onLogout, onHostGame }) {
  const [quizzes, setQuizzes] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isManagingStudents, setIsManagingStudents] = useState(false);
  const [isViewingProgress, setIsViewingProgress] = useState(false);
  const [isManagingAcademy, setIsManagingAcademy] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, [profile.school_id]);

  useEffect(() => {
    if (selectedClass) fetchQuizzes();
  }, [selectedClass]);

  const fetchClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', profile.school_id)
      .order('name');
    
    if (data && data.length > 0) {
      setClasses(data);
      setSelectedClass(data[0].name);
    } else {
      setClasses([]);
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('name', selectedClass)
        .eq('school_id', profile.school_id)
        .single();

      if (classData) {
        const { data } = await supabase
          .from('quizzes')
          .select('*')
          .eq('class_id', classData.id)
          .order('created_at', { ascending: false });

        if (data) setQuizzes(data);
      }
    } catch (err) {
      console.error('Error fetching quizzes:', err);
    }
    setLoading(false);
  };

  const handleStartHost = async (mode) => {
    if (!selectedQuiz) return;
    try {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          quiz_id: selectedQuiz.id,
          pin: pin,
          status: 'lobby',
          mode: mode,
          host_id: profile.id
        })
        .select()
        .single();

      if (error) throw error;
      
      const sessionWithQuiz = {
        ...data,
        quizzes: { title: selectedQuiz.title }
      };
      
      onHostGame(sessionWithQuiz);
    } catch (err) {
      alert('Failed to host game: ' + err.message);
    }
  };

  const handleDeleteQuiz = async (e, quizId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this quiz? All associated game history will be lost.')) return;
    try {
      setLoading(true);
      // Let the database ON DELETE CASCADE handle questions and sessions
      const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
      if (error) throw error;
      setQuizzes(quizzes.filter(q => q.id !== quizId));
    } catch (err) {
      alert('Error deleting quiz: ' + err.message + '\n\nNote: If this quiz has been played, you must run the database cleanup script first to allow cascading deletes.');
    } finally {
      setLoading(false);
    }
  };

  if (isCreating) {
    return <QuizCreator profile={profile} selectedClass={selectedClass} onSave={() => { setIsCreating(false); fetchQuizzes(); }} onCancel={() => setIsCreating(false)} />;
  }

  if (isManagingStudents) {
    return <StudentManager profile={profile} selectedClass={selectedClass} onCancel={() => setIsManagingStudents(false)} />;
  }

  if (isViewingProgress) {
    return (
      <ClassProgress 
        profile={profile}
        selectedClass={selectedClass}
        onCancel={() => setIsViewingProgress(false)}
      />
    );
  }

  if (isManagingAcademy) {
    return (
      <AcademyManager 
        profile={profile}
        onCancel={() => {
          setIsManagingAcademy(false);
          fetchClasses();
        }}
      />
    );
  }

  return (
    <div className="screen animate-in" style={{justifyContent: 'flex-start', padding: '2rem'}}>
      <div className="dashboard-header">
        <div className="user-info">
          <h2>{profile.schools?.name || 'Academy'} Dashboard</h2>
          <p>Welcome, {profile.full_name} ({profile.role === 'admin_teacher' ? 'Admin' : 'Teacher'})</p>
        </div>
        <div style={{display: 'flex', gap: '1rem'}}>
          {profile.role === 'admin_teacher' && (
            <button 
              className="btn btn-outline" 
              style={{width: 'auto', background: 'rgba(59, 130, 246, 0.1)'}}
              onClick={() => setIsManagingAcademy(true)}
            >
              <Shield size={18} /> Manage Academy
            </button>
          )}
          <button className="btn btn-outline" style={{width: 'auto'}} onClick={onLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      <div className="class-selector">
        <h3>Current Class</h3>
        <div className="class-chips">
          {classes.map(cls => (
            <button key={cls.id} className={`chip ${selectedClass === cls.name ? 'active' : ''}`} onClick={() => setSelectedClass(cls.name)}>
              {cls.name}
            </button>
          ))}
          {profile.role === 'admin_teacher' && (
            <button className="chip" style={{border: '1px dashed var(--primary)', background: 'transparent'}} onClick={() => { /* TODO: Add Class Modal */ }}>
              <Plus size={14} /> New Class
            </button>
          )}
        </div>
      </div>

      <div className="quiz-section" style={{marginTop: '2rem'}}>
        <div className="section-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
          <h3>{selectedClass} Battle Quizzes</h3>
          <button className="btn btn-primary btn-sm" style={{width: 'auto'}} onClick={() => setIsCreating(true)}>
            <Plus size={18} /> New Quiz
          </button>
        </div>
        
        {loading ? <p>Loading gear...</p> : (
          <div className="quiz-grid">
            {quizzes.map(q => (
              <div key={q.id} className="quiz-card animate-in">
                <h4>{q.title}</h4>
                <p>{q.description || 'No description provided.'}</p>
                <div className="card-actions" style={{display: 'flex', gap: '0.8rem', marginTop: '1.5rem'}}>
                  <button className="btn btn-primary" style={{flex: 1}} onClick={() => { setSelectedQuiz(q); setShowHostModal(true); }}>
                    <Rocket size={18} /> Host Live
                  </button>
                  <button className="btn btn-outline" style={{width: 'auto', color: 'var(--danger)'}} onClick={(e) => handleDeleteQuiz(e, q.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {quizzes.length === 0 && <div className="empty-state"><p>No quizzes for this class yet. Build your first one!</p></div>}
          </div>
        )}
      </div>

      {/* HOST MODE MODAL */}
      {showHostModal && (
        <div className="modal-overlay" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000}}>
          <div className="auth-card" style={{maxWidth: '500px', width: '90%'}}>
            <h3 style={{marginBottom: '1rem'}}>Select Hosting Mode</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: '2rem'}}>How would you like to host <strong>{selectedQuiz?.title}</strong>?</p>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1rem'}}>
              <button className="btn btn-secondary" style={{textAlign: 'left', padding: '1.5rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '1rem'}} onClick={() => handleStartHost('classroom')}>
                <School size={24} />
                <div>
                  <div style={{fontWeight: 'bold'}}>Classroom Mode</div>
                  <div style={{fontSize: '0.8rem', opacity: 0.7}}>Only for registered students in {selectedClass}</div>
                </div>
              </button>
              
              <button className="btn btn-primary" style={{textAlign: 'left', padding: '1.5rem', height: 'auto', display: 'flex', alignItems: 'center', gap: '1rem'}} onClick={() => handleStartHost('outreach')}>
                <Globe size={24} />
                <div>
                  <div style={{fontWeight: 'bold'}}>Outreach Mode (Public)</div>
                  <div style={{fontSize: '0.8rem', opacity: 0.7}}>Open to everyone! Perfect for events and visitors.</div>
                </div>
              </button>
            </div>
            
            <button className="btn btn-outline" style={{marginTop: '1.5rem'}} onClick={() => setShowHostModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="section-label">School Control Panel</div>
      <div className="action-grid">
        <div className="action-card" onClick={() => setIsManagingStudents(true)}>
          <div className="icon-badge"><Users size={32} /></div>
          <h4>Student Roster</h4>
          <p>Manage credentials for {selectedClass}</p>
        </div>
        <div className="action-card" onClick={() => setIsViewingProgress(true)}>
          <div className="icon-badge"><LayoutDashboard size={32} /></div>
          <h4>Class Analytics</h4>
          <p>View performance reports for {selectedClass}</p>
        </div>
      </div>
    </div>
  );
}
