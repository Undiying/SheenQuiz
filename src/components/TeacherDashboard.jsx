import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Play, Users, LayoutDashboard, LogOut } from 'lucide-react';
import QuizCreator from './QuizCreator';
import StudentManager from './StudentManager';
import ClassProgress from './ClassProgress';

const TeacherDashboard = ({ profile, onLogout, onHostGame }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [selectedClass, setSelectedClass] = useState('Explorer');
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isManagingStudents, setIsManagingStudents] = useState(false);
  const [isViewingProgress, setIsViewingProgress] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, [selectedClass]);

  const fetchQuizzes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, classes(name)')
      .eq('teacher_id', profile.id)
      .eq('classes.name', selectedClass);

    if (data) setQuizzes(data);
    setLoading(false);
  };

  const handleHostGame = async (quizId) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        quiz_id: quizId,
        pin: pin,
        status: 'lobby',
        host_id: profile.id
      })
      .select()
      .single();

    if (error) {
      alert('Failed to host game: ' + error.message);
    } else {
      onHostGame(data);
    }
  };

  if (isCreating) {
    return (
      <QuizCreator 
        profile={profile} 
        selectedClass={selectedClass} 
        onSave={() => {
          setIsCreating(false);
          fetchQuizzes();
        }}
        onCancel={() => setIsCreating(false)}
      />
    );
  }

  if (isManagingStudents) {
    return (
      <StudentManager
        profile={profile}
        selectedClass={selectedClass}
        onCancel={() => setIsManagingStudents(false)}
      />
    );
  }

  if (isViewingProgress) {
    return (
      <ClassProgress 
        selectedClass={selectedClass}
        onCancel={() => setIsViewingProgress(false)}
      />
    );
  }

  return (
    <div className="screen animate-in" style={{justifyContent: 'flex-start', padding: '2rem'}}>
      <div className="dashboard-header" style={{position: 'relative', overflow: 'hidden'}}>
        <div className="user-info" style={{position: 'relative', zIndex: 1}}>
          <h2>Teacher Dashboard</h2>
          <p>Welcome back, {profile.full_name}</p>
        </div>
        <div className="mascot-container" style={{
          position: 'absolute',
          right: '150px',
          top: '-20px',
          width: '150px',
          height: '150px',
          opacity: 0.6,
          pointerEvents: 'none'
        }}>
          <img 
            src="/robotic_mascot_hero_1777034901017.png" 
            alt="Mascot" 
            style={{width: '100%', height: '100%', objectFit: 'contain'}} 
          />
        </div>
        <button className="btn btn-outline" style={{width: 'auto', position: 'relative', zIndex: 1}} onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <div className="class-selector">
        <h3>Active Class</h3>
        <div className="class-chips">
          {['Explorer', 'Junior', 'Intro'].map(cls => (
            <button 
              key={cls}
              className={`chip ${selectedClass === cls ? 'active' : ''}`}
              onClick={() => setSelectedClass(cls)}
            >
              {cls}
            </button>
          ))}
        </div>
      </div>

      <div className="quiz-section" style={{marginTop: '2rem'}}>
        <div className="section-header" style={{marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h3>My {selectedClass} Quizzes</h3>
          <button 
            className="btn btn-primary btn-sm" 
            style={{width: 'auto'}}
            onClick={() => setIsCreating(true)}
          >
            <Plus size={18} /> New Quiz
          </button>
        </div>
        
        {loading ? (
          <p>Loading quizzes...</p>
        ) : (
          <div className="quiz-grid">
            {quizzes.length > 0 ? (
              quizzes.map(q => (
                <div key={q.id} className="quiz-card animate-in">
                  <h4>{q.title}</h4>
                  <p>{q.description || 'No description provided.'}</p>
                  <button className="btn btn-secondary" onClick={() => handleHostGame(q.id)}>
                    <Play size={18} /> Host Live
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No quizzes found for {selectedClass}. Click "New Quiz" to start!</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="section-label">Management & Insights</div>
      <div className="action-grid">
        <div 
          className="action-card" 
          onClick={() => setIsManagingStudents(true)}
        >
          <div className="icon-badge" style={{background: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: '20px'}}>
            <Users size={32} />
          </div>
          <h4>Student Roster</h4>
          <p>Add students and manage credentials</p>
        </div>
        <div 
          className="action-card"
          onClick={() => setIsViewingProgress(true)}
        >
          <div className="icon-badge" style={{background: 'rgba(139, 92, 246, 0.1)', padding: '1.5rem', borderRadius: '20px'}}>
            <LayoutDashboard size={32} />
          </div>
          <h4>Class Progress</h4>
          <p>View achievement reports and analytics</p>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
