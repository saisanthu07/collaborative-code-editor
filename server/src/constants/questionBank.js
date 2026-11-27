export const QUESTION_BANK = [
  {
    id: "two-sum",
    title: "Two Sum",
    difficulty: "Easy",
    category: "Arrays & Hash Map",
    prompt: `# Two Sum\n\nGiven \`n\` integers and a target integer, print the 0-based indices of the two numbers that add up to \`target\` (separated by a space).\n\n### Input Format\n- Line 1: \`n\` and \`target\`\n- Line 2: \`n\` space-separated integers\n\n### Example\nInput:\n\`\`\`\n4 9\n2 7 11 15\n\`\`\`\nOutput:\n\`\`\`\n0 1\n\`\`\`\n`,
    starter: {
      javascript: `const fs = require("fs");\nconst tokens = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\nif (tokens.length >= 2) {\n  const [n, target, ...nums] = tokens;\n  const seen = new Map();\n  for (let i = 0; i < n; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) {\n      console.log(seen.get(need), i);\n      break;\n    }\n    seen.set(nums[i], i);\n  }\n}\n`,
      python: `import sys\n\ndata = list(map(int, sys.stdin.read().split()))\nif len(data) >= 2:\n    n, target = data[0], data[1]\n    nums = data[2:2 + n]\n    seen = {}\n    for i, val in enumerate(nums):\n        need = target - val\n        if need in seen:\n            print(seen[need], i)\n            break\n        seen[val] = i\n`,
    },
    testCases: [
      { id: 1, input: "4 9\n2 7 11 15", expected: "0 1", isHidden: false },
      { id: 2, input: "3 6\n3 2 4", expected: "1 2", isHidden: false },
      { id: 3, input: "2 6\n3 3", expected: "0 1", isHidden: true },
      { id: 4, input: "5 -1\n-3 4 3 90 2", expected: "1 4", isHidden: true },
    ],
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses",
    difficulty: "Easy",
    category: "Stack",
    prompt: `# Valid Parentheses\n\nGiven a string containing \`(\`, \`)\`, \`{\`, \`}\`, \`[\`, and \`]\`, print \`true\` if the brackets are balanced and properly nested, or \`false\` otherwise.\n`,
    starter: {
      javascript: `const fs = require("fs");\nconst s = fs.readFileSync(0, "utf8").trim();\nconst pairs = { ")": "(", "}": "{", "]": "[" };\nconst stack = [];\nlet valid = true;\nfor (const ch of s) {\n  if ("({[".includes(ch)) stack.push(ch);\n  else if (stack.pop() !== pairs[ch]) { valid = false; break; }\n}\nconsole.log(String(valid && stack.length === 0));\n`,
      python: `import sys\n\ns = sys.stdin.read().strip()\npairs = {")": "(", "}": "{", "]": "["}\nstack = []\nvalid = True\nfor ch in s:\n    if ch in "({[":\n        stack.append(ch)\n    elif not stack or stack.pop() != pairs.get(ch):\n        valid = False\n        break\nprint("true" if valid and not stack else "false")\n`,
    },
    testCases: [
      { id: 1, input: "()[]{}", expected: "true", isHidden: false },
      { id: 2, input: "(]", expected: "false", isHidden: false },
      { id: 3, input: "({[]})", expected: "true", isHidden: true },
      { id: 4, input: "(((", expected: "false", isHidden: true },
    ],
  },
  {
    id: "merge-intervals",
    title: "Merge Intervals",
    difficulty: "Medium",
    category: "Sorting & Intervals",
    prompt: `# Merge Intervals\n\nGiven \`n\` intervals \`[start, end]\`, merge all overlapping intervals and print each merged interval on its own line as \`start end\`.\n\n### Input Format\n- Line 1: \`n\`\n- Next \`n\` lines: \`start end\`\n`,
    starter: {
      javascript: `const fs = require("fs");\nconst tokens = fs.readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\nconst n = tokens[0] || 0;\nconst intervals = [];\nfor (let i = 0; i < n; i++) intervals.push([tokens[1 + i * 2], tokens[2 + i * 2]]);\nintervals.sort((a, b) => a[0] - b[0]);\nconst merged = [];\nfor (const [s, e] of intervals) {\n  if (!merged.length || merged[merged.length - 1][1] < s) merged.push([s, e]);\n  else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);\n}\nconsole.log(merged.map(([s, e]) => \`\${s} \${e}\`).join("\\n"));\n`,
      python: `import sys\n\ntokens = list(map(int, sys.stdin.read().split()))\nif tokens:\n    n = tokens[0]\n    intervals = sorted((tokens[1 + 2 * i], tokens[2 + 2 * i]) for i in range(n))\n    merged = []\n    for s, e in intervals:\n        if not merged or merged[-1][1] < s:\n            merged.append([s, e])\n        else:\n            merged[-1][1] = max(merged[-1][1], e)\n    for s, e in merged:\n        print(s, e)\n`,
    },
    testCases: [
      { id: 1, input: "4\n1 3\n2 6\n8 10\n15 18", expected: "1 6\n8 10\n15 18", isHidden: false },
      { id: 2, input: "2\n1 4\n4 5", expected: "1 5", isHidden: true },
    ],
  },
  {
    id: "lru-cache",
    title: "LRU Cache Design",
    difficulty: "Medium",
    category: "Data Structures",
    prompt: `# LRU Cache\n\nImplement an O(1) \`get(key)\` and \`put(key, value)\` Least Recently Used cache.\n\n### Operations (stdin)\n- Line 1: \`capacity\`\n- Remaining lines: \`PUT k v\` or \`GET k\` (print result of each \`GET\`, or \`-1\` if absent)\n`,
    starter: {
      javascript: `const fs = require("fs");\nconst lines = fs.readFileSync(0, "utf8").trim().split(/\\n+/);\nconst cap = Number(lines[0] || 0);\nconst cache = new Map();\nfor (const line of lines.slice(1)) {\n  const [op, k, v] = line.trim().split(/\\s+/);\n  if (op === "GET") {\n    if (!cache.has(k)) { console.log(-1); continue; }\n    const val = cache.get(k);\n    cache.delete(k);\n    cache.set(k, val);\n    console.log(val);\n  } else if (op === "PUT") {\n    if (cache.has(k)) cache.delete(k);\n    cache.set(k, v);\n    if (cache.size > cap) cache.delete(cache.keys().next().value);\n  }\n}\n`,
      python: `import sys\nfrom collections import OrderedDict\n\nlines = [l.strip() for l in sys.stdin.read().splitlines() if l.strip()]\nif lines:\n    cap = int(lines[0])\n    cache = OrderedDict()\n    for line in lines[1:]:\n        parts = line.split()\n        if parts[0] == "GET":\n            k = parts[1]\n            if k not in cache:\n                print(-1)\n            else:\n                cache.move_to_end(k)\n                print(cache[k])\n        elif parts[0] == "PUT":\n            k, v = parts[1], parts[2]\n            if k in cache:\n                cache.move_to_end(k)\n            cache[k] = v\n            if len(cache) > cap:\n                cache.popitem(last=False)\n`,
    },
    testCases: [
      { id: 1, input: "2\nPUT 1 10\nPUT 2 20\nGET 1\nPUT 3 30\nGET 2\nGET 3", expected: "10\n-1\n30", isHidden: false },
      { id: 2, input: "1\nPUT 5 50\nPUT 6 60\nGET 5\nGET 6", expected: "-1\n60", isHidden: true },
    ],
  },
  {
    id: "rate-limiter",
    title: "Sliding Window Rate Limiter",
    difficulty: "Hard",
    category: "System Design & Coding",
    prompt: `# Sliding Window Rate Limiter\n\nDesign & implement a per-user sliding-window rate limiter allowing at most \`limit\` requests within \`windowMs\` milliseconds.\n\n### Input\n- Line 1: \`limit windowMs\`\n- Remaining lines: \`userId timestampMs\`\n- Output \`ALLOW\` or \`DENY\` per request.\n`,
    starter: {
      javascript: `const fs = require("fs");\nconst lines = fs.readFileSync(0, "utf8").trim().split(/\\n+/);\nconst [limit, windowMs] = (lines[0] || "0 0").split(/\\s+/).map(Number);\nconst buckets = new Map();\nfor (const line of lines.slice(1)) {\n  const [user, tsStr] = line.trim().split(/\\s+/);\n  const ts = Number(tsStr);\n  const q = (buckets.get(user) || []).filter((t) => ts - t < windowMs);\n  if (q.length < limit) {\n    q.push(ts);\n    buckets.set(user, q);\n    console.log("ALLOW");\n  } else {\n    buckets.set(user, q);\n    console.log("DENY");\n  }\n}\n`,
      python: `import sys\nfrom collections import deque\n\nlines = [l.strip() for l in sys.stdin.read().splitlines() if l.strip()]\nif lines:\n    limit, window_ms = map(int, lines[0].split())\n    buckets = {}\n    for line in lines[1:]:\n        user, ts_str = line.split()\n        ts = int(ts_str)\n        q = buckets.setdefault(user, deque())\n        while q and ts - q[0] >= window_ms:\n            q.popleft()\n        if len(q) < limit:\n            q.append(ts)\n            print("ALLOW")\n        else:\n            print("DENY")\n`,
    },
    testCases: [
      { id: 1, input: "2 1000\nalice 100\nalice 500\nalice 800\nalice 1200", expected: "ALLOW\nALLOW\nDENY\nALLOW", isHidden: false },
      { id: 2, input: "1 500\nbob 10\nbob 100\nbob 510", expected: "ALLOW\nDENY\nALLOW", isHidden: true },
    ],
  },
];

export function getQuestionById(id) {
  return QUESTION_BANK.find((q) => q.id === id) || null;
}
