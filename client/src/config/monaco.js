import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Disable noisy semantic validation in real-time collaborative sandbox
if (monaco.languages?.typescript) {
  monaco.languages.typescript.javascriptDefaults?.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
  monaco.languages.typescript.typescriptDefaults?.setDiagnosticsOptions({
    noSemanticValidation: true,
    noSyntaxValidation: false,
  });
}

// Option 1: Editorial Parchment (Light Paper Monaco Theme)
monaco.editor.defineTheme("paper-parchment", {
  base: "vs",
  inherit: true,
  rules: [
    { token: "", foreground: "221C16" }, // Walnut ink
    { token: "comment", foreground: "8F8373", fontStyle: "italic" }, // Graphite pencil
    { token: "keyword", foreground: "C2542D", fontStyle: "bold" }, // Terracotta wax seal
    { token: "identifier", foreground: "221C16" },
    { token: "string", foreground: "3C6E47" }, // Forest sage stamp
    { token: "number", foreground: "8C4B1F" }, // Warm sienna
    { token: "type", foreground: "70487D" }, // Royal mulberry
    { token: "type.identifier", foreground: "70487D" },
    { token: "delimiter", foreground: "73685C" },
    { token: "tag", foreground: "C2542D" },
    { token: "attribute.name", foreground: "8C4B1F" },
    { token: "attribute.value", foreground: "3C6E47" },
  ],
  colors: {
    "editor.background": "#FAF7F0",
    "editor.foreground": "#221C16",
    "editorLineNumber.foreground": "#9E9280",
    "editorLineNumber.activeForeground": "#C2542D",
    "editorGutter.background": "#F4EFE6",
    "editor.lineHighlightBackground": "#EDE6D855",
    "editorCursor.foreground": "#C2542D",
    "editor.selectionBackground": "#C2542D26",
    "editor.inactiveSelectionBackground": "#C2542D14",
    "editorIndentGuide.background": "#E5DDCF",
    "editorIndentGuide.activeBackground": "#C2542D77",
    "editorWhitespace.foreground": "#DDD5C7",
    "scrollbarSlider.background": "#DDD5C755",
    "scrollbarSlider.hoverBackground": "#DDD5C799",
    "scrollbarSlider.activeBackground": "#C2542D66",
  },
});

// Option 2: Midnight Kraft (Dark Paper Monaco Theme)
monaco.editor.defineTheme("paper-midnight-kraft", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "", foreground: "ECE7DC" }, // Bone white ink
    { token: "comment", foreground: "787367", fontStyle: "italic" }, // Warm ash dust
    { token: "keyword", foreground: "E08338", fontStyle: "bold" }, // Amber copper seal
    { token: "identifier", foreground: "ECE7DC" },
    { token: "string", foreground: "7BB894" }, // Patina sage
    { token: "number", foreground: "D48A55" }, // Apricot kraft
    { token: "type", foreground: "C095D1" }, // Lavender wax
    { token: "type.identifier", foreground: "C095D1" },
    { token: "delimiter", foreground: "969082" },
    { token: "tag", foreground: "E08338" },
    { token: "attribute.name", foreground: "D48A55" },
    { token: "attribute.value", foreground: "7BB894" },
  ],
  colors: {
    "editor.background": "#1E1D19",
    "editor.foreground": "#ECE7DC",
    "editorLineNumber.foreground": "#635F55",
    "editorLineNumber.activeForeground": "#E08338",
    "editorGutter.background": "#181714",
    "editor.lineHighlightBackground": "#28262066",
    "editorCursor.foreground": "#E08338",
    "editor.selectionBackground": "#E0833833",
    "editor.inactiveSelectionBackground": "#E083381A",
    "editorIndentGuide.background": "#302E27",
    "editorIndentGuide.activeBackground": "#E0833877",
    "editorWhitespace.foreground": "#383630",
    "scrollbarSlider.background": "#3D3B3355",
    "scrollbarSlider.hoverBackground": "#3D3B3399",
    "scrollbarSlider.activeBackground": "#E0833866",
  },
});

loader.config({ monaco });

export { monaco };
