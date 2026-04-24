import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, XCircle, Rocket, Timer, CheckCircle2, Trophy, BarChart3, Settings, Cpu, Zap, Bot } from 'lucide-react';

const GameRoom = ({ profile, gameSession, onLeave }) => {
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState(gameSession.status);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(gameSession.current_question_index || 0);
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [localResult, setLocalResult] = useState(null);
  const [results, setResults] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [responsesCount, setResponsesCount] = useState(0);

  const roboticsIcons = [
    { icon: <Settings />, color: '#3b82f6', label: 'Gear' },
    { icon: <Cpu />, color: '#8b5cf6', label: 'CPU' },
    { icon: <Zap />, color: '#f59e0b', label: 'Bolt' },
    { icon: <Bot />, color: '#10b981', label: 'Bot' }
  ];

  useEffect(() => {
    fetchParticipants();
    fetchQuestions();

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
    const sessionChannel = supabase
      .channel(`session:${gameSession.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_sessions',
        filter: `id=eq.${gameSession.id}`
      }, (payload) => {
        setStatus(payload.new.status);
        setCurrentQuestionIndex(payload.new.current_question_index);
        
        if (payload.new.status === 'active') {
          setShowLeaderboard(false);
          startTimer();
          fetchResponsesCount(payload.new.current_question_index);
        } else if (payload.new.status === 'finished') {
          setStatus('finished');
        }
      })
      .subscribe();

    const responsesChannel = supabase
      .channel(`responses:${gameSession.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'student_responses',
        filter: `session_id=eq.${gameSession.id}`
      }, (payload) => {
        // Double check it's for the current question
        if (questions[currentQuestionIndex] && payload.new.question_id === questions[currentQuestionIndex].id) {
          fetchResponsesCount(currentQuestionIndex);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(responsesChannel);
    };
  }, [gameSession.id]);

  const fetchResponsesCount = async (index = currentQuestionIndex) => {
    if (!questions[index]) return;
    const { count } = await supabase
      .from('student_responses')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', gameSession.id)
      .eq('question_id', questions[index].id);
    
    setResponsesCount(count || 0);
  };

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('game_participants')
      .select('*, profiles(display_name, full_name)')
      .eq('session_id', gameSession.id);
    if (data) setParticipants(data);
  };

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', gameSession.quiz_id)
      .order('sort_order', { ascending: true });
    if (data) setQuestions(data);
  };

  const startTimer = () => {
    setTimeLeft(20); 
    setHasAnswered(false);
    setResults(null);
    setLocalResult(null);
    setResponsesCount(0);
  };

  useEffect(() => {
    // Early exit if all participants have answered
    if (status === 'active' && !showLeaderboard && participants.length > 0 && responsesCount >= participants.length) {
      setTimeLeft(0);
      showQuestionResults();
      return;
    }

    if (status === 'active' && !showLeaderboard && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && status === 'active' && !showLeaderboard) {
      showQuestionResults();
    }
  }, [timeLeft, status, showLeaderboard, responsesCount, participants.length]);

  const showQuestionResults = async () => {
    const { data } = await supabase
      .from('student_responses')
      .select('*')
      .eq('session_id', gameSession.id)
      .eq('question_id', questions[currentQuestionIndex].id);
    
    setResults(data);
  };

  const calculateLeaderboard = async () => {
    const { data } = await supabase
      .from('student_responses')
      .select('profile_id, is_correct, time_taken, profiles(display_name, full_name)')
      .eq('session_id', gameSession.id);

    const scores = {};
    data.forEach(resp => {
      if (!scores[resp.profile_id]) {
        scores[resp.profile_id] = { 
          name: resp.profiles.display_name || resp.profiles.full_name,
          score: 0 
        };
      }
      if (resp.is_correct) {
        // Simple scoring: 1000 base - (time_taken * 10)
        const points = Math.max(500, 1000 - Math.floor(resp.time_taken * 25));
        scores[resp.profile_id].score += points;
      }
    });

    const sorted = Object.values(scores).sort((a, b) => b.score - a.score);
    setLeaderboard(sorted);
    setShowLeaderboard(true);
  };

  const handleStartGame = async () => {
    await supabase
      .from('game_sessions')
      .update({ status: 'active', current_question_index: 0 })
      .eq('id', gameSession.id);
  };

  const handleStopSession = async () => {
    if (window.confirm('Are you sure you want to stop the game session for everyone?')) {
      await supabase
        .from('game_sessions')
        .update({ status: 'finished' })
        .eq('id', gameSession.id);
    }
  };

  const handleNextQuestion = async () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      await supabase
        .from('game_sessions')
        .update({ current_question_index: nextIndex })
        .eq('id', gameSession.id);
    } else {
      await supabase
        .from('game_sessions')
        .update({ status: 'finished' })
        .eq('id', gameSession.id);
    }
  };

  const submitAnswer = async (optionIndex) => {
    if (hasAnswered || timeLeft === 0) return;
    setHasAnswered(true);
    const question = questions[currentQuestionIndex];
    const isCorrect = optionIndex === question.correct_answer;
    
    // Calculate points (max 1000, min 500 based on speed)
    const timeTaken = 20 - timeLeft;
    const points = isCorrect ? Math.max(500, 1000 - Math.floor(timeTaken * 25)) : 0;
    
    // Save locally for immediate feedback when timer ends
    setLocalResult({ isCorrect, points });

    await supabase
      .from('student_responses')
      .insert({
        session_id: gameSession.id,
        profile_id: profile.id,
        question_id: question.id,
        chosen_option: optionIndex,
        is_correct: isCorrect,
        time_taken: timeTaken
      });
  };

  const isHost = profile.id === gameSession.host_id;
  const currentQuestion = questions[currentQuestionIndex];

  // --- RENDERING ---

  if (status === 'lobby') {
    return (
      <div className="screen animate-in">
        <div className="lobby-container">
          <div className="lobby-header">
            <div className="pin-display">
              <span>GAME PIN:</span>
              <h1>{gameSession.pin}</h1>
            </div>
            <div style={{textAlign: 'right'}}>
              <h3>{gameSession.quizzes?.title || 'Sheen Quiz Live'}</h3>
              <span>{participants.length} Players joined</span>
            </div>
          </div>
          <div className="players-grid">
            {participants.map(p => (
              <div key={p.id} className="player-tag animate-in">
                {p.profiles.display_name || p.profiles.full_name}
              </div>
            ))}
          </div>
          <div style={{display: 'flex', gap: '1rem', marginTop: '2rem'}}>
            <button className="btn btn-outline" onClick={onLeave} style={{width: 'auto'}}><XCircle size={18} /> Exit</button>
            {isHost && <button className="btn btn-primary" onClick={handleStartGame} style={{width: 'auto', padding: '0 3rem'}}><Rocket size={18} /> START</button>}
          </div>
        </div>
      </div>
    );
  }

  if (showLeaderboard || status === 'finished') {
    return (
      <div className="screen animate-in">
        <Trophy size={64} color="var(--warning)" style={{marginBottom: '1rem'}}/>
        <h1 style={{fontSize: '3rem', marginBottom: '2rem'}}>{status === 'finished' ? 'Final Leaderboard' : 'Standings'}</h1>
        
        <div className="leaderboard-card auth-card" style={{width: '100%', maxWidth: '600px'}}>
          {leaderboard.length > 0 ? (
            leaderboard.map((entry, idx) => (
              <div key={idx} style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '1rem', 
                background: idx === 0 ? 'rgba(255,215,0,0.1)' : 'transparent',
                borderRadius: '12px',
                borderBottom: '1px solid var(--glass-border)',
                marginBottom: '0.5rem'
              }}>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                  <span style={{fontWeight: 800, color: idx === 0 ? 'var(--warning)' : 'var(--text-secondary)'}}>#{idx + 1}</span>
                  <span style={{fontWeight: 600}}>{entry.name}</span>
                </div>
                <span style={{fontWeight: 800, color: 'var(--primary)'}}>{entry.score} pts</span>
              </div>
            ))
          ) : (
            <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>No scores yet!</p>
          )}
        </div>

        <div style={{marginTop: '2rem', display: 'flex', gap: '1rem'}}>
          {isHost && status !== 'finished' && (
            <button className="btn btn-primary" onClick={handleNextQuestion} style={{width: 'auto', padding: '1rem 3rem'}}>
              {currentQuestionIndex + 1 === questions.length ? 'FINISH GAME' : 'NEXT QUESTION'}
            </button>
          )}
          {status === 'finished' && (
            <button className="btn btn-outline" onClick={onLeave} style={{width: 'auto'}}>Back to Dashboard</button>
          )}
        </div>
      </div>
    );
  }

  if (status === 'active' && currentQuestion) {
    return (
      <div className="screen animate-in" style={{background: 'var(--bg-dark)'}}>
        <div className="quiz-header" style={{width: '100%', display: 'flex', justifyContent: 'space-between', padding: '2rem'}}>
          <div className="timer-badge" style={{background: 'var(--primary)', padding: '1rem 2rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <Timer />
            <span style={{fontSize: '2rem', fontWeight: 800}}>{timeLeft}</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '2rem'}}>
            <div className="question-count" style={{fontSize: '1.2rem', fontWeight: 600}}>
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            {isHost && (
              <button 
                className="btn btn-outline btn-sm" 
                style={{borderColor: 'var(--danger)', color: 'var(--danger)'}}
                onClick={handleStopSession}
              >
                STOP GAME
              </button>
            )}
          </div>
        </div>

        <div className="question-area" style={{textAlign: 'center', maxWidth: '900px', margin: '2rem auto'}}>
          {/* Only show the question text if Host or if results are being shown */}
          {(isHost || results) && (
            <h1 style={{fontSize: '3rem', marginBottom: '3rem'}}>{currentQuestion.question_text}</h1>
          )}
          
          {isHost || results ? (
            <div className="options-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', width: '100%'}}>
              {currentQuestion.options.map((opt, idx) => (
                <div key={idx} style={{
                  background: 'var(--bg-card)', 
                  padding: '2rem', 
                  borderRadius: '24px', 
                  border: results && idx === currentQuestion.correct_answer ? '4px solid var(--success)' : '1px solid var(--glass-border)',
                  position: 'relative',
                  opacity: results && idx !== currentQuestion.correct_answer ? 0.4 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.5rem',
                  textAlign: 'left'
                }}>
                  <div style={{
                    background: roboticsIcons[idx].color,
                    padding: '1rem',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    {React.cloneElement(roboticsIcons[idx].icon, { size: 32 })}
                  </div>
                  <span style={{fontSize: '1.5rem', fontWeight: 600}}>{opt}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="response-grid">
              {roboticsIcons.map((item, idx) => (
                <button 
                  key={idx}
                  className="response-btn"
                  disabled={hasAnswered}
                  onClick={() => submitAnswer(idx)}
                  style={{
                    height: '100%', 
                    borderRadius: '32px', 
                    border: 'none', 
                    cursor: hasAnswered ? 'default' : 'pointer',
                    opacity: hasAnswered ? 0.6 : 1,
                    background: item.color,
                    boxShadow: '0 12px 0 rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    transition: 'all 0.1s'
                  }}
                >
                  {React.cloneElement(item.icon, { size: 100 })}
                </button>
              ))}
            </div>
          )}
        </div>

        {isHost && timeLeft === 0 && !showLeaderboard && (
          <button className="btn btn-secondary" onClick={calculateLeaderboard} style={{width: 'auto', marginTop: '2rem', padding: '1rem 4rem'}}>
            <BarChart3 size={18} /> SHOW LEADERBOARD
          </button>
        )}

        {hasAnswered && !isHost && timeLeft > 0 && (
          <div className="waiting-indicator">
            <h2 style={{color: 'var(--success)'}}>Answer Submitted!</h2>
            <p>Wait for the results...</p>
          </div>
        )}

        {timeLeft === 0 && !isHost && !showLeaderboard && (
          <div className="feedback-screen animate-in" style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
            background: localResult?.isCorrect ? 'var(--success)' : (localResult ? 'var(--danger)' : 'var(--bg-dark)'),
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 100
          }}>
            <h1 style={{fontSize: '4rem', color: 'white', marginBottom: '1rem'}}>
              {localResult?.isCorrect ? 'Correct!' : (localResult ? 'Incorrect' : "Time's Up!")}
            </h1>
            {localResult?.isCorrect && (
              <div style={{background: 'rgba(0,0,0,0.2)', padding: '1rem 3rem', borderRadius: '50px', marginTop: '2rem'}}>
                <span style={{fontSize: '2rem', fontWeight: 800, color: 'white'}}>+{localResult.points} pts</span>
              </div>
            )}
            {!localResult && (
              <p style={{fontSize: '1.5rem', color: 'rgba(255,255,255,0.8)'}}>No answer submitted.</p>
            )}
            <p style={{marginTop: '3rem', color: 'rgba(255,255,255,0.7)'}}>Teacher is reviewing results...</p>
          </div>
        )}
      </div>
    );
  }

  return <div>Loading Game...</div>;
};

export default GameRoom;
