import type {
  Certificate,
  Course,
  LearningLevel,
  LearningTool,
  PracticalProject,
  TemplateResource,
  WorkshopEvent
} from '../types';

export const LEARNING_LEVELS: LearningLevel[] = [
  {
    level: 1,
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
    outcome: {
      en: 'Explain core AI concepts clearly, identify AI limitations, and verify outputs before using them.',
      rw: 'Gusobanura iby’ibanze kuri AI, kumenya aho ifite intege nke, no kugenzura ibisubizo byayo mbere yo kubikoresha.'
    }
  },
  {
    level: 2,
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
    outcome: {
      en: 'Design, test, refine, and reuse prompt templates for study, research, and business tasks.',
      rw: 'Gukora, kugerageza no gukoresha kenshi amabwiriza afasha mu masomo, ubushakashatsi n’akazi ka buri munsi.'
    }
  },
  {
    level: 3,
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
    outcome: {
      en: 'Break down any business or school process into a clear step-by-step workflow blueprint.',
      rw: 'Gusesengura buri gikorwa cy’ubucuruzi cyangwa cy’ishuri ukagishyira mu nyandiko y’imikorere isobanutse.'
    }
  },
  {
    level: 4,
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
    outcome: {
      en: 'Build, test, and maintain practical no-code automations that eliminate manual copy-paste work.',
      rw: 'Kubaka no kugerageza imiyoboro yikoresha ikura imirimo yo kwimura amakuru n’intoki.'
    }
  },
  {
    level: 5,
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
    outcome: {
      en: 'Design automated pipelines where AI handles language processing while humans retain final approval.',
      rw: 'Gutegura inzira aho AI itunganya inyandiko naho umuntu agasuzuma akemeza mbere yo kubyohereza.'
    }
  },
  {
    level: 6,
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
    outcome: {
      en: 'Design a controlled AI agent blueprint with clear tool boundaries, safety checks, and human escalation.',
      rw: 'Gutegura igishushanyo cya AI Agent ifite imipaka isobanutse n’uburyo umuntu ayigenzura.'
    }
  },
  {
    level: 7,
    title: { en: 'AI Systems & Problem Solving', rw: 'Kubaka Sisitemu za AI' },
    summary: {
      en: 'Combine AI, automation, and software architecture to prototype and demonstrate real solutions for Rwanda-focused problems.',
      rw: 'Huza AI, imiyoboro yikoresha n’ubumenyi bwa sisitemu kugira ngo wubake igisubizo gikemura ikibazo nyacyo mu Rwanda.'
    },
    topics: {
      en: [
        'Problem discovery and solution selection',
        'System architecture, cost, and performance',
        'Security, privacy, and Rwanda Law No. 058/2021',
        'Prototyping, testing, and live demonstration'
      ],
      rw: [
        'Gusesengura ibibazo no guhitamo igisubizo',
        'Imiterere ya sisitemu, ikiguzi n’umuvuduko',
        'Umutekano w’amakuru n’itegeko N° 058/2021',
        'Kugerageza no kumurika umushinga wa nyuma'
      ]
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
    code: 'PRODUCT 01',
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
      en: 'From AI foundations and structured prompting to automated workflows and your first AI-powered project.',
      rw: 'Kuva ku ntangiriro za AI no kwandika amabwiriza meza kugeza ku miyoboro yikoresha n’umushinga wawe wa mbere.'
    },
    description: {
      en: 'Our flagship 4-week introductory program designed for Rwandan students, TVET and university graduates, entrepreneurs, and educators. Each daily lesson takes 5–12 minutes of reading plus a guided practical exercise using free-tier tools.',
      rw: 'Gahunda yacu y’ibanze y’ibyumweru 4 yateguriwe abanyeshuri, abarangije kaminuza na TVET, ba rwiyemezamirimo n’abarimu mu Rwanda. Buri somo rifata iminota 5–12 yo gusoma rikagira n’imyitozo ngiro ikoresha porogaramu z’ubuntu.'
    },
    outcomes: {
      en: [
        'Understand how LLMs work, spot hallucinations, and apply responsible AI verification.',
        'Build a personal prompt library for research, writing, and study assistance.',
        'Design and deploy a working Form -> Google Sheets -> Email automation workflow.',
        'Create an AI-powered inquiry processor with human approval gates and present a capstone project.'
      ],
      rw: [
        'Gusobanukirwa imikorere ya AI, gutahura amakosa yayo no kugenzura amakuru mbere yo kuyakoresha.',
        'Kubaka ububiko bwawe bw’amabwiriza afasha mu bushakashatsi, kwandika no kwiga.',
        'Gukora umuyoboro w’ikoranabuhanga uhuza Google Form, Google Sheets na Email.',
        'Kubaka uburyo bufasha gusesengura ibibazo by’abakiriya bwemejwe n’umuntu no kumurika umushinga.'
      ]
    },
    audience: {
      en: [
        'Secondary school & TVET graduates',
        'University students & recent graduates',
        'Small business owners & freelancers',
        'Teachers, educators & NGO staff'
      ],
      rw: [
        'Abanyeshuri barangije ayisumbuye na TVET',
        'Abanyeshuri ba kaminuza n’abarangije kwiga',
        'Ba nyiri ibigo bito n’abikorera',
        'Abarimu, abarezi n’abakozi b’imiryango itegamiye kuri Leta'
      ]
    },
    deviceNote: {
      en: 'Reading lessons and prompt exercises work on a smartphone. Week 3–4 workflow automation builds require access to a laptop or desktop computer.',
      rw: 'Gusoma amasomo n’imyitozo y’amabwiriza bikorera kuri telefoni. Ibikorwa by’ibyumweru bya 3–4 byo kubaka imiyoboro bisaba mudasobwa.'
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
1. **Ikibazo gisobanutse (20)**: Ikibazo nyacyo n'abo kigenewe.
2. **Imiterere y'umuyoboro (25)**: Ibitangira, ibyinjira n'ibisohoka bikora neza.
3. **Ibikorwa n'igerageza (25)**: Umushinga ukora kandi wagaragajwe mu myitozo.
4. **Umutekano n'igenzura (15)**: Uburyo bwo kurinda amakuru no kugenzura amakosa ya AI.
5. **Inyandiko isobanutse (15)**: Ibisobanuro byuzuye kandi byumvikana.
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
