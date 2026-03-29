import pool from '../src/config/db.js';

function futureDate(daysAhead) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

const JOB_TEMPLATES = [
  {
    title: 'Senior Full-Stack Engineer',
    description: 'Build and maintain scalable web platforms across frontend and backend services. Partner with product and design to deliver high-quality features, improve reliability, and mentor junior engineers.',
    criteria: ['javascript', 'react', 'node.js', 'sql', 'api design', 'aws', 'testing', 'microservices'],
    deadlineInDays: 21
  },
  {
    title: 'Data Analyst (Business Intelligence)',
    description: 'Translate business questions into analytical models and dashboards. Work closely with stakeholders to track KPIs, automate reports, and identify growth opportunities.',
    criteria: ['sql', 'power bi', 'excel', 'data visualization', 'statistics', 'python', 'stakeholder communication'],
    deadlineInDays: 14
  },
  {
    title: 'Product Manager - Growth',
    description: 'Own growth roadmap for user acquisition, activation, and retention. Define experiments, analyze outcomes, and collaborate with engineering, design, and marketing.',
    criteria: ['product strategy', 'a/b testing', 'analytics', 'roadmapping', 'communication', 'agile'],
    deadlineInDays: 18
  },
  {
    title: 'Cybersecurity Analyst',
    description: 'Monitor security events, investigate incidents, and strengthen preventive controls across cloud and endpoint infrastructure. Support compliance and risk assessments.',
    criteria: ['siem', 'incident response', 'network security', 'threat analysis', 'compliance', 'python'],
    deadlineInDays: 25
  },
  {
    title: 'DevOps Engineer',
    description: 'Design and optimize CI/CD pipelines, container orchestration, and cloud deployment practices. Improve system observability and reduce deployment lead time.',
    criteria: ['docker', 'kubernetes', 'ci/cd', 'aws', 'terraform', 'linux', 'monitoring'],
    deadlineInDays: 20
  },
  {
    title: 'HR Business Partner',
    description: 'Support talent planning, performance management, and employee relations. Collaborate with leaders to improve team effectiveness and organizational health.',
    criteria: ['hr operations', 'employee relations', 'coaching', 'policy', 'communication', 'analytics'],
    deadlineInDays: 16
  },
  {
    title: 'Finance Officer (FP&A)',
    description: 'Drive budgeting, forecasting, and variance analysis. Build financial models to support strategic decisions and present monthly reports to leadership.',
    criteria: ['financial modeling', 'budgeting', 'forecasting', 'excel', 'powerpoint', 'communication'],
    deadlineInDays: 17
  },
  {
    title: 'UX/UI Designer',
    description: 'Create user-centered experiences from discovery through high-fidelity prototypes. Collaborate closely with product and engineering teams to ship polished interfaces.',
    criteria: ['figma', 'wireframing', 'prototyping', 'user research', 'design systems', 'interaction design'],
    deadlineInDays: 15
  },
  {
    title: 'Customer Success Manager',
    description: 'Own customer onboarding, adoption, and retention for key accounts. Deliver strategic guidance and coordinate with support and product teams.',
    criteria: ['customer onboarding', 'relationship management', 'crm', 'communication', 'problem solving', 'saas'],
    deadlineInDays: 12
  },
  {
    title: 'Procurement Specialist',
    description: 'Manage sourcing processes, vendor relationships, and contract negotiations to optimize cost and quality while ensuring compliance.',
    criteria: ['vendor management', 'negotiation', 'contract management', 'sourcing', 'compliance', 'excel'],
    deadlineInDays: 19
  }
];

async function seedRealWorldJobs() {
  const [orgRows] = await pool.query('SELECT id FROM organizations ORDER BY id ASC');

  if (!orgRows.length) {
    console.log('No organizations found. Create an organization first, then rerun this script.');
    return;
  }

  let inserted = 0;

  for (const org of orgRows) {
    const [creatorRows] = await pool.query(
      `SELECT id FROM users WHERE organization_id = ? ORDER BY (role = 'admin') DESC, id ASC LIMIT 1`,
      [org.id]
    );

    if (!creatorRows.length) {
      continue;
    }

    const createdBy = creatorRows[0].id;

    for (const job of JOB_TEMPLATES) {
      const [existing] = await pool.query(
        'SELECT id FROM jobs WHERE organization_id = ? AND title = ? LIMIT 1',
        [org.id, job.title]
      );

      if (existing.length) {
        continue;
      }

      await pool.query(
        `INSERT INTO jobs (organization_id, title, description, criteria_keywords, application_deadline, status, created_by)
         VALUES (?, ?, ?, ?, ?, 'open', ?)`,
        [
          org.id,
          job.title,
          job.description,
          JSON.stringify(job.criteria),
          futureDate(job.deadlineInDays),
          createdBy
        ]
      );

      inserted += 1;
    }
  }

  const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM jobs');
  console.log(`Inserted ${inserted} new jobs.`);
  console.log(`Total jobs in database: ${Number(countRows[0].total || 0)}.`);
}

seedRealWorldJobs()
  .catch((error) => {
    console.error('Failed seeding real-world jobs:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
