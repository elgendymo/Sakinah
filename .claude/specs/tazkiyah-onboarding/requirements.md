# Requirements Document

## Introduction

This feature replaces the current magic link authentication system with a streamlined email/password signup and onboarding flow centered around the Tazkiyah Discovery Survey or in arabic (استبيان قراءة النفس). The system will guide new users through a structured spiritual self-assessment process while maintaining minimal PII collection (first name and gender only). The onboarding experience uses a multi-phase survey design with bilingual support, visual progress tracking, and personalized results that integrate with the existing Sakinah platform's spiritual development features.

## Requirements

### Requirement 1: Authentication System Refactor

**User Story:** As a new user, I want to sign up with email and password instead of magic links, so that I have a more familiar and immediate registration experience.

#### Acceptance Criteria

1. WHEN a user visits the signup page THEN the system SHALL display First name, Gender, email and password input fields
2. WHEN a user enters a valid email and password THEN the system SHALL create an account and authenticate the user
3. WHEN a user enters an invalid email format THEN the system SHALL display a validation error message
4. WHEN a user enters a password shorter than 8 characters THEN the system SHALL display a password requirement error
5. IF a user tries to register with an existing email THEN the system SHALL display an appropriate error message
6. WHEN user registration is successful THEN the system SHALL redirect to the welcome phase of the Tazkiyah survey
7. Gender Field is not input rater choosing between two options Male or Female 

### Requirement 2: Minimal PII Data Collection

**User Story:** As a privacy-conscious user, I want the system to collect only essential personal information, so that my data privacy is protected while still enabling personalized spiritual guidance.

#### Acceptance Criteria

1. WHEN a user registers THEN the system SHALL only collect first name and gender
2. WHEN storing user data THEN the system SHALL NOT store email addresses beyond authentication requirements
3. WHEN a user provides their first name THEN the system SHALL validate it contains only alphabetic characters and spaces
4. WHEN a user selects gender THEN the system SHALL provide options: Male, Female, or Prefer not to say
5. IF a user skips the first name field THEN the system SHALL still allow registration to proceed
6. WHEN user data is stored THEN the system SHALL use the existing centralized database patterns

### Requirement 3: Multi-Phase Survey Structure

**User Story:** As a user seeking spiritual development, I want to complete a structured assessment in manageable phases, so that I can provide thoughtful responses without feeling overwhelmed.

#### Acceptance Criteria

1. WHEN a user starts the survey THEN the system SHALL present exactly 4 phases: Welcome, Phase 1 (Q1-Q4), Phase 2 (Q5-Q11), and Reflection & Results
2. WHEN a user completes Phase 1 THEN the system SHALL automatically advance to Phase 2
3. WHEN a user completes Phase 2 THEN the system SHALL advance to the Reflection phase
4. WHEN a user completes Reflection THEN the system SHALL advance to Results
5. IF a user attempts to skip phases THEN the system SHALL prevent progression and redirect to the current incomplete phase
6. WHEN displaying any phase THEN the system SHALL show a progress indicator with current step and percentage completion

### Requirement 4: Welcome Phase Implementation

**User Story:** As a new user, I want a clear short introduction to the survey's purpose that it will be used for the tazkyah and habit plans.

#### Acceptance Criteria

1. WHEN a user enters the welcome phase THEN the system SHALL display the app's purpose and survey overview
2. WHEN the welcome screen loads THEN the system SHALL display a progress indicator showing step 1 of 4
3. WHEN a user clicks continue THEN the system SHALL advance to Phase 1 of the survey


### Requirement 5: Phase 1 - Inner Heart Diseases Assessment

**User Story:** As a user beginning spiritual self-assessment, I want to evaluate my relationship with inner spiritual diseases (envy, arrogance, self-deception, lust), so that I can gain insight into areas needing spiritual attention.

#### Acceptance Criteria

1. WHEN Phase 1 loads THEN the system SHALL present exactly 4 questions covering envy, arrogance, self-deception, and lust
2. WHEN displaying each question THEN the system SHALL show bilingual text (English and Arabic) with collapsible display options
3. WHEN a user responds to a question THEN the system SHALL provide a 5-point Likert scale (1=Never, 2=Rarely, 3=Sometimes, 4=Often, 5=Always)
4. WHEN a user selects a rating THEN the system SHALL provide visual indicators for the selection
5. WHEN a question is answered THEN the system SHALL provide an optional text field for personal notes
6. WHEN any answer is provided THEN the system SHALL auto-save the response immediately
7. WHEN Phase 1 is completed THEN the system SHALL update progress to 50%

### Requirement 6: Phase 2 - Behavioral Manifestations Assessment

**User Story:** As a user continuing the assessment, I want to evaluate behavioral manifestations of spiritual challenges (anger, malice, backbiting, etc.), so that I can understand how inner conditions affect my outward actions.

#### Acceptance Criteria

1. WHEN Phase 2 loads THEN the system SHALL present exactly 7 questions covering anger, malice, backbiting, suspicion, love of dunya, laziness, and despair
2. WHEN displaying Phase 2 questions THEN the system SHALL group related themes together for logical flow
3. WHEN a user responds to any Phase 2 question THEN the system SHALL use the same 5-point Likert scale as Phase 1
4. WHEN Phase 2 questions are displayed THEN the system SHALL maintain the same bilingual card format as Phase 1
5. WHEN any Phase 2 answer is provided THEN the system SHALL auto-save the response immediately
6. WHEN Phase 2 is completed THEN the system SHALL update progress to 75%
7. WHEN all Phase 2 questions are answered THEN the system SHALL enable advancement to Reflection phase

### Requirement 7: Reflection Phase Implementation

**User Story:** As a user completing the assessment, I want to provide deeper reflection on my strongest struggles and daily habits, so that I can receive more personalized guidance and recommendations.

#### Acceptance Criteria

1. WHEN the Reflection phase loads THEN the system SHALL present exactly 2 open-response questions
2. WHEN displaying reflection questions THEN the system SHALL ask about "strongest struggle" and "daily habit you want to develop"
3. WHEN a user types in reflection fields THEN the system SHALL enforce a minimum of 10 characters and maximum of 500 characters
4. WHEN reflection text is entered THEN the system SHALL auto-save responses
5. WHEN reflection is complete THEN the system SHALL show an AI-powered initial analysis preview(for now make it simple personlized habit todo list and takhlya and ta7lya fields based on the result action points to focus on)
6. WHEN reflection is submitted THEN the system SHALL update progress to 100%
7. IF reflection questions are incomplete THEN the system SHALL prevent advancement to results

### Requirement 8: Results Dashboard and Analysis

**User Story:** As a user who has completed the assessment, I want to see visual representations of my spiritual assessment and receive personalized recommendations, so that I can understand my results and take actionable steps for improvement.

#### Acceptance Criteria

1. WHEN results are generated THEN the system SHALL display a visual disease mapping using a radar chart
2. WHEN displaying results THEN the system SHALL categorize diseases into high risk (scores 4-5), moderate risk (score 3), and strengths (scores 1-2)
3. WHEN results show high scores THEN the system SHALL provide Takhliyah (removal) recommendations
4. WHEN results show low scores THEN the system SHALL provide Taḥliyah (virtue cultivation) recommendations
5. WHEN results are displayed THEN the system SHALL include personalized habit suggestions based on reflection responses
6. WHEN results are complete THEN the system SHALL provide export options for PDF and JSON formats
7. WHEN results are saved THEN the system SHALL integrate with existing user spiritual development tracking

### Requirement 9: Visual Design and User Experience

**User Story:** As a user engaging with Islamic spiritual content, I want an aesthetically pleasing and culturally appropriate interface with smooth interactions, so that my spiritual assessment feels meaningful and engaging.

#### Acceptance Criteria

1. WHEN any survey page loads THEN the system SHALL use Islamic design principles and visual elements
2. WHEN questions are displayed THEN the system SHALL present them as visually appealing cards
3. WHEN users interact with elements THEN the system SHALL provide smooth animations and transitions
4. WHEN displaying progress THEN the system SHALL use clear visual progress bars and step indicators
5. WHEN content is in Arabic THEN the system SHALL properly support RTL (right-to-left) text direction
6. WHEN survey psychology best practices are applied THEN the system SHALL implement optimal spacing, colors, and typography
7. WHEN users navigate between sections THEN the system SHALL provide clear navigation buttons and labels

### Requirement 10: Data Persistence and State Management

**User Story:** As a user taking the survey, I want my progress to be automatically saved so that I can continue from where I left off if I need to take a break or if something interrupts my session.

#### Acceptance Criteria

1. WHEN any survey response is provided THEN the system SHALL immediately save to localStorage as backup
2. WHEN a user returns to an incomplete survey THEN the system SHALL resume from the last completed phase
3. WHEN survey data is saved THEN the system SHALL use the existing centralized Success Response Helper
4. WHEN errors occur during saving THEN the system SHALL use the centralized Error Handling System with appropriate error codes
5. WHEN survey actions are performed THEN the system SHALL log activities using the Structured Logging system with traceId
6. WHEN user completes the survey THEN the system SHALL persist all data to the main database
7. IF a user's session expires THEN the system SHALL retain their progress and allow them to continue after re-authentication

### Requirement 11: Integration with Existing Systems

**User Story:** As a platform user, I want the new onboarding survey to seamlessly integrate with existing Sakinah features, so that my spiritual development journey continues smoothly after onboarding.

#### Acceptance Criteria

1. WHEN survey results are generated THEN the system SHALL use the existing AI recommendation engine
2. WHEN API calls are made THEN the system SHALL use the standardized createSuccessResponse format
3. WHEN errors occur THEN the system SHALL use createAppError with appropriate ErrorCode values
4. WHEN logging survey events THEN the system SHALL use the existing logger.info and logger.error patterns
5. WHEN survey is completed THEN the system SHALL connect results to the user's Tazkiyah plan creation workflow
6. WHEN user data is created THEN the system SHALL follow existing database schema and repository patterns
7. WHEN survey generates recommendations THEN the system SHALL integrate with existing content snippet and habit suggestion systems