/* ==================================================================
   PINELOOP — discovery call endpoint.

   POST /api/lead  {name, company, email, message}
     → emails the request to LEAD_TO via Resend
     → 200 {ok:true} on success, 4xx on bad input, 502 if the mail fails

   Runs on Vercel's Node runtime. No npm dependencies: fetch is global in
   Node 18+. CommonJS, so no package.json is needed.

   Required environment variable
     RESEND_API_KEY   from https://resend.com/api-keys

   Optional environment variables
     LEAD_TO          inbox that receives requests   (default below)
     LEAD_FROM        verified sender                 (default below)
   ================================================================== */

const TO = process.env.LEAD_TO || 'ankitagrawal.316@gmail.com';

// Must be on a domain verified in Resend, or mail is rejected. Until
// pineloop.com is verified there, set LEAD_FROM to onboarding@resend.dev —
// Resend's sandbox sender, which only delivers to your own Resend account.
const FROM = process.env.LEAD_FROM || 'Pineloop <leads@pineloop.com>';

const LABELS = {
  name: 'Name',
  company: 'Company',
  email: 'Work email',
  message: 'Process',
};

const clean = (v) => String(v == null ? '' : v).trim().slice(0, 5000);
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const escapeHtml = (v) =>
  v.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }
  if (!body || typeof body !== 'object') body = {};

  // Honeypot. Bots fill hidden fields; people never see this one. Answer 200
  // so the bot records a success and stops retrying.
  if (clean(body['bot-field'])) return res.status(200).json({ ok: true });

  const name = clean(body.name);
  const company = clean(body.company);
  const email = clean(body.email);
  const message = clean(body.message);

  if (!name || !company || !message || !isEmail(email)) {
    return res.status(400).json({ error: 'Please complete all four fields.' });
  }

  const fields = { name, company, email, message };
  const text = Object.keys(LABELS)
    .map((k) => LABELS[k] + ': ' + fields[k])
    .concat('', 'Submitted: ' + new Date().toISOString())
    .join('\n');

  const html =
    '<div style="font:15px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#10161A">' +
    '<p style="margin:0 0 16px;font:500 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;' +
    'letter-spacing:.08em;text-transform:uppercase;color:#5B6B73">Discovery call request</p>' +
    Object.keys(LABELS)
      .map(
        (k) =>
          '<p style="margin:0 0 12px"><strong style="display:block;font:500 12px/1.6 ui-monospace,' +
          'SFMono-Regular,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;color:#5B6B73">' +
          LABELS[k] +
          '</strong>' +
          escapeHtml(fields[k]).replace(/\n/g, '<br>') +
          '</p>'
      )
      .join('') +
    '<hr style="border:0;border-top:1px solid #D4D6D0;margin:20px 0">' +
    '<p style="margin:0;font-size:13px;color:#5B6B73">Reply directly to this email to reach ' +
    escapeHtml(name) +
    '.</p></div>';

  // Written to the Vercel function log before the send, so a lead survives a
  // mail outage. Swap this for a database insert when there is one.
  console.log('LEAD', JSON.stringify(fields));

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set — lead captured in logs only.');
    return res.status(502).json({ error: 'Mail is not configured.' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: 'Discovery call — ' + name + ' · ' + company,
        text: text,
        html: html,
      }),
    });

    if (!r.ok) {
      console.error('Resend rejected:', r.status, await r.text());
      return res.status(502).json({ error: 'Could not send.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Lead send failed:', err);
    return res.status(502).json({ error: 'Could not send.' });
  }
};
