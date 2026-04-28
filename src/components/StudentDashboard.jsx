import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, History, Play, LogOut } from 'lucide-react';

const StudentDashboard = ({ profile, onLogout, onJoinGame }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('pin'); 
  const [sessionData, setSessionData] = useState(null);
  const [displayName, setDisplayName] = useState(profile.display_name || '');

  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    setLoading(true);
    const { data: participantData } = await supabase
      .from('game_participants')
      .select('session_id')
      .eq('profile_id', profile.id)
      .order('last_seen', { ascending: false })
      .limit(1)
      .single();

    if (participantData) {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const { data: activeSession } = await supabase
        .from('game_sessions')
        .select('*, quizzes(title)')
        .eq('id', participantData.session_id)
        .neq('status', 'finished')
        .gt('created_at', fourHoursAgo)
        .single();

      if (activeSession) {
        onJoinGame(activeSession, profile);
      }
    }
    setLoading(false);
  };

  const handleVerifyPin = async (e) => {
    e.preventDefault();
    if (!pin || pin.length < 6) return;

    setLoading(true);
    try {
      const { data: session, error } = await supabase
        .from('game_sessions')
        .select('*, quizzes(title, class_id)')
        .eq('pin', pin)
        .eq('status', 'lobby')
        .single();

      if (error || !session) {
        alert('Game not found or already started.');
        return;
      }

      // CLASSROOM MODE RESTRICTION
      if (session.mode === 'classroom') {
        if (session.quizzes?.class_id !== profile.class_id) {
          alert('This is a private classroom game. You are not enrolled in this class.');
          return;
        }
      }

      setSessionData(session);
      setStep('name');
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (e) => {
    e.preventDefault();
    if (!displayName) return;
    
    setLoading(true);
    
    if (!profile.is_guest) {
      await supabase.from('profiles').update({ display_name: displayName }).eq('id', profile.id);
    }

    const { data: existingParticipant } = await supabase
      .from('game_participants')
      .select('id')
      .eq('session_id', sessionData.id)
      .eq('profile_id', profile.id)
      .single();

    if (!existingParticipant) {
      await supabase.from('game_participants').insert({
        session_id: sessionData.id,
        profile_id: profile.id,
        last_seen: new Date().toISOString()
      });
    } else {
      await supabase.from('game_participants').update({ last_seen: new Date().toISOString() }).eq('id', existingParticipant.id);
    }

    const updatedProfile = { ...profile, display_name: displayName };
    onJoinGame(sessionData, updatedProfile);
    setLoading(false);
  };

  return (
    <div className="screen animate-in" style={{justifyContent: 'flex-start', padding: '2rem'}}>
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Hello, {profile.display_name || profile.full_name}</h2>
          <p>{profile.is_guest ? 'Public Outreach Guest' : `${profile.schools?.name || 'Academy'} Student`}</p>
        </div>
        <button className="btn btn-outline" style={{width: 'auto'}} onClick={onLogout}>
          <LogOut size={18} /> Logout
        </button>
      </div>

      <div className="pin-section animate-in">
        {step === 'pin' ? (
          <>
            <h3>Join a Battle</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>Enter the PIN from your teacher to join the live game.</p>
            <form onSubmit={handleVerifyPin} className="pin-input-group">
              <input type="text" placeholder="000 000" maxLength="6" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
              <button type="submit" className="btn btn-primary" style={{width: 'auto', padding: '0 2rem'}} disabled={loading || pin.length < 6}>
                {loading ? 'Searching...' : 'Next'}
              </button>
            </form>
          </>
        ) : (
          <div className="animate-in">
            <h3>Choose Nickname</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>Joining: {sessionData?.quizzes?.title}</p>
            <form onSubmit={handleJoinGame} className="pin-input-group">
              <input type="text" placeholder="Battle Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              <button type="submit" className="btn btn-primary" style={{width: 'auto', padding: '0 2rem'}} disabled={loading || !displayName}>
                {loading ? 'Joining...' : 'Launch Battle'}
              </button>
            </form>
            <button onClick={() => setStep('pin')} style={{background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: '1rem', cursor: 'pointer', textDecoration: 'underline'}}>Change PIN</button>
          </div>
        )}
      </div>

      {!profile.is_guest && (
        <div className="stats-grid animate-in" style={{animationDelay: '0.1s'}}>
          <div className="stat-card"><Trophy size={32} color="var(--warning)" style={{marginBottom: '1rem'}}/><span className="label">Rank</span><span className="value">Explorer</span></div>
          <div className="stat-card"><History size={32} color="var(--primary)" style={{marginBottom: '1rem'}}/><span className="label">Academy Games</span><span className="value">Active</span></div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
