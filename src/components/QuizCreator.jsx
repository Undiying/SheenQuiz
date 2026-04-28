import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, X, CheckCircle2 } from 'lucide-react';

const QuizCreator = ({ profile, selectedClass, onSave, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState([
    { question_text: '', options: ['', '', '', ''], correct_answer: 0, type: 'multiple_choice' }
  ]);
  const [saving, setSaving] = useState(false);

  const addQuestion = () => {
    setQuestions([...questions, { question_text: '', options: ['', '', '', ''], correct_answer: 0, type: 'multiple_choice' }]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestionText = (index, text) => {
    const newQuestions = [...questions];
    newQuestions[index].question_text = text;
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex, oIndex, text) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = text;
    setQuestions(newQuestions);
  };

  const updateQuestionType = (index, type) => {
    const newQuestions = [...questions];
    newQuestions[index].type = type;
    if (type === 'true_false') {
      newQuestions[index].options = ['True', 'False', '', ''];
      if (newQuestions[index].correct_answer > 1) newQuestions[index].correct_answer = 0;
    } else {
      newQuestions[index].options = ['', '', '', ''];
    }
    setQuestions(newQuestions);
  };

  const setCorrectAnswer = (qIndex, oIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].correct_answer = oIndex;
    setQuestions(newQuestions);
  };

  const handleSave = async () => {
    if (!title) return alert('Please enter a quiz title.');
    if (questions.some(q => !q.question_text || q.options.some(o => !o))) {
      return alert('Please fill in all questions and options.');
    }

    setSaving(true);
    try {
      // 1. Get class ID (Scoped to School)
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id')
        .eq('name', selectedClass)
        .eq('school_id', profile.school_id)
        .single();

      if (classError) throw new Error("Class not found in your school.");

      // 2. Insert Quiz
      const { data: quiz, error: qError } = await supabase
        .from('quizzes')
        .insert({
          title,
          description,
          teacher_id: profile.id,
          class_id: classData.id
        })
        .select()
        .single();

      if (qError) throw qError;

      // 3. Insert Questions
      const questionsToInsert = questions.map((q, idx) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        options: q.type === 'true_false' ? ['True', 'False'] : q.options,
        correct_answer: q.correct_answer,
        type: q.type,
        sort_order: idx
      }));

      const { error: qsError } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (qsError) throw qsError;

      onSave();
    } catch (err) {
      alert('Error saving quiz: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="screen animate-in" style={{justifyContent: 'flex-start', padding: '2rem'}}>
      <div className="dashboard-header">
        <div className="user-info">
          <h2>Create New Quiz</h2>
          <p>Class: {selectedClass}</p>
        </div>
        <button className="btn btn-outline" style={{width: 'auto'}} onClick={onCancel}>
          <X size={18} /> Cancel
        </button>
      </div>

      <div className="auth-card" style={{width: '100%', maxWidth: '800px', textAlign: 'left'}}>
        <div className="form-group">
          <label>Quiz Title</label>
          <input type="text" placeholder="e.g. Introduction to Robotics" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Description (Optional)</label>
          <textarea className="form-control" style={{width: '100%', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1rem', color: 'white', minHeight: '80px'}} placeholder="What is this quiz about?" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="questions-list" style={{marginTop: '2rem'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h3>Questions</h3>
            <button className="btn btn-outline btn-sm" style={{width: 'auto'}} onClick={addQuestion}><Plus size={18} /> Add Question</button>
          </div>

          {questions.map((q, qIndex) => (
            <div key={qIndex} className="question-item" style={{background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid var(--glass-border)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                <span style={{fontWeight: 700, color: 'var(--primary)'}}># {qIndex + 1}</span>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(qIndex)} style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer'}}><Trash2 size={18} /></button>
                )}
              </div>
              <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
                <div className="form-group" style={{flex: 1, marginBottom: 0}}>
                  <label>Type</label>
                  <select style={{width: '100%', background: 'var(--bg-dark)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.8rem', color: 'white'}} value={q.type} onChange={(e) => updateQuestionType(qIndex, e.target.value)}>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                  </select>
                </div>
                <div className="form-group" style={{flex: 2, marginBottom: 0}}>
                  <label>Question Text</label>
                  <input type="text" placeholder="Enter question" value={q.question_text} onChange={(e) => updateQuestionText(qIndex, e.target.value)} />
                </div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                {(q.type === 'true_false' ? q.options.slice(0, 2) : q.options).map((opt, oIndex) => (
                  <div key={oIndex} style={{position: 'relative'}}>
                    <input type="text" placeholder={`Option ${oIndex + 1}`} style={{paddingRight: '3rem'}} value={opt} onChange={(e) => updateOption(qIndex, oIndex, e.target.value)} />
                    <button onClick={() => setCorrectAnswer(qIndex, oIndex)} style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: q.correct_answer === oIndex ? 'var(--success)' : 'var(--text-secondary)'}}><CheckCircle2 size={20} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-primary" style={{marginTop: '1rem'}} onClick={handleSave} disabled={saving}><Save size={18} /> {saving ? 'Saving...' : 'Save Quiz'}</button>
      </div>
    </div>
  );
};

export default QuizCreator;
