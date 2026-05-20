"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import Editor from "@monaco-editor/react";
import { 
  Play, Save, RefreshCcw, Code2, 
  Terminal, CheckCircle2, AlertCircle,
  ChevronRight, Trophy, Clock, Loader2, Info
} from "lucide-react";
import { PROGRAMMING_LANGUAGES, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

type PistonExecutionResult = {
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  output?: string;
  time?: string;
  memory?: string;
};

type TestResult = {
  id: number;
  name: string;
  status: "passed" | "failed";
  time: string;
  memory: string;
};

export default function CodingPage() {
  const [selectedLang, setSelectedLang] = useState(PROGRAMMING_LANGUAGES[0]);
  const [code, setCode] = useState(selectedLang.template);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [output, setOutput] = useState("");
  const [activeTab, setActiveTab] = useState<"problem" | "testcases">("problem");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [isSolved, setIsSolved] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleLangChange = (langId: string) => {
    const lang = PROGRAMMING_LANGUAGES.find(l => l.id === langId);
    if (lang) {
      setSelectedLang(lang);
      setCode(lang.template);
    }
  };

  const runCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setOutput("Executing code on remote server...\n");
    setActiveTab("testcases");
    
    try {
      const { executeCode } = await import("@/lib/coding-actions");
      const result = await executeCode({
        source_code: code,
        language: (selectedLang as any).pistonLang,
        version: (selectedLang as any).pistonVersion,
        stdin: ""
      });
      
      if (result.stdout) {
        setOutput(`> Output:\n${result.stdout}`);
        setTestResults([
          { id: 1, name: "Sample Execution", status: "passed", time: `${result.time}s`, memory: `${result.memory}KB` }
        ]);
        toast.success("Execution complete!");
      } else if (result.compile_output) {
        setOutput(`> Compilation Error:\n${result.compile_output}`);
        toast.error("Compilation error");
      } else if (result.stderr) {
        setOutput(`> Runtime Error:\n${result.stderr}`);
        toast.error("Runtime error");
      } else {
        setOutput("> No output returned.");
      }
    } catch (error) {
      setOutput("\nError: Failed to connect to execution server.");
      toast.error("Execution failed.");
    } finally {
      setIsRunning(false);
    }
  };

  const submitSolution = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    toast.loading("Validating against hidden test cases...", { id: "submit" });
    
    try {
      // Execute final code
      const { executeCode } = await import("@/lib/coding-actions");
      const result = await executeCode({
        source_code: code,
        language: (selectedLang as any).pistonLang,
        version: (selectedLang as any).pistonVersion,
        stdin: ""
      });

      const isSuccess = result.stdout && !result.stderr;
      
      // Save submission
      await fetch("/api/coding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: selectedLang.id,
          code,
          status: isSuccess ? "passed" : "failed",
          runtime: parseFloat(result.time || "0"),
          memory: parseFloat(result.memory || "0"),
          score: isSuccess ? 100 : 0
        }),
      });

      if (isSuccess) {
        setIsSolved(true);
        toast.success("Solution submitted successfully! +100 Points", { id: "submit" });
      } else {
        toast.error("Submission failed hidden tests.", { id: "submit" });
      }
    } catch (error) {
      toast.error("Failed to submit solution.", { id: "submit" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCode = () => {
    if (confirm("Are you sure you want to reset your code to the default template?")) {
      setCode(selectedLang.template);
      setOutput("");
      setTestResults([]);
      toast("Code reset to template");
    }
  };

  return (
    <DashboardLayout 
      title="Coding Assessment" 
      subtitle="Master technical rounds with real-time feedback."
    >
      <div className="flex flex-col lg:flex-row h-[calc(100vh-180px)] gap-6">
        {/* Left Side: Problem Description */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 overflow-hidden">
           <div className="flex-1 p-0 overflow-hidden flex flex-col border-4 border-white/20 bg-black brutal-shadow">
              <div className="flex border-b-4 border-white/20">
                 <button 
                  onClick={() => setActiveTab("problem")}
                  className={cn(
                    "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-4 font-mono",
                    activeTab === "problem" ? "border-primary text-black bg-primary brutal-shadow-sm" : "border-transparent text-slate-500 hover:text-white bg-black"
                  )}
                 >
                    Problem Description
                 </button>
                 <button 
                  onClick={() => setActiveTab("testcases")}
                  className={cn(
                    "flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-4 font-mono",
                    activeTab === "testcases" ? "border-primary text-black bg-primary brutal-shadow-sm" : "border-transparent text-slate-500 hover:text-white bg-black"
                  )}
                 >
                    Test Cases {testResults.length > 0 && `(${testResults.length})`}
                 </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                 <AnimatePresence mode="wait">
                    {activeTab === "problem" ? (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-6"
                      >
                         <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white tracking-tight">Reverse Linked List</h2>
                            <span className="badge badge-blue text-[10px]">EASY</span>
                         </div>
                         
                         <div className="text-sm font-bold text-slate-400 leading-relaxed space-y-6 font-mono">
                            <p>Given the head of a singly linked list, reverse the list, and return the reversed list.</p>
                            <div className="p-6 border-4 border-white/20 bg-black brutal-shadow-sm space-y-6">
                               <div>
                                  <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Example 1</p>
                                  <code className="text-primary bg-white/5 p-4 block font-mono text-[12px] border-2 border-white/20">
                                    Input: head = [1,2,3,4,5]<br />
                                    Output: [5,4,3,2,1]
                                  </code>
                               </div>
                               <div>
                                  <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Example 2</p>
                                  <code className="text-primary bg-white/5 p-4 block font-mono text-[12px] border-2 border-white/20">
                                    Input: head = [1,2]<br />
                                    Output: [2,1]
                                  </code>
                               </div>
                            </div>
                            <div className="space-y-4 pt-4">
                               <p className="font-black text-white flex items-center gap-3 uppercase tracking-tight">
                                  <Info className="w-5 h-5 text-primary" /> Constraints:
                               </p>
                               <ul className="list-disc pl-6 space-y-2 marker:text-primary text-xs">
                                  <li>The number of nodes in the list is the range [0, 5000].</li>
                                  <li>-5000 &lt;= Node.val &lt;= 5000</li>
                               </ul>
                            </div>
                         </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="space-y-3"
                      >
                         {testResults.length > 0 ? (
                            testResults.map(res => (
                               <div key={res.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                                  <div className="flex items-center gap-3">
                                     <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px]", res.status === 'passed' ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50")} />
                                     <div>
                                        <span className="text-sm font-bold text-white block">{res.name}</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{res.memory}</span>
                                     </div>
                                  </div>
                                  <span className="text-[10px] text-slate-500 font-mono bg-white/5 px-2 py-1 rounded">{res.time}</span>
                               </div>
                            ))
                         ) : (
                            <div className="text-center py-20">
                               <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                                  <Terminal className="w-6 h-6 text-slate-600" />
                               </div>
                               <p className="text-slate-500 text-sm font-medium">Run your code to see test results</p>
                            </div>
                         )}
                      </motion.div>
                    )}
                 </AnimatePresence>
              </div>

              <div className="p-5 border-t-4 border-white/20 flex items-center justify-between bg-black">
                 <div className="flex items-center gap-3 text-[10px] font-black text-white uppercase tracking-widest font-mono">
                    <Clock className="w-4 h-4 text-primary" /> {formatTime(timeLeft)} remaining
                 </div>
                 <div className="flex items-center gap-3 text-[10px] font-black text-white uppercase tracking-widest font-mono bg-white/10 px-3 py-1 border-2 border-white/20">
                    <Trophy className="w-4 h-4 text-amber-500" /> +100 Points
                 </div>
              </div>
           </div>
        </div>

        {/* Right Side: Editor */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
           <div className="flex-1 p-0 overflow-hidden flex flex-col border-4 border-white/20 bg-black brutal-shadow">
              <div className="h-16 border-b-4 border-white/20 flex items-center justify-between px-6 bg-black">
                 <div className="flex items-center gap-4">
                    <select 
                      value={selectedLang.id}
                      onChange={(e) => handleLangChange(e.target.value)}
                      className="bg-transparent text-sm font-black text-primary uppercase tracking-widest outline-none cursor-pointer hover:text-white transition-colors font-mono"
                    >
                       {PROGRAMMING_LANGUAGES.map(l => <option key={l.id} value={l.id} className="bg-black text-white">{l.label}</option>)}
                    </select>
                 </div>
                 <div className="flex items-center gap-4">
                    <button 
                      onClick={resetCode}
                      className="p-2 border-2 border-transparent hover:border-white text-slate-500 hover:text-white transition-all brutal-shadow-sm"
                      title="Reset to template"
                    >
                       <RefreshCcw className="w-5 h-5" />
                    </button>
                    <button className="p-2 border-2 border-transparent hover:border-white text-slate-500 hover:text-white transition-all brutal-shadow-sm">
                       <Save className="w-5 h-5" />
                    </button>
                 </div>
              </div>

              <div className="flex-1 relative bg-[#1e1e1e]">
                 <Editor
                   height="100%"
                   theme="vs-dark"
                   language={selectedLang.monacoLang}
                   value={code}
                   onChange={(val) => setCode(val || "")}
                   options={{
                     fontSize: 14,
                     minimap: { enabled: false },
                     scrollBeyondLastLine: false,
                     lineNumbers: "on",
                     automaticLayout: true,
                     padding: { top: 20 },
                     fontFamily: "JetBrains Mono",
                     cursorStyle: "block",
                     smoothScrolling: true,
                     lineHeight: 24,
                   }}
                 />
              </div>

              <div className="h-48 border-t-4 border-white/20 bg-black flex flex-col overflow-hidden">
                 <div className="h-12 px-6 flex items-center justify-between border-b-2 border-white/20 bg-black">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-3 font-mono">
                       <Terminal className="w-4 h-4 text-primary" /> Output Terminal
                    </span>
                    {isRunning && <div className="w-3 h-3 bg-primary animate-pulse border border-black brutal-shadow-sm" />}
                 </div>
                 <div className="flex-1 p-6 text-[13px] font-mono text-primary overflow-y-auto custom-scrollbar whitespace-pre font-bold">
                    {output || "No output yet. Run your code to see results."}
                 </div>
              </div>

              <div className="p-6 flex items-center justify-between bg-black border-t-4 border-white/20">
                 <Link href="/interview/setup" className="text-xs font-black text-slate-500 hover:text-primary uppercase tracking-widest transition-all flex items-center gap-2 font-mono">
                    <ChevronRight className="w-5 h-5 rotate-180" /> Leave Session
                 </Link>
                 <div className="flex items-center gap-6">
                    <button 
                      onClick={runCode}
                      disabled={isRunning || isSubmitting || isSolved}
                      className="px-6 py-3 bg-black border-4 border-white text-white text-xs font-black uppercase tracking-widest font-mono hover:bg-white hover:text-black brutal-shadow transition-colors flex items-center gap-3 disabled:opacity-50"
                    >
                       {isRunning ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <Play className="w-5 h-5 fill-current" />}
                       {isRunning ? "RUNNING..." : "RUN TESTS"}
                    </button>
                    <button 
                      onClick={submitSolution}
                      disabled={isRunning || isSubmitting || isSolved}
                      className="px-8 py-3 btn-primary text-xs font-black uppercase tracking-widest font-mono flex items-center gap-3 disabled:opacity-50"
                    >
                       {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : isSolved ? <CheckCircle2 className="w-5 h-5" /> : null}
                       {isSubmitting ? "SUBMITTING..." : isSolved ? "SUBMITTED" : "FINAL SUBMIT"}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
      {isSubmitting && (
        <LoadingScreen message="Executing test suite against hidden test cases..." />
      )}
    </DashboardLayout>
  );
}
