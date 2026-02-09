
import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2, Files, Trash2, FileCode } from 'lucide-react';
import { analyzeNoteContent, extractTextFromImage } from '../services/gemini';
import { v4 as uuidv4 } from 'uuid';
import { Note } from '../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (note: Note) => Promise<void> | void;
  onStatusChange?: (status: { processing: boolean, count: number }) => void;
  aiEnabled: boolean;
}

interface FileStatus {
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  id: string;
  errorMessage?: string;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportComplete, onStatusChange, aiEnabled }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileQueue, setFileQueue] = useState<FileStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (onStatusChange) {
        onStatusChange({ 
            processing: isProcessing, 
            count: fileQueue.filter(f => f.status === 'pending' || f.status === 'processing').length 
        });
    }
  }, [isProcessing, fileQueue, onStatusChange]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const validExts = ['.txt', '.md', '.json', '.csv', '.js', '.ts', '.tsx', '.jsx', '.pdf', '.docx'];
    const newFiles: FileStatus[] = files
      .filter(f => {
        const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
        return validExts.includes(ext) || f.type.startsWith('text/') || f.type === 'application/pdf' || f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      })
      .map(f => ({ file: f, status: 'pending', id: uuidv4() }));

    if (newFiles.length < files.length) {
      setError("Some files were skipped (only text, code, PDF, or Word files supported).");
    } else {
      setError(null);
    }

    setFileQueue(prev => [...prev, ...newFiles]);
  };

  const readTextFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string || "");
      reader.onerror = () => reject(new Error("Access denied or file unreadable."));
      reader.readAsText(file);
    });
  };

  const extractPdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      // @ts-ignore
      const pdfjsLib = await import('pdfjs-dist');
      const pdfjs = pdfjsLib.default ?? pdfjsLib;

      const getDocument = pdfjs.getDocument;
      const GlobalWorkerOptions = pdfjs.GlobalWorkerOptions;

      if (!getDocument || !GlobalWorkerOptions) {
          throw new Error("PDF.js library could not be loaded properly.");
      }
      
      const VERSION = '3.11.174'; 
      GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${VERSION}/pdf.worker.min.js`;
  
      const typedArray = new Uint8Array(arrayBuffer);
      const loadingTask = getDocument({ 
        data: typedArray,
        cMapUrl: `https://unpkg.com/pdfjs-dist@${VERSION}/cmaps/`,
        cMapPacked: true,
        isEvalSupported: false,
        useSystemFonts: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${VERSION}/standard_fonts/`
      });

      const pdf = await loadingTask.promise;
      
      // Parallel processing for speed
      const pagePromises = [];
      for (let i = 1; i <= pdf.numPages; i++) {
          pagePromises.push(pdf.getPage(i).then(async (page: any) => {
              const textContent = await page.getTextContent();
              let pageText = textContent.items.map((item: any) => item.str).join(' ');
              
              // Basic OCR Fallback for first 3 pages if empty
              if (!pageText.trim() && i <= 3) {
                  try {
                      const viewport = page.getViewport({ scale: 1.5 });
                      const canvas = document.createElement('canvas');
                      canvas.height = viewport.height;
                      canvas.width = viewport.width;
                      const context = canvas.getContext('2d');
                      if (context) {
                          await page.render({ canvasContext: context, viewport } as any).promise;
                          const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                          const extracted = await extractTextFromImage(base64, 'image/jpeg');
                          pageText = extracted ? `[OCR Page ${i}]:\n${extracted}` : `[Image Page ${i} - No Text]`;
                      }
                  } catch (e) { pageText = `[Page ${i} Unreadable]`; }
              }
              return pageText;
          }));
      }

      const pageTexts = await Promise.all(pagePromises);
      const fullText = pageTexts.join('\n\n');
      
      if (!fullText.trim()) {
         return "This PDF contains no extractable text and OCR failed. It might be a protected file.";
      }

      return fullText;
    } catch (e: any) {
      console.error("PDF Extraction Failed", e);
      throw new Error("Failed to parse PDF file.");
    }
  };

  const extractDocxText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      // @ts-ignore
      const mammothModule = await import('mammoth');
      const mammoth = mammothModule.default || mammothModule;
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value || "";
    } catch (e: any) {
      throw new Error("Failed to parse Word document.");
    }
  };

  const removeFile = (id: string) => {
    setFileQueue(prev => prev.filter(f => f.id !== id));
  };

  const processImport = async () => {
    if (fileQueue.length === 0 || isProcessing) return;
    setIsProcessing(true);

    const pending = fileQueue.filter(f => f.status === 'pending');
    
    // Process 2 files at a time to avoid memory spikes but faster than 1
    const batchSize = 2;
    for (let i = 0; i < pending.length; i += batchSize) {
        if (!isMounted.current) break; // Check if still mounted before starting batch

        const batch = pending.slice(i, i + batchSize);
        await Promise.all(batch.map(async (item) => {
            if (!fileQueue.find(f => f.id === item.id)) return;
            if (isMounted.current) setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'processing' } : f));
            
            try {
                let text = '';
                const ext = item.file.name.substring(item.file.name.lastIndexOf('.')).toLowerCase();
                if (ext === '.pdf' || item.file.type === 'application/pdf') {
                    const buffer = await item.file.arrayBuffer();
                    text = await extractPdfText(buffer);
                } else if (ext === '.docx' || item.file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                    const buffer = await item.file.arrayBuffer();
                    text = await extractDocxText(buffer);
                } else {
                    text = await readTextFile(item.file);
                }
                
                if (text === "" && item.file.size > 0) throw new Error("File could not be read.");
                const finalContent = text.trim() || "Imported empty file.";
                
                let analysis = null;
                if (aiEnabled && finalContent.length > 50) {
                   try { analysis = await analyzeNoteContent(finalContent.substring(0, 10000)); } catch(e) {}
                }
                
                const newNote: Note = {
                  id: uuidv4(),
                  title: item.file.name.replace(/\.[^/.]+$/, ""),
                  content: finalContent,
                  type: 'note',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  metadata: analysis ? {
                    themes: analysis.themes,
                    summary: analysis.summary,
                    tags: [...analysis.tags, 'imported'],
                    artifacts: [],
                    lifeAxis: analysis.lifeAxis
                  } : { tags: ['imported'], artifacts: [] }
                };

                await onImportComplete(newNote);
                if (isMounted.current) setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'completed' } : f));
            } catch (err: any) {
                console.error("Import error", err);
                if (isMounted.current) setFileQueue(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', errorMessage: err.message } : f));
            }
        }));
    }

    if (isMounted.current) {
        setIsProcessing(false);
        setTimeout(() => {
            if (isMounted.current) {
                setFileQueue(currentQueue => {
                    const allDone = currentQueue.every(f => f.status === 'completed' || f.status === 'error');
                    const hasErrors = currentQueue.some(f => f.status === 'error');
                    if (allDone && !hasErrors && isOpen) return []; 
                    return currentQueue;
                });
            }
        }, 5000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
      <div 
        className="bg-surface border border-border w-full max-w-xl rounded-2xl shadow-2xl p-6 relative animate-slide-up flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-text-main">
          <X size={20} />
        </button>

        <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold text-text-main brand-font">Bulk Import</h2>
            {isProcessing && <div className="text-xs text-accent font-bold animate-pulse px-2 py-1 bg-accent/10 rounded-lg">Processing...</div>}
        </div>
        <p className="text-text-muted text-sm mb-6">Extract wisdom from TXT, MD, PDF, DOCX, and Code files.</p>

        <div 
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer mb-6
            ${dragActive ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}
            ${fileQueue.length > 0 ? 'py-4' : 'py-12'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input 
            ref={inputRef} 
            type="file" 
            className="hidden" 
            multiple
            onChange={handleChange}
            accept=".txt,.md,.json,.csv,.js,.ts,.pdf,.docx"
          />
          <div className="text-text-muted flex flex-col items-center gap-2">
             <Files size={32} className="opacity-50 text-accent" />
             <p className="font-medium text-text-main text-sm">Click to select or drag multiple files</p>
          </div>
        </div>

        {fileQueue.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-2 mb-6 pr-2 custom-scrollbar">
             {fileQueue.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-canvas border border-border group">
                   <div className="flex items-center gap-3 overflow-hidden">
                      {item.file.name.match(/\.(js|ts|tsx|jsx|json)$/) ? <FileCode size={16} className="text-blue-400 shrink-0" /> : <FileText size={16} className="text-accent shrink-0" />}
                      <div className="overflow-hidden">
                         <p className="text-xs font-medium text-text-main truncate">{item.file.name}</p>
                         <p className="text-[10px] text-text-muted">{(item.file.size / 1024).toFixed(1)} KB</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      {item.status === 'pending' && (
                         <button onClick={(e) => { e.stopPropagation(); removeFile(item.id); }} className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={14} />
                         </button>
                      )}
                      {item.status === 'processing' && <Loader2 size={14} className="text-accent animate-spin" />}
                      {item.status === 'completed' && <CheckCircle size={14} className="text-green-500" />}
                      {item.status === 'error' && (
                        <div className="group/error relative">
                           <AlertCircle size={14} className="text-red-500 cursor-help" />
                           <div className="absolute right-0 top-full mt-1 w-48 bg-red-900/90 text-white text-[10px] p-2 rounded shadow-lg opacity-0 group-hover/error:opacity-100 transition-opacity z-50 pointer-events-none">
                              {item.errorMessage || "Unknown Error"}
                           </div>
                        </div>
                      )}
                   </div>
                </div>
             ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm">
             <AlertCircle size={16} />
             {error}
          </div>
        )}

        <div className="mt-auto flex justify-end gap-3 pt-4 border-t border-border">
           <button onClick={onClose} className="px-4 py-2 text-text-muted hover:text-text-main text-sm">Cancel</button>
           <button 
             onClick={processImport} 
             disabled={fileQueue.length === 0 || isProcessing || !fileQueue.some(f => f.status === 'pending')}
             className="px-6 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2 text-sm shadow-lg shadow-accent/20"
           >
             {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
             {isProcessing ? "Processing..." : `Import ${fileQueue.filter(f => f.status === 'pending').length} Files`}
           </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
