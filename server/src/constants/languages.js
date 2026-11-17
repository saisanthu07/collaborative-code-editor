// Single source of truth for supported languages.
// monaco: id used by the Monaco editor for syntax highlighting
// judge0: language ID used by the Judge0 execution API
// piston: language identifier used by the Piston execution API
export const LANGUAGES = {
  javascript: { label: "JavaScript", monaco: "javascript", judge0: 63, piston: "javascript" },
  typescript: { label: "TypeScript", monaco: "typescript", judge0: 74, piston: "typescript" },
  python: { label: "Python", monaco: "python", judge0: 71, piston: "python" },
  c: { label: "C", monaco: "c", judge0: 50, piston: "c" },
  cpp: { label: "C++", monaco: "cpp", judge0: 54, piston: "c++" },
  java: { label: "Java", monaco: "java", judge0: 62, piston: "java" },
  go: { label: "Go", monaco: "go", judge0: 60, piston: "go" },
  rust: { label: "Rust", monaco: "rust", judge0: 73, piston: "rust" },
  php: { label: "PHP", monaco: "php", judge0: 68, piston: "php" },
  ruby: { label: "Ruby", monaco: "ruby", judge0: 72, piston: "ruby" },
  kotlin: { label: "Kotlin", monaco: "kotlin", judge0: 78, piston: "kotlin" },
  swift: { label: "Swift", monaco: "swift", judge0: 83, piston: "swift" },
  csharp: { label: "C#", monaco: "csharp", judge0: 51, piston: "csharp" },
  dart: { label: "Dart", monaco: "dart", judge0: 90, piston: "dart" },
  sql: { label: "SQL", monaco: "sql", judge0: 82, piston: "sqlite3" },
};

export function getJudge0Id(languageKey) {
  const entry = LANGUAGES[languageKey];
  if (!entry) throw new Error(`Unsupported language: ${languageKey}`);
  return entry.judge0;
}

export function getPistonLang(languageKey) {
  const entry = LANGUAGES[languageKey];
  if (!entry) throw new Error(`Unsupported language: ${languageKey}`);
  return entry.piston || languageKey;
}

export function isSupportedLanguage(languageKey) {
  return Object.prototype.hasOwnProperty.call(LANGUAGES, languageKey);
}
