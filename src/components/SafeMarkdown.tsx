import React, { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface SafeMarkdownProps {
  content: string
  className?: string
}

function parseInlineTokens(text: string): ReactNode[] {
  // Regex to match:
  // 1. [text](url) -> link
  // 2. `code` -> inline code
  // 3. **text** -> bold
  // 4. *text* -> italic
  const pattern = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g

  const parts = text.split(pattern)
  const result: ReactNode[] = []

  parts.forEach((part, idx) => {
    if (!part) return

    // Link: [text](url)
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (linkMatch) {
      const linkText = linkMatch[1]
      const rawUrl = linkMatch[2].trim()

      // Sanitization: Only allow http://, https://, mailto:, or relative / URLs (no javascript: or data:)
      const isExternal = /^(https?:\/\/|mailto:)/i.test(rawUrl)
      const isInternal = rawUrl.startsWith('/')

      if (isInternal) {
        result.push(
          <Link
            key={idx}
            to={rawUrl}
            className="underline font-semibold text-pink-700 dark:text-pink-300 hover:text-pink-900 dark:hover:text-pink-100 transition-colors"
          >
            {linkText}
          </Link>
        )
      } else if (isExternal) {
        result.push(
          <a
            key={idx}
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold text-pink-700 dark:text-pink-300 hover:text-pink-900 dark:hover:text-pink-100 transition-colors inline-flex items-center gap-0.5"
          >
            <span>{linkText}</span>
            <span aria-hidden="true" className="text-[10px]">&#8599;</span>
          </a>
        )
      } else {
        result.push(linkText)
      }
      return
    }

    // Code: `code`
    const codeMatch = /^`([^`]+)`$/.exec(part)
    if (codeMatch) {
      result.push(
        <code
          key={idx}
          className="px-1 py-0.5 rounded bg-pink-900/10 dark:bg-pink-900/30 font-mono text-[11px] text-pink-800 dark:text-pink-200 border border-pink-500/20"
        >
          {codeMatch[1]}
        </code>
      )
      return
    }

    // Bold: **text**
    const boldMatch = /^\*\*([^*]+)\*\*$/.exec(part)
    if (boldMatch) {
      result.push(<strong key={idx} className="font-bold">{boldMatch[1]}</strong>)
      return
    }

    // Italic: *text*
    const italicMatch = /^\*([^*]+)\*$/.exec(part)
    if (italicMatch) {
      result.push(<em key={idx} className="italic">{italicMatch[1]}</em>)
      return
    }

    // Plain text: escape raw HTML entities naturally in React JSX
    result.push(part)
  })

  return result
}

export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ content, className = '' }) => {
  if (!content) return null

  // Split by newlines to render paragraphs / lines
  const lines = content.split('\n')

  return (
    <div className={`space-y-1.5 ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={idx} className="h-1" />
        }
        return (
          <p key={idx} className="leading-relaxed">
            {parseInlineTokens(line)}
          </p>
        )
      })}
    </div>
  )
}

export default SafeMarkdown
