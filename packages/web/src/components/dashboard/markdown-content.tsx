"use client";

import { Component, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownContentProps = { children: string };

class MarkdownErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // Swallow render errors — fall back to plain text below.
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function MarkdownContent({ children }: MarkdownContentProps) {
  const fallback = (
    <p className="whitespace-pre-wrap text-sm text-gray-800">{children}</p>
  );

  return (
    <MarkdownErrorBoundary fallback={fallback}>
      <div className="markdown-body text-sm text-gray-800 leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          skipHtml
          components={{
            p: ({ children }) => (
              <p className="mb-3 last:mb-0 whitespace-pre-wrap">{children}</p>
            ),
            h1: ({ children }) => (
              <h1 className="mt-4 mb-2 text-lg font-semibold text-gray-900">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mt-4 mb-2 text-base font-semibold text-gray-900">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mt-3 mb-2 text-sm font-semibold text-gray-900">
                {children}
              </h3>
            ),
            ul: ({ children }) => (
              <ul className="mb-3 list-disc pl-5 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-3 list-decimal pl-5 space-y-1">{children}</ol>
            ),
            li: ({ children }) => <li className="pl-0.5">{children}</li>,
            a: ({ children, href }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline break-all"
              >
                {children}
              </a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="mb-3 border-l-4 border-gray-200 pl-3 text-gray-600 italic">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="my-4 border-gray-200" />,
            table: ({ children }) => (
              <div className="mb-3 overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-xs">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="border border-gray-200 bg-gray-50 px-2 py-1 text-left font-semibold">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="border border-gray-200 px-2 py-1 align-top">
                {children}
              </td>
            ),
            code: ({ className, children, ...props }) => {
              const isBlock = /language-/.test(className ?? "");
              if (isBlock) {
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <code
                  className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-800"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="mb-3 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
                {children}
              </pre>
            ),
          }}
        >
          {children}
        </ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  );
}
