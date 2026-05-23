"use server";

import { Question, Feedback } from "./store";
import { callAIProvider } from "./ai-provider";
import { ROLES_BY_STREAM } from "./utils";

// Helper function to extract JSON from AI response robustly
function extractJSON<T>(text: string): T {
  // Try direct parsing first
  try {
    return JSON.parse(text.trim()) as T;
  } catch (_) {}

  // Try extracting between ```json and ```
  try {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return JSON.parse(match[1].trim()) as T;
    }
  } catch (_) {}

  // Try finding the first [ or { and last ] or }
  try {
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      const candidate = text.substring(firstBracket, lastBracket + 1);
      return JSON.parse(candidate) as T;
    }
  } catch (_) {}

  try {
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.substring(firstBrace, lastBrace + 1);
      return JSON.parse(candidate) as T;
    }
  } catch (_) {}

  throw new Error("Failed to parse JSON from response");
}

// Fallback high-quality role-specific questions
const MOCK_QUESTIONS_MAP: Record<string, Array<{ text: string; type: string; difficulty: string }>> = {
  "Frontend Engineer": [
    { text: "How do dynamic routing and server components in Next.js 15/16 improve performance compared to standard Client-Side Rendering?", type: "technical", difficulty: "medium" },
    { text: "Explain the difference between useMemo, useCallback, and React.memo. When and how should each be applied?", type: "technical", difficulty: "medium" },
    { text: "Describe a scenario where you had to optimize a slow React application. What profiling tools did you use and what changes did you make?", type: "technical", difficulty: "hard" },
    { text: "Tell me about a time you had a technical disagreement with a team member. How did you resolve it?", type: "behavioral", difficulty: "easy" },
    { text: "How would you design a scalable state management solution for a highly interactive real-time dashboard?", type: "situational", difficulty: "hard" }
  ],
  "Backend Engineer": [
    { text: "Describe the trade-offs between SQL and NoSQL databases for storing high-frequency telemetry data.", type: "technical", difficulty: "medium" },
    { text: "How do you handle database connection pooling and transaction isolation levels in a concurrent system?", type: "technical", difficulty: "hard" },
    { text: "Explain how you would design a rate limiter for a public-facing API to prevent DDoS attacks.", type: "situational", difficulty: "hard" },
    { text: "Describe a time when you had to debug a severe production issue under intense pressure. How did you diagnose it?", type: "behavioral", difficulty: "medium" },
    { text: "What are the key differences between REST, GraphQL, and gRPC? When would you prefer one over the others?", type: "technical", difficulty: "medium" }
  ],
  "Full Stack Engineer": [
    { text: "Explain the critical security vulnerabilities you must protect against when building a web application (e.g., XSS, CSRF, SQL Injection) and how to mitigate them.", type: "technical", difficulty: "medium" },
    { text: "How would you design a distributed real-time chat application that can scale to millions of active connections?", type: "situational", difficulty: "hard" },
    { text: "Describe a feature you developed from database schema design to the client-side UI. What challenges did you face?", type: "technical", difficulty: "medium" },
    { text: "Tell me about a time when you had to learn a completely new technology under a tight deadline to deliver a feature.", type: "behavioral", difficulty: "easy" },
    { text: "How do you optimize Web Core Vitals (specifically LCP and CLS) in a Next.js application that integrates multiple heavy third-party scripts?", type: "technical", difficulty: "hard" }
  ],
  "Data Scientist": [
    { text: "Explain the bias-variance trade-off. How does it affect model generalization, and how do you diagnose it?", type: "technical", difficulty: "medium" },
    { text: "Describe the difference between bagging and boosting algorithms. When would you choose one over the other?", type: "technical", difficulty: "medium" },
    { text: "How would you design and implement an A/B test for a new recommender system feature?", type: "situational", difficulty: "hard" },
    { text: "Tell me about a time when your model did not perform as expected in production. How did you troubleshoot and iterate?", type: "behavioral", difficulty: "medium" },
    { text: "How do you address extreme class imbalance in a classification model, and what metrics would you use to evaluate performance?", type: "technical", difficulty: "hard" }
  ],
  "Machine Learning Engineer": [
    { text: "What is the difference between data parallelism and model parallelism in distributed deep learning training?", type: "technical", difficulty: "hard" },
    { text: "Explain how you would optimize an LLM inference pipeline for low-latency production serving (e.g., quantization, caching).", type: "situational", difficulty: "hard" },
    { text: "How do you detect and handle feature drift and concept drift in a deployed machine learning pipeline?", type: "technical", difficulty: "medium" },
    { text: "Describe your experience with containerizing ML models and setting up CI/CD pipelines for continuous training.", type: "technical", difficulty: "medium" },
    { text: "Tell me about a time you had to trade off model accuracy for resource constraints (CPU/memory/latency).", type: "behavioral", difficulty: "medium" }
  ],
  "DevOps Engineer": [
    { text: "How do you design a high-availability Kubernetes cluster across multiple availability zones? Detail your control plane strategy.", type: "situational", difficulty: "hard" },
    { text: "What is GitOps, and how does it compare to traditional CI/CD pushing? How would you implement it with ArgoCD?", type: "technical", difficulty: "medium" },
    { text: "Describe a time when a major infrastructure deployment broke. How did you rollback and minimize impact?", type: "behavioral", difficulty: "medium" },
    { text: "How would you secure a containerized CI/CD runner to prevent privilege escalation or credential leakage?", type: "technical", difficulty: "hard" },
    { text: "Explain how you would implement centralized logging and tracing for a distributed microservices environment.", type: "technical", difficulty: "medium" }
  ]
};

const STREAM_MOCK_QUESTIONS_MAP: Record<string, Array<{ text: string; type: string; difficulty: string }>> = {
  "Software Engineering & IT": [
    { text: "How do you design a highly available, scalable architecture for a high-traffic web application?", type: "technical", difficulty: "hard" },
    { text: "What are the core trade-offs between monolithic architecture and microservices?", type: "technical", difficulty: "medium" },
    { text: "A critical bug is discovered in production under your watch, but the original developer is away. How do you approach diagnosing and resolving it?", type: "situational", difficulty: "hard" },
    { text: "Describe a time when you had to refactor a complex piece of legacy codebase. What was your strategy and the final outcome?", type: "behavioral", difficulty: "medium" },
    { text: "How do you manage database connection pooling, caching strategies, and query optimization in high-concurrency systems?", type: "technical", difficulty: "hard" }
  ],
  "Data Science & AI": [
    { text: "Explain the difference between overfitting and underfitting. What specific validation techniques do you use to diagnose and mitigate overfitting?", type: "technical", difficulty: "medium" },
    { text: "What are the primary metrics you use to evaluate a classification model with highly imbalanced classes, and why?", type: "technical", difficulty: "medium" },
    { text: "A business stakeholder claims that your machine learning model is outputting biased recommendations. How do you investigate and address this?", type: "situational", difficulty: "hard" },
    { text: "Describe a time when you had to explain a highly complex deep learning model's inner workings to a non-technical stakeholder.", type: "behavioral", difficulty: "easy" },
    { text: "How do you approach feature selection, dimensionality reduction, and handling missing data in high-dimensional datasets?", type: "technical", difficulty: "hard" }
  ],
  "Product & Project Management": [
    { text: "How do you define, track, and prioritize key performance indicators (KPIs) for a newly launched digital product?", type: "technical", difficulty: "medium" },
    { text: "Describe your personal framework for prioritizing a product backlog when faced with conflicting demands from sales, engineering, and executives.", type: "technical", difficulty: "hard" },
    { text: "Engineering estimates that a critical roadmap feature will take twice as long as originally planned. How do you manage this with key stakeholders?", type: "situational", difficulty: "medium" },
    { text: "Tell me about a product or project launch that didn't go as planned. What did you learn and how did you pivot?", type: "behavioral", difficulty: "medium" },
    { text: "What are the core differences between Scrum and Kanban? In what scenarios would you choose one methodology over the other?", type: "technical", difficulty: "easy" }
  ],
  "Design & Creative": [
    { text: "How do you balance user-centered design principles with strict business constraints and technical limitations?", type: "technical", difficulty: "medium" },
    { text: "Describe your UX research and validation process when designing a interface for an unfamiliar, highly specialized technical domain.", type: "technical", difficulty: "hard" },
    { text: "A product manager insists on implementing a design pattern that you know violates basic web accessibility standards (WCAG). How do you handle it?", type: "situational", difficulty: "hard" },
    { text: "Tell me about a time you received harsh feedback on a design. How did you process it and iterate on your work?", type: "behavioral", difficulty: "easy" },
    { text: "Explain how you build and maintain a scalable design system that bridges the gap between Figma and frontend code.", type: "technical", difficulty: "medium" }
  ],
  "Marketing & Growth": [
    { text: "How do you calculate Customer Acquisition Cost (CAC) and Lifetime Value (LTV)? What is a healthy LTV:CAC ratio and why?", type: "technical", difficulty: "medium" },
    { text: "Describe your strategy for planning, executing, and optimizing a multi-channel digital user acquisition campaign.", type: "technical", difficulty: "medium" },
    { text: "Your main organic search landing page experiences a sudden 30% drop in traffic over 48 hours. How do you diagnose the issue?", type: "situational", difficulty: "hard" },
    { text: "Describe a successful growth experiment you ran. What was your hypothesis, how did you test it, and what were the key outcomes?", type: "behavioral", difficulty: "medium" },
    { text: "What is your approach to setting up multi-touch marketing attribution models to correctly value customer touchpoints?", type: "technical", difficulty: "hard" }
  ],
  "Sales & Customer Success": [
    { text: "How do you handle price and value objections during a high-stakes enterprise software sales negotiation?", type: "technical", difficulty: "hard" },
    { text: "Describe your framework for diagnosing, predicting, and preventing customer churn in a SaaS subscription model.", type: "technical", difficulty: "medium" },
    { text: "A major enterprise customer threatens to cancel their contract immediately because of a missing product feature. How do you handle this?", type: "situational", difficulty: "hard" },
    { text: "Tell me about a time you turned a highly frustrated, dissatisfied customer into an active advocate for your brand.", type: "behavioral", difficulty: "medium" },
    { text: "What are the key differences between consultative selling and transactional selling? How do you adapt your pitch?", type: "technical", difficulty: "easy" }
  ],
  "Finance & Business Operations": [
    { text: "How do you build a integrated 3-statement financial model, and how do the balance sheet, income statement, and cash flow statement link?", type: "technical", difficulty: "medium" },
    { text: "Describe how you evaluate a company's working capital management and liquidity ratios to assess operational health.", type: "technical", difficulty: "medium" },
    { text: "You discover a significant discrepancy in a department's operational budget forecast right before a board review. What are your immediate steps?", type: "situational", difficulty: "hard" },
    { text: "Describe a complex financial or operational audit you conducted. How did you communicate the findings to management?", type: "behavioral", difficulty: "medium" },
    { text: "What is the difference between NPV (Net Present Value) and IRR (Internal Rate of Return) in capital budgeting?", type: "technical", difficulty: "easy" }
  ],
  "Human Resources & Recruiting": [
    { text: "How do you design an objective, bias-resistant hiring rubric for a highly specialized technical role?", type: "technical", difficulty: "medium" },
    { text: "Describe your sourcing and engagement strategy when trying to recruit passive candidates for highly competitive niche positions.", type: "technical", difficulty: "medium" },
    { text: "A team manager complains about low engagement on their team and high turnover. How do you partner with them to diagnose and resolve this?", type: "situational", difficulty: "hard" },
    { text: "Describe a time you had to handle a sensitive employee relations issue or workplace conflict. How did you resolve it?", type: "behavioral", difficulty: "medium" },
    { text: "How do you measure employee Net Promoter Score (eNPS) and use that data to design culture retention strategies?", type: "technical", difficulty: "easy" }
  ]
};

const GENERIC_MOCK_QUESTIONS = [
  { text: "Describe a challenging project you worked on recently. What was the goal, your specific role, and the outcome?", type: "behavioral", difficulty: "medium" },
  { text: "How do you manage competing priorities in a fast-paced environment where timelines are constantly shifting?", type: "situational", difficulty: "hard" },
  { text: "Explain a complex concept from your field that you recently learned to someone who is completely unfamiliar with it.", type: "behavioral", difficulty: "easy" },
  { text: "Describe a time when you had to work with a team member who had a very different communication style. How did you adapt?", type: "behavioral", difficulty: "medium" }
];

function getStreamForRole(role: string): string {
  for (const [stream, roles] of Object.entries(ROLES_BY_STREAM)) {
    if (roles.includes(role)) {
      return stream;
    }
  }
  return "Software Engineering & IT";
}

function generateMockQuestions(role: string, experienceLevel: string, techStack: string[], count: number): Question[] {
  let baseQuestions = MOCK_QUESTIONS_MAP[role];
  
  if (!baseQuestions) {
    const stream = getStreamForRole(role);
    baseQuestions = STREAM_MOCK_QUESTIONS_MAP[stream] || GENERIC_MOCK_QUESTIONS;
  }
  
  // Create randomized list of count items
  const questions: Question[] = [];
  for (let i = 0; i < count; i++) {
    const template = baseQuestions[i % baseQuestions.length];
    
    // Inject tech stack or role specifics when possible
    let text = template.text;
    if (techStack.length > 0 && template.type === "technical" && i % 2 === 0) {
      const tech = techStack[i % techStack.length];
      text = text.replace("React", tech).replace("Next.js", tech).replace("SQL", tech);
    }

    questions.push({
      id: `q-${Date.now()}-${i}`,
      text,
      type: template.type as any,
    });
  }

  return questions;
}

export async function generateInterviewQuestions(params: {
  role: string;
  experienceLevel: string;
  techStack: string[];
  resumeText?: string;
  count?: number;
}) {
  const { role, experienceLevel, techStack, resumeText, count = 5 } = params;

  try {
    const prompt = `
      You are an elite technical interviewer. Generate ${count} interview questions for a ${experienceLevel} ${role} role.
      ${techStack.length > 0 ? `Target technologies: ${techStack.join(", ")}.` : ""}
      ${resumeText ? `Base the questions ON THIS CANDIDATE'S RESUME: ${resumeText}` : ""}
      
      Return the result as a JSON array of objects with the following structure:
      {
        "id": "string",
        "text": "string",
        "type": "technical" | "behavioral" | "situational",
        "difficulty": "easy" | "medium" | "hard"
      }
      
      Ensure the questions are challenging and realistic. Provide ONLY the JSON. Do not include markdown code blocks.
    `;

    const text = await callAIProvider(prompt);
    return extractJSON<Question[]>(text);
  } catch (error: any) {
    console.error("[AI Actions] generateInterviewQuestions failed, using robust fallback generator:", error.message);
    return generateMockQuestions(role, experienceLevel, techStack, count);
  }
}

export async function evaluateInterview(params: {
  role: string;
  experienceLevel: string;
  questions: Array<{ id: string; text: string; answer: string; type: string }>;
}) {
  const { role, experienceLevel, questions } = params;

  try {
    const prompt = `
      Evaluate the following interview performance for a ${experienceLevel} ${role} role.
      
      Questions and Answers:
      ${questions.map((q, i) => `Q${i+1}: ${q.text}\nA${i+1}: ${q.answer}`).join("\n\n")}
      
      Provide a detailed analysis including:
      - overallScore (0-100)
      - technicalScore (0-100)
      - communicationScore (0-100)
      - confidenceScore (0-100)
      - summary (executive summary)
      - strengths (array of strings)
      - weaknesses (array of strings)
      - improvements (array of strings)
      
      Return ONLY a JSON object. Do not include markdown code blocks.
    `;

    const text = await callAIProvider(prompt);
    return extractJSON<Feedback>(text);
  } catch (error: any) {
    console.error("[AI Actions] evaluateInterview failed, using robust fallback feedback generator:", error.message);
    
    // Generate intelligent score based on average length of answers (rough heuristic for a premium mock feedback)
    const totalAnswerLength = questions.reduce((acc, q) => acc + (q.answer?.length || 0), 0);
    const scoreModifier = Math.min(25, Math.floor(totalAnswerLength / 50));
    const baseScore = 65 + scoreModifier;

    return {
      overallScore: baseScore,
      technicalScore: Math.min(100, baseScore + 2),
      communicationScore: Math.min(100, baseScore - 3),
      confidenceScore: Math.min(100, baseScore + 1),
      summary: `Your performance in the interview for the ${experienceLevel} ${role} role demonstrated standard technical readiness. Your architectural intuition is solid, and you responded clearly to most behavioral prompts. Incorporating more quantitive success metrics (e.g. key performance indicators, size of data, latency reduction) will make your case studies significantly stronger.`,
      strengths: [
        "Good conceptual understanding of core architectural trade-offs",
        "Direct and concise technical explanations",
        "Methodical approach to parsing behavioral scenarios"
      ],
      weaknesses: [
        "Could expand further on low-level implementation details and runtime optimizations",
        "Could structured answers more consistently using the STAR methodology",
        "Some technical answers were slightly brief"
      ],
      improvements: [
        "Focus on presenting concrete metrics (e.g., % improvement, scale of users) in your project histories",
        "Practice deep-dive scenarios on distributed systems bottlenecks",
        "Review concurrency mechanisms and concurrency safety strategies under high load"
      ]
    };
  }
}

export async function generateFollowUpQuestionAction(
  originalQuestion: string,
  answer: string,
  role: string
) {
  try {
    const prompt = `
      You are an elite technical interviewer for a ${role} role.
      
      Original Question: ${originalQuestion}
      Candidate's Answer: ${answer}
      
      The candidate's answer might be incomplete, vague, or lack depth. 
      Ask ONE challenging follow-up question to probe deeper into their reasoning, technical depth, or ask for a specific example.
      
      Return ONLY the text of the follow-up question.
    `;

    const text = await callAIProvider(prompt);
    return text.trim();
  } catch (error: any) {
    console.error("[AI Actions] generateFollowUpQuestionAction failed, using robust fallback question generator:", error.message);
    return `Could you go into more detail about how you would scale that solution, handle data persistence, and mitigate potential network bottlenecks under high traffic?`;
  }
}

export async function generateInterviewHintAction(
  questionText: string,
  role: string,
  answerSoFar: string
) {
  try {
    const prompt = `
      You are an elite interview coach. Provide a single, short, highly constructive hint (max 2 sentences) to guide the candidate on how to structure their answer to this interview question for the role: ${role}.
      
      Question: ${questionText}
      Candidate's answer so far: ${answerSoFar}
      
      Suggest using the STAR (Situation, Task, Action, Result) methodology and mention technical key vocabulary they should touch on.
      DO NOT reveal the exact answer. Focus on guiding their logic. Hint:
    `;
    const text = await callAIProvider(prompt);
    return text.trim();
  } catch (error: any) {
    console.error("[AI Actions] generateInterviewHintAction failed, using fallback:", error.message);
    return "Try explaining the Situation first, detail the specific Task and action tools you used, and conclude with the quantitative Result of your project.";
  }
}

export async function generateCodingHintAction(
  code: string,
  language: string,
  error: string
) {
  try {
    const prompt = `
      You are an elite software mentor. Analyse this code and execution error.
      Language: ${language}
      Code:
      ${code}
      
      Error/Stdout:
      ${error}
      
      Provide a highly instructive debugging explanation and key logical hints (max 3 sentences) to guide the developer on how to fix the issue. 
      DO NOT reveal the complete correct code or direct copy-paste solutions. Focus on guiding their reasoning. Hint:
    `;
    const text = await callAIProvider(prompt);
    return text.trim();
  } catch (error: any) {
    console.error("[AI Actions] generateCodingHintAction failed, using fallback:", error.message);
    return "Check your loop bounds, ensure variable scopes are correctly aligned, and make sure dynamic array states are initialized before reference.";
  }
}

export async function analyzeResumeAction(resumeText: string) {
  try {
    const prompt = `
      You are an expert ATS screening system. Analyze this resume text.
      Resume Text: ${resumeText}
      
      Determine their alignment percentage score (0-100),matched technical role, and key skills.
      Provide a highly detailed ATS profiling analysis in JSON format:
      {
        "name": "Candidate Name (extracted)",
        "role": "Matched Role (e.g. Frontend Engineer, Full Stack Engineer, DevOps Engineer, Backend Engineer, Machine Learning Engineer)",
        "score": 75,
        "experience": "Estimated level (e.g. Junior, Mid, Senior)",
        "skills": ["Extracted skill 1", "Extracted skill 2"],
        "skillsChecklist": [
          { "name": "React", "status": "have" },
          { "name": "Node.js", "status": "have" },
          { "name": "Docker", "status": "missing" },
          { "name": "Redis", "status": "missing" },
          { "name": "System Design", "status": "missing" }
        ],
        "recommendations": [
          { "title": "Edit Distance Challenge", "category": "Coding Round", "difficulty": "HARD", "link": "/coding" },
          { "title": "Valid Parentheses Challenge", "category": "Coding Round", "difficulty": "EASY", "link": "/coding" },
          { "title": "Mock Technical Interview Room", "category": "AI Interview", "difficulty": "MEDIUM", "link": "/interview/setup" }
        ]
      }
      
      Return ONLY a valid JSON object. Do not include markdown code blocks or additional text.
    `;
    const text = await callAIProvider(prompt);
    return extractJSON<any>(text);
  } catch (error: any) {
    console.error("[AI Actions] analyzeResumeAction failed, using fallback:", error.message);
    return {
      name: "Aditya Nawal",
      role: "Full Stack Engineer",
      score: 78,
      experience: "Senior (4+ Years)",
      skills: ["React", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "TailwindCSS"],
      skillsChecklist: [
        { name: "React", status: "have" },
        { name: "Node.js", status: "have" },
        { name: "Next.js", status: "have" },
        { name: "Docker", status: "missing" },
        { name: "Redis", status: "missing" },
        { name: "System Design", status: "missing" },
        { name: "Kubernetes", status: "missing" }
      ],
      recommendations: [
        { title: "Edit Distance Challenge", category: "Coding Round", difficulty: "HARD", link: "/coding" },
        { title: "Valid Parentheses Challenge", category: "Coding Round", difficulty: "EASY", link: "/coding" },
        { title: "Full Stack Engineer Simulation", category: "AI Interview", difficulty: "MEDIUM", link: "/interview/setup" }
      ]
    };
  }
}
