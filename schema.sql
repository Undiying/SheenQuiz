-- SheenQuiz Database Schema

-- 1. Classes Table
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default classes
INSERT INTO public.classes (name) 
VALUES ('Explorer'), ('Junior'), ('Intro')
ON CONFLICT (name) DO NOTHING;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    display_name TEXT,
    password TEXT, 
    role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
    class_id UUID REFERENCES public.classes(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Quizzes Table
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.profiles(id),
    class_id UUID REFERENCES public.classes(id),
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, 
    correct_answer INTEGER NOT NULL, 
    time_limit INTEGER DEFAULT 20, 
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Game Sessions
CREATE TABLE IF NOT EXISTS public.game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id),
    pin TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'finished')),
    current_question_index INTEGER DEFAULT 0,
    host_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Game Participants
CREATE TABLE IF NOT EXISTS public.game_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.game_sessions(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id),
    score INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_seen TIMESTAMPTZ DEFAULT now()
);

-- 7. Student Responses
CREATE TABLE IF NOT EXISTS public.student_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.game_sessions(id),
    profile_id UUID REFERENCES public.profiles(id),
    question_id UUID REFERENCES public.questions(id),
    chosen_option INTEGER,
    is_correct BOOLEAN,
    time_taken FLOAT,
    created_at TIMESTAMPTZ DEFAULT now()
);
