// app/api/tailor-resume/route.ts
// POST { jobDescription, mode: 'full' }               → { config, generationTime }
// POST { jobDescription, mode: 'build-docx', config } → { docxBase64 }

import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle, LevelFormat, TabStopType, UnderlineType,
} from 'docx';

// ─── LOCKED FORMATTING — NEVER CHANGE ────────────────────────────────────────
const FONT       = 'Arial';
const BODY_SIZE  = 20;   // 10pt
const HEAD_SIZE  = 22;   // 11pt
const NAME_SIZE  = 32;   // 16pt
const CONTACT_SZ = 19;   // 9.5pt
const PAGE_W     = 12240;
const PAGE_H     = 15840;
const MARGINS    = { top: 580, right: 780, bottom: 580, left: 780 };
// ─────────────────────────────────────────────────────────────────────────────

const FULL_REWRITE_PROMPT = `You are an elite resume writer for Poojith Reddy Annachedu.
Given a job description, FULLY REWRITE his resume to maximally match the JD.
Output ONLY valid JSON — no markdown fences, no explanation.

## Step 1: Detect JD Seniority Level
Read the JD carefully and classify it:
- ENTRY (0-2 yrs, new grad, intern, associate): Use collaborative/learning tone
- MID (2-5 yrs, SDE II, engineer II): Use balanced ownership tone  
- SENIOR (5+ yrs, senior, staff, lead): Use full ownership tone

## Step 2: Apply Seniority Tone Rules

IF ENTRY-LEVEL JD:
- Change job titles to: "Software Engineer" (remove "Senior")
- Replace: "architected" → "helped build", "designed" → "developed", "led" → "contributed to"
- ADD phrases like: "collaborated with", "learned and applied", "as part of the team", "worked closely with"
- Frame scale as learning context: "gained experience scaling systems to 20K+ daily transactions"
- Emphasize: learning, collaboration, growth, contributing to team goals
- Surface: projects, coursework, AI awareness, full-stack breadth
- STILL keep real metrics — just frame them as team/system outcomes not personal achievements

IF MID-LEVEL JD:
- Keep "Software Engineer" titles, use "implemented", "built", "optimized", "contributed"
- Balance personal ownership with team context

IF SENIOR JD:
- Keep "Senior Software Engineer", use "designed", "architected", "led", "owned"

## Core Rewriting Rules
- NEVER fabricate metrics, companies, or degrees
- REWRITE bullet phrasing using JD's exact keywords and terminology
- REORDER bullets — most JD-relevant first within each role
- REORDER skill categories — most JD-relevant categories first
- REWRITE project descriptions to match JD domain
- KEEP same 3 companies, same education, same 2 projects
- Mark rewritten segments with "rewritten": true
- STRICT 1-PAGE: Citi=4 bullets, ADP=4 bullets, HCA=3 bullets — no exceptions
- Max 155 characters per bullet (total across all segments)

## Personal Info (NEVER change)
Name: Poojith Reddy Annachedu
Contact: "Chicago, IL, USA  |  +1 (312) 536-9779  |  poojithreddy.se@gmail.com  |  linkedin.com/in/poojith-dev  |  github.com/poojithreddy"

## Real Skills (reorder only — never add new skills)
Languages: Java, Python, JavaScript, TypeScript, SQL, Bash/Shell Scripting
Web & UI: HTML5, CSS3, REST APIs, GraphQL, React.js, Next.js, AngularJS, Redux
Frameworks: Spring Boot, Spring MVC, Flask, Kafka, LangChain, LangGraph, WebSockets, PyTest, JUnit
Database: PostgreSQL, MySQL, MongoDB, DynamoDB, Redis, Cassandra, Elasticsearch, Redshift
Cloud: AWS (EC2, S3, RDS, Lambda, ECS, Step Functions, Cognito, CloudWatch, CloudFormation), GCP
Deployment: Docker, Kubernetes, Jenkins, Nginx, Terraform, ArgoCD, GitHub Actions, Keycloak
Observability: Prometheus, Grafana, Loki, Tempo, Open Telemetry, Splunk, Jaeger
Practices: Agile/Scrum, CI/CD, Microservices, Event-Driven Architectures, Distributed Systems, RAG, AI Agents, MCP

## Real Experience Facts (rephrase freely, keep metrics, apply seniority tone)

### Citi — (May 2024 – Present) — EXACTLY 4 bullets
- Event-driven microservices (Java Spring Boot + Kafka), 20K+ daily transactions, REST/gRPC, <200ms, 99.9% uptime
- Fault-tolerant ingestion (Kafka consumer groups + circuit breakers), reduced failures 70%
- JWT + mTLS across 15+ microservices (Spring Security), reduced unauthorized access 45%
- PostgreSQL optimization (indexing, partitioning, pooling), 50% throughput, 10M+ records
- Prometheus + Grafana dashboards (20+ services), MTTR reduced 40%

### ADP — Software Engineer (Jul 2022 – Jul 2023) — EXACTLY 4 bullets
- Payroll Fraud Detection backend (Spring MVC, Kafka, Spring Data JPA), 60% throughput, 35% p99 latency cut
- W-2 processing 14x faster (AWS Step Functions, DynamoDB, CloudWatch), 55% API response time reduction
- Spring Security + AWS Cognito RBAC, SOC 2 compliance, 5M+ monthly pay events via Lambda + S3
- 120+ enterprise apps migrated EV5→EV6 (EC2, CloudFormation), zero downtime, Agile/Scrum

### HCA Healthcare — Software Engineer (Jan 2020 – Jul 2022) — EXACTLY 3 bullets
- HIPAA-compliant REST APIs (Java Spring Boot), 3 hospital systems, 8K+ HL7/FHIR/day, 99.95% uptime, <150ms
- Async notifications (Kafka + Redis pub/sub), 30% faster nurse response, 500+ care units
- EHR monolith → 8 Spring Boot microservices, 45% faster deploys; MySQL optimization, 40% query speed

## Real Projects (always both, rewrite to emphasize JD-relevant aspects)
RetailPulse | Java, Spring Boot, Kafka, MongoDB, Docker, Kubernetes, Jenkins, Prometheus, Grafana
URL: https://github.com/poojithreddy28/RetailPulse
Facts: production microservices retail system, Kafka backbone, Keycloak RBAC, Tempo+Grafana tracing, Docker+K8s, Jenkins CI/CD

SmartHomes | Java, React, MySQL, MongoDB, Elasticsearch, OpenAI, LangGraph, Docker, Kubernetes
URL: https://github.com/poojithreddy28/SmartHomes
Facts: full-stack AI e-commerce, OpenAI LLMs + LangGraph multi-agent, React frontend, Java REST APIs, Elasticsearch 60% relevance gain, 10K+ SKUs

## Output JSON (ONLY this structure, no wrapper):
{
  "contact": {
    "name": "Poojith Reddy Annachedu",
    "line": "Chicago, IL, USA  |  +1 (312) 536-9779  |  poojithreddy.se@gmail.com  |  linkedin.com/in/poojith-dev  |  github.com/poojithreddy"
  },
  "skills": [
    { "label": "Languages", "value": "Java, Python, ...", "rewritten": true }
  ],
  "experience": [
    {
      "title": "Software Engineer",
      "company": "Citi",
      "location": "Chicago, IL, USA",
      "dates": "May 2024 – Present",
      "bullets": [
        [
          { "t": "Collaborated with the team to build scalable microservices using ", "b": false, "rewritten": true },
          { "t": "Java Spring Boot", "b": true, "rewritten": false },
          { "t": " and ", "b": false, "rewritten": false },
          { "t": "Kafka", "b": true, "rewritten": false },
          { "t": ", processing 20K+ daily transactions with <200ms latency.", "b": false, "rewritten": true }
        ]
      ]
    }
  ],
  "education": {
    "degree": "Master of Science in Computer Science",
    "university": "Illinois Institute of Technology, Chicago, IL, USA",
    "dates": "Aug 2023 – May 2025",
    "gpa": "(GPA – 3.83)"
  },
  "projects": [
    {
      "name": "RetailPulse",
      "tech": "Java, Spring Boot, Kafka, MongoDB, Docker, Kubernetes, Jenkins, Prometheus, Grafana",
      "url": "https://github.com/poojithreddy28/RetailPulse",
      "bullets": [
        [{ "t": "Built a production microservices retail system...", "b": false, "rewritten": true }]
      ]
    },
    {
      "name": "SmartHomes",
      "tech": "Java, React, MySQL, MongoDB, Elasticsearch, OpenAI, LangGraph, Docker, Kubernetes",
      "url": "https://github.com/poojithreddy28/SmartHomes",
      "bullets": [
        [{ "t": "Developed full-stack AI-powered e-commerce...", "b": false, "rewritten": true }]
      ]
    }
  ]
}

Segment rules:
- "b": true only for specific tech names (Spring Boot, Kafka, React, AWS Lambda, etc.) — NEVER bold full sentences
- "rewritten": true when you changed the phrasing from the original`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Seg { t: string; b: boolean; rewritten?: boolean }
interface Skill { label: string; value: string; rewritten?: boolean }
interface ExpRole { title: string; company: string; location: string; dates: string; bullets: Seg[][] }
interface Project { name: string; tech: string; url: string; bullets: Seg[][] }
interface ResumeConfig {
  contact: { name: string; line: string }
  skills: Skill[]
  experience: ExpRole[]
  education: { degree: string; university: string; dates: string; gpa: string }
  projects: Project[]
}

// ─── 1-Page Enforcer (server-side guarantee) ──────────────────────────────────
const BULLET_LIMITS: Record<string, number> = {
  Citi: 4,
  ADP: 4,
  'HCA Healthcare': 3,
};
const MAX_BULLET_CHARS = 155;

function enforceFits1Page(config: ResumeConfig): ResumeConfig {
  return {
    ...config,
    experience: config.experience.map(exp => {
      const limit = BULLET_LIMITS[exp.company] ?? 4;
      let bullets = exp.bullets.slice(0, limit);
      bullets = bullets.map(segs => {
        const fullText = segs.map(s => s.t).join('');
        if (fullText.length <= MAX_BULLET_CHARS) return segs;
        let budget = MAX_BULLET_CHARS;
        const trimmed: Seg[] = [];
        for (const seg of segs) {
          if (budget <= 0) break;
          if (seg.t.length <= budget) {
            trimmed.push(seg);
            budget -= seg.t.length;
          } else {
            const cut = seg.t.slice(0, budget).replace(/\s+\S*$/, '');
            trimmed.push({ ...seg, t: cut + '.' });
            budget = 0;
          }
        }
        return trimmed;
      });
      return { ...exp, bullets };
    }),
  };
}

// ─── DOCX Builder ─────────────────────────────────────────────────────────────
function sectionBlock(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 85, after: 25 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '000000', space: 1 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: HEAD_SIZE, font: FONT })],
  });
}

function jobHeader(title: string, company: string, location: string, dates: string): Paragraph {
  return new Paragraph({
    spacing: { before: 55, after: 10 },
    tabStops: [{ type: TabStopType.RIGHT, position: 9520 }],
    children: [
      new TextRun({ text: `${title} | `, bold: true, size: BODY_SIZE, font: FONT }),
      new TextRun({ text: `${company}, ${location}`, bold: true, italics: true, size: BODY_SIZE, font: FONT }),
      new TextRun({ text: '\t' }),
      new TextRun({ text: dates, italics: true, size: BODY_SIZE, font: FONT }),
    ],
  });
}

function bul(segs: Seg[]): Paragraph {
  return new Paragraph({
    numbering: { reference: 'bullets', level: 0 },
    spacing: { before: 0, after: 10 },
    children: segs.map(s => new TextRun({ text: s.t, bold: !!s.b, size: BODY_SIZE, font: FONT })),
  });
}

function buildDocx(config: ResumeConfig): Document {
  const kids: Paragraph[] = [];

  kids.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 18 },
    children: [new TextRun({ text: config.contact.name, bold: true, size: NAME_SIZE, font: FONT })],
  }));
  kids.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 },
    children: [new TextRun({ text: config.contact.line, size: CONTACT_SZ, font: FONT })],
  }));

  kids.push(sectionBlock('Technical Skills'));
  config.skills.forEach(s => kids.push(new Paragraph({
    spacing: { before: 0, after: 16 },
    children: [
      new TextRun({ text: `${s.label}: `, bold: true, size: BODY_SIZE, font: FONT }),
      new TextRun({ text: s.value, size: BODY_SIZE, font: FONT }),
    ],
  })));

  kids.push(sectionBlock('Experience'));
  config.experience.forEach(exp => {
    kids.push(jobHeader(exp.title, exp.company, exp.location, exp.dates));
    exp.bullets.forEach(b => kids.push(bul(b)));
  });

  kids.push(sectionBlock('Education'));
  kids.push(new Paragraph({
    spacing: { before: 20, after: 10 },
    tabStops: [{ type: TabStopType.RIGHT, position: 9520 }],
    children: [
      new TextRun({ text: `${config.education.degree}, `, bold: true, italics: true, size: BODY_SIZE, font: FONT }),
      new TextRun({ text: config.education.university, bold: true, italics: true, size: BODY_SIZE, font: FONT }),
      new TextRun({ text: '\t' }),
      new TextRun({ text: config.education.dates, italics: true, size: BODY_SIZE, font: FONT }),
    ],
  }));
  kids.push(new Paragraph({
    spacing: { before: 0, after: 10 },
    children: [new TextRun({ text: config.education.gpa, size: BODY_SIZE, font: FONT })],
  }));

  kids.push(sectionBlock('Projects'));
  config.projects.forEach(proj => {
    kids.push(new Paragraph({
      spacing: { before: 30, after: 10 },
      children: [
        new TextRun({ text: proj.name, bold: true, size: BODY_SIZE, font: FONT }),
        new TextRun({ text: ' | ', size: BODY_SIZE, font: FONT }),
        new TextRun({ text: proj.tech, italics: true, size: BODY_SIZE, font: FONT }),
        new TextRun({ text: ' | ', size: BODY_SIZE, font: FONT }),
        new TextRun({ text: 'GitHub', size: BODY_SIZE, font: FONT, color: '1155CC', underline: { type: UnderlineType.SINGLE } }),
      ],
    }));
    proj.bullets.forEach(b => kids.push(bul(b)));
  });

  return new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 180 } } },
        }],
      }],
    },
    sections: [{
      properties: { page: { size: { width: PAGE_W, height: PAGE_H }, margin: MARGINS } },
      children: kids,
    }],
  });
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jobDescription, mode = 'full', config: incomingConfig } = body;

    // build-docx: take user's (possibly edited) config → enforce 1-page → DOCX
    if (mode === 'build-docx' && incomingConfig) {
      const enforced = enforceFits1Page(incomingConfig as ResumeConfig);
      const doc = buildDocx(enforced);
      const buffer = await Packer.toBuffer(doc);
      return NextResponse.json({ docxBase64: buffer.toString('base64') });
    }

    if (!jobDescription?.trim()) {
      return NextResponse.json({ error: 'jobDescription is required' }, { status: 400 });
    }

    const startTime = Date.now();

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        system: FULL_REWRITE_PROMPT,
        messages: [{
          role: 'user',
          content: `Rewrite Poojith's resume to maximally match this JD. First detect seniority level, then apply the correct tone. Output only JSON.\n\nJOB DESCRIPTION:\n${jobDescription}`,
        }],
      }),
    });

    if (!claudeRes.ok) {
      const t = await claudeRes.text();
      console.error('Claude error:', t);
      return NextResponse.json({ error: 'Claude API call failed' }, { status: 502 });
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('');

    let config: ResumeConfig;
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      config = JSON.parse(cleaned);
    } catch {
      console.error('Parse failed:', rawText.slice(0, 400));
      return NextResponse.json({ error: 'Failed to parse Claude response' }, { status: 500 });
    }

    // Hard enforce 1-page server-side before sending to frontend
    config = enforceFits1Page(config);

    return NextResponse.json({
      config,
      generationTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    });

  } catch (err) {
    console.error('route error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}