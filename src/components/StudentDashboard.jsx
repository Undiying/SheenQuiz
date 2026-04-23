import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, History, Play, LogOut } from 'lucide-react';

const StudentDashboard = ({ profile, onLogout, onJoinGame }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('pin'); // 'pin' or 'name'
  const [sessionData, setSessionData] = useState(null);
  const [displayName, setDisplayName] = useState(profile.display_name || '');

  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    setLoading(true);
    // Look for the most recent game joined by this student
    const { data: participantData } = await supabase
      .from('game_participants')
      .select('session_id')
      .eq('profile_id', profile.id)
      .order('last_seen', { ascending: false })
      .limit(1)
      .single();

    if (participantData) {
      // Check if that session is still active or in lobby
      const { data: activeSession } = await supabase
        .from('game_sessions')
        .select('*, quizzes(title)')
        .eq('id', participantData.session_id)
        .neq('status', 'finished')
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
    const { data: session, error } = await supabase
      .from('game_sessions')
      .select('*, quizzes(title)')
      .eq('pin', pin)
      .eq('status', 'lobby')
      .single();

    if (error || !session) {
      alert('Game not found or already started.');
      setLoading(false);
    } else {
      setSessionData(session);
      setStep('name');
      setLoading(false);
    }
  };

  const handleJoinGame = async (e) => {
    e.preventDefault();
    if (!displayName) return;
    
    setLoading(true);
    
    // Update profile display name
    await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', profile.id);

    // Check if they are already in the session to avoid unique constraint errors if we had them
    const { data: existingParticipant } = await supabase
      .from('game_participants')
      .select('id')
      .eq('session_id', sessionData.id)
      .eq('profile_id', profile.id)
      .single();

    let pError = null;
    if (!existingParticipant) {
      // Join as participant
      const { error } = await supabase
        .from('game_participants')
        .insert({
          session_id: sessionData.id,
          profile_id: profile.id,
          last_seen: new Date().toISOString()
        });
      pError = error;
    } else {
      // Just update last_seen
      await supabase
        .from('game_participants')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', existingParticipant.id);
    }

    if (pError) {
      alert('Error joining game: ' + pError.message);
    } else {
      // Create an updated profile object to pass to GameRoom
      const updatedProfile = { ...profile, display_name: displayName };
      onJoinGame(sessionData, updatedProfile);
    }
    setLoading(false);
  };

  return (
    <div className="screen animate-in" style={{justifyContent: 'flex-start', padding: '2rem'}}>
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Hello, {profile.display_name || profile.full_name}</h2>
          <p>Explorer Rank • 1,250 Points</p>
        </div>
        <button className="btn btn-outline" style={{width: 'auto'}} onClick={onLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </div>

      <div className="pin-section animate-in">
        {step === 'pin' ? (
          <>
            <h3>Ready to Play?</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>Enter the PIN from your teacher to join the live game.</p>
            <form onSubmit={handleVerifyPin} className="pin-input-group">
              <input 
                type="text" 
                placeholder="000 000" 
                maxLength="6"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
              <button type="submit" className="btn btn-primary" style={{width: 'auto', padding: '0 2rem'}} disabled={loading || pin.length < 6}>
                {loading ? 'Finding...' : 'Next'}
              </button>
            </form>
          </>
        ) : (
          <div className="animate-in">
            <h3>Choose your Display Name</h3>
            <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>Keep your identity a secret from the class!</p>
            <form onSubmit={handleJoinGame} className="pin-input-group">
              <input 
                type="text" 
                placeholder="Fun Nickname" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" style={{width: 'auto', padding: '0 2rem'}} disabled={loading || !displayName}>
                {loading ? 'Joining...' : 'Join Game'}
              </button>
            </form>
            <button 
              onClick={() => setStep('pin')} 
              style={{background: 'none', border: 'none', color: 'var(--text-secondary)', marginTop: '1rem', cursor: 'pointer', textDecoration: 'underline'}}
            >
              Back
            </button>
          </div>
        )}
      </div>

      <div className="stats-grid animate-in" style={{animationDelay: '0.1s'}}>
        <div className="stat-card">
          <Trophy size={32} color="var(--warning)" style={{marginBottom: '1rem'}}/>
          <span className="label">Achievements</span>
          <span className="value">12</span>
        </div>
        <div className="stat-card">
          <History size={32} color="var(--primary)" style={{marginBottom: '1rem'}}/>
          <span className="label">Quizzes Played</span>
          <span className="value">48</span>
        </div>
        <div className="stat-card">
          <Play size={32} color="var(--success)" style={{marginBottom: '1rem'}}/>
          <span className="label">Win Streak</span>
          <span className="value">3</span>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
