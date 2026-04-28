import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import GameRoom from './components/GameRoom';
import SuperAdminDashboard from './components/SuperAdminDashboard';

function App() {
  const [profile, setProfile] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('auth');
  const [activeSession, setActiveSession] = useState(null);

  useEffect(() => {
    // 1. Check local storage for simple logins (students/guests)
    const savedProfile = localStorage.getItem('sheenquiz_profile');
    if (savedProfile) {
      const parsed = JSON.parse(savedProfile);
      handleLoginRoute(parsed);
    }

    // 2. Check Supabase Auth for Teachers/Admins
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, schools(name)')
          .eq('id', user.id)
          .single();
        
        if (profile) handleLoginRoute(profile);
      }
    };
    checkUser();
  }, []);

  const handleLoginRoute = (profileData) => {
    setProfile(profileData);
    if (!profileData.is_guest) {
      localStorage.setItem('sheenquiz_profile', JSON.stringify(profileData));
    }
    
    if (profileData.role === 'superadmin') {
      setCurrentScreen('superadmin-dashboard');
    } else if (profileData.role === 'admin_teacher' || profileData.role === 'teacher') {
      setCurrentScreen('teacher-dashboard');
    } else {
      setCurrentScreen('student-dashboard');
    }
  };

  const handleGuestLogin = (session, guestProfile) => {
    setProfile(guestProfile);
    setActiveSession(session);
    setCurrentScreen('game-room');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
    if (profile?.is_guest) {
      setProfile(null);
      setCurrentScreen('auth');
    } else {
      setCurrentScreen(profile.role.includes('teacher') ? 'teacher-dashboard' : 'student-dashboard');
    }
  };

  return (
    <div className="app">
      {currentScreen === 'auth' && (
        <Auth 
          onTeacherLogin={handleLoginRoute} 
          onStudentLogin={handleLoginRoute} 
          onGuestLogin={handleGuestLogin}
        />
      )}

      {currentScreen === 'superadmin-dashboard' && profile && (
        <SuperAdminDashboard profile={profile} onLogout={handleLogout} />
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
