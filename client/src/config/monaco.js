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

loader.config({ monaco });

export { monaco };
