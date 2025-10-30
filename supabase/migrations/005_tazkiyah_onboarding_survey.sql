-- Tazkiyah Onboarding Survey Schema
-- This migration adds the survey system for spiritual self-assessment

-- Update users table with minimal PII fields collected during signup
ALTER TABLE users
ADD COLUMN first_name VARCHAR(100),
ADD COLUMN gender VARCHAR(20) CHECK (gender IN ('male', 'female'));

-- Survey responses table - stores individual question responses
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL CHECK (phase_number BETWEEN 1 AND 3),
    question_id VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    note TEXT,
    completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    UNIQUE(user_id, phase_number, question_id)
);

-- Survey results table - stores final analysis and recommendations
CREATE TABLE survey_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    disease_scores JSONB NOT NULL, -- {envy: 4, arrogance: 2, ...}
    critical_diseases JSONB NOT NULL, -- List of diseases with scores 4-5 for Tazkiyah plan
    reflection_answers JSONB NOT NULL, -- {strongestStruggle: "...", dailyHabit: "..."}
    personalized_habits JSONB NOT NULL, -- Auto-generated habit todo list based on survey
    tazkiyah_plan JSONB NOT NULL, -- Spiritual development plan for critical diseases
    radar_chart_data JSONB, -- Chart visualization data
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Survey progress table - tracks user progression through survey phases
CREATE TABLE survey_progress (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_phase INTEGER NOT NULL DEFAULT 0 CHECK (current_phase BETWEEN 0 AND 4),
    phase_1_completed BOOLEAN DEFAULT FALSE,
    phase_2_completed BOOLEAN DEFAULT FALSE,
    reflection_completed BOOLEAN DEFAULT FALSE,
    results_generated BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_survey_responses_user_phase ON survey_responses(user_id, phase_number);
CREATE INDEX idx_survey_responses_question ON survey_responses(question_id);
CREATE INDEX idx_survey_results_user ON survey_results(user_id);
CREATE INDEX idx_survey_progress_user ON survey_progress(user_id);
CREATE INDEX idx_survey_progress_phase ON survey_progress(current_phase);

-- Enable RLS for survey tables
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only manage their own survey data
CREATE POLICY "Users can manage own survey responses" ON survey_responses
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own survey results" ON survey_results
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own survey progress" ON survey_progress
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically update survey_progress.last_updated
CREATE OR REPLACE FUNCTION update_survey_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamp
CREATE TRIGGER trigger_update_survey_progress_timestamp
    BEFORE UPDATE ON survey_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_survey_progress_timestamp();

-- Function to automatically update survey_results.updated_at
CREATE OR REPLACE FUNCTION update_survey_results_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamp
CREATE TRIGGER trigger_update_survey_results_timestamp
    BEFORE UPDATE ON survey_results
    FOR EACH ROW
    EXECUTE FUNCTION update_survey_results_timestamp();