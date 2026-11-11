export const LANGUAGES = [
  { key: "javascript", label: "JavaScript", monaco: "javascript" },
  { key: "typescript", label: "TypeScript", monaco: "typescript" },
  { key: "python", label: "Python", monaco: "python" },
  { key: "c", label: "C", monaco: "c" },
  { key: "cpp", label: "C++", monaco: "cpp" },
  { key: "java", label: "Java", monaco: "java" },
  { key: "go", label: "Go", monaco: "go" },
  { key: "rust", label: "Rust", monaco: "rust" },
  { key: "php", label: "PHP", monaco: "php" },
  { key: "ruby", label: "Ruby", monaco: "ruby" },
  { key: "kotlin", label: "Kotlin", monaco: "kotlin" },
  { key: "swift", label: "Swift", monaco: "swift" },
  { key: "csharp", label: "C#", monaco: "csharp" },
  { key: "dart", label: "Dart", monaco: "dart" },
  { key: "sql", label: "SQL", monaco: "sql" },
];

export function monacoLangFor(key) {
  return LANGUAGES.find((l) => l.key === key)?.monaco || "plaintext";
}
