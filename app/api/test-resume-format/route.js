import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType, convertInchesToTwip, ExternalHyperlink, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import fs from 'fs';
import path from 'path';

const TEMP_DIR = path.join(process.cwd(), 'temp');

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Fast Test Mode for Resume Formatting
 * This endpoint uses pre-defined test data to quickly validate styling changes
 * without waiting for LLM generation (completes in under 5 seconds)
 */
export async function POST(req) {
  const startTime = Date.now();
  
  try {
    console.log('🧪 TEST MODE: Generating resume with pre-defined data for quick validation...');
    
    // Use test data instead of calling LLM
    const testContent = getTestResumeData();
    
    // Generate DOCX with formatting
    const docxPath = await generateTestResumeDOCX(testContent);
    
    const endTime = Date.now();
    const totalSeconds = ((endTime - startTime) / 1000).toFixed(1);
    console.log(`✅ TEST MODE: Resume generated in ${totalSeconds} seconds`);
    
    // Read the final DOCX
    const docxBuffer = fs.readFileSync(docxPath);
    
    // Generate HTML preview
    const htmlPreview = generateHTMLPreview(testContent);
    
    // Convert DOCX to base64
    const docxBase64 = docxBuffer.toString('base64');
    
    // Clean up temp files
    setTimeout(() => {
      try {
        if (fs.existsSync(docxPath)) fs.unlinkSync(docxPath);
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }, 60000);
    
    return NextResponse.json({
      htmlPreview,
      docxBase64,
      generationTime: `${totalSeconds} sec (TEST MODE)`,
      filename: 'TestResume_Format_Validation.docx',
      testMode: true
    });
    
  } catch (error) {
    console.error('❌ Test mode error:', error);
    return NextResponse.json(
      { error: 'Test mode failed: ' + error.message },
      { status: 500 }
    );
  }
}

function getTestResumeData() {
  return {
    name: 'Poojith Reddy A',
    title: 'Senior Java Full Stack Developer',
    phone: '312-536-9779',
    email: 'poojithreddy.se@gmail.com',
    linkedin: 'https://www.linkedin.com/in/poojith-reddy-com/',
    summary: [
      'Senior Java Full Stack Developer with 11+ years of experience in Java/J2EE, Spring Boot, Angular, and AWS cloud technologies, specializing in enterprise microservices, fintech applications, and e-commerce platforms, delivering high-performance solutions for Fortune 500 companies',
      'Specialized in Core Java multithreading, Executor Framework, and concurrent collections, ensuring scalable and responsive server-side applications with optimized resource utilization across distributed systems',
      'Engineered RESTful APIs with Spring Boot and JAX-RS, enabling seamless system integrations supporting 10M+ API transactions daily with 99.95% uptime and sub-200ms response times',
      'Built responsive front-end solutions using Angular, React, JSP, HTML5, CSS3, and jQuery, creating cross-browser compatible applications that improved user engagement by 25% and reduced page load times by 40%',
      'Strong expertise in Core Java concepts including Exception handling, Multi-threading, Lambda functions, Synchronization, Serialization, Collections framework, Executor Services, and Thread pools for high-concurrency applications',
      'Demonstrated proficiency in Java 17, leveraging latest features such as sealed classes, pattern matching, and enhanced switch expressions for cleaner, more maintainable code in modern applications',
      'Migrated legacy Java 8 applications to Java 17, ensuring compatibility and optimization while reducing memory footprint by 30% and improving startup time by 45% through optimized JVM configurations'
    ],
    technicalSkills: {
      'Languages': 'Java (8/11/17), SQL, TypeScript, JavaScript, PHP, Python, .NET, C#, C.',
      'Java/J2EE Technologies': 'Servlets, Spring, JPA, JSP, JMS, JNDI, EJB, RMI, JAXB, JAXP, XML, JDBC, JNDi, Core Java Multithreading (Threads, Synchronization, Locks), Executor Framework (Callable/Future, Fork/Join Pool, Concurrent Collections)',
      'Frameworks': 'Spring, Spring MVC, Spring Batch, Spring Security, Spring AOP, Spring Core, Spring IoC, Struts (1.2, 2.1, 2.5), Hibernate 5.x, Django, JSF, GWT, Vaadin, MyBatis.',
      'Scripting Languages': 'JSP (1.2, 2.1), JSP-EL, JSTL, JavaScript, TypeScript, HTML4, HTML15, CSS2, CSS3, Custom Tags, jQuery (1.8, 1.9), jQuery UI, ECMAScript 5/6, Node.js',
      'Web Technologies': 'HTML5, CSS3, AJAX, jQuery, Bootstrap, XML, JSON, Kotlin, Scala, Grunt, Gulp.',
      'Databases': 'SQL Server, MySQL, Oracle, MongoDB, DB2, PostgreSQL, MS-SQL, SQL Performance Tuning (Indexing, Query Optimization, Stored Procedures).',
      'JavaScript Frameworks': 'AngularJS (2, 4), Angular 8, Angular 11, React.js, Express.js, Node.js, Backbone.js, Hapi.js, Ember.js, Ext.js, Dojo.',
      'Web Services': 'RESTful, SOAP, GraphQL, JAX-RS, JAX-WS, WSDL, XSD, Apache Axis.',
      'DevOps & Cloud Tooling': 'GitLab CI/CD, Jenkins, GitHub Actions, Bitbucket Pipelines, Docker, Kubernetes (EKS), Terraform, AWS CloudFormation, HCL, Ansible, AWS CloudWatch, ELK Stack, Prometheus, Grafana, HashiCorp Vault, AWS Secrets Manager.'
    },
    experiences: [
      {
        company: 'Bank of America',
        location: 'Jersey City, NJ',
        period: 'Dec 2023 – Current',
        role: 'Senior Java Full Stack Developer',
        bullets: [
          'Spearheaded migration of monolithic banking platform to microservices architecture using Java 17, Spring Boot 3.2, Spring Cloud Gateway, and Kubernetes, processing $2.4B in daily transactions across 12 services with 99.98% uptime',
          'Orchestrated cloud-native transformation leveraging AWS EKS, RDS Aurora, ElastiCache Redis, and S3, reducing infrastructure costs by $340K annually while supporting 2.5M concurrent users during peak trading hours',
          'Pioneered real-time fraud detection pipeline using Apache Kafka Streams, Apache Flink, and DynamoDB, analyzing 250K transactions per minute with sub-50ms latency, preventing $8.2M in fraudulent activities quarterly',
          'Streamlined CI/CD automation with Jenkins, GitLab CI, Docker, Terraform, and ArgoCD, deploying 60+ releases monthly across 4 environments, cutting deployment time from 3.5 hours to 22 minutes',
          'Enhanced API gateway using Spring Cloud Gateway and Netflix Eureka, implementing intelligent routing, rate limiting, and circuit breakers, improving system resilience and reducing cascading failures by 87%'
        ]
      },
      {
        company: 'JPMorgan Chase',
        location: 'Chicago, IL',
        period: 'Jan 2021 – Nov 2023',
        role: 'Java Full Stack Developer',
        bullets: [
          'Transformed payment processing system using Java 11, Spring Boot 2.7, Angular 14, and PostgreSQL, handling 1.8M daily transactions with 99.95% success rate and average processing time of 340ms',
          'Established comprehensive monitoring solution with Prometheus, Grafana, ELK Stack, and AWS CloudWatch, providing real-time observability across 18 microservices, reducing MTTR from 45 minutes to 8 minutes',
          'Modernized front-end architecture with Angular 14, RxJS, NgRx state management, implementing lazy loading and code splitting, reducing initial bundle size by 65% and improving First Contentful Paint to under 1.2 seconds'
        ]
      }
    ]
  };
}

async function generateTestResumeDOCX(content) {
  const sections = [];
  
  // Header with name and title
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: content.name, size: 28, bold: true, color: '000000' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 }
    }),
    new Paragraph({
      children: [new TextRun({ text: content.title, size: 20, color: '000000' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 150 }
    })
  );
  
  // Contact Box
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: `Phone: ${content.phone} | Email: ${content.email}`, size: 18 })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 100 },
      border: {
        top: { color: '5DADE2', space: 3, style: 'single', size: 12 },
        bottom: { color: '5DADE2', space: 3, style: 'single', size: 12 },
        left: { color: '5DADE2', space: 3, style: 'single', size: 12 },
        right: { color: '5DADE2', space: 3, style: 'single', size: 12 }
      },
      shading: { fill: 'D6EAF8' }
    })
  );
  
  // LinkedIn
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'LinkedIn : ', size: 18 }),
        new ExternalHyperlink({
          children: [new TextRun({ text: content.linkedin, size: 18, color: '0563C1', underline: {} })],
          link: content.linkedin
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    })
  );
  
  // Professional Summary
  sections.push(
    new Paragraph({
      text: 'PROFESSIONAL SUMMARY',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 150 },
      border: {
        bottom: { color: '000000', space: 1, style: 'single', size: 6 }
      }
    })
  );
  
  content.summary.forEach(bullet => {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: '• ', size: 20 }),
          new TextRun({ text: bullet, size: 20 })
        ],
        spacing: { after: 120 }
      })
    );
  });
  
  // Technical Skills Section
  sections.push(
    new Paragraph({
      text: 'TECHNICAL SKILLS',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      border: {
        bottom: { color: '000000', space: 1, style: 'single', size: 6 }
      }
    })
  );
  
  // Skills in table format
  const skillRows = [];
  for (const [category, skills] of Object.entries(content.technicalSkills)) {
    skillRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: category, bold: true, size: 20 })],
              spacing: { before: 80, after: 80 }
            })],
            width: { size: 22, type: WidthType.PERCENTAGE },
            verticalAlign: 'center',
            shading: { fill: 'FFFFFF' },
            margins: {
              top: 120,
              bottom: 120,
              left: 120,
              right: 120
            }
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: skills, size: 20 })],
              spacing: { before: 80, after: 80 }
            })],
            width: { size: 78, type: WidthType.PERCENTAGE },
            verticalAlign: 'center',
            margins: {
              top: 120,
              bottom: 120,
              left: 120,
              right: 120
            }
          })
        ],
        height: { value: 350, rule: 'atLeast' }
      })
    );
  }
  
  sections.push(
    new Table({
      rows: skillRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
      margins: {
        top: 80,
        bottom: 80
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        right: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
      }
    })
  );
  
  // Work Experience Section
  sections.push(
    new Paragraph({
      text: 'WORK EXPERIENCE',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 150 },
      border: {
        bottom: { color: '000000', space: 1, style: 'single', size: 6 }
      }
    })
  );
  
  // Experience entries
  for (const exp of content.experiences) {
    // Company, location on first line (bold, larger font)
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ 
            text: `${exp.company}, ${exp.location}`,
            size: 22,
            bold: true
          })
        ],
        spacing: { before: 250, after: 50 },
        alignment: AlignmentType.LEFT
      })
    );
    
    // Role | period on second line (normal weight)
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ 
            text: `${exp.role} | ${exp.period}`,
            size: 20,
            bold: false
          })
        ],
        spacing: { after: 150 }
      })
    );
    
    // Bullets
    for (const bullet of exp.bullets) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: '• ', size: 20 }),
            new TextRun({ text: bullet, size: 20 })
          ],
          spacing: { after: 120 }
        })
      );
    }
  }
  
  // Create document
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.5),
            right: convertInchesToTwip(0.75),
            bottom: convertInchesToTwip(0.5),
            left: convertInchesToTwip(0.75)
          }
        }
      },
      children: sections
    }]
  });
  
  // Save to temp file
  const timestamp = Date.now();
  const filename = `test_resume_${timestamp}.docx`;
  const filepath = path.join(TEMP_DIR, filename);
  
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filepath, buffer);
  
  return filepath;
}

function generateHTMLPreview(content) {
  const boldTechTerms = (text) => {
    const techTerms = [
      'Java', 'J2EE', 'Spring', 'Spring Boot', 'Spring MVC', 'Spring Cloud', 'Spring Security',
      'Hibernate', 'MyBatis', 'JPA', 'JDBC', 'REST', 'RESTful', 'SOAP', 'GraphQL',
      'Angular', 'React', 'Node.js', 'Express.js', 'Vue.js', 'TypeScript', 'JavaScript',
      'HTML5', 'CSS3', 'AJAX', 'jQuery', 'Bootstrap', 'Tailwind',
      'Docker', 'Kubernetes', 'EKS', 'AWS', 'Azure', 'EC2', 'S3', 'Lambda', 'RDS',
      'Microservices', 'Kafka', 'RabbitMQ', 'Redis', 'MongoDB', 'PostgreSQL', 'MySQL', 'Oracle',
      'Jenkins', 'GitLab', 'GitHub', 'CI/CD', 'Terraform', 'Ansible',
      'JUnit', 'Mockito', 'Selenium', 'Git', 'Maven', 'Gradle',
      'Tomcat', 'JBoss', 'WebSphere', 'JSON', 'XML', 'OAuth', 'JWT',
      'Python', 'SQL', 'NoSQL', 'Elasticsearch', 'Kibana', 'Logstash', 'ELK',
      'Prometheus', 'Grafana', 'CloudWatch', 'Snowflake', 'Spark', 'Flink'
    ];
    
    const pattern = new RegExp(`\\b(${techTerms.join('|')})\\b`, 'gi');
    return text.replace(pattern, '<strong>$1</strong>');
  };
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Calibri, Arial, sans-serif;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 40px;
      background: #fff;
      color: #000;
      font-size: 11pt;
      line-height: 1.4;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .header h1 {
      font-size: 24pt;
      margin: 0 0 5px 0;
      font-weight: bold;
    }
    .header h2 {
      font-size: 14pt;
      margin: 0 0 10px 0;
      font-weight: normal;
    }
    .contact-box {
      background-color: #D6EAF8;
      border: 2px solid #5DADE2;
      padding: 10px;
      margin: 10px 0;
      text-align: center;
      font-size: 10pt;
    }
    .linkedin {
      text-align: center;
      margin-bottom: 20px;
    }
    .linkedin a {
      color: #0563C1;
      text-decoration: underline;
    }
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 10px;
      padding-bottom: 3px;
      border-bottom: 2px solid #000;
    }
    .bullet {
      margin: 8px 0;
      padding-left: 20px;
      text-indent: -15px;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 10px 0;
      border: 1px solid #000;
    }
    table tr {
      border-bottom: 1px solid #000;
    }
    table td {
      border-right: 1px solid #000;
      padding: 10px 12px;
      vertical-align: top;
      background-color: #fff;
      line-height: 1.3;
    }
    table td:first-child {
      width: 22%;
      font-weight: bold;
      background-color: #fff;
      border-right: 1px solid #000;
    }
    table td:last-child {
      border-right: none;
    }
    table tr:last-child td {
      border-bottom: none;
    }
    .company-header {
      font-size: 13pt;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 4px;
      color: #000;
    }
    .role-info {
      font-size: 11pt;
      font-weight: normal;
      margin-bottom: 10px;
      color: #000;
    }
    .role-info .date {
      float: right;
    }
    .test-mode-banner {
      background-color: #FFF3CD;
      border: 2px solid #FFC107;
      padding: 15px;
      margin-bottom: 20px;
      text-align: center;
      font-weight: bold;
      color: #856404;
    }
  </style>
</head>
<body>
  <div class="test-mode-banner">
    🧪 TEST MODE - Format Validation Preview (Generated in under 5 seconds)
  </div>

  <div class="header">
    <h1>${content.name}</h1>
    <h2>${content.title}</h2>
  </div>
  
  <div class="contact-box">
    Phone: ${content.phone} | Email: ${content.email}
  </div>
  
  <div class="linkedin">
    <a href="${content.linkedin}" target="_blank">LinkedIn : ${content.linkedin}</a>
  </div>
  
  <div class="section-title">PROFESSIONAL SUMMARY</div>
  ${content.summary.map(bullet => `<div class="bullet">• ${boldTechTerms(bullet)}</div>`).join('\n  ')}
  
  <div class="section-title">TECHNICAL SKILLS</div>
  <table>
  ${Object.entries(content.technicalSkills).map(([category, skills]) => 
    `<tr><td>${category}</td><td>${skills}</td></tr>`
  ).join('\n  ')}
  </table>
  
  <div class="section-title">WORK EXPERIENCE</div>
  ${content.experiences.map(exp => `
  <div class="company-header">${exp.company}, ${exp.location}</div>
  <div class="role-info">${exp.role} | ${exp.period}</div>
  ${exp.bullets.map(bullet => `<div class="bullet">• ${boldTechTerms(bullet)}</div>`).join('\n  ')}
  `).join('\n  ')}
</body>
</html>
  `;
  
  return html;
}
