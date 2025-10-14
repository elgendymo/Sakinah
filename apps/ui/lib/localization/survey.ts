export type SurveyLanguage = 'en' | 'ar';

export interface SurveyQuestionTranslations {
  title: string;
  question: string;
}

export interface PageTranslations {
  title: string;
  subtitle: string;
  description?: string;
}

export interface SurveyTranslations {
  // Common UI elements
  common: {
    continue: string;
    back: string;
    next: string;
    submit: string;
    loading: string;
    error: string;
    save: string;
    cancel: string;
    languageToggle: string;
  };

  // Likert scale responses
  likertScale: {
    never: string;
    rarely: string;
    sometimes: string;
    often: string;
    always: string;
  };

  // Page headers and descriptions
  pages: {
    welcome: PageTranslations;
    phase1: PageTranslations;
    phase2: PageTranslations;
    reflection: PageTranslations;
    results: PageTranslations;
  };

  // Survey questions by questionId
  questions: {
    envy: SurveyQuestionTranslations;
    arrogance: SurveyQuestionTranslations;
    selfDeception: SurveyQuestionTranslations;
    lust: SurveyQuestionTranslations;
    anger: SurveyQuestionTranslations;
    malice: SurveyQuestionTranslations;
    backbiting: SurveyQuestionTranslations;
    suspicion: SurveyQuestionTranslations;
    loveOfDunya: SurveyQuestionTranslations;
    laziness: SurveyQuestionTranslations;
    despair: SurveyQuestionTranslations;
  };

  // Reflection page specific
  reflection: {
    strongestStruggle: {
      label: string;
      placeholder: string;
      description: string;
    };
    dailyHabit: {
      label: string;
      placeholder: string;
      description: string;
    };
    preview: {
      title: string;
      subtitle: string;
      showPreview: string;
      hidePreview: string;
    };
    validation: {
      strongestStruggleTooShort: string;
      strongestStruggleTooLong: string;
      strongestStruggleRequired: string;
      dailyHabitTooShort: string;
      dailyHabitTooLong: string;
      dailyHabitRequired: string;
    };
  };

  // Results page specific
  results: {
    title: string;
    subtitle: string;
    tabs: {
      overview: string;
      habits: string;
      plan: string;
    };
    actions: {
      saveJourney: string;
      exportData: string;
      beginPractice: string;
    };
    insights: {
      title: string;
      subtitle: string;
    };
    encouragement: {
      title: string;
      message: string;
    };
  };

  // Auto-save and status messages
  status: {
    saving: string;
    saved: string;
    error: string;
    retrying: string;
  };

  // Navigation messages
  navigation: {
    phaseCompleted: string;
    readyToContinue: string;
    questionsRemaining: string;
    allQuestionsCompleted: string;
  };

  // Validation and error messages
  validation: {
    pleaseCompleteAllQuestions: string;
    questionRequired: string;
    minimumCharacters: string;
    maximumCharacters: string;
  };

  // Spiritual virtues and insights
  virtues: {
    envy: { name: string; description: string; insight: string };
    arrogance: { name: string; description: string; insight: string };
    selfDeception: { name: string; description: string; insight: string };
    lust: { name: string; description: string; insight: string };
    anger: { name: string; description: string; insight: string };
    malice: { name: string; description: string; insight: string };
    backbiting: { name: string; description: string; insight: string };
    suspicion: { name: string; description: string; insight: string };
    loveOfDunya: { name: string; description: string; insight: string };
    laziness: { name: string; description: string; insight: string };
    despair: { name: string; description: string; insight: string };
  };
}

export const surveyTranslations: Record<SurveyLanguage, SurveyTranslations> = {
  en: {
    common: {
      continue: 'Continue',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      loading: 'Loading...',
      error: 'Error',
      save: 'Save',
      cancel: 'Cancel',
      languageToggle: 'عربي'
    },

    likertScale: {
      never: 'Never',
      rarely: 'Rarely',
      sometimes: 'Sometimes',
      often: 'Often',
      always: 'Always'
    },

    pages: {
      welcome: {
        title: 'Welcome to Your Spiritual Journey',
        subtitle: 'A gentle assessment for spiritual growth',
        description: 'This assessment will help you understand your spiritual state and provide personalized guidance for your journey towards Allah.'
      },
      phase1: {
        title: 'Inner Heart Assessment',
        subtitle: 'Reflect honestly on your inner spiritual state. These questions help identify areas for spiritual purification.'
      },
      phase2: {
        title: 'Behavioral Manifestations',
        subtitle: 'Reflect on how inner spiritual conditions manifest in your daily behavior and interactions with others.'
      },
      reflection: {
        title: 'Personal Reflection',
        subtitle: 'Share your deepest reflections to help us create a personalized spiritual growth plan for you.'
      },
      results: {
        title: 'Your Spiritual Journey Insights',
        subtitle: 'Allah has guided you through this reflection. These insights are a gift to help you grow closer to Him.'
      }
    },

    questions: {
      envy: {
        title: 'Envy and Jealousy',
        question: 'How often do you feel envious or jealous when you see others succeed or have things you want?'
      },
      arrogance: {
        title: 'Pride and Arrogance',
        question: 'How often do you feel superior to others or look down on people you consider beneath you?'
      },
      selfDeception: {
        title: 'Self-Deception',
        question: 'How often do you justify your mistakes or wrongdoings instead of acknowledging them honestly?'
      },
      lust: {
        title: 'Inappropriate Desires',
        question: 'How often do you struggle with controlling inappropriate desires or sexual thoughts?'
      },
      anger: {
        title: 'Anger and Irritability',
        question: 'How often do you lose your temper or become angry in your daily interactions?'
      },
      malice: {
        title: 'Hatred and Resentment',
        question: 'How often do you hold grudges or feel lasting resentment toward people who have wronged you?'
      },
      backbiting: {
        title: 'Gossip and Backbiting',
        question: 'How often do you speak negatively about people behind their backs or engage in gossip?'
      },
      suspicion: {
        title: 'Suspicion and Doubt',
        question: 'How often do you assume the worst about others\' intentions or motives without evidence?'
      },
      loveOfDunya: {
        title: 'Attachment to Worldly Things',
        question: 'How often do you find yourself overly focused on material possessions or worldly status?'
      },
      laziness: {
        title: 'Spiritual Laziness',
        question: 'How often do you delay or avoid acts of worship, good deeds, or spiritual practices?'
      },
      despair: {
        title: 'Hopelessness and Despair',
        question: 'How often do you feel hopeless about your spiritual progress or Allah\'s mercy?'
      }
    },

    reflection: {
      strongestStruggle: {
        label: 'What is your strongest spiritual struggle?',
        placeholder: 'Describe the spiritual challenge you find most difficult to overcome...',
        description: 'Be honest and specific. This will help us provide the most relevant guidance for your journey.'
      },
      dailyHabit: {
        label: 'What daily spiritual habit would you most like to develop?',
        placeholder: 'Describe a spiritual practice you would like to make part of your daily routine...',
        description: 'Think of a small, achievable practice that would bring you closer to Allah.'
      },
      preview: {
        title: 'Preview Your Insights',
        subtitle: 'See a preview of your personalized spiritual plan',
        showPreview: 'Show Preview',
        hidePreview: 'Hide Preview'
      },
      validation: {
        strongestStruggleTooShort: 'Strongest struggle description must be at least 10 characters',
        strongestStruggleTooLong: 'Strongest struggle description must be less than 500 characters',
        strongestStruggleRequired: 'Please describe your strongest struggle',
        dailyHabitTooShort: 'Daily habit description must be at least 10 characters',
        dailyHabitTooLong: 'Daily habit description must be less than 300 characters',
        dailyHabitRequired: 'Please describe your desired daily habit'
      }
    },

    results: {
      title: 'Your Spiritual Journey Insights',
      subtitle: 'Complete analysis of your spiritual assessment',
      tabs: {
        overview: 'Your Heart\'s Reflection',
        habits: 'Gentle Practices',
        plan: 'Growth Journey'
      },
      actions: {
        saveJourney: 'Save My Journey',
        exportData: 'Export Data',
        beginPractice: 'Begin My Practice'
      },
      insights: {
        title: 'Spiritual Insights for Your Journey',
        subtitle: 'Gentle wisdom to guide your spiritual growth'
      },
      encouragement: {
        title: 'A Beautiful Beginning',
        message: 'You have taken a profound step in understanding your heart. This is not an ending, but the gentle beginning of a lifelong journey towards Allah.'
      }
    },

    status: {
      saving: 'Saving responses...',
      saved: 'All responses saved',
      error: 'Failed to save - will retry',
      retrying: 'Retrying...'
    },

    navigation: {
      phaseCompleted: 'Phase completed',
      readyToContinue: 'Ready to continue!',
      questionsRemaining: 'questions remaining',
      allQuestionsCompleted: 'All questions completed'
    },

    validation: {
      pleaseCompleteAllQuestions: 'Please complete all questions',
      questionRequired: 'This question is required',
      minimumCharacters: 'Minimum {count} characters required',
      maximumCharacters: 'Maximum {count} characters allowed'
    },

    virtues: {
      envy: {
        name: 'Contentment',
        description: 'Growing in gratitude and appreciation',
        insight: 'Your heart seeks contentment and gratitude for Allah\'s blessings'
      },
      arrogance: {
        name: 'Humility',
        description: 'Cultivating modesty and humbleness',
        insight: 'Growing in humility brings you closer to Allah\'s mercy'
      },
      selfDeception: {
        name: 'Self-Awareness',
        description: 'Developing honest self-reflection',
        insight: 'Honest self-reflection is a gift from Allah for growth'
      },
      lust: {
        name: 'Purity',
        description: 'Strengthening spiritual discipline',
        insight: 'Seeking purity of heart leads to spiritual clarity'
      },
      anger: {
        name: 'Patience',
        description: 'Building forbearance and calm',
        insight: 'Patience is a strength that brings inner peace'
      },
      malice: {
        name: 'Compassion',
        description: 'Growing in forgiveness and kindness',
        insight: 'Forgiveness frees your heart and brings Allah\'s blessings'
      },
      backbiting: {
        name: 'Good Speech',
        description: 'Practicing mindful and positive words',
        insight: 'Kind words are charity that purifies the soul'
      },
      suspicion: {
        name: 'Trust',
        description: 'Building positive thinking and trust',
        insight: 'Thinking well of others reflects your pure heart'
      },
      loveOfDunya: {
        name: 'Spiritual Focus',
        description: 'Growing focus on the Hereafter',
        insight: 'Your heart yearns for the eternal beauty of the Hereafter'
      },
      laziness: {
        name: 'Diligence',
        description: 'Developing consistency and action',
        insight: 'Every small step towards Allah is beloved to Him'
      },
      despair: {
        name: 'Hope',
        description: 'Strengthening faith and optimism',
        insight: 'Allah\'s mercy is infinite, and hope in Him never disappoints'
      }
    }
  },

  ar: {
    common: {
      continue: 'متابعة',
      back: 'رجوع',
      next: 'التالي',
      submit: 'إرسال',
      loading: 'جاري التحميل...',
      error: 'خطأ',
      save: 'حفظ',
      cancel: 'إلغاء',
      languageToggle: 'English'
    },

    likertScale: {
      never: 'أبداً',
      rarely: 'نادراً',
      sometimes: 'أحياناً',
      often: 'غالباً',
      always: 'دائماً'
    },

    pages: {
      welcome: {
        title: 'مرحباً بك في رحلتك الروحية',
        subtitle: 'تقييم لطيف للنمو الروحي',
        description: 'هذا التقييم سيساعدك على فهم حالتك الروحية وتوفير إرشادات شخصية لرحلتك نحو الله.'
      },
      phase1: {
        title: 'تقييم القلب الداخلي',
        subtitle: 'تأمل بصدق في حالتك الروحية الداخلية. هذه الأسئلة تساعد في تحديد المجالات التي تحتاج إلى تطهير روحي.'
      },
      phase2: {
        title: 'المظاهر السلوكية',
        subtitle: 'تأمل في كيف تتجلى الأحوال الروحية الداخلية في سلوكك اليومي وتفاعلاتك مع الآخرين.'
      },
      reflection: {
        title: 'تأمل شخصي',
        subtitle: 'شارك أعمق تأملاتك لمساعدتنا في إنشاء خطة نمو روحي شخصية لك.'
      },
      results: {
        title: 'رؤى رحلتك الروحية',
        subtitle: 'الله قد هداك خلال هذا التأمل. هذه الرؤى هدية لمساعدتك على الاقتراب منه.'
      }
    },

    questions: {
      envy: {
        title: 'الحسد والغيرة',
        question: 'كم مرة تشعر بالحسد أو الغيرة عندما ترى الآخرين ينجحون أو يمتلكون أشياء تريدها؟'
      },
      arrogance: {
        title: 'الكبر والغرور',
        question: 'كم مرة تشعر بالتفوق على الآخرين أو تنظر باستعلاء للأشخاص الذين تعتبرهم أقل منك؟'
      },
      selfDeception: {
        title: 'خداع النفس',
        question: 'كم مرة تبرر أخطاءك أو أفعالك الخاطئة بدلاً من الاعتراف بها بصدق؟'
      },
      lust: {
        title: 'الشهوات المحرمة',
        question: 'كم مرة تجد صعوبة في التحكم في الرغبات غير المناسبة أو الأفكار الجنسية؟'
      },
      anger: {
        title: 'الغضب والانفعال',
        question: 'كم مرة تفقد أعصابك أو تغضب في تفاعلاتك اليومية؟'
      },
      malice: {
        title: 'الحقد والضغينة',
        question: 'كم مرة تحمل الضغائن أو تشعر بالحقد المستمر تجاه الأشخاص الذين أساؤوا إليك؟'
      },
      backbiting: {
        title: 'الغيبة والنميمة',
        question: 'كم مرة تتحدث بالسوء عن الناس في غيابهم أو تشارك في النميمة؟'
      },
      suspicion: {
        title: 'سوء الظن والشك',
        question: 'كم مرة تفترض الأسوأ حول نوايا أو دوافع الآخرين دون دليل؟'
      },
      loveOfDunya: {
        title: 'حب الدنيا والتعلق بها',
        question: 'كم مرة تجد نفسك مهتماً بشكل مفرط بالممتلكات المادية أو المكانة الدنيوية؟'
      },
      laziness: {
        title: 'الكسل الروحي',
        question: 'كم مرة تؤجل أو تتجنب أعمال العبادة أو الأعمال الصالحة أو الممارسات الروحية؟'
      },
      despair: {
        title: 'اليأس والقنوط',
        question: 'كم مرة تشعر باليأس من تقدمك الروحي أو من رحمة الله؟'
      }
    },

    reflection: {
      strongestStruggle: {
        label: 'ما هو أكبر تحدي روحي تواجهه؟',
        placeholder: 'صف التحدي الروحي الذي تجد صعوبة في التغلب عليه...',
        description: 'كن صادقاً ومحدداً. هذا سيساعدنا في تقديم الإرشاد الأكثر صلة برحلتك.'
      },
      dailyHabit: {
        label: 'ما العادة الروحية اليومية التي تود تطويرها أكثر؟',
        placeholder: 'صف ممارسة روحية تود أن تجعلها جزءاً من روتينك اليومي...',
        description: 'فكر في ممارسة صغيرة قابلة للتحقيق تقربك من الله.'
      },
      preview: {
        title: 'معاينة رؤاك',
        subtitle: 'انظر معاينة لخطتك الروحية الشخصية',
        showPreview: 'إظهار المعاينة',
        hidePreview: 'إخفاء المعاينة'
      },
      validation: {
        strongestStruggleTooShort: 'وصف أكبر تحدي يجب أن يكون على الأقل 10 أحرف',
        strongestStruggleTooLong: 'وصف أكبر تحدي يجب أن يكون أقل من 500 حرف',
        strongestStruggleRequired: 'يرجى وصف أكبر تحدي تواجهه',
        dailyHabitTooShort: 'وصف العادة اليومية يجب أن يكون على الأقل 10 أحرف',
        dailyHabitTooLong: 'وصف العادة اليومية يجب أن يكون أقل من 300 حرف',
        dailyHabitRequired: 'يرجى وصف العادة اليومية المرغوبة'
      }
    },

    results: {
      title: 'رؤى رحلتك الروحية',
      subtitle: 'تحليل شامل لتقييمك الروحي',
      tabs: {
        overview: 'انعكاس قلبك',
        habits: 'ممارسات لطيفة',
        plan: 'رحلة النمو'
      },
      actions: {
        saveJourney: 'احفظ رحلتي',
        exportData: 'تصدير البيانات',
        beginPractice: 'ابدأ ممارستي'
      },
      insights: {
        title: 'رؤى روحية لرحلتك',
        subtitle: 'حكمة لطيفة لتوجيه نموك الروحي'
      },
      encouragement: {
        title: 'بداية جميلة',
        message: 'لقد اتخذت خطوة عميقة في فهم قلبك. هذه ليست نهاية، بل بداية لطيفة لرحلة تدوم مدى الحياة نحو الله.'
      }
    },

    status: {
      saving: 'جاري حفظ الإجابات...',
      saved: 'تم حفظ جميع الإجابات',
      error: 'فشل في الحفظ - سيعاد المحاولة',
      retrying: 'جاري إعادة المحاولة...'
    },

    navigation: {
      phaseCompleted: 'تم إكمال المرحلة',
      readyToContinue: 'جاهز للمتابعة!',
      questionsRemaining: 'أسئلة متبقية',
      allQuestionsCompleted: 'تم إكمال جميع الأسئلة'
    },

    validation: {
      pleaseCompleteAllQuestions: 'يرجى إكمال جميع الأسئلة',
      questionRequired: 'هذا السؤال مطلوب',
      minimumCharacters: 'الحد الأدنى {count} أحرف مطلوب',
      maximumCharacters: 'الحد الأقصى {count} حرف مسموح'
    },

    virtues: {
      envy: {
        name: 'القناعة',
        description: 'النمو في الامتنان والتقدير',
        insight: 'قلبك يسعى للقناعة والامتنان لنعم الله'
      },
      arrogance: {
        name: 'التواضع',
        description: 'زراعة التواضع والتواضع',
        insight: 'النمو في التواضع يقربك من رحمة الله'
      },
      selfDeception: {
        name: 'الوعي الذاتي',
        description: 'تطوير التأمل الصادق في الذات',
        insight: 'التأمل الصادق في الذات هدية من الله للنمو'
      },
      lust: {
        name: 'الطهارة',
        description: 'تقوية الانضباط الروحي',
        insight: 'السعي لطهارة القلب يؤدي إلى الوضوح الروحي'
      },
      anger: {
        name: 'الصبر',
        description: 'بناء الصبر والهدوء',
        insight: 'الصبر قوة تجلب السكينة الداخلية'
      },
      malice: {
        name: 'الصفح',
        description: 'النمو في الصفح والطيبة',
        insight: 'الصفح يحرر قلبك ويجلب بركات الله'
      },
      backbiting: {
        name: 'الكلام الطيب',
        description: 'ممارسة الكلمات الواعية والإيجابية',
        insight: 'الكلمات الطيبة صدقة تطهر الروح'
      },
      suspicion: {
        name: 'حسن الظن',
        description: 'بناء التفكير الإيجابي والثقة',
        insight: 'حسن الظن بالآخرين يعكس طهارة قلبك'
      },
      loveOfDunya: {
        name: 'التركيز على الآخرة',
        description: 'النمو في التركيز على الآخرة',
        insight: 'قلبك يشتاق لجمال الآخرة الأبدي'
      },
      laziness: {
        name: 'النشاط',
        description: 'تطوير الثبات والعمل',
        insight: 'كل خطوة صغيرة نحو الله محبوبة إليه'
      },
      despair: {
        name: 'الرجاء',
        description: 'تقوية الإيمان والتفاؤل',
        insight: 'رحمة الله لا حدود لها، والرجاء فيه لا يخيب أبداً'
      }
    }
  }
};

// Utility function to get translation by key
export function getTranslation(language: SurveyLanguage, key: string): string {
  const keys = key.split('.');
  let value: any = surveyTranslations[language];

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback to English if key not found
      value = surveyTranslations.en;
      for (const fallbackKey of keys) {
        if (value && typeof value === 'object' && fallbackKey in value) {
          value = value[fallbackKey];
        } else {
          return key; // Return key if not found in fallback
        }
      }
    }
  }

  return typeof value === 'string' ? value : key;
}