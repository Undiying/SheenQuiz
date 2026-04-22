import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, History, Play, LogOut } from 'lucide-react';

const StudentDashboard = ({ profile, onLogout, onJoinGame }) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinGame = async (e) => {
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
    } else {
      // Join as participant
      const { error: pError } = await supabase
        .from('game_participants')
        .insert({
          session_id: session.id,
          profile_id: profile.id
        });

      if (pError) {
        alert('Error joining game: ' + pError.message);
      } else {
        onJoinGame(session);
      }
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
        <h3>Ready to Play?</h3>
        <p style={{color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>Enter the PIN from your teacher to join the live game.</p>
        <form onSubmit={handleJoinGame} className="pin-input-group">
          <input 
            type="text" 
            placeholder="000 000" 
            maxLength="6"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          />
          <button type="submit" className="btn btn-primary" style={{width: 'auto', padding: '0 2rem'}} disabled={loading}>
            {loading ? 'Joining...' : 'Join Game'}
          </button>
        </form>
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
