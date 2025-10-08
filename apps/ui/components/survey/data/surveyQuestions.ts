import type { SurveyQuestion } from '../types';

export const surveyQuestions: SurveyQuestion[] = [
  // Phase 1: Inner Heart Diseases (4 questions)
  {
    id: 'q1',
    questionId: 'envy',
    titleEn: 'Envy and Jealousy',
    titleAr: 'الحسد والغيرة',
    questionEn: 'How often do you feel envious or jealous when you see others succeed or have things you want?',
    questionAr: 'كم مرة تشعر بالحسد أو الغيرة عندما ترى الآخرين ينجحون أو يمتلكون أشياء تريدها؟',
    disease: 'envy',
    phase: 1,
    category: 'inner',
    order: 1
  },
  {
    id: 'q2',
    questionId: 'arrogance',
    titleEn: 'Pride and Arrogance',
    titleAr: 'الكبر والغرور',
    questionEn: 'How often do you feel superior to others or look down on people you consider beneath you?',
    questionAr: 'كم مرة تشعر بالتفوق على الآخرين أو تنظر باستعلاء للأشخاص الذين تعتبرهم أقل منك؟',
    disease: 'arrogance',
    phase: 1,
    category: 'inner',
    order: 2
  },
  {
    id: 'q3',
    questionId: 'selfDeception',
    titleEn: 'Self-Deception',
    titleAr: 'خداع النفس',
    questionEn: 'How often do you justify your mistakes or wrongdoings instead of acknowledging them honestly?',
    questionAr: 'كم مرة تبرر أخطاءك أو أفعالك الخاطئة بدلاً من الاعتراف بها بصدق؟',
    disease: 'selfDeception',
    phase: 1,
    category: 'inner',
    order: 3
  },
  {
    id: 'q4',
    questionId: 'lust',
    titleEn: 'Inappropriate Desires',
    titleAr: 'الشهوات المحرمة',
    questionEn: 'How often do you struggle with controlling inappropriate desires or sexual thoughts?',
    questionAr: 'كم مرة تجد صعوبة في التحكم في الرغبات غير المناسبة أو الأفكار الجنسية؟',
    disease: 'lust',
    phase: 1,
    category: 'inner',
    order: 4
  },

  // Phase 2: Behavioral Manifestations (7 questions)
  {
    id: 'q5',
    questionId: 'anger',
    titleEn: 'Anger and Irritability',
    titleAr: 'الغضب والانفعال',
    questionEn: 'How often do you lose your temper or become angry in your daily interactions?',
    questionAr: 'كم مرة تفقد أعصابك أو تغضب في تفاعلاتك اليومية؟',
    disease: 'anger',
    phase: 2,
    category: 'behavioral',
    order: 5
  },
  {
    id: 'q6',
    questionId: 'malice',
    titleEn: 'Hatred and Resentment',
    titleAr: 'الحقد والضغينة',
    questionEn: 'How often do you hold grudges or feel lasting resentment toward people who have wronged you?',
    questionAr: 'كم مرة تحمل الضغائن أو تشعر بالحقد المستمر تجاه الأشخاص الذين أساؤوا إليك؟',
    disease: 'malice',
    phase: 2,
    category: 'behavioral',
    order: 6
  },
  {
    id: 'q7',
    questionId: 'backbiting',
    titleEn: 'Gossip and Backbiting',
    titleAr: 'الغيبة والنميمة',
    questionEn: 'How often do you speak negatively about people behind their backs or engage in gossip?',
    questionAr: 'كم مرة تتحدث بالسوء عن الناس في غيابهم أو تشارك في النميمة؟',
    disease: 'backbiting',
    phase: 2,
    category: 'behavioral',
    order: 7
  },
  {
    id: 'q8',
    questionId: 'suspicion',
    titleEn: 'Suspicion and Doubt',
    titleAr: 'سوء الظن والشك',
    questionEn: 'How often do you assume the worst about others\' intentions or motives without evidence?',
    questionAr: 'كم مرة تفترض الأسوأ حول نوايا أو دوافع الآخرين دون دليل؟',
    disease: 'suspicion',
    phase: 2,
    category: 'behavioral',
    order: 8
  },
  {
    id: 'q9',
    questionId: 'loveOfDunya',
    titleEn: 'Attachment to Worldly Things',
    titleAr: 'حب الدنيا والتعلق بها',
    questionEn: 'How often do you find yourself overly focused on material possessions or worldly status?',
    questionAr: 'كم مرة تجد نفسك مهتماً بشكل مفرط بالممتلكات المادية أو المكانة الدنيوية؟',
    disease: 'loveOfDunya',
    phase: 2,
    category: 'behavioral',
    order: 9
  },
  {
    id: 'q10',
    questionId: 'laziness',
    titleEn: 'Spiritual Laziness',
    titleAr: 'الكسل الروحي',
    questionEn: 'How often do you delay or avoid acts of worship, good deeds, or spiritual practices?',
    questionAr: 'كم مرة تؤجل أو تتجنب أعمال العبادة أو الأعمال الصالحة أو الممارسات الروحية؟',
    disease: 'laziness',
    phase: 2,
    category: 'behavioral',
    order: 10
  },
  {
    id: 'q11',
    questionId: 'despair',
    titleEn: 'Hopelessness and Despair',
    titleAr: 'اليأس والقنوط',
    questionEn: 'How often do you feel hopeless about your spiritual progress or Allah\'s mercy?',
    questionAr: 'كم مرة تشعر باليأس من تقدمك الروحي أو من رحمة الله؟',
    disease: 'despair',
    phase: 2,
    category: 'behavioral',
    order: 11
  }
];

// Helper functions for working with survey questions
export const getQuestionsByPhase = (phase: 1 | 2): SurveyQuestion[] => {
  return surveyQuestions.filter(q => q.phase === phase).sort((a, b) => a.order - b.order);
};

export const getQuestionById = (questionId: string): SurveyQuestion | undefined => {
  return surveyQuestions.find(q => q.questionId === questionId);
};

export const getQuestionByOrder = (order: number): SurveyQuestion | undefined => {
  return surveyQuestions.find(q => q.order === order);
};

export const getTotalQuestions = (): number => {
  return surveyQuestions.length;
};

export const getPhaseProgress = (phase: 1 | 2, completedQuestions: string[]): number => {
  const phaseQuestions = getQuestionsByPhase(phase);
  const completedInPhase = phaseQuestions.filter(q =>
    completedQuestions.includes(q.questionId)
  ).length;

  return phaseQuestions.length > 0 ? (completedInPhase / phaseQuestions.length) * 100 : 0;
};

export const getOverallProgress = (completedQuestions: string[]): number => {
  const totalQuestions = getTotalQuestions();
  return totalQuestions > 0 ? (completedQuestions.length / totalQuestions) * 100 : 0;
};