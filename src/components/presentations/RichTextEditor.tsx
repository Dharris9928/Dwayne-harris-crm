import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Undo, Redo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && value) {
      // Convert plain text to HTML with basic formatting
      const htmlContent = value
        .split('\n')
        .map(line => {
          if (line.startsWith('# ')) {
            return `<h1>${line.substring(2)}</h1>`;
          } else if (line.startsWith('## ')) {
            return `<h2>${line.substring(3)}</h2>`;
          } else if (line.startsWith('### ')) {
            return `<h3>${line.substring(4)}</h3>`;
          } else if (line.startsWith('- ')) {
            return `<li>${line.substring(2)}</li>`;
          } else if (line.match(/^\d+\. /)) {
            return `<li>${line.substring(line.indexOf(' ') + 1)}</li>`;
          } else if (line.trim()) {
            return `<p>${line}</p>`;
          }
          return '<br>';
        })
        .join('');
      
      editorRef.current.innerHTML = htmlContent;
    }
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerText);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const toggleHeading = (level: number) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === 3 ? container.parentElement : container as HTMLElement;

    if (element && editorRef.current?.contains(element)) {
      const heading = document.createElement(`h${level}`);
      heading.textContent = element.textContent || '';
      element.replaceWith(heading);
    }
    editorRef.current?.focus();
  };

  const formatButtons = [
    { icon: Bold, command: 'bold', label: 'Bold' },
    { icon: Italic, command: 'italic', label: 'Italic' },
    { icon: List, command: 'insertUnorderedList', label: 'Bullet List' },
    { icon: ListOrdered, command: 'insertOrderedList', label: 'Numbered List' },
    { icon: Heading1, onClick: () => toggleHeading(1), label: 'Heading 1' },
    { icon: Heading2, onClick: () => toggleHeading(2), label: 'Heading 2' },
    { icon: Heading3, onClick: () => toggleHeading(3), label: 'Heading 3' },
    { icon: Undo, command: 'undo', label: 'Undo' },
    { icon: Redo, command: 'redo', label: 'Redo' },
  ];

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-muted/50">
        {formatButtons.map((button, index) => (
          <Button
            key={index}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => button.onClick ? button.onClick() : execCommand(button.command!)}
            title={button.label}
            className="h-8 w-8 p-0"
          >
            <button.icon className="w-4 h-4" />
          </Button>
        ))}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className={cn(
          'min-h-[400px] max-h-[600px] overflow-y-auto p-4 outline-none',
          'prose prose-sm max-w-none',
          'focus:bg-accent/5',
          '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6',
          '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:mt-5',
          '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4',
          '[&_p]:mb-2 [&_p]:leading-relaxed',
          '[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4',
          '[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4',
          '[&_li]:mb-1',
          placeholder && !value ? 'before:content-[attr(data-placeholder)] before:text-muted-foreground before:absolute' : ''
        )}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}
