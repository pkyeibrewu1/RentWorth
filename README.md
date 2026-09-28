# RentWorth

RentWorth helps students compare housing using first-hand reviews from verified tenants. Reviews require a university email verification, and lease images can be redacted in the browser before upload.

## Live Services

- Website: [rentworth.app](https://rentworth.app)
- API health: [rentworth.onrender.com/health](https://rentworth.onrender.com/health)

## Features

- Search and filter tenant reviews by property, university, and rating.
- Verify student email addresses with a one-time code.
- Redact personal details from lease images in the browser; uploaded images are reprocessed as WebP by the backend.
- Submit property-manager claims with optional authorization proof.
- Review pending claims in the admin page at `frontend/html/admin.html`.
- Send a claim-received email when `EMAIL_USER` and `EMAIL_PASS` are configured. The email confirms receipt, sets a 48-hour review expectation, and invites replies for other questions.
- Ask the Gemini-powered assistant general renting and site-use questions. Claim-status questions are directed to support.

## Local Setup

Requirements: Node.js 18 or later and npm.

1. Install backend dependencies:

   ```sh
   npm --prefix backend install
   ```

2. Copy `.env.example` to `.env` in the repository root. Configure the SpaceMail SMTP settings and the `support@rentworth.app` mailbox password. Set `GEMINI_API_KEY` from Google AI Studio to enable the chat; `GEMINI_MODEL` is optional. Never commit `.env`.

3. Start the API:

   ```sh
   npm --prefix backend start
   ```

4. Serve `frontend/` with a local static server, such as VS Code Live Server, and open `frontend/index.html`. The frontend uses `http://localhost:5000/api` when served from localhost.

The backend stores local data in `backend/rentworth.db` and uploaded proof images in `backend/uploads/`. These are local/runtime data and are excluded from Git.

## Manager Claim Review

Submitted claims are stored with `pending` status and appear in `frontend/html/admin.html`. An admin can open optional proof, then approve or reject a claim. Claim confirmation email is sent immediately when mail settings are available; the review decision is a separate manual step and may take up to 48 hours.

## Security Notes

- Keep `.env`, the SQLite database, uploaded documents, and real credentials out of Git. `.env.example` contains placeholders only.
- The assistant sends chat text to Google's Gemini API. Do not enter passwords, financial details, or private documents; restrict the Gemini key to the Gemini API and keep it server-side.
- The admin claims page and API routes currently have no authentication. Do not expose them publicly until access control is added.
- Approval generates a manager access code, but the current admin UI does not display or email that code. Manager replies therefore need an additional delivery step before this workflow is complete.
- Without email settings, claims are still saved, but the API reports that it could not send the confirmation email.

## Technology

- Frontend: HTML, CSS, vanilla JavaScript, and Canvas API
- Backend: Node.js, Express, Multer, Nodemailer, Sharp, and SQLite
- Hosting: Render and a custom domain

## Author

Pamela Kyei Brewu · [rentworth.app](https://rentworth.app) · [GitHub](https://github.com/pkyeibrewu1)