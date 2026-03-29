// Uses Resend free email API (free tier available) to send transactional emails.
// Exported to: shared email helper used by functions in this file and imported by other service wrappers.
export async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    return { skipped: true, message: 'RESEND_API_KEY not set. Email skipped.' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to,
      subject,
      html
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email API failed: ${errorText}`);
  }

  return response.json();
}

// Exported to: server/src/controllers/authController.js and applicantAuthController.js
export async function sendCredentialsEmail({ to, subject, html }) {
  return sendEmail({ to, subject, html });
}

// Exported to: registration flows for applicant, organization admin, and panelist signup.
export async function sendVerificationCodeEmail({ to, fullName, code, audience = 'user' }) {
  const greetingName = fullName ? ` ${fullName}` : '';
  return sendEmail({
    to,
    subject: 'Your Civira verification code',
    html: `
      <h2>Civira verification</h2>
      <p>Hello${greetingName},</p>
      <p>Use this one-time code to finish your ${audience} registration:</p>
      <p style="font-size:28px;letter-spacing:4px;"><strong>${code}</strong></p>
      <p>This code expires in 10 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `
  });
}

// Exported to: server/src/controllers/candidateController.js
export async function sendShortlistEmailToAdmin({ to, jobTitle, shortlisted }) {
  const rows = shortlisted
    .map(
      (candidate) => `<tr>
        <td style="padding:8px;border:1px solid #d1d5db;">${candidate.rankPosition}</td>
        <td style="padding:8px;border:1px solid #d1d5db;">${candidate.fullName}</td>
        <td style="padding:8px;border:1px solid #d1d5db;">${candidate.email}</td>
        <td style="padding:8px;border:1px solid #d1d5db;">${candidate.candidateCode}</td>
        <td style="padding:8px;border:1px solid #d1d5db;">${Number(candidate.rankingScore).toFixed(3)}</td>
      </tr>`
    )
    .join('');

  return sendEmail({
    to,
    subject: `Civira shortlist generated: ${jobTitle}`,
    html: `
      <h2>Top 10 shortlist generated</h2>
      <p>The shortlist for <strong>${jobTitle}</strong> has been generated.</p>
      <table style="border-collapse:collapse;width:100%;max-width:900px;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Rank</th>
            <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Candidate</th>
            <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Email</th>
            <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Code</th>
            <th style="padding:8px;border:1px solid #d1d5db;text-align:left;">Ranking Score</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `
  });
}

// Exported to: server/src/controllers/scoreController.js
export async function sendSelectionEmailToCandidate({ to, candidateName, jobTitle, organizationName, totalScore, candidateCode }) {
  return sendEmail({
    to,
    subject: `Civira selection update: ${jobTitle}`,
    html: `
      <h2>Congratulations ${candidateName}</h2>
      <p>You have been selected as the leading candidate for <strong>${jobTitle}</strong>${organizationName ? ` at <strong>${organizationName}</strong>` : ''}.</p>
      <p>Candidate code: <strong>${candidateCode}</strong></p>
      <p>Total panel score: <strong>${Number(totalScore).toFixed(2)}</strong></p>
      <p>Please watch your email for the next steps from the recruiting organization.</p>
    `
  });
}

// Exported to: server/src/controllers/interviewController.js
export async function sendInterviewInviteEmailToCandidate({ to, candidateName, jobTitle, interviewDate, candidateCode }) {
  return sendEmail({
    to,
    subject: `Civira interview invitation: ${jobTitle}`,
    html: `
      <h2>Interview invitation</h2>
      <p>Hello ${candidateName},</p>
      <p>You have been shortlisted for <strong>${jobTitle}</strong>.</p>
      <p>Your interview day is <strong>${interviewDate}</strong>.</p>
      <p>Candidate code: <strong>${candidateCode}</strong></p>
      <p>On interview day, candidates are called in random order by the panel.</p>
      <p>Please keep this code ready when contacted.</p>
    `
  });
}
