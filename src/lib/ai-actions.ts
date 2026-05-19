"use server";

import { Question, Feedback } from "./store";
import { callAIProvider } from "./ai-provider";

export async function generateInterviewQuestions(params: {
  role: string;
  experienceLevel: string;
  techStack: string[];
  resumeText?: string;
  count?: number;
}) {
  const { role, experienceLevel, techStack, resumeText, count = 5 } = params;

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
  const jsonStr = text.replace(/```json|```/g, "").trim();
  
  return JSON.parse(jsonStr) as Question[];
}

export async function evaluateInterview(params: {
  role: string;
  experienceLevel: string;
  questions: Array<{ id: string; text: string; answer: string; type: string }>;
}) {
  const { role, experienceLevel, questions } = params;

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
  const jsonStr = text.replace(/```json|```/g, "").trim();
  
  return JSON.parse(jsonStr) as Feedback;
}

export async function generateFollowUpQuestionAction(
  originalQuestion: string,
  answer: string,
  role: string
) {
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
}
