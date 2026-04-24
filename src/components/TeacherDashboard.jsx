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
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Teacher Dashboard</h2>
          <p>Welcome, {profile.full_name}</p>
        </div>
        <button className="btn btn-outline" style={{width: 'auto'}} onClick={onLogout}>
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

      <div className="quiz-section">
        <div className="section-header">
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

      <div className="action-grid">
        <div 
          className="action-card" 
          onClick={() => setIsManagingStudents(true)}
        >
          <Users size={32} />
          <h4>Manage Students</h4>
          <p>Add students to {selectedClass} and set passwords</p>
        </div>
        <div 
          className="action-card"
          onClick={() => setIsViewingProgress(true)}
        >
          <LayoutDashboard size={32} />
          <h4>Class Progress</h4>
          <p>View achievement reports for {selectedClass}</p>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
