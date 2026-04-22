import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, XCircle, Rocket, Timer, CheckCircle2, Trophy } from 'lucide-react';

const GameRoom = ({ profile, gameSession, onLeave }) => {
  const [participants, setParticipants] = useState([]);
  const [status, setStatus] = useState(gameSession.status);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(gameSession.current_question_index || 0);
  const [questions, setQuestions] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [results, setResults] = useState(null);

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
          startTimer();
        }
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

  const fetchQuestions = async () => {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', gameSession.quiz_id)
      .order('sort_order', { ascending: true });
    if (data) setQuestions(data);
  };

  const startTimer = () => {
    setTimeLeft(20); // Default 20s
    setHasAnswered(false);
    setResults(null);
  };

  useEffect(() => {
    if (status === 'active' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && status === 'active') {
      showQuestionResults();
    }
  }, [timeLeft, status]);

  const showQuestionResults = async () => {
    // Fetch all answers for this question
    const { data } = await supabase
      .from('student_responses')
      .select('*')
      .eq('session_id', gameSession.id)
      .eq('question_id', questions[currentQuestionIndex].id);
    
    setResults(data);
  };

  const handleStartGame = async () => {
    await supabase
      .from('game_sessions')
      .update({ status: 'active', current_question_index: 0 })
      .eq('id', gameSession.id);
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

    await supabase
      .from('student_responses')
      .insert({
        session_id: gameSession.id,
        profile_id: profile.id,
        question_id: question.id,
        chosen_option: optionIndex,
        is_correct: isCorrect,
        time_taken: 20 - timeLeft
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

  if (status === 'active' && currentQuestion) {
    return (
      <div className="screen animate-in" style={{background: 'var(--bg-dark)'}}>
        <div className="quiz-header" style={{width: '100%', display: 'flex', justifyContent: 'space-between', padding: '2rem'}}>
          <div className="timer-badge" style={{background: 'var(--primary)', padding: '1rem 2rem', borderRadius: '50px', display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <Timer />
            <span style={{fontSize: '2rem', fontWeight: 800}}>{timeLeft}</span>
          </div>
          <div className="question-count" style={{fontSize: '1.2rem', fontWeight: 600}}>
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>

        <div className="question-area" style={{textAlign: 'center', maxWidth: '900px', margin: '2rem auto'}}>
          <h1 style={{fontSize: '3rem', marginBottom: '3rem'}}>{currentQuestion.question_text}</h1>
          
          {/* Teacher View: Options Display */}
          {isHost || results ? (
            <div className="options-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', width: '100%'}}>
              {currentQuestion.options.map((opt, idx) => (
                <div key={idx} style={{
                  background: 'var(--bg-card)', 
                  padding: '2rem', 
                  borderRadius: '24px', 
                  border: results && idx === currentQuestion.correct_answer ? '4px solid var(--success)' : '1px solid var(--glass-border)',
                  position: 'relative'
                }}>
                  <span style={{fontSize: '1.5rem'}}>{opt}</span>
                  {results && idx === currentQuestion.correct_answer && <CheckCircle2 style={{position: 'absolute', right: '20px', top: '20px'}} color="var(--success)"/>}
                </div>
              ))}
            </div>
          ) : (
            /* Student View: Response Buttons */
            <div className="response-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', width: '100%'}}>
              {['triangle', 'diamond', 'circle', 'square'].map((shape, idx) => (
                <button 
                  key={idx}
                  className={`response-btn ${shape}`}
                  disabled={hasAnswered}
                  onClick={() => submitAnswer(idx)}
                  style={{
                    height: '200px', 
                    borderRadius: '24px', 
                    border: 'none', 
                    cursor: hasAnswered ? 'default' : 'pointer',
                    opacity: hasAnswered ? 0.6 : 1,
                    background: `var(--${shape}-color)`,
                    boxShadow: '0 8px 0 rgba(0,0,0,0.2)'
                  }}
                >
                  <div className={`shape-${shape}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {isHost && timeLeft === 0 && (
          <button className="btn btn-primary" onClick={handleNextQuestion} style={{width: 'auto', marginTop: '2rem', padding: '1rem 4rem'}}>
            {currentQuestionIndex + 1 === questions.length ? 'FINISH' : 'NEXT QUESTION'}
          </button>
        )}

        {hasAnswered && !isHost && timeLeft > 0 && (
          <div className="waiting-indicator">
            <h2>Answer Submitted!</h2>
            <p>Waiting for other players...</p>
          </div>
        )}
      </div>
    );
  }

  if (status === 'finished') {
    return (
      <div className="screen animate-in">
        <Trophy size={80} color="var(--warning)" />
        <h1 style={{fontSize: '4rem', margin: '2rem 0'}}>Game Finished!</h1>
        <div className="leaderboard-preview">
          {/* We'll implement the full leaderboard next */}
          <button className="btn btn-primary" onClick={onLeave}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return <div>Loading Game...</div>;
};

export default GameRoom;
