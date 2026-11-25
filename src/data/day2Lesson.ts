import type { BilingualText } from '../types';

export interface Day2QuizQuestion {
  id: number;
  question: BilingualText;
  options: { en: string[]; rw: string[] };
  correctIndex: number;
  explanation: BilingualText;
}

export interface Day2ExerciseRow {
  id: string;
  situation: BilingualText;
  correctChoice: 'ordinary_rule' | 'ml_supervised' | 'ml_unsupervised' | 'deep_learning';
  explanation: BilingualText;
}

export const DAY2_QUIZ_QUESTIONS: Day2QuizQuestion[] = [
  {
    id: 1,
    question: {
      en: 'How do Artificial Intelligence, Machine Learning, and Deep Learning relate to one another?',
      rw: 'AI, Machine Learning na Deep Learning bihuriye he?'
    },
    options: {
      en: [
        'AI is the broadest field, Machine Learning is a branch of AI, and Deep Learning is a branch of Machine Learning',
        'Deep Learning is the broadest field containing AI inside it',
        'AI, Machine Learning, and Deep Learning are three completely unrelated software tools'
      ],
      rw: [
        'AI ni yo nini cyane, Machine Learning ikaba igice cyayo, naho Deep Learning ikaba igice cya Machine Learning',
        'Deep Learning ni yo irimo AI yose',
        'Ni ibikoresho bitatu bidafite aho bihuriye'
      ]
    },
    correctIndex: 0,
    explanation: {
      en: 'Like three nested circles: AI is the outer circle, Machine Learning sits inside AI, and Deep Learning sits inside Machine Learning.',
      rw: 'Bimeze nk’inziga eshatu zirimo imbere y’izindi: AI hanze, ML hagati, DL imbere.'
    }
  },
  {
    id: 2,
    question: {
      en: 'Does every AI system use machine learning?',
      rw: 'Ese buri sisitemu ya AI ikoresha Machine Learning?'
    },
    options: {
      en: [
        'No — rule-based expert systems and search/planning algorithms can be AI without learning from data',
        'Yes — without neural networks a computer program cannot be called software',
        'Yes — machine learning is required even for a basic calculator'
      ],
      rw: [
        'Oya — hari sisitemu za AI zikoresha amategeko yanditswe n’umuntu zitagombye kwiga ku makuru',
        'Yego — buri porogaramu yose ikoresha neural networks',
        'Yego — na karikilatire ikenera machine learning'
      ]
    },
    correctIndex: 0,
    explanation: {
      en: 'Rule-based systems and planning algorithms belong to AI even when they do not learn statistically from datasets.',
      rw: 'Hari uburyo bwa AI bukoresha amategeko asobanutse butagombye kwigira ku makuru.'
    }
  },
  {
    id: 3,
    question: {
      en: 'In a crop-yield dataset containing Rainfall, Temperature, Fertilizer, and Recorded Yield, what is "Recorded Yield"?',
      rw: 'Mu mbonerahamwe irimo Imvura, Ubushyuhe, Ifumbire n’Umusaruro wabonetse, "Umusaruro wabonetse" ni iki?'
    },
    options: {
      en: ['The Label (target answer)', 'A Feature (input variable)', 'Data leakage'],
      rw: ['Label (igisubizo gishakishwa)', 'Feature (ibimenyetso byinjira)', 'Data leakage']
    },
    correctIndex: 0,
    explanation: {
      en: 'Rainfall, temperature, and fertilizer are Features (inputs); Recorded Yield is the Label the supervised model learns to predict.',
      rw: 'Imvura, ubushyuhe n’ifumbire ni ibyinjira (Features), naho Umusaruro ni cyo gisubizo (Label).'
    }
  },
  {
    id: 4,
    question: {
      en: 'Why do machine-learning projects separate Training, Validation, and Test datasets?',
      rw: 'Kuki mu mushinga wa Machine Learning batandukanya amakuru yo kwigisha (Training), ayo kunoza (Validation) n’ayo kugerageza (Test)?'
    },
    options: {
      en: [
        'To check whether the model generalizes to new unseen examples instead of memorizing training answers',
        'Because spreadsheets cannot hold more than 70 rows',
        'To delete 30% of the data permanently'
      ],
      rw: [
        'Kugira ngo barebe niba sisitemu ibasha gusubiza ibibazo bishya itarafata mu mutwe',
        'Kuko spreadsheets zitabika imirongo irenze 70',
        'Kugira ngo basibe 30% by’amakuru'
      ]
    },
    correctIndex: 0,
    explanation: {
      en: 'Just like an exam with unseen questions, separate test data proves real understanding rather than memorization.',
      rw: 'Nk’ikizamini gifite ibibazo bishya, amakuru yihariye agaragaza ko sisitemu yize neza.'
    }
  },
  {
    id: 5,
    question: {
      en: 'Which task is an example of Supervised Learning?',
      rw: 'Ni ikihe gikorwa kiri mu cyiciro cya Supervised Learning?'
    },
    options: {
      en: [
        'Classifying new emails as Spam or Not Spam after training on labeled email examples',
        'Grouping customers without any predefined group labels',
        'Sending an automatic SMS confirmation after a Google Form submission'
      ],
      rw: [
        'Gushyira imeri mu cyiciro cya Spam cyangwa Imeri nzima nyuma yo kwiga ku ngero zanditseho igisubizo',
        'Gukusanya abakiriya mu matsinda nta bisubizo byabanje gutangwa',
        'Kohereza SMS yemeza iyandikishwa rya Form'
      ]
    },
    correctIndex: 0,
    explanation: {
      en: 'Supervised learning trains on input examples paired with known target labels (Spam vs Not Spam).',
      rw: 'Supervised learning yigira ku ngero zifite ibisubizo byazo bizwi neza.'
    }
  },
  {
    id: 6,
    question: {
      en: 'What does the word "deep" in Deep Learning refer to?',
      rw: 'Ijambo "deep" muri Deep Learning risobanura iki?'
    },
    options: {
      en: [
        'Multiple hidden layers inside the neural network between input and output',
        'Human-like emotional consciousness inside the computer',
        'Storing files deep inside underground servers'
      ],
      rw: [
        'Ibice byinshi (layers) biri hagati y’ibyinjira n’ibisohoka muri neural network',
        'Kuba imashini ifite ubwenge n’amarangamutima nk’ay’umuntu',
        'Kubika amakuru munsi y’ubutaka'
      ]
    },
    correctIndex: 0,
    explanation: {
      en: 'Deep refers strictly to the depth (number of layers) of the computational neural network, not human-level intelligence.',
      rw: 'Rivuga umubare munini w’ibice bikorana muri sisitemu, ntabwo bivuga ubwenge bw’umuntu.'
    }
  },
  {
    id: 7,
    question: {
      en: 'What is "Overfitting" in machine learning?',
      rw: 'Iyo bavuze "Overfitting" muri Machine Learning baba bavuze iki?'
    },
    options: {
      en: [
        'A model memorizes training examples so closely that it performs poorly on new data',
        'A model runs out of battery on a laptop',
        'A model refuses to accept CSV files'
      ],
      rw: [
        'Igihe sisitemu ifata mu mutwe amakuru yigiyeho cyane ku buryo itsindwa ku makuru mashya',
        'Igihe umuriro ushize muri mudasobwa',
        'Igihe idashaka gufungura dosiye ya CSV'
      ]
    },
    correctIndex: 0,
    explanation: {
      en: 'An overfit model scores high on training data but fails to generalize to real-world unseen examples.',
      rw: 'Sisitemu yakoze overfitting itsinda ku myitozo ariko ikananirwa ku bibazo bishya.'
    }
  },
  {
    id: 8,
    question: {
      en: 'What is "Data Leakage"?',
      rw: 'Ni iki kitwa "Data Leakage"?'
    },
    options: {
      en: [
        'Information that would not be available at prediction time accidentally enters training, causing misleadingly high accuracy',
        'Spilling water on a server rack',
        'Using Excel instead of Google Sheets'
      ],
      rw: [
        'Igihe amakuru atabonetse mu gihe cyo gupima yinjira mu myitozo agatuma amanota agaragara nk’aho ari meza cyane kandi atari ukuri',
        'Kumeneka kw’amazi kuri mudasobwa',
        'Gukoresha Excel aho gukoresha Google Sheets'
      ]
    },
    correctIndex: 0,
    explanation: {
      en: 'For example, including post-repayment outcomes when training a loan default predictor gives fake confidence.',
      rw: 'Kwinjiza amakuru y’icyabaye nyuma mu gihe cyo kwigisha sisitemu bituma ibeshya ubushobozi bwayo.'
    }
  },
  {
    id: 9,
    question: {
      en: 'How do modern chatbots like ChatGPT and Gemini relate to deep learning?',
      rw: 'ChatGPT na Gemini bihuriye he na Deep Learning?'
    },
    options: {
      en: [
        'They are generative AI systems built on deep neural-network architectures (Transformers) predicting tokens',
        'They are simple if/else attendance checklists',
        'They cannot generate text without manual human typing behind the scenes'
      ],
      rw: [
        'Ni sisitemu za Generative AI zubatswe kuri deep neural networks (Transformers)',
        'Ni amategeko asanzwe y’ibyanditswe gusa',
        'Zikenera umuntu wandika inyuma buri gisubizo'
      ]
    },
    correctIndex: 0,
    explanation: {
      en: 'LLMs use deep neural networks trained on vast text data—yet fluent outputs can still contain hallucinations and must be verified.',
      rw: 'Zikoresha deep neural networks, ariko ibisubizo byazo biracyakeneye kugenzurwa.'
    }
  },
  {
    id: 10,
    question: {
      en: 'A calculator needs to compute 450 × 25, and a shop needs to send a confirmation SMS after an order. Which is best?',
      rw: 'Karikilatire igomba kubara 450 × 25, naho iduka rikohereza SMS iyo umuntu aguze. Hakoreshwa iki?'
    },
    options: {
      en: [
        'Ordinary software and simple rule-based automation—no AI or machine learning is needed',
        'A multi-layer deep neural network trained for 3 weeks',
        'Unsupervised clustering'
      ],
      rw: [
        'Porogaramu isanzwe n’umuyoboro w’amategeko asobanutse—nta AI ikenewe',
        'Deep neural network imara ibyumweru 3 yiga',
        'Unsupervised clustering'
      ]
    },
    correctIndex: 0,
    explanation: {
      en: 'Start with the problem, not the hype. Rule-based software is cheaper, exact, and more reliable when rules are fixed.',
      rw: 'Tangira wumva ikibazo mbere yo guhitamo AI. Porogaramu isanzwe irizewe kandi irahendutse igihe amategeko adahinduka.'
    }
  }
];

export const DAY2_CLASSIFIER_EXERCISE: Day2ExerciseRow[] = [
  {
    id: 'sms-absent',
    situation: {
      en: 'A school sends an SMS automatically whenever a student is marked absent.',
      rw: 'Ishuri ryohereza SMS mu buryo bwikoresha igihe umunyeshuri yasibye.'
    },
    correctChoice: 'ordinary_rule',
    explanation: {
      en: 'Rule-based automation: clear fixed trigger ("marked absent") and fixed action ("send SMS"). No learning required.',
      rw: 'Ni umuyoboro w’amategeko asanzwe (Trigger -> Action). Nta AI ikenewe.'
    }
  },
  {
    id: 'shop-sales',
    situation: {
      en: 'A shop wants to predict which products may sell more next month using 3 years of historical sales.',
      rw: 'Iduka rishaka guhanura ibicuruzwa bizagurwa cyane mu kwezi gutaha rishingiye ku makuru y’imyaka 3.'
    },
    correctChoice: 'ml_supervised',
    explanation: {
      en: 'Supervised Machine Learning (regression/forecasting): learns patterns from historical features and recorded sales labels.',
      rw: 'Supervised Machine Learning: yiga imiterere ivuye ku makuru y’ibyacurujwe mbere.'
    }
  },
  {
    id: 'cat-dog',
    situation: {
      en: 'A computer must identify whether a photograph contains a cat or a dog.',
      rw: 'Mudasobwa igomba kumenya niba ifoto irimo injangwe cyangwa imbwa.'
    },
    correctChoice: 'deep_learning',
    explanation: {
      en: 'Deep Learning: multi-layer convolutional neural networks excel at complex pixel and visual texture recognition.',
      rw: 'Deep Learning: ikora neza mu gusesengura amashusho n’amafoto.'
    }
  },
  {
    id: 'group-customers',
    situation: {
      en: 'A business wants to discover natural groups of customers based on purchasing behavior without predefined labels.',
      rw: 'Ikigo gishaka kubona amatsinda y’abakiriya gishingiye ku buryo bagura nta bisubizo byatanzwe mbere.'
    },
    correctChoice: 'ml_unsupervised',
    explanation: {
      en: 'Unsupervised Machine Learning (clustering): finds similarities across unlabeled purchase records for human review.',
      rw: 'Unsupervised Machine Learning: ishakisha amatsinda mu makuru adafite ibisubizo byatanzwe.'
    }
  },
  {
    id: 'calc-math',
    situation: {
      en: 'A calculator must compute 450 × 25 accurately every single time.',
      rw: 'Karikilatire igomba kubara 450 × 25 neza buri gihe.'
    },
    correctChoice: 'ordinary_rule',
    explanation: {
      en: 'Ordinary deterministic software (no AI at all): exact arithmetic needs zero statistical guessing.',
      rw: 'Porogaramu isanzwe idakoresha AI: imibare isaba ukuri kudashidikanywaho.'
    }
  }
];
