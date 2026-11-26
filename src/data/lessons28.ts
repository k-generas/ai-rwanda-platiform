import type { LessonContent, WeeklyAssessment } from '../types';

interface DayOutline {
  day: number;
  week: number;
  isSample?: boolean;
  titleEn: string;
  titleRw: string;
  deliverableEn: string;
  deliverableRw: string;
  resourceTitleEn: string;
  resourceTitleRw: string;
  tools: string[];
  levelTag: string;
}

const DAY_OUTLINES: DayOutline[] = [
  // Week 1 — AI Foundations
  { day: 1, week: 1, isSample: true, titleEn: 'Introduction to Artificial Intelligence', titleRw: 'Intangiriro ku Bwenge Bwubatswe (AI)', deliverableEn: 'Personal AI application worksheet', deliverableRw: 'Urupapuro rw’aho AI ikoreshwa mu buzima busanzwe', resourceTitleEn: 'Day 1 Personal AI Worksheet', resourceTitleRw: 'Urupapuro rw’Umunsi wa 1', tools: ['ChatGPT', 'Google Gemini'], levelTag: 'Level 1' },
  { day: 2, week: 1, isSample: true, titleEn: 'AI vs Machine Learning vs Deep Learning', titleRw: 'AI vs Machine Learning vs Deep Learning', deliverableEn: 'AI concepts comparison exercise', deliverableRw: 'Umwitozo wo kugereranya ibyiciro bya AI', resourceTitleEn: 'AI Taxonomy Comparison Sheet', resourceTitleRw: 'Imbonerahamwe yo Kugereranya AI', tools: ['Teachable Machine', 'Google Gemini'], levelTag: 'Level 1' },
  { day: 3, week: 1, titleEn: 'Generative AI and Large Language Models', titleRw: 'Generative AI na Large Language Models (LLMs)', deliverableEn: 'AI model comparison worksheet', deliverableRw: 'Urupapuro rugereranya ibisubizo bya AI ebyiri', resourceTitleEn: 'LLM Output Comparison Log', resourceTitleRw: 'Urupapuro rwo Kugereranya Models', tools: ['ChatGPT', 'Google Gemini'], levelTag: 'Level 1' },
  { day: 4, week: 1, titleEn: 'How AI Generates Responses', titleRw: 'Uko AI Itanga Ibisubizo', deliverableEn: 'AI response experiment report', deliverableRw: 'Raporo y’igerageza ry’uko imiterere ihindura igisubizo', resourceTitleEn: 'Context & Token Experiment Sheet', resourceTitleRw: 'Urupapuro rw’Igerageza rya Context', tools: ['ChatGPT'], levelTag: 'Level 1' },
  { day: 5, week: 1, titleEn: 'Hallucinations, Bias and Fact-Checking', titleRw: 'Amakosa ya AI (Hallucinations), Kubogama n’Igenzura', deliverableEn: 'AI fact-checking report', deliverableRw: 'Raporo yo kugenzura ukuri kw’amakuru ya AI', resourceTitleEn: 'Fact-Checking & Source Log', resourceTitleRw: 'Inyandiko yo Kugenzura Ukuri', tools: ['NotebookLM', 'Google Gemini'], levelTag: 'Level 1' },
  { day: 6, week: 1, titleEn: 'Responsible AI, Privacy and Ethics', titleRw: 'Gukoresha AI neza, Ibanga n’Amategeko', deliverableEn: 'Responsible AI checklist', deliverableRw: 'Urutonde rwo gukoresha AI mu buryo buboneye', resourceTitleEn: 'Law No. 058/2021 Privacy Checklist', resourceTitleRw: 'Urutonde rw’Umutekano w’Amakuru', tools: ['Google Gemini'], levelTag: 'Level 1' },
  { day: 7, week: 1, titleEn: 'Weekly Assessment 01', titleRw: 'Isuzuma ry’Icyumweru cya 1', deliverableEn: 'Completed Week 1 assessment (5% weight)', deliverableRw: 'Isuzuma ry’Icyumweru cya 1 ryuzuye (5%)', resourceTitleEn: 'Week 1 Revision & Marking Guide', resourceTitleRw: 'Inshamake y’Isuzuma rya 1', tools: ['Platform Quiz'], levelTag: 'Level 1' },

  // Week 2 — Prompt Engineering
  { day: 8, week: 2, isSample: true, titleEn: 'Introduction to Prompt Engineering', titleRw: 'Intangiriro ku Kwandika Amabwiriza (Prompts)', deliverableEn: 'Prompt improvement worksheet (5 prompts improved)', deliverableRw: 'Urupapuro rwo kunoza amabwiriza 5 atari meza', resourceTitleEn: 'Before & After Prompt Worksheet', resourceTitleRw: 'Urupapuro rwo Kunoza Amabwiriza', tools: ['ChatGPT', 'Google Gemini'], levelTag: 'Level 2' },
  { day: 9, week: 2, titleEn: 'Anatomy of a Good Prompt', titleRw: 'Ibice Bigize Ibwiriza Ritanga Igisubizo Cyiza', deliverableEn: 'Reusable prompt template', deliverableRw: 'Ibwiriza fatizo rikoreshwa kenshi', resourceTitleEn: 'Structured Prompt Anatomy Sheet', resourceTitleRw: 'Imiterere y’Ibwiriza Ryuzuye', tools: ['ChatGPT', 'Google Gemini'], levelTag: 'Level 2' },
  { day: 10, week: 2, titleEn: 'Advanced Prompting Techniques', titleRw: 'Uburyo Bwisumbuye bwo Kwandika Amabwiriza', deliverableEn: 'Advanced prompt collection (zero-shot, few-shot, JSON/tables)', deliverableRw: 'Ububiko bw’amabwiriza arimo ingero n’imbonerahamwe', resourceTitleEn: 'Few-Shot & Structured Output Guide', resourceTitleRw: 'Urupapuro rwa Few-Shot na JSON', tools: ['ChatGPT'], levelTag: 'Level 2' },
  { day: 11, week: 2, titleEn: 'AI Research and Document Analysis', titleRw: 'AI mu Bushakashatsi no Gusesengura Inyandiko', deliverableEn: 'Document analysis report', deliverableRw: 'Raporo yo gusesengura inyandiko ifite aho ikomoka', resourceTitleEn: 'Document Analysis & Citation Sheet', resourceTitleRw: 'Urupapuro rwo Gusesengura Inyandiko', tools: ['NotebookLM', 'Google Gemini'], levelTag: 'Level 2' },
  { day: 12, week: 2, titleEn: 'AI for Writing, Communication and Productivity', titleRw: 'AI mu Kwandika, Itumanaho no Kongera Umusaruro', deliverableEn: 'Personal productivity prompt toolkit', deliverableRw: 'Ibikoresho by’amabwiriza byongera umusaruro', resourceTitleEn: 'Bilingual Writing & Editing Prompts', resourceTitleRw: 'Amabwiriza yo Kwandika neza', tools: ['ChatGPT', 'Google Docs'], levelTag: 'Level 2' },
  { day: 13, week: 2, titleEn: 'Prompt Chaining and Reusable Prompt Systems', titleRw: 'Kujyanisha Amabwiriza n’Ububiko Bwayo', deliverableEn: 'Reusable prompt workflow (3-stage chain)', deliverableRw: 'Uruhererekane rw’amabwiriza atatu yikoresha', resourceTitleEn: '3-Stage Prompt Chaining Canvas', resourceTitleRw: 'Igishushanyo cyo Kujyanisha Amabwiriza', tools: ['ChatGPT', 'Google Sheets'], levelTag: 'Level 2' },
  { day: 14, week: 2, titleEn: 'Weekly Assessment 02', titleRw: 'Isuzuma ry’Icyumweru cya 2', deliverableEn: 'Personal prompt library with at least 10 tested prompts (15% weight)', deliverableRw: 'Ububiko burimo nibura amabwiriza 10 yageragejwe (15%)', resourceTitleEn: 'Prompt Library Template & Rubric', resourceTitleRw: 'Urupapuro rw’Ububiko bw’Amabwiriza', tools: ['Platform Quiz', 'Google Sheets'], levelTag: 'Level 2' },

  // Week 3 — Workflow Thinking and No-Code Automation
  { day: 15, week: 3, isSample: true, titleEn: 'Introduction to Automation', titleRw: 'Intangiriro ku Koroshya Imirimo (Automation)', deliverableEn: 'Automation opportunity worksheet', deliverableRw: 'Urupapuro rw’imirimo 5 ishobora gukorwa mu buryo bwikoresha', resourceTitleEn: 'Automation Opportunity Worksheet', resourceTitleRw: 'Urupapuro rw’Imirimo Yoroshwa', tools: ['Make', 'Zapier'], levelTag: 'Level 3' },
  { day: 16, week: 3, titleEn: 'Workflow Mapping and Process Design', titleRw: 'Gushushanya Imiyoboro n’Imikorere y’Akazi', deliverableEn: 'Workflow diagram (registration process map)', deliverableRw: 'Igishushanyo cy’inzira yo kwiyandikisha', resourceTitleEn: 'Workflow Mapping & Decision Sheet', resourceTitleRw: 'Igishushanyo cy’Inzira y’Akazi', tools: ['Google Sheets'], levelTag: 'Level 3' },
  { day: 17, week: 3, titleEn: 'Introduction to Automation Platforms', titleRw: 'Porogaramu Zikoresha Imiyoboro (Make, Zapier, n8n)', deliverableEn: 'Automation platform comparison', deliverableRw: 'Igereranya rya Make, Zapier na n8n ku buntu', resourceTitleEn: 'Make vs Zapier vs n8n Comparison', resourceTitleRw: 'Igereranya rya Porogaramu', tools: ['Make', 'Zapier', 'n8n'], levelTag: 'Level 4' },
  { day: 18, week: 3, titleEn: 'Connecting Applications and Mapping Data', titleRw: 'Guhuza Porogaramu n’Amakuru', deliverableEn: 'Data mapping worksheet', deliverableRw: 'Urupapuro rwo guhuza ibyinjira n’inkingi z’amakuru', resourceTitleEn: 'Data Mapping & JSON Guide', resourceTitleRw: 'Urupapuro rwo Guhuza Amakuru', tools: ['Google Forms', 'Google Sheets', 'Make'], levelTag: 'Level 4' },
  { day: 19, week: 3, titleEn: 'Build a Form-to-Spreadsheet-to-Email Workflow', titleRw: 'Kubaka Umuyoboro wa Form → Spreadsheet → Email', deliverableEn: 'Working registration automation', deliverableRw: 'Umuyoboro ukora wo kwiyandikisha wohereza na Email', resourceTitleEn: 'Registration Workflow Lab Guide', resourceTitleRw: 'Amabwiriza ya Form → Sheets → Email', tools: ['Google Forms', 'Google Sheets', 'Make', 'Google Apps Script'], levelTag: 'Level 4' },
  { day: 20, week: 3, titleEn: 'Conditions, Filters, Scheduling and Error Handling', titleRw: 'Amategeko, Gutoranya, Gupanga Igihe n’Amakosa', deliverableEn: 'Improved workflow and test report', deliverableRw: 'Umuyoboro unonosoye hamwe na raporo y’igerageza', resourceTitleEn: 'Automation Testing & Error Log', resourceTitleRw: 'Inyandiko yo Kugerageza Amakosa', tools: ['Make', 'Zapier'], levelTag: 'Level 4' },
  { day: 21, week: 3, titleEn: 'Weekly Assessment 03', titleRw: 'Isuzuma ry’Icyumweru cya 3', deliverableEn: 'Completed automation project and documentation (20% weight)', deliverableRw: 'Umushinga w’umuyoboro ukora n’inyandiko yawo (20%)', resourceTitleEn: 'Week 3 Automation Assessment Rubric', resourceTitleRw: 'Ibipimo by’Isuzuma rya 3', tools: ['Google Forms', 'Google Sheets'], levelTag: 'Level 4' },

  // Week 4 — AI-Powered Automation and AI Agents
  { day: 22, week: 4, isSample: true, titleEn: 'Introduction to AI-Powered Automation', titleRw: 'Intangiriro ku Miyoboro Ikoresha AI', deliverableEn: 'AI workflow design', deliverableRw: 'Igishushanyo cy’umuyoboro w’ikigo ukoresha AI', resourceTitleEn: 'AI-Powered Workflow Blueprint', resourceTitleRw: 'Igishushanyo cya AI Workflow', tools: ['Make', 'Google Gemini'], levelTag: 'Level 5' },
  { day: 23, week: 4, titleEn: 'AI Classification, Extraction and Summarization', titleRw: 'Gushyira mu Byiciro, Kuvana Ingamba no Guhinira', deliverableEn: 'AI information processing exercise', deliverableRw: 'Umwitozo wo gushyira ibibazo by’abakiriya mu byiciro', resourceTitleEn: 'Classification & Extraction Sheet', resourceTitleRw: 'Urupapuro rwo Gushyira mu Byiciro', tools: ['Google Gemini', 'Make', 'Google Sheets'], levelTag: 'Level 5' },
  { day: 24, week: 4, titleEn: 'Build an AI-Powered Information Processing Workflow', titleRw: 'Kubaka Umuyoboro wa AI Usesengura Amakuru', deliverableEn: 'Working demonstration or documented prototype', deliverableRw: 'Imurika ry’umuyoboro ufite ubugenzuzi bw’umuntu', resourceTitleEn: 'Human Approval Gate Checklist', resourceTitleRw: 'Urutonde rw’Igenzura ry’Umuntu', tools: ['Google Forms', 'Make', 'Google Gemini'], levelTag: 'Level 5' },
  { day: 25, week: 4, titleEn: 'Introduction to AI Agents', titleRw: 'Intangiriro kuri AI Agents', deliverableEn: 'Agent architecture worksheet', deliverableRw: 'Urupapuro rw’ibice bigize AI Agent n’imikorere yayo', resourceTitleEn: 'Agent Design Canvas Worksheet', resourceTitleRw: 'Igishushanyo cya AI Agent', tools: ['n8n', 'Google Gemini'], levelTag: 'Level 6' },
  { day: 26, week: 4, titleEn: 'Human Approval, Security and Reliability', titleRw: 'Ubugenzuzi bw’Umuntu, Umutekano n’Ubuziranenge', deliverableEn: 'Agent risk assessment', deliverableRw: 'Isuzuma ry’ibyago n’amategeko y’umutekano kuri Agent', resourceTitleEn: 'Agent Safety & Prompt Injection Log', resourceTitleRw: 'Igenzura ry’Umutekano wa Agent', tools: ['Google Sheets', 'Make'], levelTag: 'Level 6' },
  { day: 27, week: 4, titleEn: 'Final Project Development', titleRw: 'Gutegura Umushinga wa Nyuma', deliverableEn: 'Final project submission (30% capstone prep)', deliverableRw: 'Gutegura no kunoza umushinga wa nyuma (30%)', resourceTitleEn: 'Final Project Proposal & Documentation Template', resourceTitleRw: 'Urupapuro rw’Umushinga wa Nyuma', tools: ['All Course Tools'], levelTag: 'Level 7' },
  { day: 28, week: 4, titleEn: 'Final Assessment and Project Demonstration', titleRw: 'Isuzuma rya Nyuma no Kumurika Umushinga', deliverableEn: 'Completed final project and course assessment (15% W4 + 30% Capstone)', deliverableRw: 'Umushinga wa nyuma wamuritswe n’isuzuma rya nyuma', resourceTitleEn: '7-Criterion Final Evaluation Rubric', resourceTitleRw: 'Ibipimo 7 by’Umushinga wa Nyuma', tools: ['Platform Capstone'], levelTag: 'Level 7' }
];

const WEEK_TITLES = {
  1: { en: 'Week 1 — Understanding Artificial Intelligence', rw: 'Icyumweru cya 1 — Gusobanukirwa AI' },
  2: { en: 'Week 2 — Prompt Engineering', rw: 'Icyumweru cya 2 — Kwandika Amabwiriza (Prompts)' },
  3: { en: 'Week 3 — Workflow Thinking and Automation', rw: 'Icyumweru cya 3 — Imiyoboro n’Ikoranabuhanga' },
  4: { en: 'Week 4 — AI-Powered Automation and Agents', rw: 'Icyumweru cya 4 — AI Automation na AI Agents' }
} as const;

const FEATURED_OVERRIDES: Record<number, Partial<LessonContent>> = {
  1: {
    durationMinutes: 8,
    objectives: {
      en: [
        'Define artificial intelligence in plain, practical terms.',
        'Distinguish traditional rule-based software from pattern-learning AI systems.',
        'Identify three realistic AI use cases in Rwandan education and business.'
      ],
      rw: [
        'Gusobanura icyo AI ari cyo mu magambo yumvikana neza.',
        'Gutandukanya porogaramu zisanzwe n’iziga zikoresheje amakuru.',
        'Kugaragaza uburyo butatu AI yakoreshwa mu burezi n’ubucuruzi mu Rwanda.'
      ]
    },
    introduction: {
      en: 'Many people think AI is magic or only for programmers. In reality, AI is software trained on patterns in data so it can recognize, summarize, classify, and generate useful outputs.',
      rw: 'Abantu benshi batekereza ko AI ari ubumaji cyangwa ko igenewe abahanga mu kwandika kode gusa. Mu by’ukuri, AI ni porogaramu yigishijwe ku makuru menshi kugira ngo ibashe gusesengura, guhinira no gutanga ibisubizo bifasha.'
    },
    simpleExplanation: {
      en: 'Traditional software follows fixed rules written by a human ("If button A is clicked, open page B"). AI learns patterns from thousands of examples so it can handle messy human input like a question written in mixed English and Kinyarwanda.',
      rw: 'Porogaramu isanzwe ikurikiza amategeko yanditswe n’umuntu. AI yo yiga imiterere y’amakuru menshi ku buryo ishobora kumva ibibazo byanditswe mu buryo bunyuranye.'
    },
    technicalExplanation: {
      en: 'Modern AI combines statistical pattern recognition, optimization algorithms, and neural network weights tuned across large datasets. Rather than executing hard-coded if/else branches for every sentence, it computes probabilities over learned representations.',
      rw: 'AI igezweho ikoresha imibare n’urusobe rwa neural networks rwatojwe ku makuru menshi kugira ngo ipime icyo igisubizo gikwiye kuba cyo aho kugendera ku mategeko yanditse gusa.'
    },
    realWorldExample: {
      en: 'A customer support team sorts 400 incoming emails per morning into Billing, Technical Support, and Partnerships automatically.',
      rw: 'Ikigo gifasha abakiriya gishyira imeri 400 mu byiciro by’ubwishyu, ubufasha cyangwa ubufatanye mu buryo bwikoresha.'
    },
    rwandaExample: {
      en: 'A TVET student in Kigali or Huye uses AI to translate technical carpentry or solar-installation manuals into clear step-by-step study notes before practical exams.',
      rw: 'Umunyeshuri wiga imyuga i Kigali cyangwa i Huye akoresha AI mu gusobanura ibitabo by’ubuhanga akabishyira mu nshamake yoroheye gusubiramo.'
    },
    practicalDemo: {
      en: 'Ask Gemini or ChatGPT to explain a concept you are studying today at two levels: first for a secondary school student, then for a small business owner.',
      rw: 'Baza Gemini cyangwa ChatGPT gusobanura ingingo wiga uyu munsi mu buryo bubiri: ubwa mbere ku munyeshuri, ubwa kabiri kuri rwiyemezamirimo.'
    },
    exerciseSteps: {
      en: [
        'Open ChatGPT or Google Gemini (free tier).',
        'Pick one real task from your school, work, or shop.',
        'Run the Day 1 starter prompt below and inspect where the AI helped vs where it missed local context.',
        'Write down one way you would verify the result before trusting it.'
      ],
      rw: [
        'Fungura ChatGPT cyangwa Google Gemini.',
        'Hitamo igikorwa kimwe cyo mu ishuri cyangwa mu kazi kawe.',
        'Koresha ibwiriza ryo munsi maze urebe aho AI yagufashije n’aho itumvise neza imiterere yo mu Rwanda.',
        'Andika uburyo bumwe wagenzura ukuri kw’icyo gisubizo.'
      ]
    },
    reusableTemplate: {
      en: 'Explain [TOPIC] in simple everyday language for someone in Rwanda. Give 1 practical example and list 2 things I must double-check myself.',
      rw: 'Sobanura [INGINGO] mu magambo yoroshye ku muntu wo mu Rwanda. Tanga urugero rumwe rufatika n’ibintu 2 ngomba kwigenzurira ubwanjye.'
    },
    commonMistakes: {
      en: [
        'Treating AI as an all-knowing authority instead of a fallible assistant.',
        'Pasting private ID numbers, phone numbers, or customer passwords into public AI chats.'
      ],
      rw: [
        'Kwizera ibyo AI ivuze byose nta kugenzura.',
        'Gushyira nimero z’indangamuntu cyangwa ibanga ry’abakiriya muri AI.'
      ]
    },
    limitationsAndRisks: {
      en: 'AI does not genuinely understand truth or local legal obligations. Never skip human judgment for financial, medical, or legal decisions.',
      rw: 'AI ntifite ubushobozi bwo kumenya ukuri ku giti cyayo. Ntugasimbuke ubushishozi bw’umuntu ku byemezo by’amafaranga cyangwa amategeko.'
    },
    knowledgeCheck: {
      question: {
        en: 'What makes AI different from traditional rule-based software?',
        rw: 'Ni iki gitandukanya AI na porogaramu zisanzwe zanditse mu mategeko adahinduka?'
      },
      options: {
        en: [
          'AI learns patterns from examples rather than relying solely on fixed human-written rules',
          'AI never makes factual errors',
          'AI always requires paid subscriptions'
        ],
        rw: [
          'AI yiga imiterere ivuye ku ngero nyinshi aho gukoresha amategeko adahinduka gusa',
          'AI ntiyigera ikora amakosa',
          'AI ikenera kwishyurwa buri gihe'
        ]
      },
      correctIndex: 0,
      explanation: {
        en: 'AI models learn statistical patterns from data, which allows flexible responses—but also means outputs must still be verified.',
        rw: 'AI yiga imiterere y’amakuru, ibi bituma itanga ibisubizo byinshi ariko bisaba ko umuntu abigenzura.'
      }
    },
    reflectionQuestion: {
      en: 'Which repetitive reading or writing task in your week could save 30 minutes if assisted—and verified—by AI?',
      rw: 'Ni ikihe gikorwa gisubirwamo mu cyumweru cyawe cyagabanyirizwa igihe ukoresheje AI ukigenzura?'
    }
  },
  8: {
    durationMinutes: 10,
    objectives: {
      en: [
        'Understand why vague prompts yield generic, unreliable answers.',
        'Apply the 5-part prompt anatomy: Role, Context, Task, Constraints, Format.',
        'Transform a weak one-line request into a structured reusable prompt.'
      ],
      rw: [
        'Gusobanukirwa impamvu ibwiriza ridasobanutse ritanga igisubizo kidafite ireme.',
        'Gukoresha ibice 5 by’ibwiriza: Uruhare, Imiterere, Igikorwa, Imipaka n’Imiterere y’igisubizo.',
        'Guhindura ikibazo cy’umurongo umwe mo ibwiriza ryuzuye.'
      ]
    },
    simpleExplanation: {
      en: 'Asking AI "Write a business plan" is like asking a builder "Build a house" without telling them the budget, plot size, or number of rooms. Specific instructions create specific, useful work.',
      rw: 'Kubwira AI ngo "Nyandikira gahunda y’ubucuruzi" ni nko kubwira umwubatsi ngo "Wubake inzu" utamubwiye ubunini bw’ikibanza cyangwa ibyumba. Amabwiriza asobanutse atanga igisubizo cyiza.'
    },
    rwandaExample: {
      en: 'Instead of "Help me sell honey", prompt: "Act as an agricultural marketing advisor in Rwanda. Write 3 WhatsApp product messages for a 500g honey jar from Nyungwe priced at 4,500 RWF, keeping each under 50 words."',
      rw: 'Aho kwandika ngo "Mfasha kugurisha ubuki", andika uti: "Kora nk’umujyanama w’ubucuruzi mu Rwanda. Andika ubutumwa 3 bwa WhatsApp bugurisha ubuki bwa Nyungwe bwa 500g ku mafaranga 4,500 RWF, buri bumwe butarenza amagambo 50."'
    },
    reusableTemplate: {
      en: 'Role: Act as [EXPERT ROLE].\nContext: I am working on [CONTEXT] for [AUDIENCE].\nTask: Create [OUTPUT].\nConstraints: Keep under [N] words. State clearly if anything is uncertain.\nFormat: Return as a numbered checklist.',
      rw: 'Uruhare: Kora nka [UMUHANGA].\nImiterere: Ndi gukora kuri [IGIKORWA] kigenewe [ABO KIGENEWE].\nIgikorwa: Tegura [IGISUBIZO].\nImipaka: Ntarenze amagambo [N].\nImiterere: Tanga urutonde ruri ku murongo.'
    },
    knowledgeCheck: {
      question: {
        en: 'Which element prevents an AI from guessing wildly when it lacks information?',
        rw: 'Ni ikihe gice cy’ibwiriza kirinda AI kwihimbira amakuru itabifitiye?'
      },
      options: {
        en: [
          'Adding explicit constraints such as "State clearly when information is missing or uncertain"',
          'Using all capital letters in the greeting',
          'Making the prompt as short as 3 words'
        ],
        rw: [
          'Gushyiramo imipaka isaba AI kuvuga igihe idafite amakuru ahagije',
          'Kwandika inyuguti nkuru gusa',
          'Kugira ibwiriza rigufi cyane ry’amagambo 3'
        ]
      },
      correctIndex: 0,
      explanation: {
        en: 'Explicit constraints instruct the model on boundaries, tone, length, and uncertainty handling.',
        rw: 'Imipaka isobanutse iyobora AI ku burebure, imvugo n’uko yitwara igihe itizeye amakuru.'
      }
    }
  },
  15: {
    durationMinutes: 9,
    objectives: {
      en: [
        'Define workflow automation without jargon.',
        'Distinguish between a Trigger, an Action, and Data Mapping.',
        'Identify 3 repetitive tasks worth automating vs tasks that should stay manual.'
      ],
      rw: [
        'Gusobanura icyo imiyoboro yikoresha ari cyo mu magambo yoroshye.',
        'Gutandukanya Igitangiza igikorwa (Trigger), Igikorwa (Action) n’Ihuza ry’amakuru.',
        'Kumenya imirimo ikwiye gukorwa n’imashini n’igomba gukorwa n’umuntu.'
      ]
    },
    simpleExplanation: {
      en: 'Automation simply means: when Event X happens automatically in App A, perform Action Y in App B—without a human copying and pasting data by hand.',
      rw: 'Ikoranabuhanga ryikoresha risobanuye ko igihe ikintu kibaye muri porogaramu imwe, igikorwa gikurikiyeho gihita kiba mu yindi umuntu adakoresheje intoki.'
    },
    rwandaExample: {
      en: 'When a student fills out a Google Form to join a university coding club in Kigali, their name is added to Google Sheets and they automatically receive a welcome email with the meeting link.',
      rw: 'Iyo umunyeshuri yujuje Google Form yo kwinjira mu ihuriro ry’ikoranabuhanga, amazina ye ahita ajya muri Google Sheets kandi akabona Email y’ikaze.'
    },
    reusableTemplate: {
      en: 'Trigger: When [EVENT] happens in [APP A]\nFilter: Only if [CONDITION] is true\nAction: Send [FIELDS] to [APP B] and notify [HUMAN].',
      rw: 'Igitangira: Igihe [IGIKORWA] kibaye muri [APP A]\nIgenzura: Niba [ITEGEKO] ryuzuye\nIgikorwa: Ohereza [AMAKURU] muri [APP B] umenyeshe [UMUNTU].'
    },
    knowledgeCheck: {
      question: {
        en: 'In a Form -> Spreadsheet -> Email workflow, what is the Trigger?',
        rw: 'Mu muyoboro wa Form -> Spreadsheet -> Email, ni ikihe gice ari Igitangira (Trigger)?'
      },
      options: {
        en: [
          'A new Google Form response being submitted',
          'Deleting the spreadsheet at the end of the month',
          'Buying a new laptop'
        ],
        rw: [
          'Igihe umuntu yohereje igisubizo gishya kuri Google Form',
          'Gusiba imbonerahamwe mu mpera z’ukwezi',
          'Kugura mudasobwa nshya'
        ]
      },
      correctIndex: 0,
      explanation: {
        en: 'A trigger is the starting event that initiates the automated workflow.',
        rw: 'Igitangira (Trigger) ni cyo gikorwa cy’ibanze gituma umuyoboro wose utangira gukora.'
      }
    }
  },
  22: {
    durationMinutes: 11,
    objectives: {
      en: [
        'Compare traditional rule-based automation with AI-powered automation.',
        'Identify where language reasoning (classification, summarizing, drafting) fits inside a workflow.',
        'Design a mandatory human-approval step before sending AI-drafted outputs externally.'
      ],
      rw: [
        'Kugereranya imiyoboro isanzwe n’imiyoboro ikoresha AI.',
        'Kumenya aho gushyira mu byiciro, guhinira no gutegura ibisubizo byinjira mu muyoboro.',
        'Gushyiraho umwanya umuntu yemeramo ibyakozwe mbere yo kubyohereza hanze.'
      ]
    },
    simpleExplanation: {
      en: 'Traditional automation moves exact data from A to B ("copy email into column B"). AI-powered automation can read messy text in between—classifying urgency, summarizing a complaint, and drafting a reply for a human staff member to approve.',
      rw: 'Umuyoboro usanzwe wimura amakuru uko yakabaye. Umuyoboro urimo AI ushobora gusoma inyandiko ndende, ukamenya ikibazo icyo ari cyo, ugategura igisubizo cy’ibanze umukozi akabanza kugisuzuma.'
    },
    rwandaExample: {
      en: 'An agricultural cooperative receives farmer messages about seed delivery or fertilizer questions. AI categorizes each inquiry and drafts a polite Kinyarwanda reply in Google Sheets for the coordinator to review and send.',
      rw: 'Koperative y’abahinzi yakira ubutumwa bw’abanyamuryango ku mbuto cyangwa ifumbire. AI ibushyira mu byiciro igategura igisubizo cy’Ikinyarwanda muri Google Sheets kugira ngo umuyobozi agenzure mbere yo gusubiza.'
    },
    reusableTemplate: {
      en: 'Step 1 (Trigger): New inquiry arrives.\nStep 2 (AI Node): Classify category + extract name/order + draft reply.\nStep 3 (Human Gate): Save draft with status "Pending Approval".\nStep 4 (Send): Deliver only after human changes status to "Approved".',
      rw: 'Intambwe 1: Hakiriwe ikibazo gishya.\nIntambwe 2 (AI): Shyira mu cyiciro utegure igisubizo.\nIntambwe 3 (Umuntu): Bika igisubizo gitegereje kwemezwa.\nIntambwe 4: Ohereza nyuma y’uko umuntu yemeje.'
    },
    knowledgeCheck: {
      question: {
        en: 'Why should an AI customer inquiry workflow include a human approval gate before sending?',
        rw: 'Kuki umuyoboro wa AI usubiza abakiriya ugomba kugira aho umuntu abanza kwemeza?'
      },
      options: {
        en: [
          'To catch AI hallucinations, wrong prices, or tone errors before customers see them',
          'Because Google Sheets cannot store text without human approval',
          'To make the workflow run slower on purpose'
        ],
        rw: [
          'Kugira ngo umuntu atahure amakosa ya AI cyangwa ibiciro bitari byo mbere y’uko bigera ku mukiriya',
          'Kuko Google Sheets idashobora kubika inyandiko',
          'Kugira ngo umuyoboro utinde gukora'
        ]
      },
      correctIndex: 0,
      explanation: {
        en: 'Human-in-the-loop approval protects customer trust, pricing accuracy, and legal compliance.',
        rw: 'Ubugenzuzi bw’umuntu burinda ikigo gutakaza icyizere no gukora amakosa ku biciro cyangwa amakuru.'
      }
    }
  }
};

export const LESSONS_28: LessonContent[] = DAY_OUTLINES.map((outline) => {
  const override = FEATURED_OVERRIDES[outline.day] ?? {};
  const weekTitle = WEEK_TITLES[outline.week as 1 | 2 | 3 | 4];

  return {
    dayNumber: outline.day,
    weekNumber: outline.week,
    weekTitle,
    isSample: Boolean(outline.isSample),
    durationMinutes: override.durationMinutes ?? 10,
    levelTag: outline.levelTag,
    title: { en: outline.titleEn, rw: outline.titleRw },
    deliverable: { en: outline.deliverableEn, rw: outline.deliverableRw },
    downloadableResourceTitle: { en: outline.resourceTitleEn, rw: outline.resourceTitleRw },
    lowBandwidthTip: {
      en: 'Low-bandwidth mode: All instructions, examples, and templates can be studied in text without loading video.',
      rw: 'Uburyo butwara interineti nke: Inyandiko, ingero n’amabwiriza byose bisomeka neza utabanje gufungura amashusho.'
    },
    objectives: override.objectives ?? {
      en: [
        `Understand the core concepts behind ${outline.titleEn}.`,
        `Apply today's principle in a guided 10-minute practical exercise.`,
        `Verify outputs and identify common beginner pitfalls.`
      ],
      rw: [
        `Gusobanukirwa iby'ibanze kuri ${outline.titleRw}.`,
        `Gushyira mu bikorwa isomo ry'uyu munsi mu myitozo y'iminota 10.`,
        `Kugenzura ibisubizo no kwirinda amakosa akunda gukorwa.`
      ]
    },
    introduction: override.introduction ?? {
      en: `Day ${outline.day} builds directly on your progress in ${weekTitle.en}. Today focuses on ${outline.titleEn.toLowerCase()} using accessible, low-bandwidth workflows.`,
      rw: `Umunsi wa ${outline.day} ukomeza amasomo ya ${weekTitle.rw}. Uyu munsi twibanda kuri ${outline.titleRw} dukoresheje uburyo bworoshye budasaba interineti nyinshi.`
    },
    simpleExplanation: override.simpleExplanation ?? {
      en: `${outline.titleEn} helps you turn unclear, manual steps into a structured method you can repeat reliably every week.`,
      rw: `${outline.titleRw} bigufasha guhindura ibikorwa bikorwa mu kajagari mo inzira isobanutse ushobora gusubiramo neza buri cyumweru.`
    },
    technicalExplanation: override.technicalExplanation ?? {
      en: `Under the hood, ${outline.titleEn} relies on clear input boundaries, consistent state transitions, and explicit verification checkpoints between tools (${outline.tools.join(', ')}).`,
      rw: `Mu buryo bw'ubuhanga, ${outline.titleRw} bishingiye ku gushyiraho imipaka y'ibyinjira n'ibisohoka hagati ya porogaramu (${outline.tools.join(', ')}) hamwe n'igenzura.`
    },
    realWorldExample: override.realWorldExample ?? {
      en: `Small teams use ${outline.titleEn.toLowerCase()} to standardize repetitive intake, research notes, or weekly reporting without needing full-time software engineers.`,
      rw: `Ibigo bito bikoresha ${outline.titleRw} mu gutunganya raporo, ubushakashatsi cyangwa imirimo y'abakozi badakeneye abahanga benshi mu ikoranabuhanga.`
    },
    rwandaExample: override.rwandaExample ?? {
      en: `A university student group or local enterprise in Kigali applies ${outline.titleEn.toLowerCase()} to organize member requests, summarize workshop notes in English and Kinyarwanda, and keep human review in place.`,
      rw: `Itsinda ry'abanyeshuri muri kaminuza cyangwa ikigo gito i Kigali rikoresha ${outline.titleRw} mu gutondeka ibibazo by'abantu no guhinira inyandiko mu Kinyarwanda n'Icyongereza.`
    },
    practicalDemo: override.practicalDemo ?? {
      en: `Open ${outline.tools[0]} and run a 3-minute test comparing an unstructured request against today's structured template.`,
      rw: `Fungura ${outline.tools[0]} maze ugerageze mu minota 3 kugereranya uburyo budafite gahunda n'ibwiriza ryateguwe neza.`
    },
    tools: outline.tools,
    exerciseSteps: override.exerciseSteps ?? {
      en: [
        `Review the objective and open ${outline.tools[0]}.`,
        `Copy the Day ${outline.day} reusable template and adapt it to a real school or business case.`,
        `Run the exercise and inspect the output for accuracy and clarity.`,
        `Save your tested prompt or workflow note in your personal library and mark Day ${outline.day} complete.`
      ],
      rw: [
        `Soma intego z'isomo ufungure ${outline.tools[0]}.`,
        `Kopora ibwiriza ry'Umunsi wa ${outline.day} urihuze n'igikorwa cyawe cyo mu ishuri cyangwa mu kazi.`,
        `Koresha umwitozo ugenzure neza ukuri kw'igisubizo.`,
        `Bika ibyo wakoze mu bubiko bwawe maze wemeze ko warangije Umunsi wa ${outline.day}.`
      ]
    },
    reusableTemplate: override.reusableTemplate ?? {
      en: `Day ${outline.day} Template (${outline.titleEn}):\n- Goal: [What problem are you solving?]\n- Input: [Source data or text]\n- Constraint: [Verify facts & keep human check]\n- Output: [Actionable summary or workflow step]`,
      rw: `Ibwiriza ry'Umunsi wa ${outline.day} (${outline.titleRw}):\n- Intego: [Ikibazo gikemurwa]\n- Ibyinjira: [Amakuru y'ibanze]\n- Imipaka: [Genzura ukuri, umuntu yemeze]\n- Igisohoka: [Inshamake cyangwa intambwe ikurikiyeho]`
    },
    commonMistakes: override.commonMistakes ?? {
      en: [
        'Skipping the verification step when the output sounds confident.',
        'Trying to automate a messy process before mapping its inputs and outputs.'
      ],
      rw: [
        'Kudasuzuma ibisubizo igihe bigaragara nkaho ari byiza.',
        'Kugerageza gukoresha ikoranabuhanga mu gikorwa kitarategurwa neza.'
      ]
    },
    limitationsAndRisks: override.limitationsAndRisks ?? {
      en: 'Always protect personal data (names, phone numbers, IDs) under Rwanda Law No. 058/2021 and never rely solely on automated output for high-stakes decisions.',
      rw: 'Rinda amakuru bwite y’abantu ukurikije itegeko N° 058/2021 kandi ntukishingikirize ku gisubizo cy’imashini gusa ku byemezo bikomeye.'
    },
    knowledgeCheck: override.knowledgeCheck ?? {
      question: {
        en: `What is the main priority when applying "${outline.titleEn}" in practice?`,
        rw: `Ni ikihe cy'ingenzi mu gukoresha "${outline.titleRw}" mu bikorwa?`
      },
      options: {
        en: [
          'Combine clear structure with verification and human oversight',
          'Publish every generated output immediately without checking',
          'Use as many paid tools as possible'
        ],
        rw: [
          'Guhuza imiterere isobanutse n’igenzura ry’umuntu',
          'Guhita utangaza ibyo AI itanze utabigenzuye',
          'Gukoresha porogaramu zishyurwa nyinshi bishoboka'
        ]
      },
      correctIndex: 0,
      explanation: {
        en: 'Practical AI skills always pair structured design with human verification and free-tool accessibility.',
        rw: 'Ubumenyi ngiro kuri AI buhuza imitegurire myiza n’ubugenzuzi bw’umuntu.'
      }
    },
    reflectionQuestion: override.reflectionQuestion ?? {
      en: `How can you apply today's lesson (${outline.titleEn}) to improve one real workflow or study habit this week?`,
      rw: `Wakoresha ute isomo ry'uyu munsi (${outline.titleRw}) mu kunoza imikorere yawe cyangwa imyigire muri iki cyumweru?`
    },
    furtherResources: [
      'AI Education Rwanda Prompt Library',
      `Tools reference: ${outline.tools.join(' · ')}`
    ]
  };
});

export const WEEKLY_ASSESSMENTS: WeeklyAssessment[] = [
  {
    weekNumber: 1,
    title: {
      en: 'Week 1 Assessment — AI Foundations & Responsible Usage',
      rw: 'Isuzuma ry’Icyumweru cya 1 — Ibanze kuri AI n’Umutekano'
    },
    weightLabel: '5% of course total (Week 1 Knowledge Assessment)',
    questions: [
      {
        question: {
          en: 'What is an AI "hallucination"?',
          rw: 'Iyo bavuze "hallucination" muri AI baba bavuze iki?'
        },
        options: {
          en: [
            'When an AI confidently generates plausible-sounding but false or fabricated information',
            'When a computer screen loses internet connection',
            'When a user forgets their password'
          ],
          rw: [
            'Igihe AI itanga igisubizo kimeze nk’ukuri kandi ari ikinyoma cyangwa cyahimbwe',
            'Igihe interineti ihagaze kuri mudasobwa',
            'Igihe umuntu yibagiwe ijambo ry’ibanga'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'LLMs predict likely words rather than querying a verified truth database, so they can fabricate facts confidently.',
          rw: 'AI itekereza amagambo ashobora gukurikirana aho kureba mu bubiko bw’ukuri kwemewe, bityo ishobora guhimba ibitari ukuri.'
        }
      },
      {
        question: {
          en: 'Which practice respects learner and customer privacy under Rwanda Law No. 058/2021?',
          rw: 'Ni ikihe gikorwa cyubahiriza umutekano w’amakuru bwite ukurikije Itegeko N° 058/2021?'
        },
        options: {
          en: [
            'Removing national IDs, phone numbers, and private records before pasting text into public AI tools',
            'Sharing full customer spreadsheets in public chat prompts',
            'Storing mobile money PINs inside plain text notes'
          ],
          rw: [
            'Gukuramo nimero z’indangamuntu, telefoni n’amakuru bwite mbere yo kuyashyira muri AI',
            'Gushyira amakuru y’abakiriya bose muri AI rusange',
            'Kubika umubare w’ibanga wa Mobile Money mu nyandiko isanzwe'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'Anonymizing personal data protects privacy and prevents unauthorized exposure.',
          rw: 'Guhisha amakuru y’abantu ku giti cyabo birinda ibanga ryabo n’amakosa y’amategeko.'
        }
      },
      {
        question: {
          en: 'How does Machine Learning relate to Artificial Intelligence?',
          rw: 'Machine Learning ihuriye he na Artificial Intelligence?'
        },
        options: {
          en: [
            'Machine Learning is a subfield of AI where systems learn patterns from data',
            'Machine Learning is a completely unrelated hardware cable',
            'AI only exists in robotics, not Machine Learning'
          ],
          rw: [
            'Machine Learning ni igice cya AI aho sisitemu yiga imiterere y’amakuru',
            'Machine Learning ni umugozi wa mudasobwa',
            'AI iba mu marobo gusa'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'AI is the broad umbrella; Machine Learning is the data-driven subset, and Deep Learning uses multi-layer neural networks.',
          rw: 'AI ni icyiciro kinini; Machine Learning ni igice cyayo kiga amakuru.'
        }
      },
      {
        question: {
          en: 'Before using an AI-generated statistic in a school or business report, what should you do?',
          rw: 'Mbere yo gukoresha imibare itanzwe na AI muri raporo y’ishuri cyangwa y’akazi, wakora iki?'
        },
        options: {
          en: [
            'Verify the figure against an authoritative primary source',
            'Assume it is accurate because the sentence is well-written',
            'Ask the same AI "Are you sure?" and trust yes'
          ],
          rw: [
            'Kugenzura iyo mibare ku isoko y’ukuri yizewe',
            'Kwemeza ko ari ukuri kuko interuro yanditse neza',
            'Kubaza iyo AI nyine ngo "Urabyizeye?" ugahita wemera'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'Always cross-check facts and numbers against primary documents or trusted references.',
          rw: 'Buri gihe genzura amakuru n’imibare ku nyandiko z’umwimerere zizewe.'
        }
      }
    ]
  },
  {
    weekNumber: 2,
    title: {
      en: 'Week 2 Assessment — Prompt Engineering & Research',
      rw: 'Isuzuma ry’Icyumweru cya 2 — Kwandika Amabwiriza n’Ubushakashatsi'
    },
    weightLabel: '15% of course total (Week 2 Knowledge & Prompt Assignment)',
    questions: [
      {
        question: {
          en: 'Which components belong in a well-structured prompt?',
          rw: 'Ni ibihe bice bigize ibwiriza ryateguwe neza?'
        },
        options: {
          en: [
            'Role, Context, Task, Constraints, and Output Format',
            'Greeting, Emoji, and Signature only',
            'A single vague noun with no goal'
          ],
          rw: [
            'Uruhare, Imiterere, Igikorwa, Imipaka n’Imiterere y’igisubizo',
            'Indamutso n’utumenyetso gusa',
            'Ijambo rimwe gusa ridafite intego'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'Clear roles, context, constraints, and formatting eliminate ambiguity and improve consistency.',
          rw: 'Kugaragaza uruhare, imiterere, imipaka n’imiterere y’igisubizo bituma AI itanga igisubizo cyiza.'
        }
      },
      {
        question: {
          en: 'What is "Prompt Chaining"?',
          rw: 'Iyo bavuze "Prompt Chaining" baba bavuze iki?'
        },
        options: {
          en: [
            'Breaking a complex task into sequential prompts where each output feeds the next step',
            'Sending the exact same broken prompt 10 times',
            'Using AI without reading any responses'
          ],
          rw: [
            'Kugabanya igikorwa kinini mu mabwiriza akurikirana aho igisubizo kimwe gikoreshwa mu gikurikira',
            'Kohereza ibwiriza rimwe ridakora inshuro 10',
            'Gukoresha AI udasoma ibisubizo'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'Chaining improves accuracy and makes each intermediate step easy to verify.',
          rw: 'Kujyanisha amabwiriza byoroshya kugenzura buri ntambwe kandi bigatanga umusaruro mwiza.'
        }
      },
      {
        question: {
          en: 'Which tool is purpose-built for asking questions grounded strictly in uploaded PDFs and study sources?',
          rw: 'Ni iyihe porogaramu yagenewe kubaza ibibazo bishingiye ku nyandiko n’ibitabo washyizemo gusa?'
        },
        options: {
          en: [
            'NotebookLM',
            'Google Forms',
            'A blank spreadsheet'
          ],
          rw: [
            'NotebookLM',
            'Google Forms',
            'Imbonerahamwe itarimo ikintu'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'NotebookLM grounds answers directly in your approved source files with inline citations.',
          rw: 'NotebookLM itanga ibisubizo bifite aho bihuriye n’inyandiko washyizemo.'
        }
      }
    ]
  },
  {
    weekNumber: 3,
    title: {
      en: 'Week 3 Assessment — Workflow Thinking & No-Code Automation',
      rw: 'Isuzuma ry’Icyumweru cya 3 — Imiyoboro n’Ikoranabuhanga'
    },
    weightLabel: '20% of course total (Week 3 Workflow & Automation)',
    questions: [
      {
        question: {
          en: 'Why should learners map a workflow on paper or a sheet BEFORE opening Make or Zapier?',
          rw: 'Kuki umunyeshuri agomba kubanza gushushanya umuyoboro mbere yo gufungura Make cyangwa Zapier?'
        },
        options: {
          en: [
            'Because automating an unclear or broken process only multiplies errors faster',
            'Because Make requires uploading a photo of paper before creating an account',
            'Because workflows cannot have triggers'
          ],
          rw: [
            'Kuko gukoresha ikoranabuhanga mu gikorwa kidasobanutse byongera amakosa vuba',
            'Kuko Make isaba ifoto y’urupapuro',
            'Kuko imiyoboro itagira ibiyitangiza'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'Workflow thinking first ensures clear inputs, outputs, decision conditions, and human checkpoints.',
          rw: 'Gutekereza ku muyoboro mbere bituma ibyinjira, ibisohoka n’igenzura bisobanuka neza.'
        }
      },
      {
        question: {
          en: 'What does "data mapping" mean when connecting Google Forms to Google Sheets and Email?',
          rw: 'Guhuza amakuru (Data Mapping) hagati ya Google Forms, Sheets na Email bisobanura iki?'
        },
        options: {
          en: [
            'Matching each source form field (such as Name or Email) to the exact destination column or template variable',
            'Drawing a geographic map of Kigali streets',
            'Encrypting a spreadsheet with a random password'
          ],
          rw: [
            'Guhuza buri kizu cyo muri Form (nk’Izina cyangwa Email) n’inkingi ya Sheet cyangwa ahajya mu butumwa',
            'Gushushanya ikarita y’imihanda',
            'Gushyiraho ijambo ry’ibanga gusa'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'Data mapping guarantees the right fields arrive in the right columns and message placeholders.',
          rw: 'Guhuza amakuru bituma buri makuru ajya mu mwanya wayo wagenwe.'
        }
      },
      {
        question: {
          en: 'What is the purpose of a Filter / Condition inside an automated workflow?',
          rw: 'Akamaro k’Igenzura (Filter/Condition) mu muyoboro w’ikoranabuhanga ni akahe?'
        },
        options: {
          en: [
            'Ensure subsequent actions only run when specific criteria are satisfied',
            'Delete all incoming emails automatically',
            'Bypass testing completely'
          ],
          rw: [
            'Kugenzura ko ibikorwa bikurikiyeho bikorwa gusa igihe amategeko runaka yuzuye',
            'Gusiba imeri zose zinjira',
            'Kureka kugerageza umuyoboro'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'Filters prevent irrelevant or malformed records from triggering emails or updates.',
          rw: 'Amategeko arinda kohereza ubutumwa ku makuru atuzuye cyangwa adakenewe.'
        }
      }
    ]
  },
  {
    weekNumber: 4,
    title: {
      en: 'Week 4 Assessment — AI Automation, Agents & Systems',
      rw: 'Isuzuma ry’Icyumweru cya 4 — AI Automation, Agents & Sisitemu'
    },
    weightLabel: '15% of course total (Week 4 Practical Assessment)',
    questions: [
      {
        question: {
          en: 'How does an AI agent differ from a simple FAQ chatbot?',
          rw: 'AI Agent itandukaniye he na chatbot isanzwe isubiza ibibazo?'
        },
        options: {
          en: [
            'An agent can plan multi-step actions and invoke scoped tools or integrations under defined permissions and human oversight',
            'An agent never needs instructions or boundaries',
            'An agent only works offline without software'
          ],
          rw: [
            'AI Agent ishobora gutegura intambwe nyinshi igakoresha n’ibikoresho ifitiye uburenganzira n’ubugenzuzi bw’umuntu',
            'AI Agent ntikenera amabwiriza cyangwa imipaka',
            'AI Agent ikora itagira porogaramu'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'Agents combine reasoning with tool access and memory—requiring strict permission boundaries and human review.',
          rw: 'Agents zihuza gutekereza no gukoresha porogaramu ariko zigasaba imipaka n’igenzura.'
        }
      },
      {
        question: {
          en: 'In the AI Customer Inquiry Assistant project, what happens right after AI drafts a response?',
          rw: 'Mu mushinga w’Umufasha w’Abakiriya, ni iki kiba ako kanya nyuma y’uko AI itegura igisubizo?'
        },
        options: {
          en: [
            'The draft goes to a human reviewer for approval before reaching the customer',
            'The AI changes company bank details automatically',
            'The workflow deletes the customer record'
          ],
          rw: [
            'Igisubizo kijya ku muntu kugira ngo acyemeze mbere y’uko kigera ku mukiriya',
            'AI ihindura konti ya banki y’ikigo',
            'Umuyoboro usiba amakuru y’umukiriya'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'Human approval prevents wrong commitments, hallucinations, and tone issues.',
          rw: 'Ubugenzuzi bw’umuntu burinda ko amakosa agera ku bakiriya.'
        }
      },
      {
        question: {
          en: 'What is the minimum overall course score required to earn the Certificate of Completion?',
          rw: 'Ni ayahe manota fatizo asabwa kugira ngo umunyeshuri ahabwe Impamyabumenyi?'
        },
        options: {
          en: [
            'At least 70% overall plus completed weekly assessments and final project demonstration',
            '10% with no practical project',
            'Paying for 5 external subscriptions'
          ],
          rw: [
            'Byibura 70% muri rusange hamwe n’amasuzuma n’umushinga wa nyuma wamuritswe',
            '10% nta mushinga',
            'Kwishyura porogaramu 5 zo hanze'
          ]
        },
        correctIndex: 0,
        explanation: {
          en: 'Learners must complete required weekly assessments, achieve at least 70% overall, and demonstrate their final project.',
          rw: 'Abanyeshuri bagomba kurangiza amasuzuma y’ibyumweru, bakagira nibura 70% bakanamurika umushinga wa nyuma.'
        }
      }
    ]
  }
];
