import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import GameRoom from './components/GameRoom';
import { Sparkles } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('auth');
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setCurrentScreen('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
      setCurrentScreen(data.role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard');
    }
  };

  // Custom login for students (non-email)
  const handleStudentLogin = (studentProfile) => {
    setProfile(studentProfile);
    setCurrentScreen('student-dashboard');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setCurrentScreen('auth');
  };

  const joinGame = (gameSession) => {
    setActiveSession(gameSession);
    setCurrentScreen('game-room');
  };

  const leaveGame = () => {
    setActiveSession(null);
    setCurrentScreen(profile.role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard');
  };

  return (
    <div className="app">
      {currentScreen === 'auth' && (
        <Auth onTeacherLogin={fetchProfile} onStudentLogin={handleStudentLogin} />
      )}

      {currentScreen === 'teacher-dashboard' && profile && (
        <TeacherDashboard 
          profile={profile} 
          onLogout={handleLogout} 
          onHostGame={joinGame}
        />
      )}

      {currentScreen === 'student-dashboard' && profile && (
        <StudentDashboard 
          profile={profile} 
          onLogout={handleLogout} 
          onJoinGame={joinGame}
        />
      )}

      {currentScreen === 'game-room' && profile && activeSession && (
        <GameRoom 
          profile={profile} 
          gameSession={activeSession} 
          onLeave={leaveGame}
        />
      )}
    </div>
  );
}

export default App;
