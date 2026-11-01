import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MeetingImage } from '@/types/meeting';
import { saveMeetingImageBlob, getMeetingImageUrl } from '@/lib/meeting-storage';
import {
  LuBold,
  LuItalic,
  LuUnderline,
  LuStrikethrough,
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuList,
  LuListOrdered,
  LuListTodo,
  LuQuote,
  LuCode,
  LuSquareCode,
  LuAlignLeft,
  LuAlignCenter,
  LuAlignRight,
  LuLink,
  LuMinus,
  LuTable,
  LuImage,
  LuUndo2,
  LuRedo2,
  LuRemoveFormatting,
  LuHighlighter,
  LuPalette,
  LuTrash2,
  LuCheck,
  LuX,
  LuUpload,
} from 'react-icons/lu';

interface RichTextEditorProps {
  sessionId: string;
  initialContent: string;
  onChange: (htmlContent: string) => void;
  onImageAdded?: (image: MeetingImage) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  sessionId,
  initialContent,
  onChange,
  onImageAdded,
  placeholder = 'Type your meeting notes, capture action items, or press Ctrl+V to paste screenshots directly...',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInternalChangeRef = useRef(false);

  // Active state for selected image formatting
  const [selectedImageEl, setSelectedImageEl] = useState<HTMLImageElement | null>(null);
  const [imageWidthPreset, setImageWidthPreset] = useState<string>('100%');

  // Link dialog state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const savedSelectionRef = useRef<Range | null>(null);

  // Color picker popovers
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // Uploading / pasting status
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // 1. Initialize content once
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialContent || '';
      restoreImageBlobUrls();
    }
  }, [initialContent]);

  // Restore blob URLs for images in the note from IndexedDB
  const restoreImageBlobUrls = useCallback(async () => {
    if (!editorRef.current) return;
    const imgs = editorRef.current.querySelectorAll('img[data-image-id]');
    for (let i = 0; i < imgs.length; i++) {
      const img = imgs[i] as HTMLImageElement;
      const id = img.getAttribute('data-image-id');
      if (id) {
        const freshUrl = await getMeetingImageUrl(id);
        if (freshUrl && img.src !== freshUrl) {
          img.src = freshUrl;
        }
      }
    }
  }, []);

  // Sync content back to parent
  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChangeRef.current = true;
    onChange(editorRef.current.innerHTML);
    setTimeout(() => {
      isInternalChangeRef.current = false;
    }, 50);
  }, [onChange]);

  // Execute formatting command
  const execCmd = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    emitChange();
  };

  // 2. Direct Screenshot Pasting (Ctrl+V) & Clipboard Handler
  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;

    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        hasImage = true;
        const blob = item.getAsFile();
        if (blob) {
          e.preventDefault();
          const filename = `screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
          await insertImageBlob(blob, filename);
        }
      }
    }

    if (!hasImage) {
      // Normal text paste - allow browser to handle naturally then emit
      setTimeout(emitChange, 10);
    }
  };

  // 3. Drag and drop image files onto editor
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    let hasImage = false;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        hasImage = true;
        e.preventDefault();
        await insertImageBlob(file, file.name);
      }
    }

    if (hasImage) {
      emitChange();
    }
  };

  // Insert image blob into IndexedDB and embed figure node into editor
  const insertImageBlob = async (blob: Blob | File, filename: string) => {
    setIsProcessingImage(true);
    try {
      const meetingImg = await saveMeetingImageBlob(sessionId, blob, filename);

      if (editorRef.current) {
        editorRef.current.focus();

        const figure = document.createElement('figure');
        figure.className = 'meeting-image-container my-4 block group relative max-w-full';
        figure.setAttribute('data-image-id', meetingImg.id);
        figure.style.textAlign = 'center';

        const img = document.createElement('img');
        img.src = meetingImg.url;
        img.alt = filename;
        img.setAttribute('data-image-id', meetingImg.id);
        img.className = 'rounded-xl shadow-lg border border-zinc-700/80 transition-all max-w-full inline-block cursor-pointer hover:ring-2 hover:ring-blue-500';
        img.style.width = '100%';
        img.style.maxHeight = '650px';
        img.style.objectFit = 'contain';

        const caption = document.createElement('figcaption');
        caption.className = 'text-xs text-zinc-400 mt-1.5 italic text-center outline-none empty:before:content-["Add_caption..."]';
        caption.contentEditable = 'true';
        caption.innerText = filename;

        figure.appendChild(img);
        figure.appendChild(caption);

        // Insert at cursor position if selection exists inside editor
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(figure);

          // Move cursor after figure
          range.setStartAfter(figure);
          range.setEndAfter(figure);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          // Append to end of editor
          editorRef.current.appendChild(figure);
        }

        // Add paragraph break after figure for easy continuation
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        figure.insertAdjacentElement('afterend', p);

        emitChange();
        onImageAdded?.(meetingImg);
      }
    } catch (err) {
      console.error('Failed to insert screenshot image:', err);
    } finally {
      setIsProcessingImage(false);
    }
  };

  // 4. File input upload handler
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      await insertImageBlob(files[i], files[i].name);
    }
    if (e.target) e.target.value = '';
  };

  // 5. Click listener for images & checkboxes inside editor
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // Checkbox click in task lists
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      const checkbox = target as HTMLInputElement;
      const li = checkbox.closest('li');
      if (li) {
        li.setAttribute('data-checked', checkbox.checked ? 'true' : 'false');
        if (checkbox.checked) {
          checkbox.setAttribute('checked', 'checked');
        } else {
          checkbox.removeAttribute('checked');
        }
      }
      emitChange();
      return;
    }

    // Image click
    if (target.tagName === 'IMG' && target.hasAttribute('data-image-id')) {
      setSelectedImageEl(target as HTMLImageElement);
      const widthVal = target.style.width || '100%';
      setImageWidthPreset(widthVal);
      return;
    }

    // Clicked outside image
    if (selectedImageEl && !target.closest('.meeting-image-container')) {
      setSelectedImageEl(null);
    }
  };

  // Image actions: resize, align, delete
  const handleSetImageWidth = (widthPct: string) => {
    if (!selectedImageEl) return;
    selectedImageEl.style.width = widthPct;
    setImageWidthPreset(widthPct);
    emitChange();
  };

  const handleSetImageAlign = (align: 'left' | 'center' | 'right') => {
    if (!selectedImageEl) return;
    const figure = selectedImageEl.closest('figure');
    if (figure) {
      figure.style.textAlign = align;
      emitChange();
    }
  };

  const handleDeleteSelectedImage = () => {
    if (!selectedImageEl) return;
    const figure = selectedImageEl.closest('figure');
    if (figure) {
      figure.remove();
    } else {
      selectedImageEl.remove();
    }
    setSelectedImageEl(null);
    emitChange();
  };

  // Insert Table Helper
  const handleInsertTable = () => {
    const tableHtml = `
      <table border="1" class="my-4 w-full border-collapse border border-zinc-700 text-xs">
        <thead>
          <tr class="bg-zinc-800/80">
            <th class="border border-zinc-700 p-2 text-left text-zinc-200">Header 1</th>
            <th class="border border-zinc-700 p-2 text-left text-zinc-200">Header 2</th>
            <th class="border border-zinc-700 p-2 text-left text-zinc-200">Header 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-zinc-700 p-2 text-zinc-300">Data cell 1</td>
            <td class="border border-zinc-700 p-2 text-zinc-300">Data cell 2</td>
            <td class="border border-zinc-700 p-2 text-zinc-300">Data cell 3</td>
          </tr>
          <tr>
            <td class="border border-zinc-700 p-2 text-zinc-300">Row 2 cell 1</td>
            <td class="border border-zinc-700 p-2 text-zinc-300">Row 2 cell 2</td>
            <td class="border border-zinc-700 p-2 text-zinc-300">Row 2 cell 3</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    execCmd('insertHTML', tableHtml);
  };

  // Insert Task List Helper
  const handleInsertTaskList = () => {
    const taskHtml = `
      <ul class="task-list my-2 pl-0 space-y-1">
        <li data-checked="false" class="flex items-center gap-2 text-zinc-200">
          <input type="checkbox" class="rounded accent-blue-600 cursor-pointer" />
          <span>New action item...</span>
        </li>
      </ul>
      <p><br></p>
    `;
    execCmd('insertHTML', taskHtml);
  };

  // Insert Code Block Helper
  const handleInsertCodeBlock = () => {
    const codeHtml = `
      <pre class="bg-zinc-900 border border-zinc-800 text-emerald-400 p-3 rounded-lg font-mono text-xs my-3 overflow-x-auto"><code>// Code snippet or SQL query here
SELECT * FROM meeting_sessions WHERE status = 'active';</code></pre>
      <p><br></p>
    `;
    execCmd('insertHTML', codeHtml);
  };

  // Hyperlink creation
  const handleOpenLinkModal = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      setLinkText(sel.toString());
    }
    setLinkUrl('https://');
    setShowLinkModal(true);
  };

  const handleApplyLink = () => {
    if (!linkUrl) {
      setShowLinkModal(false);
      return;
    }

    if (savedSelectionRef.current && editorRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    }

    if (linkText) {
      execCmd('insertHTML', `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline hover:text-blue-300">${linkText}</a>`);
    } else {
      execCmd('createLink', linkUrl);
    }

    setShowLinkModal(false);
    setLinkUrl('');
    setLinkText('');
  };

  const TEXT_COLORS = ['#ffffff', '#f87171', '#fb923c', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
  const HIGHLIGHT_COLORS = ['transparent', '#ef444430', '#f9731630', '#eab30830', '#10b98130', '#3b82f630', '#8b5cf630'];

  return (
    <div className="flex flex-col w-full h-full bg-zinc-950 text-zinc-100 relative">
      {/* Hidden Multi-file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Floating Image Format Bar (shown when an image is clicked) */}
      {selectedImageEl && (
        <div className="sticky top-14 z-30 mx-auto max-w-md w-full bg-zinc-900/95 border border-zinc-700 rounded-xl shadow-2xl p-2 flex items-center justify-between text-xs backdrop-blur-md animate-fade-in my-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-zinc-400 font-semibold px-1">Width:</span>
            {['25%', '50%', '75%', '100%'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleSetImageWidth(preset)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  imageWidthPreset === preset
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-zinc-700 mx-1" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleSetImageAlign('left')}
              title="Align Left"
              className="p-1 rounded hover:bg-zinc-800 text-zinc-300"
            >
              <LuAlignLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleSetImageAlign('center')}
              title="Align Center"
              className="p-1 rounded hover:bg-zinc-800 text-zinc-300"
            >
              <LuAlignCenter size={14} />
            </button>
            <button
              type="button"
              onClick={() => handleSetImageAlign('right')}
              title="Align Right"
              className="p-1 rounded hover:bg-zinc-800 text-zinc-300"
            >
              <LuAlignRight size={14} />
            </button>

            <div className="h-4 w-[1px] bg-zinc-700 mx-1" />

            <button
              type="button"
              onClick={handleDeleteSelectedImage}
              title="Delete Image"
              className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
            >
              <LuTrash2 size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Formatting Toolbar */}
      <div className="sticky top-0 z-20 w-full bg-zinc-900/95 border-b border-zinc-800 backdrop-blur-md px-4 py-2 flex flex-wrap items-center gap-1.5 select-none text-zinc-300 shadow-sm">
        {/* Undo / Redo */}
        <button
          type="button"
          onClick={() => execCmd('undo')}
          title="Undo (Ctrl+Z)"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuUndo2 size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCmd('redo')}
          title="Redo (Ctrl+Y)"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuRedo2 size={15} />
        </button>

        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

        {/* Headings */}
        <button
          type="button"
          onClick={() => execCmd('formatBlock', '<h1>')}
          title="Heading 1"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white font-bold transition-colors"
        >
          <LuHeading1 size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCmd('formatBlock', '<h2>')}
          title="Heading 2"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white font-bold transition-colors"
        >
          <LuHeading2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCmd('formatBlock', '<h3>')}
          title="Heading 3"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white font-bold transition-colors"
        >
          <LuHeading3 size={16} />
        </button>
        <button
          type="button"
          onClick={() => execCmd('formatBlock', '<p>')}
          title="Regular Paragraph"
          className="px-2 py-1 rounded hover:bg-zinc-800 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          Text
        </button>

        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

        {/* Inline Formatting: Bold, Italic, Underline, Strike */}
        <button
          type="button"
          onClick={() => execCmd('bold')}
          title="Bold (Ctrl+B)"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuBold size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCmd('italic')}
          title="Italic (Ctrl+I)"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuItalic size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCmd('underline')}
          title="Underline (Ctrl+U)"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuUnderline size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCmd('strikeThrough')}
          title="Strikethrough"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuStrikethrough size={15} />
        </button>

        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

        {/* Lists & Tasks */}
        <button
          type="button"
          onClick={() => execCmd('insertUnorderedList')}
          title="Bullet List"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuList size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCmd('insertOrderedList')}
          title="Numbered List"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuListOrdered size={15} />
        </button>
        <button
          type="button"
          onClick={handleInsertTaskList}
          title="Checklist / Task List"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-blue-400 transition-colors"
        >
          <LuListTodo size={15} />
        </button>

        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => execCmd('justifyLeft')}
          title="Align Left"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuAlignLeft size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCmd('justifyCenter')}
          title="Align Center"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuAlignCenter size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCmd('justifyRight')}
          title="Align Right"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuAlignRight size={15} />
        </button>

        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

        {/* Quote & Code */}
        <button
          type="button"
          onClick={() => execCmd('formatBlock', '<blockquote>')}
          title="Blockquote"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuQuote size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCmd('insertHTML', '<code>' + (window.getSelection()?.toString() || 'inline_code') + '</code>')}
          title="Inline Code"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuCode size={15} />
        </button>
        <button
          type="button"
          onClick={handleInsertCodeBlock}
          title="Code Block"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-emerald-400 transition-colors"
        >
          <LuSquareCode size={15} />
        </button>

        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

        {/* Text Color Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTextColorPicker((v) => !v)}
            title="Text Color"
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-0.5"
          >
            <LuPalette size={15} />
          </button>
          {showTextColorPicker && (
            <div className="absolute top-full left-0 mt-2 p-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex gap-1 z-40">
              {TEXT_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  style={{ backgroundColor: col }}
                  onClick={() => {
                    execCmd('foreColor', col);
                    setShowTextColorPicker(false);
                  }}
                  className="w-5 h-5 rounded-full border border-zinc-600 hover:scale-110 transition-transform"
                />
              ))}
            </div>
          )}
        </div>

        {/* Highlight Color Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHighlightPicker((v) => !v)}
            title="Highlight Color"
            className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-0.5"
          >
            <LuHighlighter size={15} />
          </button>
          {showHighlightPicker && (
            <div className="absolute top-full left-0 mt-2 p-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl flex gap-1 z-40">
              {HIGHLIGHT_COLORS.map((col, idx) => (
                <button
                  key={idx}
                  type="button"
                  style={{ backgroundColor: col === 'transparent' ? '#3f3f46' : col }}
                  onClick={() => {
                    execCmd('hiliteColor', col);
                    setShowHighlightPicker(false);
                  }}
                  className="w-5 h-5 rounded-full border border-zinc-600 hover:scale-110 transition-transform text-[9px] text-zinc-300"
                >
                  {col === 'transparent' ? '✕' : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

        {/* Insert Elements: Link, Divider, Table, Screenshot/Image */}
        <button
          type="button"
          onClick={handleOpenLinkModal}
          title="Insert Link"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-blue-400 transition-colors"
        >
          <LuLink size={15} />
        </button>
        <button
          type="button"
          onClick={() => execCmd('insertHorizontalRule')}
          title="Horizontal Divider"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LuMinus size={15} />
        </button>
        <button
          type="button"
          onClick={handleInsertTable}
          title="Insert Table"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-indigo-400 transition-colors"
        >
          <LuTable size={15} />
        </button>

        {/* Insert / Upload Screenshot Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Insert Image / Screenshot (or paste directly with Ctrl+V)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 text-xs font-medium transition-all"
        >
          <LuImage size={15} />
          <span>Image</span>
        </button>

        <div className="h-4 w-[1px] bg-zinc-800 mx-0.5" />

        {/* Clear formatting */}
        <button
          type="button"
          onClick={() => execCmd('removeFormat')}
          title="Clear Formatting"
          className="p-1.5 rounded hover:bg-zinc-800 hover:text-red-400 transition-colors"
        >
          <LuRemoveFormatting size={15} />
        </button>

        {/* Processing Indicator */}
        {isProcessingImage && (
          <div className="ml-auto flex items-center gap-2 text-xs text-blue-400 animate-pulse font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Pasting screenshot...</span>
          </div>
        )}
      </div>

      {/* Writing Canvas / contentEditable */}
      <div className="flex-1 w-full overflow-y-auto px-6 py-8 flex justify-center">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onClick={handleEditorClick}
          data-placeholder={placeholder}
          className="w-full max-w-4xl min-h-[500px] outline-none text-zinc-100 text-base leading-relaxed selection:bg-blue-600 selection:text-white prose prose-invert prose-blue max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-600 empty:before:pointer-events-none focus:outline-none"
        />
      </div>

      {/* Link Dialog Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-5 max-w-sm w-full space-y-4">
            <h4 className="font-semibold text-white text-sm">Insert Link</h4>
            <div className="space-y-2">
              <div>
                <label className="text-zinc-400 text-xs">Text</label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Link text..."
                  className="w-full mt-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs">URL</label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  autoFocus
                  className="w-full mt-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyLink}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

