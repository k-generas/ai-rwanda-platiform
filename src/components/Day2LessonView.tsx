import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, PlayCircle, Sparkles } from 'lucide-react';
import type { Language } from '../types';
import { DAY2_CLASSIFIER_EXERCISE, DAY2_QUIZ_QUESTIONS } from '../data/day2Lesson';

interface Day2LessonViewProps {
  lang: Language;
  isCompleted: boolean;
  canMarkComplete: boolean;
  markingComplete: boolean;
  onBackToSyllabus: () => void;
  onMarkComplete: () => void;
  onPrevDay: () => void;
  onNextDay: () => void;
}

export function Day2LessonView({
  lang,
  isCompleted,
  canMarkComplete,
  markingComplete,
  onBackToSyllabus,
  onMarkComplete,
  onPrevDay,
  onNextDay
}: Day2LessonViewProps) {
  const [exercisePicks, setExercisePicks] = useState<Record<string, string>>({});
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [checklist, setChecklist] = useState<Record<number, boolean>>({});
  const [showVideoScript, setShowVideoScript] = useState(false);
  const [reflectionNotes, setReflectionNotes] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      const targetTag = (e.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrevDay();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNextDay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onPrevDay, onNextDay]);

  const answeredCount = Object.keys(quizAnswers).length;
  const correctCount = DAY2_QUIZ_QUESTIONS.filter(
    (q) => quizAnswers[q.id] === q.correctIndex
  ).length;

  const choiceLabels: Record<string, string> = {
    ordinary_rule: lang === 'en' ? 'Ordinary software / Rule-based' : 'Porogaramu isanzwe / Amategeko',
    ml_supervised: lang === 'en' ? 'Supervised Machine Learning' : 'Supervised Machine Learning',
    ml_unsupervised: lang === 'en' ? 'Unsupervised Machine Learning' : 'Unsupervised Machine Learning',
    deep_learning: lang === 'en' ? 'Deep Learning' : 'Deep Learning'
  };

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-10">
      {/* Top Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-black/[0.08] mb-8">
        <button
          type="button"
          onClick={onBackToSyllabus}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#5D5D66] hover:text-[#0D0D0F] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{lang === 'en' ? 'Back to 28-Day Syllabus' : 'Subira ku rutonde rw’iminsi 28'}</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-[#5D5D66] font-mono tabular-nums">
          <span>Day 2 / 28</span>
          <span aria-hidden="true">·</span>
          <span>45–60 min</span>
          <span aria-hidden="true">·</span>
          <span>Beginner · AI Foundations</span>
        </div>
      </div>

      <article className="space-y-12">
        {/* Header */}
        <header>
          <p className="text-xs font-medium text-[#0D7A5F] mb-2">
            {lang === 'en'
              ? 'Week 1 · Module: AI Foundations · Free Preview Lesson'
              : 'Icyumweru cya 1 · Ibanze kuri AI · Isomo ryo Kwigeragereza'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-[#0D0D0F] text-balance mb-4">
            {lang === 'en'
              ? 'Day 2: Artificial Intelligence vs Machine Learning vs Deep Learning'
              : 'Umunsi wa 2: AI vs Machine Learning vs Deep Learning'}
          </h1>
          <p className="text-base text-[#5D5D66] leading-relaxed">
            {lang === 'en'
              ? 'Understand how AI, machine learning (ML), and deep learning (DL) relate to one another, how machines learn from data, and why the distinction matters when choosing or building AI solutions.'
              : 'Sobanukirwa uko AI, Machine Learning (ML) na Deep Learning (DL) bihura, uko imashini ziga zikoresheje amakuru, n’impamvu gutandukanya ibi bice ari ingenzi mu gukemura ibibazo.'}
          </p>
        </header>

        {/* 1. Learning Objectives */}
        <section className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 sm:p-8">
          <h2 className="text-base font-display font-semibold text-[#0D0D0F] mb-4">
            {lang === 'en' ? '1. Learning Objectives' : '1. Intego z’Isomo'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Explain the difference between AI, machine learning, and deep learning.',
              'Show how the three concepts relate to one another.',
              'Explain how a machine-learning system learns from data.',
              'Identify datasets, features, labels, models, training, and predictions.',
              'Distinguish supervised learning from unsupervised learning.',
              'Describe what neural networks do at a beginner level.',
              'Identify common ways machine-learning systems fail.',
              'Recognize when a problem does not need AI at all.'
            ].map((item, idx) => (
              <div key={item} className="flex items-start gap-2.5 text-sm text-[#5D5D66]">
                <span className="font-mono text-xs text-[#0D7A5F] tabular-nums mt-0.5">
                  0{idx + 1}.
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Opening Hook */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-[#0D0D0F]">
            2. Opening Hook: Three Systems, Three Different Approaches
          </h2>
          <p className="text-sm sm:text-base text-[#5D5D66]">
            Imagine three businesses in Rwanda using computer technology in everyday operations:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-black/[0.08] rounded-2xl p-5">
              <p className="text-xs font-mono text-[#0D7A5F] mb-1">Business A</p>
              <h3 className="text-sm font-semibold text-[#0D0D0F] mb-2">Shop Order Confirmation</h3>
              <p className="text-xs text-[#5D5D66] leading-relaxed mb-3">
                Automatically sends a message whenever a customer places an order.
              </p>
              <p className="text-xs font-medium text-[#0D0D0F]">
                Uses ordinary automation with predefined rules.
              </p>
            </div>
            <div className="bg-white border border-black/[0.08] rounded-2xl p-5">
              <p className="text-xs font-mono text-[#0D7A5F] mb-1">Business B</p>
              <h3 className="text-sm font-semibold text-[#0D0D0F] mb-2">Bank Fraud Detection</h3>
              <p className="text-xs text-[#5D5D66] leading-relaxed mb-3">
                Learns patterns from historical transactions to flag suspicious activity.
              </p>
              <p className="text-xs font-medium text-[#0D0D0F]">
                Uses Machine Learning trained on historical data.
              </p>
            </div>
            <div className="bg-white border border-black/[0.08] rounded-2xl p-5">
              <p className="text-xs font-mono text-[#0D7A5F] mb-1">Business C</p>
              <h3 className="text-sm font-semibold text-[#0D0D0F] mb-2">Visual Object Recognition</h3>
              <p className="text-xs text-[#5D5D66] leading-relaxed mb-3">
                Trained on large volumes of image data to recognize objects in photographs.
              </p>
              <p className="text-xs font-medium text-[#0D0D0F]">
                Uses Deep Learning neural networks.
              </p>
            </div>
          </div>
          <p className="text-sm font-medium text-[#0D0D0F] bg-[#F2FBF8] border border-[#0D7A5F]/20 rounded-xl p-4">
            Key takeaway: AI is the broader field. Machine learning is one way of developing AI. Deep learning is one approach within machine learning.
          </p>
        </section>

        {/* 3. Understand the Relationship + Uploaded Nested Circles Diagrams */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-semibold text-[#0D0D0F] mb-2">
              3. Understand the Nested Relationship (AI → ML → DL)
            </h2>
            <p className="text-sm sm:text-base text-[#5D5D66] leading-relaxed">
              Think of three nested circles: Artificial Intelligence is the outer circle, Machine Learning sits inside AI, and Deep Learning sits inside Machine Learning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <figure className="bg-white border border-black/[0.08] rounded-2xl overflow-hidden">
              <div className="aspect-[16/10] bg-white flex items-center justify-center p-4">
                <img
                  src="/assets/aistudio/image_3843fdcf.png"
                  alt="Concentric nested diagram showing AI: Artificial Intelligence containing ML: Machine Learning containing DL: Deep Learning"
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <figcaption className="px-5 py-3 border-t border-black/[0.06] text-xs text-[#5D5D66]">
                Diagram 1 — Nested hierarchy: AI (Artificial Intelligence) → ML (Machine Learning) → DL (Deep Learning)
              </figcaption>
            </figure>

            <figure className="bg-white border border-black/[0.08] rounded-2xl overflow-hidden">
              <div className="aspect-[16/10] bg-white flex items-center justify-center p-4">
                <img
                  src="/assets/aistudio/image_cf011535.png"
                  alt="Nested circles showing Artificial Intelligence encompassing Machine Learning and Deep Learning"
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <figcaption className="px-5 py-3 border-t border-black/[0.06] text-xs text-[#5D5D66]">
                Diagram 2 — Subset view: Deep Learning is one specialized method inside Machine Learning and AI
              </figcaption>
            </figure>
          </div>

          <div className="overflow-x-auto border border-black/[0.08] rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F9F9FB] border-b border-black/[0.08] text-xs text-[#5D5D66]">
                <tr>
                  <th className="px-5 py-3 font-semibold text-[#0D0D0F]">Concept</th>
                  <th className="px-5 py-3 font-semibold text-[#0D0D0F]">Meaning</th>
                  <th className="px-5 py-3 font-semibold text-[#0D0D0F]">Cow Image Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                <tr>
                  <td className="px-5 py-3.5 font-medium text-[#0D0D0F]">Artificial Intelligence</td>
                  <td className="px-5 py-3.5 text-[#5D5D66]">
                    The broader field of creating systems that perform tasks associated with intelligence
                  </td>
                  <td className="px-5 py-3.5 text-[#5D5D66]">
                    Overall goal: make a computer recognize objects
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-3.5 font-medium text-[#0D0D0F]">Machine Learning</td>
                  <td className="px-5 py-3.5 text-[#5D5D66]">
                    A branch of AI where systems learn patterns from data
                  </td>
                  <td className="px-5 py-3.5 text-[#5D5D66]">
                    Learns patterns from thousands of labeled animal photos
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-3.5 font-medium text-[#0D0D0F]">Deep Learning</td>
                  <td className="px-5 py-3.5 text-[#5D5D66]">
                    A branch of machine learning that uses multi-layer neural networks
                  </td>
                  <td className="px-5 py-3.5 text-[#5D5D66]">
                    Uses a deep neural network to learn complex visual textures and edges
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#5D5D66]">
            Important: Not every AI system uses machine learning (rule-based systems can be AI without learning from data), and not every ML system uses deep learning.
          </p>
        </section>

        {/* 4 & 5. AI vs Machine Learning Process */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-black/[0.08] rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              4. What is Artificial Intelligence?
            </h2>
            <p className="text-sm text-[#5D5D66] leading-relaxed">
              The broad area of computer science creating systems for understanding language, recognizing images, making predictions, recommending products, generating media, and planning actions—via rule-based systems, search/planning algorithms, ML, or DL.
            </p>
            <div className="bg-[#F9F9FB] rounded-xl p-4 text-xs text-[#5D5D66]">
              <strong className="text-[#0D0D0F] block mb-1">Rule-based example (not ML):</strong>
              If a learner&apos;s attendance is below 75%, flag the record; otherwise mark attendance acceptable. Fixed human rules, zero data training.
            </div>
          </div>

          <div className="border border-black/[0.08] rounded-2xl p-6 space-y-3">
            <h2 className="text-lg font-display font-semibold text-[#0D0D0F]">
              5. How Machine Learning Works (7 Steps)
            </h2>
            <ol className="space-y-1.5 text-sm text-[#5D5D66]">
              <li><span className="font-mono text-xs text-[#0D7A5F]">01.</span> Collect relevant historical examples</li>
              <li><span className="font-mono text-xs text-[#0D7A5F]">02.</span> Prepare data (fix errors &amp; missing values)</li>
              <li><span className="font-mono text-xs text-[#0D7A5F]">03.</span> Select an appropriate algorithm</li>
              <li><span className="font-mono text-xs text-[#0D7A5F]">04.</span> Train the model on training data</li>
              <li><span className="font-mono text-xs text-[#0D7A5F]">05.</span> Evaluate on separate unseen data</li>
              <li><span className="font-mono text-xs text-[#0D7A5F]">06.</span> Use the model for new predictions (inference)</li>
              <li><span className="font-mono text-xs text-[#0D7A5F]">07.</span> Monitor performance as real conditions change</li>
            </ol>
          </div>
        </section>

        {/* 6 & 7. Vocabulary + Illustrative Dataset + Train/Val/Test Split */}
        <section className="space-y-6">
          <h2 className="text-2xl font-display font-semibold text-[#0D0D0F]">
            6. Machine Learning Vocabulary &amp; Why Three Data Splits Matter
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 border border-black/[0.08] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-[#F9F9FB] border-b border-black/[0.08]">
                <p className="text-xs font-semibold text-[#0D0D0F]">
                  Illustrative Dataset: Features (Inputs) vs Label (Target)
                </p>
              </div>
              <table className="w-full text-left text-xs tabular-nums">
                <thead className="border-b border-black/[0.06] text-[#5D5D66]">
                  <tr>
                    <th className="px-4 py-2.5">Rainfall (mm)</th>
                    <th className="px-4 py-2.5">Temp (°C)</th>
                    <th className="px-4 py-2.5">Fertilizer (kg)</th>
                    <th className="px-4 py-2.5 text-[#0D7A5F]">Yield (tons · Label)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06]">
                  <tr><td className="px-4 py-2.5">800</td><td className="px-4 py-2.5">23</td><td className="px-4 py-2.5">50</td><td className="px-4 py-2.5 font-mono font-medium">2.1</td></tr>
                  <tr><td className="px-4 py-2.5">950</td><td className="px-4 py-2.5">21</td><td className="px-4 py-2.5">60</td><td className="px-4 py-2.5 font-mono font-medium">2.8</td></tr>
                  <tr><td className="px-4 py-2.5">700</td><td className="px-4 py-2.5">25</td><td className="px-4 py-2.5">40</td><td className="px-4 py-2.5 font-mono font-medium">1.7</td></tr>
                  <tr><td className="px-4 py-2.5">1,000</td><td className="px-4 py-2.5">22</td><td className="px-4 py-2.5">65</td><td className="px-4 py-2.5 font-mono font-medium">3.0</td></tr>
                </tbody>
              </table>
              <p className="px-4 py-2.5 text-[11px] text-[#5D5D66] border-t border-black/[0.06]">
                Illustrative values only—not agricultural recommendations or official Rwanda harvest records.
              </p>
            </div>

            <div className="lg:col-span-6 bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-[#0D0D0F]">
                7. Training, Validation &amp; Testing (Example 70% / 15% / 15% Split)
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="bg-white border border-black/[0.06] rounded-xl p-3">
                  <strong className="text-[#0D0D0F]">Training data (70%):</strong> Teaches the model statistical patterns.
                </div>
                <div className="bg-white border border-black/[0.06] rounded-xl p-3">
                  <strong className="text-[#0D0D0F]">Validation data (15%):</strong> Compares approaches and tunes settings during development.
                </div>
                <div className="bg-white border border-black/[0.06] rounded-xl p-3">
                  <strong className="text-[#0D0D0F]">Test data (15%):</strong> Held-out final exam proving generalization to unseen inputs.
                </div>
              </div>
              <p className="text-xs text-[#5D5D66]">
                Reality check: A 100% score on memorized training questions does not prove a model works in the real world.
              </p>
            </div>
          </div>
        </section>

        {/* 8 & 9 & 10. Supervised vs Unsupervised, Deep Learning, Chatbots */}
        <section className="space-y-6">
          <h2 className="text-2xl font-display font-semibold text-[#0D0D0F]">
            8–10. Supervised vs Unsupervised Learning, Deep Learning &amp; Chatbots
          </h2>
          <div className="overflow-x-auto border border-black/[0.08] rounded-2xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F9F9FB] border-b border-black/[0.08] text-xs">
                <tr>
                  <th className="px-5 py-3 font-semibold text-[#0D0D0F]">Question</th>
                  <th className="px-5 py-3 font-semibold text-[#0D0D0F]">Supervised Learning</th>
                  <th className="px-5 py-3 font-semibold text-[#0D0D0F]">Unsupervised Learning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                <tr>
                  <td className="px-5 py-3 font-medium">Are target labels supplied?</td>
                  <td className="px-5 py-3 text-[#5D5D66]">Yes (known target answers)</td>
                  <td className="px-5 py-3 text-[#5D5D66]">No target labels supplied</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-medium">Main goal</td>
                  <td className="px-5 py-3 text-[#5D5D66]">Predict categories (classification) or numbers (regression)</td>
                  <td className="px-5 py-3 text-[#5D5D66]">Discover structures, clusters, or anomalies</td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-medium">Example</td>
                  <td className="px-5 py-3 text-[#5D5D66]">Spam vs Not Spam email classifier; crop yield estimation</td>
                  <td className="px-5 py-3 text-[#5D5D66]">Grouping shop customers by purchasing behavior</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-black/[0.08] rounded-2xl p-6">
              <h3 className="text-base font-semibold text-[#0D0D0F] mb-2">
                9. Neural Networks &amp; Deep Learning
              </h3>
              <p className="text-sm text-[#5D5D66] leading-relaxed">
                Neural networks stack an <strong>Input layer</strong>, multiple <strong>Hidden layers</strong>, and an <strong>Output layer</strong>, adjusting numerical weights during training. In image recognition (e.g., dog vs cat), early layers detect edges and textures while deeper layers combine shapes into class scores. They are mathematical systems—not human brains.
              </p>
            </div>
            <div className="border border-black/[0.08] rounded-2xl p-6">
              <h3 className="text-base font-semibold text-[#0D0D0F] mb-2">
                10. How ChatGPT &amp; Gemini Fit In
              </h3>
              <p className="text-sm text-[#5D5D66] leading-relaxed">
                Modern LLMs use deep neural networks (often Transformers) to convert text into tokens and predict output tokens step by step. A fluent explanation is not proof of truth—models can hallucinate or carry training data bias, and not every AI system is a chatbot.
              </p>
            </div>
          </div>
        </section>

        {/* 12. Rwanda Problem Laboratory */}
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-display font-semibold text-[#0D0D0F] mb-1">
              12. Rwanda Problem Laboratory (Hypothetical Educational Scenarios)
            </h2>
            <p className="text-xs text-[#5D5D66]">
              Illustrative scenarios showing approach, potential benefits, failure risks, and mandatory human responsibility.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                title: 'Case A: Agricultural Yield Estimation',
                approach: 'Supervised ML on historical rainfall, soil, crop type & harvest records.',
                risk: 'Missing records, unusual weather, or single-region data biases predictions.',
                human: 'Farmers & agronomists interpret estimates alongside field conditions.'
              },
              {
                title: 'Case B: Customer Message Classification',
                approach: 'Supervised classifier or configured LLM sorting inquiries, complaints, payments & delivery.',
                risk: 'Mixed-language messages, local slang, or multi-category complaints.',
                human: 'Staff review uncertain or urgent customer messages before replying.'
              },
              {
                title: 'Case C: Transport Demand Patterns',
                approach: 'Statistical analysis or ML on passenger counts and time windows.',
                risk: 'Holidays, road disruptions, and new routes break historical patterns.',
                human: 'Operators compare estimates against live conditions before scheduling.'
              }
            ].map((c) => (
              <div key={c.title} className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-5 space-y-2.5 text-xs">
                <h3 className="text-sm font-semibold text-[#0D0D0F]">{c.title}</h3>
                <p className="text-[#5D5D66]"><strong className="text-[#0D0D0F]">Approach:</strong> {c.approach}</p>
                <p className="text-[#5D5D66]"><strong className="text-[#0D0D0F]">Failure risk:</strong> {c.risk}</p>
                <p className="text-[#0D7A5F]"><strong>Human role:</strong> {c.human}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 13. AI Failure Laboratory */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-semibold text-[#0D0D0F]">
            13. AI Failure Laboratory: Six Ways Machine Learning Fails
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              ['01. Poor-Quality Data', 'Inaccurate, incomplete, or single-region training records produce unreliable predictions elsewhere.'],
              ['02. Bias in Data', 'Models trained on unfair historical hiring or lending decisions reproduce and amplify those inequalities.'],
              ['03. Overfitting', 'Memorizing training noise scores high in practice but fails on new data (vs Underfitting or Good fit).'],
              ['04. Data Leakage', 'Future/post-outcome fields sneak into training, creating fake accuracy that collapses in production.'],
              ['05. Correlation ≠ Causation', 'Two variables moving together in a table does not prove one causes the other.'],
              ['06. Shifting Real Conditions', 'Changing fraud tactics, prices, or weather require continuous post-launch monitoring.']
            ].map(([title, desc]) => (
              <div key={title} className="bg-white border border-black/[0.08] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[#0D0D0F] mb-1">{title}</h3>
                <p className="text-xs text-[#5D5D66] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 14. Practical Demonstration (Teachable Machine) */}
        <section className="bg-[#0D0D0F] text-white rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-mono text-[#34D399] mb-1">14. HANDS-ON LAB</p>
              <h2 className="text-xl font-display font-semibold">
                Practical Demonstration: Train an Image Classifier with Teachable Machine
              </h2>
            </div>
            <a
              href="https://teachablemachine.withgoogle.com/"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 text-xs font-medium bg-white text-[#0D0D0F] rounded-lg hover:bg-white/90"
            >
              Open Teachable Machine
            </a>
          </div>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white/80">
            <li>1. Create an Image Project with two classes: Notebook vs Water Bottle.</li>
            <li>2. Capture diverse angles and lighting examples for each class.</li>
            <li>3. Click Train Model, then test with unseen objects not in training.</li>
            <li>4. Change lighting or background and watch prediction confidence shift.</li>
          </ol>
          <p className="text-xs text-white/65 pt-2 border-t border-white/10">
            Teaching point: The model outputs statistical predictions based on visual patterns—not human understanding of what a notebook is.
          </p>
        </section>

        {/* 15. Interactive Learner Exercise (Part A + Part B) */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-semibold text-[#0D0D0F] mb-1">
              15. Practical Learner Exercise: Identify the Right Technology
            </h2>
            <p className="text-sm text-[#5D5D66]">
              Select the simplest suitable technology for each scenario below to receive instant feedback.
            </p>
          </div>

          <div className="space-y-3">
            {DAY2_CLASSIFIER_EXERCISE.map((row) => {
              const picked = exercisePicks[row.id];
              const isCorrect = picked === row.correctChoice;
              return (
                <div
                  key={row.id}
                  className="bg-white border border-black/[0.08] rounded-2xl p-5 space-y-3"
                >
                  <p className="text-sm font-medium text-[#0D0D0F]">{row.situation[lang]}</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(choiceLabels).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setExercisePicks((prev) => ({ ...prev, [row.id]: key }))}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          picked === key
                            ? key === row.correctChoice
                              ? 'bg-[#ECFDF5] border-[#0D7A5F] text-[#0D0D0F]'
                              : 'bg-[#FEF2F2] border-[#DC2626] text-[#0D0D0F]'
                            : 'bg-[#F9F9FB] border-black/[0.08] text-[#5D5D66] hover:text-[#0D0D0F]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {picked && (
                    <p className="text-xs text-[#5D5D66]">
                      <strong className={isCorrect ? 'text-[#0D7A5F]' : 'text-[#DC2626]'}>
                        {isCorrect ? 'Correct: ' : 'Consider again: '}
                      </strong>
                      {row.explanation[lang]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Part B Sample */}
          <div className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 space-y-2 text-xs text-[#5D5D66]">
            <h3 className="text-sm font-semibold text-[#0D0D0F]">
              Part B Example Answer: Small Shop Water Bottle Demand
            </h3>
            <p>
              <strong>Problem:</strong> Estimate weekly drinking water bottles sold · <strong>Features:</strong> Previous sales, day of week, price, holidays · <strong>Label:</strong> Bottles sold · <strong>Approach:</strong> Supervised regression (only after proving a simple spreadsheet is insufficient!) · <strong>Human oversight:</strong> Shop owner reviews estimate before ordering stock.
            </p>
          </div>
        </section>

        {/* 17. Interactive 10-Question Day 2 Knowledge Check */}
        <section className="bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-display font-semibold text-[#0D0D0F]">
                17. Day 2 Knowledge Check (Suggested Pass Mark: 8 / 10)
              </h2>
              <p className="text-xs text-[#5D5D66] mt-1">
                Self-check quiz—not a formal professional qualification.
              </p>
            </div>
            <span className="text-sm font-mono font-semibold tabular-nums text-[#0D0D0F]">
              Score: {correctCount} / {DAY2_QUIZ_QUESTIONS.length} ({answeredCount} answered)
            </span>
          </div>

          <div className="space-y-6">
            {DAY2_QUIZ_QUESTIONS.map((q) => {
              const picked = quizAnswers[q.id];
              return (
                <div key={q.id} className="bg-white border border-black/[0.08] rounded-xl p-5 space-y-3">
                  <p className="text-sm font-medium text-[#0D0D0F]">
                    {q.id}. {q.question[lang]}
                  </p>
                  <div className="space-y-2">
                    {q.options[lang].map((opt, idx) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm transition-colors ${
                          picked === idx
                            ? idx === q.correctIndex
                              ? 'bg-[#ECFDF5] border-[#0D7A5F] text-[#0D0D0F]'
                              : 'bg-[#FEF2F2] border-[#DC2626] text-[#0D0D0F]'
                            : 'bg-[#F9F9FB] border-black/[0.08] text-[#0D0D0F] hover:border-black/25'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {picked !== undefined && (
                    <p className="text-xs text-[#5D5D66]">{q.explanation[lang]}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 18 & 19. Reflection + Glossary */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-xl font-display font-semibold text-[#0D0D0F]">
              18. Reflection Questions
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-[#5D5D66] list-decimal pl-4">
              <li>Why is it inaccurate to say AI and machine learning are identical?</li>
              <li>Can a computer system use AI without machine learning? Give an example.</li>
              <li>Why must a model be tested on separate data?</li>
              <li>Why might a deep-learning model fail on unfamiliar lighting or angles?</li>
              <li>What is one problem in Rwanda that might benefit from ML?</li>
              <li>When is ordinary software better than AI?</li>
            </ul>
            <textarea
              rows={4}
              value={reflectionNotes}
              onChange={(e) => setReflectionNotes(e.target.value)}
              placeholder="Write your reflection notes here..."
              className="w-full px-3.5 py-2.5 text-sm border border-black/15 rounded-xl"
            />
          </div>

          <div className="lg:col-span-7">
            <h2 className="text-xl font-display font-semibold text-[#0D0D0F] mb-4">
              19. Key Terms Glossary
            </h2>
            <div className="border border-black/[0.08] rounded-2xl divide-y divide-black/[0.06] text-xs">
              {[
                ['Artificial Intelligence', 'Broad field creating systems for intelligence-related tasks'],
                ['Machine Learning', 'Branch of AI learning patterns from data'],
                ['Deep Learning', 'ML using multi-layer neural networks'],
                ['Dataset / Feature / Label', 'Organized table / input variable / target answer'],
                ['Algorithm vs Model', 'Learning procedure vs trained artifact making predictions'],
                ['Training & Inference', 'Learning patterns from data vs producing predictions on new inputs'],
                ['Overfitting & Data Leakage', 'Memorizing training noise vs leaking future test answers into training']
              ].map(([term, def]) => (
                <div key={term} className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between gap-1">
                  <span className="font-semibold text-[#0D0D0F]">{term}</span>
                  <span className="text-[#5D5D66]">{def}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 21 & 22. Completion Checklist & Companion YouTube Lesson Plan */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 bg-white border border-black/[0.08] rounded-2xl p-6 space-y-3">
            <h2 className="text-base font-display font-semibold text-[#0D0D0F]">
              21. Day 2 Completion Checklist
            </h2>
            {[
              'I can explain AI, ML, and deep learning.',
              'I understand features, labels, datasets, and models.',
              'I can distinguish supervised and unsupervised learning.',
              'I understand training, validation, and testing.',
              'I can explain overfitting and data leakage.',
              'I completed the practical exercise.',
              'I passed the 10-question knowledge check.',
              'I answered the reflection questions.'
            ].map((item, i) => (
              <label key={item} className="flex items-center gap-3 text-xs sm:text-sm text-[#0D0D0F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(checklist[i])}
                  onChange={(e) => setChecklist((prev) => ({ ...prev, [i]: e.target.checked }))}
                  className="w-4 h-4 accent-[#0D7A5F]"
                />
                <span className={checklist[i] ? 'line-through text-[#5D5D66]' : ''}>{item}</span>
              </label>
            ))}
          </div>

          <div className="lg:col-span-6 bg-[#F9F9FB] border border-black/[0.08] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-[#0D7A5F]" />
                <h2 className="text-base font-display font-semibold text-[#0D0D0F]">
                  22. Companion Video Lesson Plan (20–25 min)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowVideoScript((prev) => !prev)}
                className="text-xs font-medium text-[#0D0D0F] underline"
              >
                {showVideoScript ? 'Hide script' : 'Read instructor script'}
              </button>
            </div>
            <p className="text-xs text-[#5D5D66]">
              <strong>Title:</strong> Artificial Intelligence vs Machine Learning vs Deep Learning — What&apos;s the Difference? · Segments: Hook (0–1:30), AI (1:30–4:00), ML &amp; Vocabulary (4:00–10:00), Supervised vs Unsupervised (10:00–13:00), Deep Learning (13:00–16:00), Applications &amp; Failure Lab (16:00–22:00), Challenge (22:00–25:00).
            </p>
            {showVideoScript && (
              <div className="bg-white border border-black/[0.08] rounded-xl p-4 text-xs text-[#5D5D66] leading-relaxed max-h-60 overflow-y-auto space-y-2">
                <p><strong>Opening:</strong> &quot;People use Artificial Intelligence, Machine Learning and Deep Learning as if they mean exactly the same thing. They do not...&quot;</p>
                <p><strong>Part 1–3:</strong> Walk through rule-based attendance vs crop-yield dataset (features/labels) vs spam/customer clustering.</p>
                <p><strong>Part 4–5:</strong> Explain neural-network depth, overfitting, data bias, and close with: &quot;Do not start by asking which AI tool you should use. Start by understanding the problem.&quot;</p>
              </div>
            )}
            <div className="pt-2 border-t border-black/[0.06] flex items-center gap-2 text-xs text-[#5D5D66]">
              <Sparkles className="w-3.5 h-3.5 text-[#0D7A5F] shrink-0" />
              <span>
                Instructor QC status: Teaching-ready draft; Kinyarwanda review and Teachable Machine device check scheduled before cohort launch.
              </span>
            </div>
          </div>
        </section>

        {/* Bottom Lesson Navigation */}
        <section className="border-t border-black/[0.08] pt-8 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onPrevDay}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-[#0D0D0F] border border-black/15 rounded-lg hover:border-black/30"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{lang === 'en' ? 'Day 1' : 'Umunsi wa 1'}</span>
          </button>

          <div className="flex items-center gap-3">
            {canMarkComplete && (
              <button
                type="button"
                disabled={isCompleted || markingComplete}
                onClick={onMarkComplete}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  isCompleted
                    ? 'bg-[#ECFDF5] text-[#0D7A5F] border border-[#0D7A5F]/30'
                    : 'bg-[#0D7A5F] text-white hover:bg-[#0B664F]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isCompleted
                    ? lang === 'en'
                      ? 'Completed'
                      : 'Byararangiye'
                    : markingComplete
                      ? lang === 'en'
                        ? 'Saving...'
                        : 'Birabikwa...'
                      : lang === 'en'
                        ? 'Mark Day 2 Complete'
                        : 'Emeza ko warangije'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onNextDay}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-[#0D0D0F] rounded-lg hover:bg-[#232329]"
            >
              <span>{lang === 'en' ? 'Day 3: Generative AI & LLMs' : 'Umunsi wa 3'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </article>
    </div>
  );
}
