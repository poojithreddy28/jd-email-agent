'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Download, RotateCcw, CheckCircle2, Clock,
  Pencil, Eye, EyeOff,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Seg { t: string; b: boolean; rewritten?: boolean }
interface Skill { label: string; value: string; rewritten?: boolean }
interface ExpRole {
  title: string; company: string; location: string; dates: string;
  bullets: Seg[][]
}
interface Project { name: string; tech: string; url: string; bullets: Seg[][] }
interface ResumeConfig {
  contact: { name: string; line: string }
  skills: Skill[]
  experience: ExpRole[]
  education: { degree: string; university: string; dates: string; gpa: string }
  projects: Project[]
}

// ─── Inline editable cell ──────────────────────────────────────────────────────
function EditableCell({
  value, onChange, multiline = false, style = {},
  highlight = false, manualEdit = false,
}: {
  value: string; onChange: (v: string) => void;
  multiline?: boolean; style?: React.CSSProperties;
  highlight?: boolean; manualEdit?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = useCallback(() => { onChange(draft); setEditing(false); }, [draft, onChange]);

  const bg = manualEdit ? '#dbeafe' : highlight ? '#bbf7d0' : 'transparent';
  const border = manualEdit ? '1.5px solid #93c5fd' : highlight ? '1.5px solid #4ade80' : '1.5px dashed transparent';

  const sharedProps = {
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setDraft(e.target.value),
    onBlur: commit,
    autoFocus: true,
    style: {
      ...style,
      border: '2px solid #6366f1',
      borderRadius: 3,
      padding: '2px 4px',
      background: '#f0f9ff',
      outline: 'none',
      fontFamily: 'Arial, sans-serif',
      fontSize: 'inherit',
      width: '100%',
    } as React.CSSProperties,
  };

  if (editing) {
    return multiline ? (
      <textarea {...sharedProps} rows={2} style={{ ...sharedProps.style, resize: 'vertical' }}
        onKeyDown={e => { if (e.key === 'Escape') { setDraft(value); setEditing(false); } }} />
    ) : (
      <input {...sharedProps}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }} />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
      style={{
        ...style, background: bg, border, borderRadius: 3,
        padding: '1px 3px', cursor: 'text', whiteSpace: 'pre-wrap',
      }}
    >
      {value}
      <span style={{ fontSize: 8, marginLeft: 2, opacity: 0.35 }}>✎</span>
    </span>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontWeight: 700, fontSize: '11pt', textTransform: 'uppercase',
      borderBottom: '1.5px solid #000', paddingBottom: 2,
      marginTop: 10, marginBottom: 6,
    }}>{children}</div>
  );
}

// ─── Live Resume Preview ───────────────────────────────────────────────────────
function ResumePreview({
  config, onChange, showHighlights,
}: {
  config: ResumeConfig; onChange: (c: ResumeConfig) => void; showHighlights: boolean;
}) {
  const upd = (patch: Partial<ResumeConfig>) => onChange({ ...config, ...patch });

  const setSkillValue = (idx: number, value: string) =>
    upd({ skills: config.skills.map((s, i) => i === idx ? { ...s, value, rewritten: false } : s) });

  const setExpField = (ei: number, field: keyof ExpRole, value: string) =>
    upd({ experience: config.experience.map((e, i) => i === ei ? { ...e, [field]: value } : e) });

  const setBulletText = (ei: number, bi: number, text: string) =>
    upd({
      experience: config.experience.map((exp, i) => i !== ei ? exp : {
        ...exp,
        bullets: exp.bullets.map((segs, j) => j !== bi ? segs : [{ t: text, b: false, rewritten: false }])
      })
    });

  const addBullet = (ei: number) =>
    upd({
      experience: config.experience.map((exp, i) => i !== ei ? exp : {
        ...exp, bullets: [...exp.bullets, [{ t: 'New bullet — click to edit', b: false, rewritten: true }]]
      })
    });

  const removeBullet = (ei: number, bi: number) =>
    upd({
      experience: config.experience.map((exp, i) => i !== ei ? exp : {
        ...exp, bullets: exp.bullets.filter((_, j) => j !== bi)
      })
    });

  const setProjectField = (pi: number, field: keyof Project, value: string) =>
    upd({ projects: config.projects.map((p, i) => i === pi ? { ...p, [field]: value } : p) });

  const setProjectBullet = (pi: number, bi: number, text: string) =>
    upd({
      projects: config.projects.map((p, i) => i !== pi ? p : {
        ...p, bullets: p.bullets.map((segs, j) => j !== bi ? segs : [{ t: text, b: false, rewritten: false }])
      })
    });

  return (
    <div style={{
      fontFamily: 'Arial, sans-serif', fontSize: '10pt', lineHeight: '1.35',
      color: '#000', padding: '0.54in', width: '8.5in', minHeight: '11in',
      boxSizing: 'border-box', background: '#fff', margin: '0 auto',
    }}>

      {/* Legend */}
      {showHighlights && (
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6,
          padding: '4px 10px', marginBottom: 10, fontSize: 9, color: '#475569',
          display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <span><span style={{ background: '#bbf7d0', padding: '0 4px', borderRadius: 2 }}>green</span> = AI rewritten</span>
          <span><span style={{ background: '#dbeafe', padding: '0 4px', borderRadius: 2 }}>blue</span> = your edits</span>
          <span style={{ color: '#94a3b8' }}>✎ click any text to edit • ✕ removes bullet • + adds bullet</span>
        </div>
      )}

      {/* Name */}
      <div style={{ textAlign: 'center', marginBottom: 3 }}>
        <EditableCell value={config.contact.name} onChange={v => upd({ contact: { ...config.contact, name: v } })}
          style={{ fontWeight: 700, fontSize: '16pt' }} />
      </div>
      {/* Contact */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <EditableCell value={config.contact.line} onChange={v => upd({ contact: { ...config.contact, line: v } })}
          style={{ fontSize: '9.5pt' }} />
      </div>

      {/* SKILLS */}
      <SectionHead>Technical Skills</SectionHead>
      {config.skills.map((skill, idx) => (
        <div key={skill.label} style={{ marginBottom: 4, display: 'flex', gap: 4, alignItems: 'flex-start' }}>
          <span style={{
            fontWeight: 700, whiteSpace: 'nowrap',
            background: showHighlights && skill.rewritten ? '#bbf7d0' : 'transparent',
            borderRadius: 2, padding: '0 2px',
          }}>{skill.label}:</span>
          <EditableCell value={skill.value} onChange={v => setSkillValue(idx, v)}
            highlight={showHighlights && !!skill.rewritten}
            style={{ fontSize: '10pt', flex: 1 }} />
        </div>
      ))}

      {/* EXPERIENCE */}
      <SectionHead>Experience</SectionHead>
      {config.experience.map((exp, ei) => (
        <div key={exp.company} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 3 }}>
            <span>
              <EditableCell value={exp.title} onChange={v => setExpField(ei, 'title', v)} style={{ fontWeight: 700 }} />
              {' | '}
              <em>
                <EditableCell value={exp.company} onChange={v => setExpField(ei, 'company', v)} style={{ fontStyle: 'italic' }} />
                {', '}
                <EditableCell value={exp.location} onChange={v => setExpField(ei, 'location', v)} style={{ fontStyle: 'italic' }} />
              </em>
            </span>
            <em style={{ fontWeight: 400, whiteSpace: 'nowrap', marginLeft: 8 }}>
              <EditableCell value={exp.dates} onChange={v => setExpField(ei, 'dates', v)} style={{ fontStyle: 'italic' }} />
            </em>
          </div>

          {exp.bullets.map((segs, bi) => {
            const fullText = segs.map(s => s.t).join('');
            const wasRewritten = segs.some(s => s.rewritten === true);
            const isManual = segs.length === 1 && segs[0].rewritten === false;
            return (
              <div key={bi} style={{
                display: 'flex', alignItems: 'flex-start', gap: 4, marginBottom: 3, paddingLeft: 10,
                background: showHighlights ? (wasRewritten ? '#f0fdf4' : isManual ? '#eff6ff' : 'transparent') : 'transparent',
                borderLeft: showHighlights ? (wasRewritten ? '3px solid #4ade80' : isManual ? '3px solid #93c5fd' : '3px solid transparent') : '3px solid transparent',
                borderRadius: 2, paddingTop: 1, paddingBottom: 1,
              }}>
                <span style={{ flexShrink: 0, marginTop: 2 }}>•</span>
                <div style={{ flex: 1 }}>
                  <EditableCell value={fullText} onChange={v => setBulletText(ei, bi, v)}
                    multiline
                    highlight={showHighlights && wasRewritten}
                    manualEdit={showHighlights && isManual && !wasRewritten}
                    style={{ fontSize: '10pt', display: 'block', width: '100%' }} />
                </div>
                <button onClick={() => removeBullet(ei, bi)}
                  title="Remove bullet"
                  style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 11, padding: '0 2px', opacity: 0.4 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '0.4')}
                >✕</button>
              </div>
            );
          })}
          <button onClick={() => addBullet(ei)} style={{
            marginLeft: 10, marginTop: 2, fontSize: 9, color: '#6366f1',
            background: 'none', border: '1px dashed #a5b4fc', borderRadius: 4,
            padding: '1px 8px', cursor: 'pointer',
          }}>+ add bullet</button>
        </div>
      ))}

      {/* EDUCATION */}
      <SectionHead>Education</SectionHead>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <strong><em>
          <EditableCell value={config.education.degree} onChange={v => upd({ education: { ...config.education, degree: v } })} style={{ fontWeight: 700, fontStyle: 'italic' }} />
          {', '}
          <EditableCell value={config.education.university} onChange={v => upd({ education: { ...config.education, university: v } })} style={{ fontWeight: 700, fontStyle: 'italic' }} />
        </em></strong>
        <em><EditableCell value={config.education.dates} onChange={v => upd({ education: { ...config.education, dates: v } })} style={{ fontStyle: 'italic' }} /></em>
      </div>
      <div style={{ marginBottom: 8 }}>
        <EditableCell value={config.education.gpa} onChange={v => upd({ education: { ...config.education, gpa: v } })} />
      </div>

      {/* PROJECTS */}
      <SectionHead>Projects</SectionHead>
      {config.projects.map((proj, pi) => (
        <div key={proj.name} style={{ marginBottom: 6 }}>
          <div style={{ marginBottom: 3, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <strong><EditableCell value={proj.name} onChange={v => setProjectField(pi, 'name', v)} style={{ fontWeight: 700 }} /></strong>
            {' | '}
            <em style={{ fontSize: '9.5pt' }}><EditableCell value={proj.tech} onChange={v => setProjectField(pi, 'tech', v)} style={{ fontStyle: 'italic', fontSize: '9.5pt' }} /></em>
            {' | '}
            <a href={proj.url} style={{ color: '#1155CC' }}>GitHub</a>
          </div>
          {proj.bullets.map((segs, bi) => {
            const fullText = segs.map(s => s.t).join('');
            const wasRewritten = segs.some(s => s.rewritten === true);
            return (
              <div key={bi} style={{
                display: 'flex', gap: 6, paddingLeft: 12, marginBottom: 2,
                background: showHighlights && wasRewritten ? '#f0fdf4' : 'transparent',
                borderLeft: showHighlights && wasRewritten ? '3px solid #4ade80' : '3px solid transparent',
                borderRadius: 2,
              }}>
                <span style={{ flexShrink: 0 }}>•</span>
                <EditableCell value={fullText} onChange={v => setProjectBullet(pi, bi, v)}
                  multiline highlight={showHighlights && wasRewritten}
                  style={{ fontSize: '10pt', flex: 1 }} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Responsive Resume Preview Wrapper ─────────────────────────────────────────
function ResumePreviewScaled({
  config, onChange, showHighlights,
}: {
  config: ResumeConfig; onChange: (c: ResumeConfig) => void; showHighlights: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const resumeWidth = 816; // 8.5in at 96dpi
        const newScale = Math.min(1, containerWidth / resumeWidth);
        setScale(newScale);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <div ref={containerRef} className="overflow-hidden">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: `${100 / scale}%`,
        }}
      >
        <ResumePreview config={config} onChange={onChange} showHighlights={showHighlights} />
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function ResumeTailor() {
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<ResumeConfig | null>(null);
  const [generationTime, setGenerationTime] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('Resume');
  const [charCount, setCharCount] = useState(0);
  const [showHighlights, setShowHighlights] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const generate = async () => {
    if (!jd.trim() || jd.trim().length < 50) {
      setError('Paste a full job description (at least 50 characters).');
      return;
    }
    setLoading(true); setError(''); setConfig(null);
    try {
      const t0 = Date.now();
      const res = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jd, mode: 'full' }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      const data = await res.json();
      setConfig(data.config);
      setGenerationTime(((Date.now() - t0) / 1000).toFixed(1) + 's');
      const m = jd.match(/(?:position|role|title|hiring|looking for|seeking)[:\s]+([^\n,.!?]{3,50})/i);
      if (m) setRoleName(m[1].trim().replace(/^(a|an|the)\s+/i, '').replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').slice(0, 30));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally { setLoading(false); }
  };

  const downloadDocx = async () => {
    if (!config) return;
    setDownloading(true);
    try {
      const res = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: jd, mode: 'build-docx', config }),
      });
      if (!res.ok) throw new Error('DOCX build failed');
      const data = await res.json();
      const bytes = atob(data.docxBase64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const blob = new Blob([arr], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: `Poojith_${roleName}.docx` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { setError('Download failed. Try again.'); }
    finally { setDownloading(false); }
  };

  const reset = () => { setJd(''); setCharCount(0); setConfig(null); setError(''); setRoleName('Resume'); };

  const rewrites = config ? (() => {
    let n = 0;
    config.skills.forEach(s => { if (s.rewritten) n++; });
    config.experience.forEach(exp => exp.bullets.forEach(b => { if (b.some(s => s.rewritten)) n++; }));
    config.projects.forEach(p => p.bullets.forEach(b => { if (b.some(s => s.rewritten)) n++; }));
    return n;
  })() : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden pt-16 sm:pt-20">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)`,
        backgroundSize: '40px 40px',
      }} />
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
            <Sparkles className="w-3 h-3" /> Powered by Claude AI
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">Resume Tailor</h1>
          <p className="text-gray-400 text-sm max-w-lg mx-auto">
            Full AI rewrite — bullets, skills, projects tailored to the JD. Edit anything inline. Download clean DOCX.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!config ? (
            <motion.div key="input" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} className="max-w-3xl mx-auto">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-widest">Job Description</span>
                  <span className="text-xs text-gray-600 tabular-nums">{charCount.toLocaleString()} chars</span>
                </div>
                <textarea
                  value={jd}
                  onChange={e => { setJd(e.target.value); setCharCount(e.target.value.length); }}
                  rows={10}
                  className="w-full bg-transparent px-4 sm:px-5 py-3 sm:py-4 text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-y min-h-[200px] leading-relaxed"
                  placeholder="Paste the full job description here — Claude will fully rewrite your resume to match it..."
                />
                <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.06] bg-white/[0.02]">
                  <p className="text-xs text-gray-600">More detail = better rewrite</p>
                  {jd && <button onClick={() => { setJd(''); setCharCount(0); }} className="text-xs text-gray-600 hover:text-gray-400 px-2 py-1">Clear</button>}
                </div>
              </div>

              {error && <p className="mt-3 text-xs text-red-400 px-1">{error}</p>}

              <motion.button
                onClick={generate} disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: loading ? 1 : 0.99 }}
                className="mt-4 w-full py-3.5 rounded-xl font-medium text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/40 disabled:text-indigo-600 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30 transition-all"
              >
                {loading ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full" />Rewriting resume for this JD...</>
                ) : (
                  <><Sparkles className="w-4 h-4" />Generate &amp; Fully Rewrite</>
                )}
              </motion.button>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-2">
                  {['Analyzing JD domain and required skills...', 'Rewriting bullet points with JD keywords...', 'Rephrasing skills rows for ATS match...', 'Rewriting project descriptions to match domain...', 'Building editable config...'].map((step, i) => (
                    <motion.div key={step} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.5 }} className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />{step}
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {!loading && (
                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { icon: '✍️', label: 'Full bullet rewrite' },
                    { icon: '🎯', label: 'JD keyword injection' },
                    { icon: '✏️', label: 'Click-to-edit inline' },
                    { icon: '📄', label: '1-page DOCX output' },
                  ].map(f => (
                    <div key={f.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                      <div className="text-lg mb-1">{f.icon}</div>
                      <p className="text-[11px] text-gray-500">{f.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

          ) : (
            <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-none">
                        Resume Ready
                        {rewrites > 0 && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">{rewrites} AI rewrites</span>}
                      </p>
                      {generationTime && <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{generationTime}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHighlights(h => !h)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all w-fit ${showHighlights ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-white/[0.04] border-white/[0.08] text-gray-400'}`}
                  >
                    {showHighlights ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {showHighlights ? 'Highlights on' : 'Highlights off'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    onClick={downloadDocx} disabled={downloading}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl font-medium text-sm bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-black/20 transition-all"
                  >
                    {downloading
                      ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full" />Building...</>
                      : <><Download className="w-4 h-4" />Download DOCX</>}
                  </motion.button>
                  <button onClick={reset} className="px-4 py-2.5 rounded-xl text-sm text-gray-400 hover:text-gray-200 border border-white/[0.08] hover:border-white/[0.15] flex items-center gap-2 transition-all">
                    <RotateCcw className="w-3.5 h-3.5" />New
                  </button>
                </div>
              </div>

              {error && <p className="mb-4 text-xs text-red-400">{error}</p>}

              <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-3 sm:px-4 py-2.5 flex items-start sm:items-center gap-2">
                <Pencil className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  <span className="text-indigo-300 font-medium">Click any text to edit it.</span>
                  <span className="hidden sm:inline">
                    {' '}Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px]">Enter</kbd> to save,{' '}
                    <kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px]">Esc</kbd> to cancel. ✕ removes a bullet. + adds one.
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white overflow-hidden shadow-2xl shadow-black/40">
                <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 truncate">📄 Poojith_{roleName}.docx — Live Editor</span>
                  {showHighlights && (
                    <div className="hidden sm:flex items-center gap-3 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-200 border border-green-400 inline-block" />AI rewritten</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300 inline-block" />Your edits</span>
                    </div>
                  )}
                </div>
                <ResumePreviewScaled config={config} onChange={setConfig} showHighlights={showHighlights} />
              </div>

              <p className="mt-3 text-center text-[11px] text-gray-600">
                Highlights &amp; edit controls are preview-only — downloaded DOCX is clean with locked formatting
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}