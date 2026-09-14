"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { useEffect, type ReactNode } from "react";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Table as TableIcon,
  Trash2,
  Undo,
} from "lucide-react";
import { cn } from "@/lib/cn";

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 disabled:opacity-40",
        active && "bg-neutral-200 text-neutral-900",
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      // Category buying-guide copy is mostly comparison tables, and pasted
      // content arrives as tables too. `resizable: false` keeps the stored
      // markup free of inline column widths the sanitizer would strip anyway.
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({
        placeholder: placeholder ?? "Write your post…",
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
    editorProps: {
      attributes: {
        class: "th-rich-text min-h-60 px-3 py-2 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && editor.isEditable === disabled) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  function setLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  if (!editor) {
    return (
      <div className="min-h-60 rounded-md border border-neutral-200 bg-white" />
    );
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-white">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-100 p-1.5">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden />
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden />
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Code"
          active={editor.isActive("code")}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden />
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          disabled={disabled}
          onClick={setLink}
        >
          <LinkIcon className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden />
        <ToolbarButton
          label="Insert table"
          disabled={disabled}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <TableIcon className="size-4" />
        </ToolbarButton>
        {editor.isActive("table") ? (
          <>
            <ToolbarButton
              label="Add row"
              disabled={disabled}
              onClick={() => editor.chain().focus().addRowAfter().run()}
            >
              <span className="text-[0.65rem] font-bold">+R</span>
            </ToolbarButton>
            <ToolbarButton
              label="Add column"
              disabled={disabled}
              onClick={() => editor.chain().focus().addColumnAfter().run()}
            >
              <span className="text-[0.65rem] font-bold">+C</span>
            </ToolbarButton>
            <ToolbarButton
              label="Delete row"
              disabled={disabled}
              onClick={() => editor.chain().focus().deleteRow().run()}
            >
              <span className="text-[0.65rem] font-bold">−R</span>
            </ToolbarButton>
            <ToolbarButton
              label="Delete column"
              disabled={disabled}
              onClick={() => editor.chain().focus().deleteColumn().run()}
            >
              <span className="text-[0.65rem] font-bold">−C</span>
            </ToolbarButton>
            <ToolbarButton
              label="Delete table"
              disabled={disabled}
              onClick={() => editor.chain().focus().deleteTable().run()}
            >
              <Trash2 className="size-4" />
            </ToolbarButton>
          </>
        ) : null}
        <span className="mx-1 h-5 w-px bg-neutral-200" aria-hidden />
        <ToolbarButton
          label="Undo"
          disabled={disabled}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={disabled}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="size-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
