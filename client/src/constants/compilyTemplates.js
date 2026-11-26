export const COMPILY_TEMPLATES = {
  javascript: {
    fileName: "index.js",
    code: `// Compily — Personal JavaScript Playground\nfunction greet(name) {\n  return \`Hello, \${name}! Ready to compile.\`;\n}\n\nconsole.log(greet("Developer"));\n`,
  },
  typescript: {
    fileName: "index.ts",
    code: `// Compily — Personal TypeScript Playground\nfunction sum(nums: number[]): number {\n  return nums.reduce((acc, n) => acc + n, 0);\n}\n\nconsole.log("Sum:", sum([10, 20, 30]));\n`,
  },
  python: {
    fileName: "main.py",
    code: `# Compily — Personal Python Playground\ndef solve(nums):\n    return sum(nums)\n\nprint("Hello from Compily!", solve([1, 2, 3, 4, 5]))\n`,
  },
  c: {
    fileName: "main.c",
    code: `#include <stdio.h>\n\nint main(void) {\n    printf("Hello from Compily!\\n");\n    return 0;\n}\n`,
  },
  cpp: {
    fileName: "main.cpp",
    code: `#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> nums = {1, 2, 3, 4, 5};\n    int sum = 0;\n    for (int n : nums) sum += n;\n    std::cout << "Hello from Compily! Sum = " << sum << std::endl;\n    return 0;\n}\n`,
  },
  java: {
    fileName: "Main.java",
    code: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Compily!");\n    }\n}\n`,
  },
  go: {
    fileName: "main.go",
    code: `package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello from Compily!")\n}\n`,
  },
  rust: {
    fileName: "main.rs",
    code: `fn main() {\n    println!("Hello from Compily!");\n}\n`,
  },
  php: {
    fileName: "index.php",
    code: `<?php\necho "Hello from Compily!\\n";\n`,
  },
  ruby: {
    fileName: "main.rb",
    code: `puts "Hello from Compily!"\n`,
  },
  kotlin: {
    fileName: "Main.kt",
    code: `fun main() {\n    println("Hello from Compily!")\n}\n`,
  },
  swift: {
    fileName: "main.swift",
    code: `print("Hello from Compily!")\n`,
  },
  csharp: {
    fileName: "Program.cs",
    code: `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello from Compily!");\n    }\n}\n`,
  },
  dart: {
    fileName: "main.dart",
    code: `void main() {\n  print("Hello from Compily!");\n}\n`,
  },
  sql: {
    fileName: "query.sql",
    code: `CREATE TABLE coders (id INTEGER PRIMARY KEY, name TEXT);\nINSERT INTO coders VALUES (1, 'Ada'), (2, 'Linus');\nSELECT * FROM coders;\n`,
  },
};

export function getCompilyTemplate(language = "javascript") {
  return COMPILY_TEMPLATES[language] || COMPILY_TEMPLATES.javascript;
}
