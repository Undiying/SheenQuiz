import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, XCircle, Rocket } from 'lucide-react';

const GameRoom = ({ profile, gameSession, onLeave }) => {
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState(gameSession.status);

  useEffect(() => {
    fetchParticipants();

    // Subscribe to participant changes
    const participantsChannel = supabase
      .channel(`lobby:${gameSession.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'game_participants', 
        filter: `session_id=eq.${gameSession.id}` 
      }, () => {
        fetchParticipants();
      })
      .subscribe();

    // Subscribe to session changes (to watch for game start)
    const sessionChannel = supabase
      .channel(`session:${gameSession.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${gameSession.id}`
      }, (payload) => {
        setStatus(payload.new.status);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [gameSession.id]);

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('game_participants')
      .select('*, profiles(display_name, full_name)')
      .eq('session_id', gameSession.id);

    if (data) setParticipants(data);
  };

  const handleStartGame = async () => {
    await supabase
      .from('game_sessions')
      .update({ status: 'active' })
      .eq('id', gameSession.id);
  };

  const isHost = profile.id === gameSession.host_id;

  return (
    <div className="screen animate-in">
      <div className="lobby-container">
        <div className="lobby-header">
          <div className="pin-display">
            <span style={{color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '2px'}}>GAME PIN:</span>
            <h1>{gameSession.pin}</h1>
          </div>
          
          <div style={{textAlign: 'right'}}>
            <h3>{gameSession.quizzes?.title || 'Sheen Quiz Live'}</h3>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem'}}>
              <Users size={18} color="var(--primary)"/>
              <span>{participants.length} Players joined</span>
            </div>
          </div>
        </div>

        <div className="participants-list">
          <div className="players-grid">
            {participants.length > 0 ? (
              participants.map(p => (
                <div key={p.id} className="player-tag animate-in">
                  {p.profiles.display_name || p.profiles.full_name}
                </div>
              ))
            ) : (
              <p style={{color: 'var(--text-secondary)'}}>Waiting for players to join...</p>
            )}
          </div>
        </div>

        <div style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
          <button className="btn btn-outline" onClick={onLeave} style={{width: 'auto'}}>
            <XCircle size={18} /> Exit
          </button>
          
          {isHost && (
            <button className="btn btn-primary" onClick={handleStartGame} style={{width: 'auto', padding: '0 3rem'}}>
              <Rocket size={18} /> START GAME
            </button>
          )}
        </div>

        {status === 'active' && (
          <div className="animate-in" style={{marginTop: '2rem', textAlign: 'center'}}>
            <h2 style={{color: 'var(--success)'}}>Get Ready! Quiz is starting...</h2>
            <p>Question logic will be implemented in the next phase.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameRoom;
