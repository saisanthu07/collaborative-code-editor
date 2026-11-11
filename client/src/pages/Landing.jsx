import { Link } from "react-router-dom";
import { Code2, Users, Zap, MessageSquare, Shield, Link2 } from "lucide-react";

const FEATURES = [
  { icon: Users, title: "Real-Time Collaboration", desc: "Edit code together with CRDT-based sync — no conflicts, ever." },
  { icon: Zap, title: "Multi-Language Execution", desc: "Run 15+ languages in an isolated sandbox via Judge0." },
  { icon: Link2, title: "Live Cursors", desc: "See exactly where teammates are typing, in real time." },
  { icon: MessageSquare, title: "Built-in Chat", desc: "Discuss the problem without leaving the editor." },
  { icon: Shield, title: "Secure Sandboxed Execution", desc: "Untrusted code never touches the app server." },
  { icon: Code2, title: "Shareable Rooms", desc: "One link, instant collaborative session." },
];

const USE_CASES = ["Pair Programming", "Technical Interviews", "Education", "Hackathons", "Remote Teams"];
const STACK = ["MongoDB", "Express", "React", "Node.js", "Yjs", "Monaco", "Socket.IO", "Judge0"];

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg text-gray-100">
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <Code2 className="text-accent" size={24} />
          CodeTogether
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link to="/login" className="text-gray-300 hover:text-white">
            Log In
          </Link>
          <Link to="/register" className="bg-accent px-4 py-1.5 rounded-md hover:bg-blue-600">
            Sign Up
          </Link>
        </div>
      </header>

      <section className="text-center py-20 px-6 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
          Code Together. <br /> Build Together.
        </h1>
        <p className="text-gray-400 mt-5">
          A real-time collaborative coding environment for developers, students, teams and interviews.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link to="/register" className="bg-accent px-6 py-2.5 rounded-md font-medium hover:bg-blue-600">
            Start Coding
          </Link>
          <Link to="/login" className="border border-border px-6 py-2.5 rounded-md font-medium hover:border-accent">
            Explore Demo
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-surface border border-border rounded-xl p-5">
              <Icon className="text-accent mb-3" size={22} />
              <div className="font-medium mb-1">{title}</div>
              <div className="text-sm text-gray-400">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-8 text-center">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">Use Cases</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {USE_CASES.map((u) => (
            <span key={u} className="border border-border rounded-full px-4 py-1.5 text-sm text-gray-300">
              {u}
            </span>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-8 pb-16 text-center">
        <h2 className="text-sm uppercase tracking-wide text-gray-500 mb-4">Technology</h2>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-400">
          {STACK.map((s) => (
            <span key={s} className="bg-surface border border-border rounded-md px-3 py-1.5">
              {s}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
