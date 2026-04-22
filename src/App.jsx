import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import GameRoom from './components/GameRoom';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { Sparkles } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('auth');
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    // Check local storage for persistent login
    const savedProfile = localStorage.getItem('sheenquiz_profile');
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      handleLoginRoute(parsed);
    }
  }, []);

  const handleLoginRoute = (profileData) => {
    setProfile(profileData);
    localStorage.setItem('sheenquiz_profile', JSON.stringify(profileData));
    
    if (profileData.role === 'superadmin') {
      setCurrentScreen('superadmin-dashboard');
    } else if (profileData.role === 'teacher') {
      setCurrentScreen('teacher-dashboard');
    } else {
      setCurrentScreen('student-dashboard');
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('sheenquiz_profile');
    setProfile(null);
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
        <Auth onTeacherLogin={handleLoginRoute} onStudentLogin={handleLoginRoute} />
      )}

      {currentScreen === 'superadmin-dashboard' && profile && (
        <SuperAdminDashboard 
          profile={profile} 
          onLogout={handleLogout} 
        />
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
