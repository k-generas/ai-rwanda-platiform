import type {
  AssessmentWeightItem,
  BlueprintInventorySection,
  Certificate,
  Course,
  IndustryPathPreset,
  LearningLevel,
  LearningTool,
  PracticalProject,
  RubricCriterion,
  TemplateResource,
  WorkshopEvent
} from '../types';

export const LEARNING_LEVELS: LearningLevel[] = [
  {
    level: 1,
    codeRange: '3.1 – 3.10',
    title: { en: 'AI Foundations', rw: 'Ibanze kuri AI' },
    summary: {
      en: 'Understand what artificial intelligence is, how Large Language Models generate text, and how to detect hallucinations and bias.',
      rw: 'Sobanukirwa icyo ubwenge bwubatswe (AI) ari cyo, uko imashini zitekereza zikora ibisubizo, n’uko utahura amakosa cyangwa kubogama.'
    },
    topics: {
      en: [
        'AI vs Machine Learning vs Deep Learning',
        'Generative AI and Large Language Models',
        'Hallucinations, bias, and verification',
        'Privacy, ethics, and human judgment'
      ],
      rw: [
        'AI vs Machine Learning vs Deep Learning',
        'Generative AI na Large Language Models',
        'Amakosa ya AI (Hallucinations) n’igenzura ry’amakuru',
        'Umurongo ngenderwaho, ibanga n’ubushishozi bw’umuntu'
      ]
    },
    evidence: {
      en: ['Knowledge assessment', 'AI concept explanation', 'Hallucination identification exercise'],
      rw: ['Isuzuma ry’ubumenyi', 'Ibisobanuro by’ibanze kuri AI', 'Umwitozo wo gutahura amakosa ya AI']
    },
    outcome: {
      en: 'Explain core AI concepts clearly, identify AI limitations, and verify outputs before using them.',
      rw: 'Gusobanura iby’ibanze kuri AI, kumenya aho ifite intege nke, no kugenzura ibisubizo byayo mbere yo kubikoresha.'
    }
  },
  {
    level: 2,
    codeRange: '4.1 – 4.12',
    title: { en: 'Prompt Engineering', rw: 'Kwandika Amabwiriza (Prompts)' },
    summary: {
      en: 'Design structured prompts with context, roles, constraints, examples, and reusable templates that produce reliable results.',
      rw: 'Tegura amabwiriza asobanutse arimo imiterere, uruhare rwa AI, amategeko n’ingero bituma ubona ibisubizo byizewe.'
    },
    topics: {
      en: [
        'Anatomy of a structured prompt',
        'Roles, constraints, and output formats',
        'Prompt chaining and reusable libraries',
        'Evaluating and refining weak responses'
      ],
      rw: [
        'Ibice bigize ibwiriza ryiza',
        'Gushyiraho uruhare n’imiterere y’igisubizo',
        'Kujyanisha amabwiriza (Prompt chaining)',
        'Gusuzuma no kunononsora ibisubizo bidafite ireme'
      ]
    },
    evidence: {
      en: ['Prompt improvement assignment', 'Personal prompt library', 'Research and document analysis exercise'],
      rw: ['Umwitozo wo kunoza ibwiriza', 'Ububiko bw’amabwiriza yizewe', 'Isesengura ry’inyandiko z’ubushakashatsi']
    },
    outcome: {
      en: 'Design, test, refine, and reuse prompt templates for study, research, and business tasks.',
      rw: 'Gukora, kugerageza no gukoresha kenshi amabwiriza afasha mu masomo, ubushakashatsi n’akazi ka buri munsi.'
    }
  },
  {
    level: 3,
    codeRange: '5.1 – 5.9',
    title: { en: 'Workflow Thinking', rw: 'Imitekerereze y’Imikorere (Workflows)' },
    summary: {
      en: 'Map real processes—inputs, triggers, actions, decision points, and human checks—before touching any software tool.',
      rw: 'Shushanya inzira y’akazi—ibinjira, ibitangiza igikorwa, ibisohoka n’aho umuntu agenzura—mbere yo guhitamo porogaramu.'
    },
    topics: {
      en: [
        'Identifying repetitive operational tasks',
        'Mapping inputs, triggers, and outputs',
        'Decision points, conditions, and exceptions',
        'Designing human-in-the-loop checkpoints'
      ],
      rw: [
        'Kumenya imirimo isubirwamo buri gihe',
        'Gushushanya ibitangira n’ibisohoka',
        'Gufata ibyemezo n’amategeko y’inzira',
        'Gushyiraho aho umuntu agenzura igikorwa'
      ]
    },
    evidence: {
      en: ['Workflow mapping assignment', 'Automation opportunity worksheet'],
      rw: ['Igishushanyo cy’inzira y’akazi', 'Urupapuro rw’ibikorwa byoroshwa']
    },
    outcome: {
      en: 'Break down any business or school process into a clear step-by-step workflow blueprint.',
      rw: 'Gusesengura buri gikorwa cy’ubucuruzi cyangwa cy’ishuri ukagishyira mu nyandiko y’imikorere isobanutse.'
    }
  },
  {
    level: 4,
    codeRange: '6.1 – 6.12',
    title: { en: 'No-Code Automation', rw: 'Ikoranabuhanga ryikoresha (No-Code)' },
    summary: {
      en: 'Connect everyday tools such as Google Forms, Google Sheets, Email, Make, and Zapier without advanced coding.',
      rw: 'Huza porogaramu zisanzwe nka Google Forms, Google Sheets, Email, Make na Zapier udakeneye ubumenyi buhambaye bwo kwandika kode.'
    },
    topics: {
      en: [
        'Triggers, actions, and data mapping',
        'Form -> Spreadsheet -> Email pipelines',
        'Filters, schedules, and error handling',
        'Testing and monitoring live automations'
      ],
      rw: [
        'Ibitangiza igikorwa no guhuza amakuru',
        'Inzira ya Form -> Spreadsheet -> Email',
        'Gutoranya amakuru no gukemura amakosa',
        'Kugerageza no gukurikirana imikorere'
      ]
    },
    evidence: {
      en: ['Working registration automation', 'Practical automation assessment'],
      rw: ['Umuyoboro ukora wo kwiyandikisha', 'Isuzuma ngiro ry’imiyoboro']
    },
    outcome: {
      en: 'Build, test, and maintain practical no-code automations that eliminate manual copy-paste work.',
      rw: 'Kubaka no kugerageza imiyoboro yikoresha ikura imirimo yo kwimura amakuru n’intoki.'
    }
  },
  {
    level: 5,
    codeRange: '7.1 – 7.10',
    title: { en: 'AI-Powered Automation', rw: 'Imiyoboro Ikoresha AI' },
    summary: {
      en: 'Embed AI classification, extraction, summarization, and response drafting inside automated workflows with human approval.',
      rw: 'Injiza AI mu miyoboro yikoresha kugira ngo ishyire mu byiciro, ikuremo ingingo, ihinire abantu ariko igenzuwe n’umuntu.'
    },
    topics: {
      en: [
        'Traditional automation vs AI automation',
        'Classification, extraction, and summarization',
        'Automated customer inquiry drafting',
        'Human approval gates and reliability checks'
      ],
      rw: [
        'Ikoranabuhanga risanzwe vs irikoresha AI',
        'Gushyira mu byiciro no kuvanamo amakuru',
        'Gutegura ibisubizo by’abakiriya mu buryo bwikoresha',
        'Uruhare rw’umuntu mu kwemeza ibyakozwe'
      ]
    },
    evidence: {
      en: ['AI-powered information processing demonstration'],
      rw: ['Imurika ry’umuyoboro wa AI usesengura amakuru']
    },
    outcome: {
      en: 'Design automated pipelines where AI handles language processing while humans retain final approval.',
      rw: 'Gutegura inzira aho AI itunganya inyandiko naho umuntu agasuzuma akemeza mbere yo kubyohereza.'
    }
  },
  {
    level: 6,
    codeRange: '8.1 – 8.12',
    title: { en: 'AI Agents', rw: 'Abakozi ba AI (AI Agents)' },
    summary: {
      en: 'Understand how goal-driven AI agents differ from chatbots by using tools, memory, permissions, and human boundaries.',
      rw: 'Menya itandukaniro riri hagati y’ikiganiro gisanzwe na AI Agent ikoresha ibikoresho, ububiko n’amategeko y’uburinzi.'
    },
    topics: {
      en: [
        'AI agents vs chatbots vs standard workflows',
        'Tool use, knowledge sources, and memory',
        'Permissions, boundaries, and human oversight',
        'Agent evaluation and security controls'
      ],
      rw: [
        'AI Agents vs Chatbots vs Workflows zisanzwe',
        'Gukoresha ibikoresho n’isoko y’ubumenyi',
        'Uruhushya, imipaka n’igenzura ry’umuntu',
        'Gupima ubuziranenge n’umutekano wa Agent'
      ]
    },
    evidence: {
      en: ['Agent design canvas', 'Agent architecture exercise'],
      rw: ['Igishushanyo cy’imikorere ya AI Agent', 'Umwitozo w’imiterere ya Agent']
    },
    outcome: {
      en: 'Design a controlled AI agent blueprint with clear tool boundaries, safety checks, and human escalation.',
      rw: 'Gutegura igishushanyo cya AI Agent ifite imipaka isobanutse n’uburyo umuntu ayigenzura.'
    }
  },
  {
    level: 7,
    codeRange: '9.1 – 9.10',
    title: { en: 'Applied AI and Innovation', rw: 'Gukoresha AI n’Udushya' },
    summary: {
      en: 'Combine AI, automation, and software design to prototype, test, document, and demonstrate real solutions for Rwanda-focused problems.',
      rw: 'Huza AI, imiyoboro yikoresha n’ubumenyi bwo gukemura ibibazo kugira ngo wubake, ugerageze kandi umurike igisubizo cy’ukuri mu Rwanda.'
    },
    topics: {
      en: [
        'Identifying real-world problems & requirements',
        'Solution design & prototype development',
        'Testing, user feedback & evaluation',
        'Documentation, impact measurement & Rwanda Law No. 058/2021'
      ],
      rw: [
        'Gutahura ibibazo nyabyo n’ibikenewe',
        'Gutegura igisubizo no kubaka icyitegererezo',
        'Kugerageza, kwakira ibitekerezo n’isuzuma',
        'Inyandiko, gupima umusaruro n’Itegeko N° 058/2021'
      ]
    },
    evidence: {
      en: ['Final project', 'Project documentation', 'Demonstration and evaluation'],
      rw: ['Umushinga wa nyuma', 'Inyandiko y’umushinga', 'Imurikabikorwa n’isuzuma']
    },
    outcome: {
      en: 'Plan, build, document, and present a working AI-powered prototype addressing a real community or business need.',
      rw: 'Gutegura, kubaka, kwandika no kumurika umushinga wa AI ukora neza ukemura ikibazo nyacyo.'
    }
  }
];

export const COURSES: Course[] = [
  {
    id: 'challenge-28',
    slug: '28-day-practical-ai-challenge',
    code: 'AER-P01',
    status: 'active',
    category: 'foundations',
    priceRwf: 1000,
    durationDays: 28,
    levelRange: 'Levels 1–7 Intro',
    title: {
      en: '28-Day Practical AI Challenge',
      rw: 'Icyiciro cy’iminsi 28 cyo kwiga AI mu bikorwa'
    },
    subtitle: {
      en: 'From AI foundations and structured prompting to automated workflows and AI agents.',
      rw: 'Kuva ku ntangiriro za AI no kwandika amabwiriza meza kugeza ku miyoboro yikoresha na AI Agents.'
    },
    description: {
      en: 'Product 01 (AER-P01) guides Rwandan students, TVET and university graduates, educators, and small businesses from foundational AI understanding to prompting, workflow automation, and an independent final project (45–90 min/day using free-tier tools; no paid subscription required).',
      rw: 'Gahunda ya mbere (AER-P01) iyobora abanyeshuri, abarangije TVET na kaminuza, abarimu na ba rwiyemezamirimo mu Rwanda kuva ku ntangiriro za AI kugeza ku miyoboro yikoresha n’umushinga wa nyuma (iminota 45–90 ku munsi ukoresha porogaramu z’ubuntu).'
    },
    outcomes: {
      en: [
        'LO1. Explain artificial intelligence and distinguish AI, machine learning, deep learning and generative AI.',
        'LO2. Explain the basic operating principles and limitations of large language models.',
        'LO3. Identify AI hallucinations, bias, privacy risks and unreliable outputs.',
        'LO4. Apply responsible AI practices when using AI tools.',
        'LO5. Construct structured prompts using roles, context, tasks, requirements and output formats.',
        'LO6. Improve prompts through testing, evaluation and refinement.',
        'LO7. Use AI tools for research, document analysis, writing and productivity while verifying facts.',
        'LO8. Identify repetitive tasks suitable for automation.',
        'LO9. Design workflows using triggers, inputs, actions, conditions and outputs.',
        'LO10. Build and test a basic no-code automation.',
        'LO11. Explain how AI can be integrated into automated workflows.',
        'LO12. Build or demonstrate an introductory AI-powered workflow with human review.',
        'LO13. Explain the differences between chatbots, AI assistants, automation workflows and AI agents.',
        'LO14. Describe the components, limitations and risks of AI agents.',
        'LO15. Design and demonstrate a practical AI-related solution to a clearly defined problem.'
      ],
      rw: [
        'LO1. Gusobanura AI no gutandukanya AI, machine learning, deep learning na generative AI.',
        'LO2. Gusobanura imikorere y’ibanze n’imipaka ya Large Language Models.',
        'LO3. Gutahura amakosa ya AI (hallucinations), kubogama n’ibibazo by’umutekano w’amakuru.',
        'LO4. Gukoresha AI mu buryo burimo ubushishozi n’inshingano.',
        'LO5. Kwandika amabwiriza arimo uruhare, imiterere, igikorwa, amategeko n’imiterere y’igisubizo.',
        'LO6. Kunoza amabwiriza binyuze mu kugerageza no kugenzura ibisubizo.',
        'LO7. Gukoresha AI mu bushakashatsi, kwandika no kongera umusaruro hamwe n’igenzura.',
        'LO8. Kumenya imirimo isubirwamo ikwiye gukorwa n’imiyoboro yikoresha.',
        'LO9. Gushushanya imiyoboro ukoresheje triggers, inputs, actions, conditions na outputs.',
        'LO10. Kubaka no kugerageza umuyoboro w’ibanze utagombera kode.',
        'LO11. Gusobanura uko AI yinjira mu miyoboro yikoresha.',
        'LO12. Kubaka cyangwa kwerekana umuyoboro wa AI ufite ubugenzuzi bw’umuntu.',
        'LO13. Gutandukanya chatbots, AI assistants, automation workflows na AI agents.',
        'LO14. Gusobanura ibice, imipaka n’ibyago bya AI agents.',
        'LO15. Gutegura no kumurika igisubizo ngiro cya AI gikemura ikibazo gisobanutse.'
      ]
    },
    audience: {
      en: [
        'Secondary school students & recent graduates',
        'University & TVET students',
        'Beginners exploring AI & digital productivity',
        'Entrepreneurs & small business operators',
        'Content creators & administrative professionals'
      ],
      rw: [
        'Abanyeshuri bo mu mashuri yisumbuye n’abarangije vuba',
        'Abanyeshuri ba kaminuza n’aba TVET',
        'Abatangira kwiga AI no kongera umusaruro mu ikoranabuhanga',
        'Ba rwiyemezamirimo n’abacuruzi bato',
        'Abahanzi b’inyandiko n’abakozi b’ibiro'
      ]
    },
    deviceNote: {
      en: 'Foundational lessons & prompt exercises run on smartphones. A laptop is strongly recommended for Week 3–4 automation exercises. No paid AI subscription is mandatory.',
      rw: 'Amasomo y’ibanze n’imyitozo y’amabwiriza bikorera kuri telefoni. Mudasobwa irakenewe cyane mu myitozo y’imiyoboro yo mu cyumweru cya 3–4. Nta kwishyura porogaramu z’inyongera bisabwa.'
    }
  },
  {
    id: 'adv-prompting',
    slug: 'advanced-prompt-engineering',
    code: 'PRODUCT 02',
    status: 'upcoming',
    category: 'prompting',
    priceRwf: 5000,
    durationDays: 21,
    levelRange: 'Level 2–3 Deep Dive',
    title: {
      en: 'Advanced Prompt Engineering',
      rw: 'Kwandika Amabwiriza ya AI ku rwego rwisumbuye'
    },
    subtitle: {
      en: 'Systematized prompt architectures, evaluation rubrics, structured JSON outputs, and multilingual Kinyarwanda-English workflows.',
      rw: 'Imiterere ihambaye y’amabwiriza, ibipimo by’ubuziranenge n’imikorere ihuza Ikinyarwanda n’Icyongereza.'
    },
    description: {
      en: 'Built for graduates of the 28-Day Challenge who want repeatable prompt systems for research teams, software workflows, and content studios.',
      rw: 'Yateguriwe abarangije icyiciro cy’iminsi 28 bashaka kubaka uburyo bwizewe bwo gukoresha AI mu bushakashatsi no mu bigo by’imirimo.'
    },
    outcomes: {
      en: [
        'Design deterministic prompt chains with explicit verification steps.',
        'Evaluate model outputs with structured rubrics and test suites.',
        'Create bilingual English and Kinyarwanda prompt libraries.'
      ],
      rw: [
        'Gukora amabwiriza akurikirana afite ibipimo by’igenzura.',
        'Gusuzuma ibisubizo bya AI ukoresheje ibipimo bifatika.',
        'Kubaka ububiko bw’amabwiriza mu Kinyarwanda no mu Cyongereza.'
      ]
    },
    audience: {
      en: ['28-Day Challenge graduates', 'Researchers & analysts', 'Content leads'],
      rw: ['Abarangije icyiciro cy’iminsi 28', 'Abashakashatsi', 'Abanditsi b’ibikoresho by’uburezi']
    },
    deviceNote: {
      en: 'Laptop recommended for prompt testing notebooks and evaluation sheets.',
      rw: 'Mudasobwa irasabwa kugira ngo ugerageze neza amabwiriza n’imbonerahamwe.'
    }
  },
  {
    id: 'practical-ai-automation',
    slug: 'practical-ai-automation',
    code: 'PRODUCT 03',
    status: 'upcoming',
    category: 'automation',
    priceRwf: 8000,
    durationDays: 28,
    levelRange: 'Level 4–5 Applied',
    title: {
      en: 'Practical AI Automation',
      rw: 'Kubaka Imiyoboro ya AI Yikoresha'
    },
    subtitle: {
      en: 'End-to-end operational automations connecting Make, n8n, Google Workspace, and AI classification nodes.',
      rw: 'Guhuza Make, n8n, Google Workspace na AI kugira ngo ikigo gikore neza kandi vuba.'
    },
    description: {
      en: 'Learn to automate intake, invoice summaries, document routing, and multilingual customer triage with resilient error handling.',
      rw: 'Iga uko wahindura akazi ka buri munsi nko kwakira amakuru, kuyashyira mu byiciro no kuyagenzura ukoresheje ikoranabuhanga.'
    },
    outcomes: {
      en: [
        'Deploy multi-branch workflows with error recovery in Make and n8n.',
        'Combine Google Apps Script with AI extraction pipelines.',
        'Implement audit logs and human approval queues.'
      ],
      rw: [
        'Kubaka imiyoboro ifite amashami menshi muri Make na n8n.',
        'Guhuza Google Apps Script na AI mu gusesengura inyandiko.',
        'Gushyiraho uburyo bwo kugenzura no kwemeza ibikorwa.'
      ]
    },
    audience: {
      en: ['Operations managers', 'SME founders', 'Freelance automation builders'],
      rw: ['Abayobozi b’ibikorwa', 'Ba rwiyemezamirimo', 'Abubaka imiyoboro y’ikoranabuhanga']
    },
    deviceNote: {
      en: 'Requires a laptop and free accounts on Make or n8n.',
      rw: 'Bisaba mudasobwa na konti y’ubuntu kuri Make cyangwa n8n.'
    }
  },
  {
    id: 'building-ai-agents',
    slug: 'building-ai-agents',
    code: 'PRODUCT 04',
    status: 'upcoming',
    category: 'agents',
    priceRwf: 12000,
    durationDays: 28,
    levelRange: 'Level 6–7 Builder',
    title: {
      en: 'Building AI Agents',
      rw: 'Kubaka Abakozi ba AI (AI Agents)'
    },
    subtitle: {
      en: 'Tool-calling, grounded knowledge retrieval, scoped permissions, memory boundaries, and evaluation harnesses.',
      rw: 'Gukoresha ibikoresho, ububiko bw’ubumenyi, imipaka y’uburenganzira n’igenzura ry’imikorere ya Agent.'
    },
    description: {
      en: 'Move beyond static workflows into bounded multi-step AI agents engineered with strict safety, cost limits, and human escalation.',
      rw: 'Tera intambwe uve ku miyoboro isanzwe wubake AI Agents zifite umutekano, imipaka y’ikiguzi n’uburyo bwo gutabaza umuntu.'
    },
    outcomes: {
      en: [
        'Architect tool-augmented agents with explicit permission scopes.',
        'Connect verified document knowledge bases cleanly.',
        'Measure agent accuracy, latency, and failure modes.'
      ],
      rw: [
        'Gutegura imiterere ya Agent ifite ububasha bugenzuye.',
        'Guhuza inyandiko z’ukuri n’uburyo Agent ibaza amakuru.',
        'Gupima ubuziranenge n’amakosa ashobora kubaho.'
      ]
    },
    audience: {
      en: ['Technical learners', 'Automation engineers', 'Product builders'],
      rw: ['Abafite ubumenyi bw’ibanze muri tekinoloji', 'Abubaka sisitemu', 'Abategura ibikoresho bya AI']
    },
    deviceNote: {
      en: 'Laptop required with stable internet access for agent prototyping.',
      rw: 'Bisaba mudasobwa n’umurongo wa interineti uhoraho.'
    }
  },
  {
    id: 'ai-industries',
    slug: 'ai-automation-for-industries',
    code: 'PRODUCT 05',
    status: 'upcoming',
    category: 'industry',
    priceRwf: 10000,
    durationDays: 21,
    levelRange: 'Applied Sector Tracks',
    title: {
      en: 'AI Automation for Industries',
      rw: 'AI n’Imiyoboro mu Nzego z’Akazi'
    },
    subtitle: {
      en: 'Applied tracks for Education, Agriculture, Retail, Hospitality, NGOs, Customer Service, and Administration.',
      rw: 'Amasomo yihariye mu Burezi, Ubuhinzi, Ubucuruzi, Ubukerarugendo, Imiryango itegamiye kuri Leta n’ubuyobozi.'
    },
    description: {
      en: 'Sector-specific workshops demonstrating real workflows tailored to Rwandan schools, cooperatives, hotels, clinics, and NGOs.',
      rw: 'Amahugurwa yibanda ku bibazo nyacyo biboneka mu mashuri, amakoperative y’ubuhinzi, amahoteli n’ibigo byo mu Rwanda.'
    },
    outcomes: {
      en: [
        'Adapt reusable templates to agriculture, education, retail, or NGO reporting.',
        'Design privacy-compliant citizen and customer service workflows.'
      ],
      rw: [
        'Guhuza amabwiriza n’imiyoboro n’ibikenewe mu buhinzi, uburezi cyangwa ubucuruzi.',
        'Kubaka inzira zubahiriza amategeko arengera amakuru y’abantu.'
      ]
    },
    audience: {
      en: ['Educators & school leaders', 'Agribusiness teams', 'NGO & hospitality operators'],
      rw: ['Abarimu n’abayobozi b’amashuri', 'Amakoperative y’ubuhinzi', 'Abakozi b’imiryango n’amahoteli']
    },
    deviceNote: {
      en: 'Accessible on mobile for case studies; laptop needed for template customization.',
      rw: 'Ushobora gusoma kuri telefoni ariko gutegura imiyoboro bisaba mudasobwa.'
    }
  }
];

export const PRACTICAL_PROJECTS: PracticalProject[] = [
  {
    key: 'study_assistant',
    number: '01',
    title: { en: 'Personal AI Study Assistant', rw: 'Umufasha wawe wa AI mu Kwiga' },
    summary: {
      en: 'Use structured prompts to break down complex subjects, summarize reading materials, generate revision quizzes, and build weekly study plans.',
      rw: 'Koresha amabwiriza ateguye neza mu gusobanukirwa amasomo akomeye, guhinira inyandiko no gutegura gahunda yo gusubiramo.'
    },
    workflowSteps: {
      en: [
        'Collect syllabus topic or difficult textbook chapter',
        'Run structured explanation + analogy prompt template',
        'Generate 5 active-recall revision questions with answer key',
        'Verify facts against primary class notes before saving'
      ],
      rw: [
        'Kusanya ingingo cyangwa igice cy’isomo kikugora',
        'Koresha ibwiriza risobanura mu buryo bworoshye n’ingero',
        'Kora ibibazo 5 byo kwisuzuma hamwe n’ibisubizo',
        'Genzura ukuri kw’ibisubizo ukigereranya n’ibyo mwarimu yatanze'
      ]
    },
    tools: ['ChatGPT', 'Google Gemini', 'NotebookLM'],
    deliverable: {
      en: 'A documented 3-prompt study system plus one verified revision guide.',
      rw: 'Inyandiko irimo amabwiriza 3 n’umushinga w’isubiramo wagenzuwe.'
    }
  },
  {
    key: 'auto_registration',
    number: '02',
    title: { en: 'Automated Registration System', rw: 'Sisitemu Yikoresha yo Kwiyandikisha' },
    summary: {
      en: 'Build a complete Form -> Google Sheets -> Email workflow that captures registrations, organizes rows cleanly, and sends instant confirmations.',
      rw: 'Kubaka umuyoboro uhuza Google Form, Google Sheets na Email ukira abiyandikisha ugahita ubabwira ko byakunze.'
    },
    workflowSteps: {
      en: [
        'Create Google Form capturing name, email, phone, and track',
        'Link responses automatically to a structured Google Sheet',
        'Connect Make or Google Apps Script trigger on new row',
        'Send personalized confirmation email and log delivery status'
      ],
      rw: [
        'Tegura Google Form yakira amazina, imeri, telefoni n’icyiciro',
        'Huza ibisubizo bihite bijya muri Google Sheet',
        'Koresha Make cyangwa Apps Script iyo hinjiye umurongo mushya',
        'Ohereza ubutumwa bwa Email buhamya ko kwiyandikisha byagenze neza'
      ]
    },
    tools: ['Google Forms', 'Google Sheets', 'Make', 'Google Apps Script'],
    deliverable: {
      en: 'Live workflow screenshot/diagram, mapping sheet, and test run log.',
      rw: 'Ifoto cyangwa igishushanyo cy’umuyoboro ukora hamwe n’urupapuro rwa test.'
    }
  },
  {
    key: 'customer_inquiry',
    number: '03',
    title: { en: 'AI Customer Inquiry Assistant', rw: 'Umufasha wa AI mu Gusubiza Abakiriya' },
    summary: {
      en: 'Receive incoming customer questions, classify urgency and topic, extract key details, draft a bilingual reply, and route to a human for approval.',
      rw: 'Akira ibibazo by’abakiriya, ubishyire mu byiciro, ukuremo iby’ingenzi, utegure igisubizo ariko umuntu abanze acyemeze.'
    },
    workflowSteps: {
      en: [
        'Trigger when a customer submits an inquiry form or email',
        'AI node classifies category (Pricing, Support, Partnership) & language',
        'AI extracts customer name, product interest, and drafts reply',
        'Send draft to staff review sheet/Slack/Email for human approval'
      ],
      rw: [
        'Tangira igihe umukiriya yohereje ikibazo muri Form cyangwa Email',
        'AI ishyira ikibazo mu cyiciro ikareba n’ururimi rwakoreshejwe',
        'AI ikuramo izina n’igikenewe igategura igisubizo cy’ibanze',
        'Igisubizo kijya ku bakozi kugira ngo umuntu acyemeze mbere yo kucyohereza'
      ]
    },
    tools: ['Google Forms', 'Make', 'Zapier', 'Google Gemini', 'Google Sheets'],
    deliverable: {
      en: 'Classification prompt + human-approval checklist + sample processed inquiries.',
      rw: 'Ibwiriza rishyira mu byiciro, urutonde rw’igenzura ry’umuntu n’ingero 3 zakozwe.'
    }
  },
  {
    key: 'content_planning',
    number: '04',
    title: { en: 'Content Planning Workflow', rw: 'Umuyoboro wo Gutegura Inyandiko' },
    summary: {
      en: 'Turn audience questions into organized content topics, structured drafts, and a review-ready publishing calendar.',
      rw: 'Hindura ibibazo by’abantu mo ingingo z’inyandiko, utegure imbonerahamwe ya gahunda n’igenzura mbere yo gutangaza.'
    },
    workflowSteps: {
      en: [
        'Input weekly business or educational themes into Google Sheets',
        'Generate structured topic angles for English and Kinyarwanda',
        'Draft posts with strict tone and fact-check constraints',
        'Flag every draft as Pending Human Review prior to publication'
      ],
      rw: [
        'Andika ingingo z’icyumweru muri Google Sheets',
        'Koresha AI mu gutanga ibitekerezo mu Kinyarwanda n’Icyongereza',
        'Tegura inyandiko z’ibanze wubahirije amategeko y’ubuziranenge',
        'Shyira ikimenyetso cyo kugenzurwa n’umuntu mbere yo kubishyira hanze'
      ]
    },
    tools: ['Google Sheets', 'ChatGPT', 'n8n', 'Make'],
    deliverable: {
      en: '4-week editorial calendar sheet + reusable content prompt template.',
      rw: 'Imbonerahamwe y’ibyumweru 4 n’ibwiriza rikoreshwa kenshi.'
    }
  },
  {
    key: 'research_assistant',
    number: '05',
    title: { en: 'Research Document Assistant', rw: 'Umufasha mu Gusesengura Inyandiko z’Ubushakashatsi' },
    summary: {
      en: 'Analyze approved PDFs or policy documents, extract key insights, flag claims needing verification, and output structured notes.',
      rw: 'Sesengura inyandiko zemewe, ukurikiremo ingingo z’ingenzi, ugaragaze ibikeneye kugenzurwa kandi utange inshamake isobanutse.'
    },
    workflowSteps: {
      en: [
        'Upload approved source documents into NotebookLM or Gemini',
        'Extract executive summary, key statistics, and open questions',
        'Highlight every factual claim requiring primary citation check',
        'Export structured research brief with source page references'
      ],
      rw: [
        'Shyira inyandiko zemewe muri NotebookLM cyangwa Gemini',
        'Kuramo inshamake, imibare y’ingenzi n’ibibazo bisigaye',
        'Garagaza buri ngingo ikeneye kugenzurwa ku isoko y’ukuri',
        'Sohora inyandiko y’ubushakashatsi ifite aho ikomoka hasobanutse'
      ]
    },
    tools: ['NotebookLM', 'Google Gemini', 'Google Docs'],
    deliverable: {
      en: 'Structured research brief + verification log from an approved document.',
      rw: 'Inshamake y’ubushakashatsi n’inyandiko y’igenzura ry’ukuri.'
    }
  },
  {
    key: 'independent_final',
    number: '06',
    title: { en: 'Independent Final Project', rw: 'Umushinga wa Nyuma Wigenga' },
    summary: {
      en: 'Choose a real problem in Education, Small Business, Productivity, Content Creation, Community Organizations, or Agriculture and build a tested, documented prototype.',
      rw: 'Hitamo ikibazo nyacyo mu Burezi, Ubucuruzi Buto, Umusaruro, Inyandiko, Imiryango cyangwa Ubuhinzi wubake igisubizo cyageragejwe kandi gisobanutse.'
    },
    workflowSteps: {
      en: [
        'Define a clear problem and target requirements (Days 27)',
        'Design the prompt chain, no-code workflow, or safe AI prototype',
        'Run real test scenarios, capture limitations, and add human approval checks',
        'Prepare clear documentation and demonstrate the solution (Day 28)'
      ],
      rw: [
        'Sobanura ikibazo nyacyo n’ibisabwa (Umunsi wa 27)',
        'Tegura imiterere y’amabwiriza cyangwa umuyoboro wa AI ufite umutekano',
        'Gerageza mu bikorwa, garagaza imipaka n’aho umuntu agenzura',
        'Tegura inyandiko isobanutse umurike igisubizo (Umunsi wa 28)'
      ]
    },
    tools: ['ChatGPT', 'Google Gemini', 'Make / Zapier', 'Google Workspace'],
    deliverable: {
      en: 'Defined problem, proposed solution, demonstrable prototype, testing evidence, limitations & documentation (30% course weight).',
      rw: 'Ikibazo gisobanutse, igisubizo, icyitegererezo gikora, ibimenyetso by’igerageza n’inyandiko (30% by’amanota).'
    }
  }
];

export const BLUEPRINT_GRADING_BREAKDOWN: AssessmentWeightItem[] = [
  {
    id: 'w1_quiz',
    label: { en: 'Week 1 Knowledge Assessment', rw: 'Isuzuma ry’Icyumweru cya 1 (Ubumenyi)' },
    weightPct: 5,
    requirement: {
      en: 'Covers AI foundations, hallucinations, bias & responsible use (Day 7).',
      rw: 'Rikubiyemo intangiriro za AI, amakosa ya AI, kubogama n’inshingano (Umunsi wa 7).'
    }
  },
  {
    id: 'w2_prompt',
    label: { en: 'Week 2 Knowledge & Prompt Assignment', rw: 'Icyumweru cya 2 — Amabwiriza & Ububiko' },
    weightPct: 15,
    requirement: {
      en: 'Prompt quality quiz + personal prompt library of 10+ tested prompts (Day 14).',
      rw: 'Ikizamini n’ububiko bw’amabwiriza nibura 10 yageragejwe (Umunsi wa 14).'
    }
  },
  {
    id: 'w3_automation',
    label: { en: 'Week 3 Workflow & Automation Assessment', rw: 'Icyumweru cya 3 — Imiyoboro Yikoresha' },
    weightPct: 20,
    requirement: {
      en: 'Workflow mapping, data mapping, and Form → Sheets → Email build (Day 21).',
      rw: 'Igishushanyo cy’inzira, guhuza amakuru n’umuyoboro wa Form → Sheets → Email (Umunsi wa 21).'
    }
  },
  {
    id: 'w4_ai_auto',
    label: { en: 'Week 4 Knowledge & Practical Assessment', rw: 'Icyumweru cya 4 — AI Automation & Agents' },
    weightPct: 15,
    requirement: {
      en: 'AI inquiry workflow evaluation, agent design risks, and final quiz (Day 28).',
      rw: 'Umuyoboro wa AI, imipaka ya AI Agent n’ikizamini gisoza (Umunsi wa 28).'
    }
  },
  {
    id: 'final_project',
    label: { en: 'Independent Final Project', rw: 'Umushinga wa Nyuma Wigenga' },
    weightPct: 30,
    requirement: {
      en: 'Strongest evidence of practical mastery, graded via the 7-criterion rubric.',
      rw: 'Ikigaragaza ubushobozi bwo gushyira mu bikorwa, gisuzumwa hakoreshejwe ibipimo 7.'
    }
  },
  {
    id: 'practical_exercises',
    label: { en: 'Practical Exercises & Participation Evidence', rw: 'Imyitozo Ngiro n’Ibimenyetso bya Buri Munsi' },
    weightPct: 15,
    requirement: {
      en: 'Daily deliverable worksheets completed across the 28-day curriculum.',
      rw: 'Impapuro n’ibimenyetso by’imyitozo ya buri munsi mu minsi 28.'
    }
  }
];

export const FINAL_PROJECT_RUBRIC_7: RubricCriterion[] = [
  {
    id: 'problem_identification',
    criterion: { en: 'Problem Identification', rw: 'Gusobanura Ikibazo' },
    weightPct: 15,
    description: {
      en: 'Clear, realistic Rwandan community, study, or business bottleneck with target users.',
      rw: 'Ikibazo nyacyo mu Rwanda mu masomo cyangwa mu bucuruzi hamwe n’abo kigenewe.'
    }
  },
  {
    id: 'solution_workflow_design',
    criterion: { en: 'Solution & Workflow Design', rw: 'Imiterere y’Igisubizo n’Umuyoboro' },
    weightPct: 15,
    description: {
      en: 'Logical triggers, inputs, prompts, conditions, and outputs mapped cleanly.',
      rw: 'Ibitangira, ibyinjira, amabwiriza, amategeko n’ibisohoka biteguye neza.'
    }
  },
  {
    id: 'appropriate_ai_use',
    criterion: { en: 'Appropriate AI Use', rw: 'Gukoresha AI Mu Buryo Bukwiye' },
    weightPct: 15,
    description: {
      en: 'AI applied only where language reasoning helps; deterministic rules used where reliable.',
      rw: 'AI ikoreshwa aho ikenewe koko; amategeko asanzwe agakoreshwa aho bikwiye.'
    }
  },
  {
    id: 'functionality_demo',
    criterion: { en: 'Functionality & Demonstration', rw: 'Imikorere n’Imurikabikorwa' },
    weightPct: 20,
    description: {
      en: 'Working prototype, prompt library, or scenario demonstrated with real inputs.',
      rw: 'Igisubizo cyubatswe gikora neza cyerekanwe hakoreshejwe ingero z’ukuri.'
    }
  },
  {
    id: 'testing_error_handling',
    criterion: { en: 'Testing & Error Handling', rw: 'Igerageza no Gukemura Amakosa' },
    weightPct: 15,
    description: {
      en: 'Evidence of testing happy-path and edge-case/missing-input scenarios.',
      rw: 'Ibimenyetso ko wagerageje ibisubizo byiza n’igihe hari ibibura.'
    }
  },
  {
    id: 'safety_human_oversight',
    criterion: { en: 'Safety & Human Oversight', rw: 'Umutekano n’Ubugenzuzi bw’Umuntu' },
    weightPct: 10,
    description: {
      en: 'Privacy protection (Law No. 058/2021) and explicit human approval gates.',
      rw: 'Kurinda amakuru bwite (Itegeko N° 058/2021) n’aho umuntu abanza kwemeza.'
    }
  },
  {
    id: 'documentation_explanation',
    criterion: { en: 'Documentation & Explanation', rw: 'Inyandiko n’Ibisobanuro' },
    weightPct: 10,
    description: {
      en: 'Honest limitations, reproducible steps, and clear learner reflection.',
      rw: 'Imipaka igaragazwa mu kuri, intambwe zisobanutse n’inyandiko zuzuye.'
    }
  }
];

export const INDUSTRY_LEARNING_PATHS_PRESETS: IndustryPathPreset[] = [
  {
    id: 'path_education',
    sectorCode: '20.1',
    titleEn: 'AI in Education',
    titleRw: 'AI mu Burezi n’Amashuri',
    descriptionEn: 'Study assistants, bilingual lesson summaries, NotebookLM revision guides, and safe academic integrity workflows for students and teachers.',
    descriptionRw: 'Abafasha bo kwiga, guhinira amasomo mu ndimi zombi, NotebookLM n’uburezi bwubahiriza ubunyangamugayo.',
    recommendedDays: [1, 5, 6, 8, 11, 12, 28],
    courseIds: ['challenge-28']
  },
  {
    id: 'path_small_business',
    sectorCode: '20.2',
    titleEn: 'AI in Small Businesses',
    titleRw: 'AI mu Bucuruzi Buto n’Ibigo Bito',
    descriptionEn: 'WhatsApp & email customer response drafting, Google Form registration automation, and daily operations organization for Rwandan SMEs.',
    descriptionRw: 'Gutegura ubutumwa bw’abakiriya, kwiyandikisha mu buryo bwikoresha no gutunganya imirimo ya buri munsi mu bigo bito.',
    recommendedDays: [8, 9, 15, 16, 19, 22, 24],
    courseIds: ['challenge-28']
  },
  {
    id: 'path_marketing_content',
    sectorCode: '20.3',
    titleEn: 'AI in Marketing and Content Creation',
    titleRw: 'AI mu Kwamamaza no Gutegura Inyandiko',
    descriptionEn: 'Structured audience prompts, prompt chaining for bilingual campaigns, and 4-week editorial calendars with human tone review.',
    descriptionRw: 'Amabwiriza ategura inyandiko z’Icyongereza n’Ikinyarwanda hamwe na gahunda yo gutangaza igenzuwe n’umuntu.',
    recommendedDays: [8, 9, 10, 12, 13, 23, 27],
    courseIds: ['challenge-28']
  },
  {
    id: 'path_agriculture',
    sectorCode: '20.4',
    titleEn: 'AI in Agriculture & Cooperatives',
    titleRw: 'AI mu Buhinzi n’Amakoperative',
    descriptionEn: 'Cooperative member intake via Forms/Sheets, bilingual extension summaries, and inquiry classification with human coordinator sign-off.',
    descriptionRw: 'Kwakira ibibazo by’abanyamuryango b’amakoperative, guhinira amakuru no gusubiza binyuze mu bugenzuzi bw’umuntu.',
    recommendedDays: [1, 6, 11, 16, 19, 22, 24],
    courseIds: ['challenge-28']
  },
  {
    id: 'path_finance_admin',
    sectorCode: '20.5',
    titleEn: 'AI in Finance and Administration',
    titleRw: 'AI mu Butegetsi n’Imari',
    descriptionEn: 'Structured data extraction, audit-ready record tracking in Google Sheets, error-handling conditions, and strict data privacy boundaries.',
    descriptionRw: 'Gukura amakuru mu nyandiko, gutondeka imbonerahamwe z’ububiko n’amategeko arinda amakuru y’imari.',
    recommendedDays: [5, 6, 10, 18, 20, 23, 26],
    courseIds: ['challenge-28']
  },
  {
    id: 'path_customer_service',
    sectorCode: '20.6',
    titleEn: 'AI in Customer Service',
    titleRw: 'AI mu Gufasha Abakiriya',
    descriptionEn: 'Automated ticket triage, topic extraction, bilingual response drafting, and mandatory human-approval queues.',
    descriptionRw: 'Gushyira ibibazo by’abakiriya mu byiciro no gutegura ibisubizo bihabwa umukozi ngo abyemeze.',
    recommendedDays: [8, 17, 19, 22, 23, 24, 26],
    courseIds: ['challenge-28']
  },
  {
    id: 'path_software_dev',
    sectorCode: '20.7',
    titleEn: 'AI in Software Development',
    titleRw: 'AI mu Kubaka Porogaramu',
    descriptionEn: 'JSON & structured outputs, API/webhook concepts, Google Apps Script extensions, and agent architecture safety.',
    descriptionRw: 'Imiterere ya JSON, APIs na webhooks, Google Apps Script n’umutekano w’imikorere ya AI Agents.',
    recommendedDays: [4, 10, 17, 18, 20, 25, 26],
    courseIds: ['challenge-28']
  },
  {
    id: 'path_ngos_community',
    sectorCode: '20.8',
    titleEn: 'AI in NGOs and Community Organizations',
    titleRw: 'AI mu Miryango Itegamiye kuri Leta',
    descriptionEn: 'Participant registration workflows, donor/impact document synthesis, privacy compliance (Law No. 058/2021), and low-bandwidth delivery.',
    descriptionRw: 'Kwandika abitabiriye gahunda, gusesengura raporo n’uburinzi bw’amakuru bwite mu miryango.',
    recommendedDays: [1, 6, 11, 15, 19, 24, 28],
    courseIds: ['challenge-28']
  }
];

export const PRODUCTION_INVENTORY_SECTIONS: BlueprintInventorySection[] = [
  {
    id: 'academic_docs',
    title: { en: 'Academic Documents (7)', rw: 'Inyandiko z’Amasomo (7)' },
    items: [
      { id: 'doc_desc', label: { en: 'Final course description', rw: 'Ibisobanuro byuzuye by’isomo' } },
      { id: 'doc_los', label: { en: 'Course learning outcomes (LO1–LO15)', rw: 'Intego 15 z’isomo (LO1–LO15)' } },
      { id: 'doc_7level', label: { en: 'Seven-level competency mapping', rw: 'Ihuza n’ibyiciro 7 by’ubumenyi' } },
      { id: 'doc_28day', label: { en: '28-day curriculum schedule', rw: 'Gahunda y’iminsi 28' } },
      { id: 'doc_template', label: { en: '16-part lesson production template', rw: 'Imiterere y’amasomo y’ibice 16' } },
      { id: 'doc_policy', label: { en: 'Assessment policy', rw: 'Amabwiriza y’isuzuma' } },
      { id: 'doc_rubric', label: { en: 'Final project grading rubrics (7 criteria)', rw: 'Ibipimo 7 byo gutanga amanota' } }
    ]
  },
  {
    id: 'daily_lessons',
    title: { en: '28 Daily Lessons (28)', rw: 'Amasomo ya Buri Munsi (28)' },
    items: Array.from({ length: 28 }, (_, idx) => ({
      id: `lesson_day_${idx + 1}`,
      label: { en: `Day ${idx + 1} lesson content`, rw: `Isomo ry’Umunsi wa ${idx + 1}` }
    }))
  },
  {
    id: 'projects',
    title: { en: 'Practical Projects (6)', rw: 'Imishinga Ngiro (6)' },
    items: [
      { id: 'proj_1', label: { en: 'Project 1: Personal AI Study Assistant', rw: 'Umushinga 1: Umufasha mu Kwiga' } },
      { id: 'proj_2', label: { en: 'Project 2: Automated Registration System', rw: 'Umushinga 2: Sisitemu yo Kwiyandikisha' } },
      { id: 'proj_3', label: { en: 'Project 3: AI Customer Inquiry Assistant', rw: 'Umushinga 3: Umufasha mu Gusubiza Abakiriya' } },
      { id: 'proj_4', label: { en: 'Project 4: Content Planning Workflow', rw: 'Umushinga 4: Umuyoboro wo Gutegura Inyandiko' } },
      { id: 'proj_5', label: { en: 'Project 5: Research Document Assistant', rw: 'Umushinga 5: Umufasha mu Bushakashatsi' } },
      { id: 'proj_6', label: { en: 'Project 6: Independent Final Project', rw: 'Umushinga 6: Umushinga wa Nyuma Wigenga' } }
    ]
  },
  {
    id: 'assessments',
    title: { en: 'Assessments & Guides (6)', rw: 'Amasuzuma n’Ibisobanuro (6)' },
    items: [
      { id: 'ass_w1', label: { en: 'Week 1 assessment', rw: 'Isuzuma ry’Icyumweru cya 1' } },
      { id: 'ass_w2', label: { en: 'Week 2 assessment', rw: 'Isuzuma ry’Icyumweru cya 2' } },
      { id: 'ass_w3', label: { en: 'Week 3 assessment', rw: 'Isuzuma ry’Icyumweru cya 3' } },
      { id: 'ass_w4', label: { en: 'Week 4 assessment', rw: 'Isuzuma ry’Icyumweru cya 4' } },
      { id: 'ass_final', label: { en: 'Final assessment & project evaluation', rw: 'Isuzuma rya nyuma' } },
      { id: 'ass_guides', label: { en: 'Answer explanations and marking guides', rw: 'Ibisobanuro by’ibisubizo n’amabwiriza yo gukosora' } }
    ]
  },
  {
    id: 'learner_resources',
    title: { en: 'Learner Toolkit Resources (8)', rw: 'Ibikoresho by’Umunyeshuri (8)' },
    items: [
      { id: 'res_prompt_tpl', label: { en: 'Prompt template collection', rw: 'Urutonde rw’amabwiriza fatizo' } },
      { id: 'res_prompt_lib', label: { en: 'Prompt library worksheet', rw: 'Urupapuro rw’ububiko bw’amabwiriza' } },
      { id: 'res_workflow', label: { en: 'Workflow mapping template', rw: 'Igishushanyo cy’imikorere' } },
      { id: 'res_datamap', label: { en: 'Data mapping worksheet', rw: 'Urupapuro rwo guhuza amakuru' } },
      { id: 'res_testing', label: { en: 'Automation testing checklist', rw: 'Urutonde rwo kugerageza imiyoboro' } },
      { id: 'res_eval', label: { en: 'AI output evaluation checklist', rw: 'Urutonde rwo kugenzura ibisubizo bya AI' } },
      { id: 'res_agent', label: { en: 'Agent design canvas', rw: 'Igishushanyo cya AI Agent' } },
      { id: 'res_projdoc', label: { en: 'Project documentation template', rw: 'Urupapuro rw’inyandiko y’umushinga' } }
    ]
  },
  {
    id: 'media_delivery',
    title: { en: 'Media & Delivery Formats (7)', rw: 'Amashusho n’Uburyo bw’Imitangire (7)' },
    items: [
      { id: 'med_slides', label: { en: 'Lesson slides & visual diagrams', rw: 'Imbonerahamwe n’amashusho y’isomo' } },
      { id: 'med_demos', label: { en: 'Demonstration recordings', rw: 'Amashusho y’imyitozo ngiro' } },
      { id: 'med_notes', label: { en: 'Downloadable lesson notes', rw: 'Inyandiko z’isomo zikurwa kuri murandasi' } },
      { id: 'med_datasets', label: { en: 'Sample datasets', rw: 'Amakuru y’icyitegererezo yo kwitorezaho' } },
      { id: 'med_en', label: { en: 'English versions verified', rw: 'Inyandiko z’Icyongereza zagenzuwe' } },
      { id: 'med_rw', label: { en: 'Kinyarwanda versions reviewed', rw: 'Inyandiko z’Ikinyarwanda zagenzuwe' } },
      { id: 'med_lowbw', label: { en: 'Low-bandwidth text alternatives', rw: 'Uburyo bworoshye budatwara interineti nyinshi' } }
    ]
  }
];

export const LEARNING_TOOLS: LearningTool[] = [
  {
    name: 'ChatGPT',
    category: { en: 'AI Interaction & Prompting', rw: 'Ikiganiro no Kwandika Amabwiriza' },
    purpose: {
      en: 'Structured prompting, brainstorming, iterative drafting, and study dialogues.',
      rw: 'Kwandika amabwiriza meza, gutekereza ku mishinga no gusobanukirwa amasomo.'
    },
    freeTierNote: { en: 'Free tier sufficient for all Week 1–2 exercises.', rw: 'Igice cy’ubuntu kirahagije mu myitozo yose.' },
    url: 'https://chatgpt.com'
  },
  {
    name: 'Google Gemini',
    category: { en: 'Multimodal AI & Analysis', rw: 'AI Isesengura Inyandiko n’Amashusho' },
    purpose: {
      en: 'Document analysis, Workspace reasoning, and multimodal experimentation.',
      rw: 'Gusesengura inyandiko ndende, guhuza na Google Workspace n’ibindi bikorwa.'
    },
    freeTierNote: { en: 'Free Google account access included.', rw: 'Ikoreshwa ku buntu ukoresheje konti ya Google.' },
    url: 'https://gemini.google.com'
  },
  {
    name: 'NotebookLM',
    category: { en: 'Grounded Document Research', rw: 'Ubushakashatsi ku Nyandiko' },
    purpose: {
      en: 'Source-grounded Q&A, citation checks, and study guides from approved PDFs.',
      rw: 'Gusoma inyandiko z’umwimerere utanga ibisubizo bifite aho bishingiye.'
    },
    freeTierNote: { en: 'Free web access with Google account.', rw: 'Bikoreshwa ku buntu kuri interineti.' },
    url: 'https://notebooklm.google.com'
  },
  {
    name: 'Google Forms',
    category: { en: 'Data Collection', rw: 'Kwakira Amakuru' },
    purpose: {
      en: 'Structured registration, survey, and customer inquiry intake.',
      rw: 'Kwakira abiyandikisha, amakuru y’abakiriya n’ibibazo mu buryo busobanutse.'
    },
    freeTierNote: { en: '100% free with Google account.', rw: 'Ubuntu 100% kuri Google.' },
    url: 'https://docs.google.com/forms'
  },
  {
    name: 'Google Sheets',
    category: { en: 'Data Organization', rw: 'Gutondeka Amakuru' },
    purpose: {
      en: 'Lightweight operational database for workflows, logs, and planning calendars.',
      rw: 'Ububiko bworoshye bw’amakuru akoreshwa mu miyoboro no gutegura gahunda.'
    },
    freeTierNote: { en: '100% free with Google account.', rw: 'Ubuntu 100% kuri Google.' },
    url: 'https://sheets.google.com'
  },
  {
    name: 'Make',
    category: { en: 'Visual Workflow Automation', rw: 'Imiyoboro Yikoresha Mu Mashusho' },
    purpose: {
      en: 'Visual scenario builder connecting Forms, Sheets, Email, and AI nodes.',
      rw: 'Kubaka imiyoboro ihuza porogaramu zinyuranye mu buryo bugaragara neza.'
    },
    freeTierNote: { en: 'Free tier includes 1,000 operations/month.', rw: 'Igice cy’ubuntu gitanga ibikorwa 1,000 ku kwezi.' },
    url: 'https://www.make.com'
  },
  {
    name: 'Zapier',
    category: { en: 'App Integration', rw: 'Guhuza Porogaramu' },
    purpose: {
      en: 'Fast trigger-action connections across thousands of web applications.',
      rw: 'Guhuza porogaramu zisanzwe mu buryo bwihuse kandi bworoshye.'
    },
    freeTierNote: { en: 'Free plan supports 2-step Zaps for practice.', rw: 'Ubuntu ku miyoboro mito y’imyitozo.' },
    url: 'https://zapier.com'
  },
  {
    name: 'n8n',
    category: { en: 'Advanced & AI Workflows', rw: 'Imiyoboro Igezweho ya AI' },
    purpose: {
      en: 'Node-based workflow automation and AI agent orchestration.',
      rw: 'Kubaka imiyoboro yimbitse ya AI n’uburyo bwo guhuza amakuru.'
    },
    freeTierNote: { en: 'Self-hostable Community Edition or cloud trial.', rw: 'Ifite uburyo bwo kwishyiriraho ku buntu.' },
    url: 'https://n8n.io'
  },
  {
    name: 'Google Apps Script',
    category: { en: 'Code-Based Automation', rw: 'Ikoranabuhanga Rikoresha Kode Yoroheje' },
    purpose: {
      en: 'Lightweight JavaScript automation directly inside Google Forms, Sheets, and Gmail.',
      rw: 'Kwandika kode yoroheje ihuza Google Forms, Sheets na Gmail ku buntu.'
    },
    freeTierNote: { en: '100% free inside Google Workspace.', rw: 'Ubuntu 100% muri Google Workspace.' },
    url: 'https://script.google.com'
  }
];

export const TEMPLATE_RESOURCES: TemplateResource[] = [
  {
    id: 'tpl-prompt-library',
    category: 'prompting',
    title: { en: 'Structured Prompt & Evaluation Worksheet', rw: 'Urupapuro rw’Amabwiriza n’Isuzuma' },
    description: {
      en: 'Includes the 5-part prompt anatomy template, role/constraint checklist, and 4-point output evaluation scorecard.',
      rw: 'Rurimo ibice 5 bigize ibwiriza ryiza, urutonde rw’amategeko n’ibipimo byo kugenzura igisubizo.'
    },
    filename: 'ai-rwanda-prompt-worksheet.md',
    contentEn: `# AI Education Rwanda — Structured Prompt & Evaluation Worksheet

## 1. Five-Part Prompt Template
- **Role**: Who should the AI act as? (e.g., "Act as a practical business analyst in Kigali.")
- **Context**: What background facts, audience, and language apply?
- **Task**: What exact action must be performed?
- **Constraints**: Word limit, tone, banned assumptions, "state when unsure".
- **Output Format**: Bullet list, comparison table, or numbered steps.

## 2. Prompt Evaluation Checklist
- [ ] Did the prompt specify clear context and audience?
- [ ] Did I verify factual claims against a trusted source?
- [ ] Are instructions unambiguous enough to reuse next week?
- [ ] Is private/personal data removed before pasting?
`,
    contentRw: `# AI Education Rwanda — Urupapuro rw'Amabwiriza n'Isuzuma

## 1. Ibice 5 bigize ibwiriza ryiza
- **Uruhare (Role)**: AI ikore nka nde? (Urugero: "Kora nk'umujyanama w'ubucuruzi i Kigali.")
- **Imiterere (Context)**: Ni ayahe makuru y'ibanze n'ururimi bikenewe?
- **Igikorwa (Task)**: Ni iki AI igomba gukora neza neza?
- **Imipaka (Constraints)**: Uburebure bw'inyandiko, ikinyabupfura, kutihimbira amakuru.
- **Imiterere y'igisubizo (Format)**: Urutonde, imbonerahamwe, cyangwa intambwe zikurikirana.

## 2. Igenzura ry'igisubizo
- [ ] Ese ibwiriza ririmo amakuru ahagije?
- [ ] Ese nagenzuye ukuri kw'ibyo AI yavuze?
- [ ] Ese nakuyemo amakuru y'ibanga ry'abantu mbere yo kubyandika?
`
  },
  {
    id: 'tpl-workflow-map',
    category: 'automation',
    title: { en: 'Workflow Mapping & Data Sheet', rw: 'Igishushanyo cy’Umuyoboro n’Amakuru' },
    description: {
      en: 'Plan triggers, inputs, outputs, data field mapping, error paths, and testing cases before building in Make or Zapier.',
      rw: 'Tegura igitangiza igikorwa, amakuru yinjira, asohoka n’uburyo bwo gukemura amakosa mbere yo kubaka.'
    },
    filename: 'ai-rwanda-workflow-mapping-template.md',
    contentEn: `# AI Education Rwanda — Workflow Mapping & Testing Sheet

## Process Overview
- **Process Name**:
- **Manual Time Before Automation**:
- **Trigger Event**: (e.g., New Google Form submission)
- **Expected Output**: (e.g., Row added to Google Sheets + confirmation email sent)

## Data Field Mapping
| Source Field (Form) | Destination Column (Sheet) | Validation Rule |
| --- | --- | --- |
| Full Name | Column A | Non-empty text |
| Email | Column B | Valid email format |
| Track Choice | Column C | Allowed enum |

## Error Handling & Testing Checklist
- [ ] Tested with valid input
- [ ] Tested with missing optional field
- [ ] Verified duplicate submissions are handled safely
- [ ] Verified human notification on failure
`,
    contentRw: `# AI Education Rwanda — Igishushanyo cy'Umuyoboro

## Incamake y'Igikorwa
- **Izina ry'igikorwa**:
- **Igihe cyafataga mbere**:
- **Igitangiza igikorwa (Trigger)**: (Urugero: Umuntu yujuje Google Form)
- **Igisohoka (Output)**: (Urugero: Umurongo muri Sheets + Email yemeza)

## Igenzura ry'Amakosa
- [ ] Nagerageje amakuru yuzuye neza
- [ ] Nagenzuye igihe hari ikibura
- [ ] Narebye ko hatabaho kohereza kabiri ku makuru amwe
`
  },
  {
    id: 'tpl-human-approval',
    category: 'ai_automation',
    title: { en: 'AI Automation & Human Approval Canvas', rw: 'Urwego rwo Kugenzura AI n’Umuntu' },
    description: {
      en: 'Classification, extraction, and response drafting prompts paired with mandatory human-in-the-loop safety gates.',
      rw: 'Amabwiriza yo gushyira mu byiciro no gutegura ibisubizo hamwe n’aho umuntu agenzura mbere yo kwemeza.'
    },
    filename: 'ai-rwanda-human-approval-canvas.md',
    contentEn: `# AI Education Rwanda — AI Automation & Human Approval Canvas

## 1. AI Task Boundary
- **Allowed AI Actions**: Classify inquiry, extract name/topic, draft polite response.
- **Forbidden AI Actions**: Never issue refunds, never promise legal/medical outcomes, never send external email without human review.

## 2. Human Approval Checklist
- [ ] Fact-checked prices, dates, and policy claims
- [ ] Tone matches organization standards
- [ ] No sensitive customer PII leaked in prompt logs
- [ ] Human reviewer clicked "Approve" before delivery
`,
    contentRw: `# AI Education Rwanda — Igenzura rya AI n'Umuntu

## 1. Imipaka ya AI
- **Ibyo AI yemerewe**: Gushyira ikibazo mu cyiciro, gukuramo amazina, gutegura igisubizo cy'ibanze.
- **Ibyo AI itagomba gukora**: Ntikwiye kwishyura amafaranga, gutanga amasezerano cyangwa kohereza ubutumwa itagenzuwe.

## 2. Igenzura ry'Umukozi
- [ ] Nagenzuye ko ibiciro n'amatariki ari ukuri
- [ ] Imvugo ikwiye abakiriya
- [ ] Nta makuru y'ibanga yasohotse
`
  },
  {
    id: 'tpl-project-rubric',
    category: 'project',
    title: { en: 'Final Project Proposal & Evaluation Rubric', rw: 'Inyandiko y’Umushinga wa Nyuma n’Amanota' },
    description: {
      en: 'Official project proposal template, demonstration checklist, and 100-point grading rubric for the 28-Day Challenge.',
      rw: 'Urupapuro rwo gutegura umushinga wa nyuma, urutonde rwo kumurika n’uko amanota atangwa.'
    },
    filename: 'ai-rwanda-final-project-rubric.md',
    contentEn: `# AI Education Rwanda — Final Project Rubric (30% Course Weight)

## Grading Criteria (100 Points)
1. **Real Problem Clarity (20 pts)**: Clearly defines a real problem, target users, and manual bottleneck.
2. **Workflow & Architecture Design (25 pts)**: Logical triggers, inputs, outputs, and tool selection.
3. **Practical Execution & Testing (25 pts)**: Working prompts or automation demonstrated with test evidence.
4. **Safety, Verification & Human Oversight (15 pts)**: Explicitly addresses AI errors, privacy, and approval gates.
5. **Documentation & Clarity (15 pts)**: Complete summary, reproducible steps, and clean demonstration.
`,
    contentRw: `# AI Education Rwanda — Isuzuma ry'Umushinga wa Nyuma (30%)

## Ibishingirwaho mu Gutanga Amanota (100)
1. **Ikibazo gisobanutse (15%)**: Ikibazo nyacyo n'abo kigenewe.
2. **Imiterere y'igisubizo n'umuyoboro (15%)**: Ibitangira, ibyinjira n'ibisohoka biteguye neza.
3. **Gukoresha AI mu buryo bukwiye (15%)**: Guhitamo neza aho AI ikenewe n'aho amategeko asanzwe ahagije.
4. **Imikorere n'imurikabikorwa (20%)**: Umushinga ukora kandi wagaragajwe mu myitozo.
5. **Igerageza no gukemura amakosa (15%)**: Kugaragaza ko umuyoboro wagenzuwe ku makuru atandukanye.
6. **Umutekano n'igenzura ry'umuntu (10%)**: Kurinda amakuru bwite n'aho umuntu abanza kwemeza.
7. **Inyandiko n'ibisobanuro (10%)**: Inyandiko zuzuye zigaragaza imipaka n'intambwe.
`
  },
  {
    id: 'tpl-factcheck-log',
    category: 'prompting',
    title: { en: 'Fact-Checking & AI Output Evaluation Log', rw: 'Inyandiko yo Kugenzura Ukuri kwa AI' },
    description: {
      en: 'Verify factual claims, dates, citations, and privacy boundaries before using any AI-generated output.',
      rw: 'Genzura ukuri kw’amakuru, amatariki n’umutekano mbere yo kwemeza ibyo AI yakoze.'
    },
    filename: 'ai-rwanda-factcheck-evaluation-log.md',
    contentEn: `# AI Education Rwanda — AI Output Verification Log

| Claim / Output Statement | Tool Used | Primary Source Checked | Status (Verified / Corrected / Removed) |
| --- | --- | --- | --- |
| Example: Cooperative policy limit | Gemini | Ministry / Cooperative doc p.4 | Verified |
| Example: Unverified statistic | ChatGPT | Not found in trusted source | Removed |
`,
    contentRw: `# AI Education Rwanda — Igenzura ry'Ukuri kw'Ibisubizo

| Icyo AI Yavuze | Porogaramu | Isoko Yagenzuwe | Umwanzuro (Byemejwe / Byakosowe / Byakuwemo) |
| --- | --- | --- | --- |
| Urugero: Amabwiriza ya koperative | Gemini | Inyandiko y'umwimerere urup. 4 | Byemejwe |
`
  },
  {
    id: 'tpl-agent-canvas',
    category: 'ai_automation',
    title: { en: 'AI Agent Design Canvas & Risk Matrix', rw: 'Igishushanyo cya AI Agent n’Igenzura ry’Ibyago' },
    description: {
      en: 'Define an agent role, allowed tools, knowledge boundary, prompt-injection safeguards, and human escalation rules.',
      rw: 'Garagaza inshingano za AI Agent, ibikoresho yemerewe, imipaka y’amakuru n’uko umuntu ayihagarika.'
    },
    filename: 'ai-rwanda-agent-design-canvas.md',
    contentEn: `# AI Education Rwanda — Agent Design Canvas

- **Agent Goal**: (Single focused objective)
- **Allowed Tools**: (e.g., Read Google Sheet row, Draft email reply)
- **Forbidden Actions**: (e.g., Never delete records, never send payments, never share PII)
- **Untrusted Input Protection**: Treat external customer emails as untrusted text, not instructions.
- **Human Escalation Rule**: Route uncertain or sensitive cases to human staff.
`,
    contentRw: `# AI Education Rwanda — Igishushanyo cya AI Agent

- **Intego ya Agent**: (Igikorwa kimwe gisobanutse)
- **Ibikoresho yemerewe**: (Gusoma Sheet, gutegura ubutumwa)
- **Ibyo ibujijwe**: (Gusiba amakuru, kwishyura, gusohora amakuru bwite)
- **Ubugenzuzi bw'umuntu**: Ibibazo bitizewe byoherezwa ku mukozi ubisuzuma.
`
  }
];

export const WORKSHOP_EVENTS: WorkshopEvent[] = [
  {
    id: 'evt-cohort-orientation',
    title: {
      en: '28-Day Practical AI Challenge — Live Cohort Orientation',
      rw: 'Icyiciro cy’iminsi 28 — Inama Itangiza Gahunda'
    },
    description: {
      en: 'Walk through the 7 learning levels, set up your free-tier tools (Gemini, ChatGPT, Google Workspace, Make), and meet fellow learners across Rwanda.',
      rw: 'Sobanukirwa ibyiciro 7 byo kwiga, utegure porogaramu z’ubuntu zikoreshwa kandi uhure n’abandi banyeshuri mu Rwanda.'
    },
    dateLabel: 'Nov 28, 2026',
    timeLabel: '18:00 – 19:30 CAT',
    format: 'hybrid',
    location: { en: 'Kigali Innovation Hub & Online Stream', rw: 'Kigali Innovation Hub & Kuri Interineti' },
    languageLabel: 'EN / RW',
    status: 'upcoming',
    featured: true,
    speaker: 'AI Education Rwanda Curriculum Team'
  },
  {
    id: 'evt-prompt-clinic-rw',
    title: {
      en: 'Bilingual Prompt Engineering Clinic (Kinyarwanda & English)',
      rw: 'Amahugurwa yo Kwandika Amabwiriza mu Kinyarwanda n’Icyongereza'
    },
    description: {
      en: 'Live before-and-after prompt refinement clinic. Bring a real study or small-business task and convert a weak prompt into a reusable template.',
      rw: 'Reba ingero z’uko bahindura ibwiriza ridafite ireme rikavamo igisubizo cyizewe mu kazi no mu masomo.'
    },
    dateLabel: 'Dec 03, 2026',
    timeLabel: '17:30 – 18:45 CAT',
    format: 'online',
    location: { en: 'Live Online Workshop', rw: 'Amahugurwa Kuri Interineti' },
    languageLabel: 'Kinyarwanda + EN',
    status: 'upcoming',
    speaker: 'Jean Bosco Habimana'
  },
  {
    id: 'evt-form-sheets-lab',
    title: {
      en: 'Hands-On Lab: Google Form → Sheets → Email Automation',
      rw: 'Imyitozo Ngiro: Huza Google Form, Sheets na Email'
    },
    description: {
      en: 'Step-by-step live build of Project 02 for student associations, cooperatives, and SMEs. Laptop recommended.',
      rw: 'Kubaka umuyoboro w’ikoranabuhanga ufasha amashyirahamwe n’ibigo bito kwakira abiyandikisha.'
    },
    dateLabel: 'Dec 10, 2026',
    timeLabel: '14:00 – 16:00 CAT',
    format: 'kigali_in_person',
    location: { en: 'Norrsken House Kigali · Room B', rw: 'Norrsken House Kigali · Icyumba B' },
    languageLabel: 'EN / RW',
    status: 'upcoming',
    speaker: 'Aline Uwimana'
  },
  {
    id: 'evt-ai-agents-safety',
    title: {
      en: 'AI Agents & Human Approval in Practice',
      rw: 'AI Agents n’Uruhare rw’Umuntu mu Kugenzura'
    },
    description: {
      en: 'How AI agents differ from ordinary chatbots, designing tool boundaries, and keeping humans in control of customer communication.',
      rw: 'Tandukanya chatbot isanzwe na AI Agent, wige no gushyiraho imipaka irinda ibigo amakosa.'
    },
    dateLabel: 'Dec 17, 2026',
    timeLabel: '18:00 – 19:15 CAT',
    format: 'online',
    location: { en: 'Live Online Seminar', rw: 'Ikiganiro Kuri Interineti' },
    languageLabel: 'EN / RW',
    status: 'upcoming',
    speaker: 'Eric Ndayisenga'
  },
  {
    id: 'evt-pilot-showcase',
    title: {
      en: 'Pilot Cohort Project Demonstration & Feedback Session',
      rw: 'Imurikabikorwa ry’Abanyeshuri ba Mbere'
    },
    description: {
      en: 'Recorded showcase of practical study assistants, agricultural cooperative summaries, and customer inquiry workflows built by pilot learners.',
      rw: 'Reba imishinga yamuritswe n’abanyeshuri ba mbere irimo iy’ubuhinzi, uburezi n’ubucuruzi.'
    },
    dateLabel: 'Nov 08, 2026',
    timeLabel: 'Recorded · 58 min',
    format: 'online',
    location: { en: 'On-Demand Archive', rw: 'Amashusho Abitse' },
    languageLabel: 'EN / RW',
    status: 'past',
    speaker: 'Pilot Cohort Alumni'
  }
];

export const OPERATING_PRINCIPLES: { en: string; rw: string }[] = [
  { en: 'Education before technology.', rw: 'Uburezi mbere y’ikoranabuhanga.' },
  { en: 'Practical skills before certificates.', rw: 'Ubumenyi ngiro mbere y’ibyemezo.' },
  { en: 'Understanding before memorizing prompts.', rw: 'Gusobanukirwa mbere yo gufata amabwiriza mu mutwe.' },
  { en: 'Workflow thinking before automation tools.', rw: 'Gutekereza ku mikorere mbere ya porogaramu.' },
  { en: 'Basic automation before AI agents.', rw: 'Ikoranabuhanga ry’ibanze mbere ya AI agents.' },
  { en: 'Human oversight for important decisions.', rw: 'Ubugenzuzi bw’umuntu ku byemezo bikomeye.' },
  { en: 'Verify AI-generated information.', rw: 'Genzura ukuri kw’ibyo AI yakoze.' },
  { en: 'Provide free-tool alternatives where possible.', rw: 'Tanga porogaramu z’ubuntu aho bishoboka.' },
  { en: 'Make lessons mobile-friendly & low-bandwidth.', rw: 'Amasomo yorohera telefoni kandi adasaba interineti nyinshi.' },
  { en: 'Create genuine English & Kinyarwanda content.', rw: 'Tanga amasomo y’umwimerere mu Cyongereza n’Ikinyarwanda.' },
  { en: 'Respect learner privacy (Law No. 058/2021).', rw: 'Kubaha uburenganzira ku makuru bwite (Itegeko N° 058/2021).' },
  { en: 'Do not claim unobtained accreditation.', rw: 'Kutiyitirira ibyemezo bitaraboneka mu buryo bwemewe.' }
];

export const SAMPLE_VERIFIED_CERTIFICATE: Certificate = {
  id: 'RW-AI-2026-0042',
  userId: 'sample_learner_kigali',
  learnerName: 'Claudine Mukamana',
  courseId: 'challenge-28',
  courseTitle: 'Certificate of Completion — 28-Day Practical AI Challenge',
  finalScore: 88,
  status: 'valid',
  issuedAt: '2026-11-12T10:30:00Z',
  issuedBy: 'AI Education Rwanda Academic Board'
};

export const UI_COPY = {
  brand: { en: 'AI Education Rwanda', rw: 'AI Education Rwanda' },
  nav: {
    home: { en: 'Home', rw: 'Ahabanza' },
    courses: { en: 'Courses', rw: 'Amasomo' },
    events: { en: 'Events', rw: 'Ibiganiro' },
    projects: { en: 'Projects', rw: 'Imishinga' },
    about: { en: 'About', rw: 'Ibyacu' },
    dashboard: { en: 'Learner Portal', rw: 'Ibikorwa byanjye' },
    founderControl: { en: 'Founder Control Center', rw: 'Ubuyobozi Bukuru' },
    staffConsole: { en: 'Staff Console', rw: 'Ibikorwa by’Abakozi' },
    admin: { en: 'Admin', rw: 'Ubuyobozi' },
    signIn: { en: 'Sign in', rw: 'Injira' },
    signOut: { en: 'Sign out', rw: 'Sohoka' },
    verify: { en: 'Verify certificate', rw: 'Genzura impamyabumenyi' }
  },
  hero: {
    kicker: {
      en: 'Rwanda & East Africa · English & Kinyarwanda',
      rw: 'U Rwanda & Afurika y’Iburasirazuba · Icyongereza & Ikinyarwanda'
    },
    headline: {
      en: 'Learn AI. Apply AI. Build with AI.',
      rw: 'Iga AI. Koresha AI. Wubake na AI.'
    },
    subheadline: {
      en: 'Practical AI education designed to move students, graduates, educators, and small businesses beyond basic chat into structured prompting, workflow automation, and AI-powered systems.',
      rw: 'Uburezi bwa AI mu bikorwa bujyana abanyeshuri, abarangije kwiga, abarimu n’ibigo bito kuva ku biganiro bisanzwe bakagera ku miyoboro yikoresha na sisitemu za AI.'
    },
    primaryCta: {
      en: 'Start 28-Day Challenge — 1,000 RWF',
      rw: 'Tangira Iminsi 28 — 1,000 RWF'
    },
    secondaryCta: {
      en: 'Preview free sample lessons',
      rw: 'Soma amasomo y’igerageza ku buntu'
    }
  }
} as const;
