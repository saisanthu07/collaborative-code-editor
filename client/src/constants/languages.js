export const LANGUAGES = [
  { key: "javascript", label: "JavaScript", monaco: "javascript", ext: ".js" },
  { key: "typescript", label: "TypeScript", monaco: "typescript", ext: ".ts" },
  { key: "python", label: "Python", monaco: "python", ext: ".py" },
  { key: "c", label: "C", monaco: "c", ext: ".c" },
  { key: "cpp", label: "C++", monaco: "cpp", ext: ".cpp" },
  { key: "java", label: "Java", monaco: "java", ext: ".java" },
  { key: "go", label: "Go", monaco: "go", ext: ".go" },
  { key: "rust", label: "Rust", monaco: "rust", ext: ".rs" },
  { key: "php", label: "PHP", monaco: "php", ext: ".php" },
  { key: "ruby", label: "Ruby", monaco: "ruby", ext: ".rb" },
  { key: "kotlin", label: "Kotlin", monaco: "kotlin", ext: ".kt" },
  { key: "swift", label: "Swift", monaco: "swift", ext: ".swift" },
  { key: "csharp", label: "C#", monaco: "csharp", ext: ".cs" },
  { key: "dart", label: "Dart", monaco: "dart", ext: ".dart" },
  { key: "sql", label: "SQL", monaco: "sql", ext: ".sql" },
];

export function monacoLangFor(key) {
  return LANGUAGES.find((l) => l.key === key)?.monaco || "plaintext";
}

const EXT_TO_LANG = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  java: "java",
  go: "go",
  rs: "rust",
  php: "php",
  rb: "ruby",
  kt: "kotlin",
  swift: "swift",
  cs: "csharp",
  dart: "dart",
  sql: "sql",
  json: "javascript",
  html: "javascript",
  css: "javascript",
};

export function detectLanguageFromFileName(filename = "") {
  if (!filename) return "javascript";
  const parts = filename.split(".");
  if (parts.length > 1) {
    const ext = parts.pop().toLowerCase();
    if (EXT_TO_LANG[ext]) {
      return EXT_TO_LANG[ext];
    }
  }
  return "javascript";
}

export function getFileBadge(filename = "") {
  const parts = filename.split(".");
  const ext = parts.length > 1 ? parts.pop().toLowerCase() : "";
  switch (ext) {
    case "js":
    case "jsx":
      return {
        text: "JS",
        color: "text-amber-800 dark:text-amber-400 bg-amber-500/15 border-amber-500/30",
      };
    case "ts":
    case "tsx":
      return {
        text: "TS",
        color: "text-blue-800 dark:text-blue-400 bg-blue-500/15 border-blue-500/30",
      };
    case "py":
      return {
        text: "PY",
        color: "text-emerald-800 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
      };
    case "java":
      return {
        text: "JV",
        color: "text-orange-800 dark:text-orange-400 bg-orange-500/15 border-orange-500/30",
      };
    case "cpp":
    case "cc":
    case "c":
      return {
        text: "C++",
        color: "text-sky-800 dark:text-sky-400 bg-sky-500/15 border-sky-500/30",
      };
    case "go":
      return {
        text: "GO",
        color: "text-teal-800 dark:text-teal-400 bg-teal-500/15 border-teal-500/30",
      };
    case "rs":
      return {
        text: "RS",
        color: "text-rose-800 dark:text-rose-400 bg-rose-500/15 border-rose-500/30",
      };
    case "json":
      return {
        text: "{}",
        color: "text-stone-700 dark:text-stone-300 bg-stone-500/15 border-stone-500/30",
      };
    default:
      return {
        text: ext ? ext.slice(0, 3).toUpperCase() : "<>",
        color: "text-gray-700 dark:text-gray-300 bg-surface2 border-border",
      };
  }
}
