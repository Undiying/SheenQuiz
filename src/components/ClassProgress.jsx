import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

const ClassProgress = ({ selectedClass, onCancel }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, [selectedClass]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      // 1. Get class ID
      const { data: classData } = await supabase
        .from('classes')
        .select('id')
        .eq('name', selectedClass)
        .single();

      if (!classData) throw new Error('Class not found');

      // 2. Get students
      const { data: studentData } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .eq('role', 'student')
        .eq('class_id', classData.id);

      if (!studentData || studentData.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // 3. For each student, calculate stats
      const statsPromises = studentData.map(async (student) => {
        // Fetch game participation
        const { data: participation } = await supabase
          .from('game_participants')
          .select('score')
          .eq('profile_id', student.id);

        const gamesPlayed = participation ? participation.length : 0;
        const totalScore = participation ? participation.reduce((acc, curr) => acc + (curr.score || 0), 0) : 0;

        // Fetch responses
        const { data: responses } = await supabase
          .from('student_responses')
          .select('is_correct, time_taken')
          .eq('profile_id', student.id);

        let accuracy = 0;
        let avgSpeed = 0;

        if (responses && responses.length > 0) {
          const correctCount = responses.filter(r => r.is_correct).length;
          accuracy = Math.round((correctCount / responses.length) * 100);
          
          const totalTime = responses.reduce((acc, curr) => acc + (curr.time_taken || 0), 0);
          avgSpeed = (totalTime / responses.length).toFixed(1);
        }

        return {
          ...student,
          gamesPlayed,
          totalScore,
          accuracy,
          avgSpeed
        };
      });

      const processedStudents = await Promise.all(statsPromises);
      // Sort by total score descending
      processedStudents.sort((a, b) => b.totalScore - a.totalScore);
      
      setStudents(processedStudents);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
    setLoading(false);
  };

  return (
    <div className="screen animate-in" style={{justifyContent: 'flex-start', padding: '2rem'}}>
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Class Progress</h2>
          <p>{selectedClass} Rankings & Stats</p>
        </div>
        <button className="btn btn-outline" style={{width: 'auto'}} onClick={onCancel}>
          <X size={18} /> Back
        </button>
      </div>

      {loading ? (
        <p>Loading arcade records...</p>
      ) : (
        <div style={{width: '100%', maxWidth: '1000px'}}>
          {students.length === 0 ? (
            <div className="auth-card" style={{textAlign: 'center'}}>
              <p>No students found in {selectedClass} class.</p>
            </div>
          ) : (
            <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem'}}>
              {students.map((s, index) => (
                <div key={s.id} className="auth-card" style={{display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--secondary)', paddingBottom: '1rem'}}>
                    <h3 style={{color: index === 0 ? 'var(--accent)' : 'white', fontSize: '1.5rem', margin: 0}}>
                      #{index + 1} {s.full_name} 
                      {s.display_name && <span style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '1rem'}}>({s.display_name})</span>}
                    </h3>
                    <div style={{fontSize: '2rem', color: 'var(--success)'}}>
                      {s.totalScore} PTS
                    </div>
                  </div>
                  
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', textAlign: 'center'}}>
                    <div style={{background: 'var(--bg-dark)', padding: '1rem', border: '2px solid var(--primary)'}}>
                      <div style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem', fontFamily: "'Press Start 2P', cursive"}}>GAMES</div>
                      <div style={{fontSize: '1.5rem', color: 'white'}}>{s.gamesPlayed}</div>
                    </div>
                    <div style={{background: 'var(--bg-dark)', padding: '1rem', border: '2px solid var(--primary)'}}>
                      <div style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem', fontFamily: "'Press Start 2P', cursive"}}>ACCURACY</div>
                      <div style={{fontSize: '1.5rem', color: 'var(--accent)'}}>{s.accuracy}%</div>
                    </div>
                    <div style={{background: 'var(--bg-dark)', padding: '1rem', border: '2px solid var(--primary)'}}>
                      <div style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem', fontFamily: "'Press Start 2P', cursive"}}>AVG SPEED</div>
                      <div style={{fontSize: '1.5rem', color: 'var(--secondary)'}}>{s.avgSpeed}s</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClassProgress;
