import MonacoEditor from "@monaco-editor/react";
import { useMonaco } from "@monaco-editor/react";
import { useEffect } from "react";
import useLocalStorageState from "use-local-storage-state";
import type { OnMount } from "@monaco-editor/react";

interface CodeEditorProps {
  schema?: object | null;
  localStorageKey: string;
  onSave(value: string): void;
}

export function CodeEditor({
  schema,
  localStorageKey,
  onSave,
}: CodeEditorProps) {
  const [value, setValue] = useLocalStorageState<string>(localStorageKey, {
    defaultValue: "{ }",
  });

  const monaco = useMonaco();

  useEffect(() => {
    if (!monaco || !schema) {
      return;
    }
    monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: "http://superstreamer-schema.org/custom",
          fileMatch: ["custom"],
          schema,
        },
      ],
    });
  }, [monaco, schema]);

  const onMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const value = editor.getValue();
      onSave(value);
    });
  };

  return (
    <MonacoEditor
      defaultLanguage="json"
      defaultValue={value}
      onMount={onMount}
      onChange={(value) => {
        setValue(value ?? "");
      }}
      defaultPath="custom"
      options={{
        wordWrap: "on",
        minimap: {
          enabled: false,
        },
        tabSize: 2,
        overviewRulerBorder: false,
        scrollBeyondLastLine: false,
      }}
    />
  );
}
