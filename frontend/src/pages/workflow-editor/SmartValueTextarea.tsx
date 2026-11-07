import { useRef, type RefObject } from "react";
import { useI18n } from "@/lib/i18n";

export interface SmartValueTextareaProps {
  value: string;
  onChange: (value: string) => void;
  variables: Array<{ token: string; description?: string; type?: string }>;
  rows?: number;
  placeholder?: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  showVariables?: boolean;
}

export default function SmartValueTextarea({
  value,
  onChange,
  variables,
  rows = 5,
  placeholder,
  textareaRef,
  showVariables = true,
}: SmartValueTextareaProps) {
  const { t } = useI18n();
  const localRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = textareaRef ?? localRef;
  const highlightRef = useRef<HTMLPreElement>(null);
  const parts = value.split(/(\{\{\s*[\w.-]+\s*\}\})/g);

  function insertVariable(name: string) {
    const input = inputRef.current;
    const token = `{{${name}}}`;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div>
      <div className="relative mt-2.5 overflow-hidden rounded-xl border border-border bg-background transition focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10">
        <pre
          ref={highlightRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words px-4 py-3 text-sm leading-6 text-foreground"
        >
          {parts.map((part, index) =>
            /^\{\{\s*[\w.-]+\s*\}\}$/.test(part) ? (
              <span key={index} className="rounded bg-primary/10 text-primary">
                {part}
              </span>
            ) : (
              <span key={index}>{part}</span>
            ),
          )}
          {"\n"}
        </pre>
        <textarea
          ref={inputRef}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={(event) => {
            if (highlightRef.current) {
              highlightRef.current.scrollTop = event.currentTarget.scrollTop;
              highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
            }
          }}
          placeholder={placeholder}
          className="relative block w-full resize-y bg-transparent px-4 py-3 text-sm leading-6 text-transparent caret-primary outline-none selection:bg-primary/20 placeholder:text-muted-foreground/70"
          spellCheck={false}
        />
      </div>
      {showVariables &&
        (variables.length > 0 ? (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("editor.availableValues")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {variables.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() => insertVariable(variable.token)}
                  title={variable.description || variable.type}
                  className="rounded-md border border-primary/20 bg-primary/[0.07] px-2 py-1 font-mono text-xs text-primary transition hover:border-primary/40 hover:bg-primary/15"
                >
                  {`{{${variable.token}}}`}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {t("editor.noVariablesSuggestion")}
          </p>
        ))}
    </div>
  );
}

