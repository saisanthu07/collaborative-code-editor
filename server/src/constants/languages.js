// Single source of truth for supported languages.
// monaco: id used by the Monaco editor for syntax highlighting
// judge0: language ID used by the Judge0 execution API
export const LANGUAGES = {
  javascript: { label: "JavaScript", monaco: "javascript", judge0: 63 },
  typescript: { label: "TypeScript", monaco: "typescript", judge0: 74 },
  python: { label: "Python", monaco: "python", judge0: 71 },
  c: { label: "C", monaco: "c", judge0: 50 },
  cpp: { label: "C++", monaco: "cpp", judge0: 54 },
  java: { label: "Java", monaco: "java", judge0: 62 },
  go: { label: "Go", monaco: "go", judge0: 60 },
  rust: { label: "Rust", monaco: "rust", judge0: 73 },
  php: { label: "PHP", monaco: "php", judge0: 68 },
  ruby: { label: "Ruby", monaco: "ruby", judge0: 72 },
  kotlin: { label: "Kotlin", monaco: "kotlin", judge0: 78 },
  swift: { label: "Swift", monaco: "swift", judge0: 83 },
  csharp: { label: "C#", monaco: "csharp", judge0: 51 },
  dart: { label: "Dart", monaco: "dart", judge0: 90 },
  sql: { label: "SQL", monaco: "sql", judge0: 82 },
};

export function getJudge0Id(languageKey) {
  const entry = LANGUAGES[languageKey];
  if (!entry) throw new Error(`Unsupported language: ${languageKey}`);
  return entry.judge0;
}

export function isSupportedLanguage(languageKey) {
  return Object.prototype.hasOwnProperty.call(LANGUAGES, languageKey);
}
