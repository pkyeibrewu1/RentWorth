# RentWorth 🏢

> A full-stack, privacy-first student housing transparency platform providing verified, landlord-proof rental reviews backed by authenticated tenancy proof and client-side PII redaction.

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.x-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Sharp](https://img.shields.io/badge/Sharp-Image_Pipeline-99CC00)](https://sharp.pixelplumbing.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 🌟 Key Features

* **In-Browser Document Redaction:** Interactive HTML5 Canvas tool that allows students to black out private details (SSNs, account balances, legal names) prior to upload. Redaction masks are permanently rasterized client-side so unredacted PII never reaches the server.
* **Automated Image Optimization Pipeline:** Server-side upload handler built with `Multer` and `Sharp` that strips EXIF camera/geolocation metadata, auto-orients, and converts lease proofs to lightweight WebP images.
* **Intelligent Autocomplete & Alias Resolution:** Sub-millisecond lookup across 2,500+ US higher education institutions with real-time fuzzy matching and alias normalization (e.g., mapping colloquial nicknames like `"112"` → `"One12 Courtland"`).
* **Dynamic College & Complex Expansion:** Allows students to add missing colleges or complexes directly within the review modal, instantly caching them for future searches.
* **Multi-Parameter Feed Filtering:** Simultaneous client-side filtering across university, apartment complex, minimum star rating, and user-generated hashtags.
* **Manager Claim & Response System:** Workflow allowing community directors to submit corporate identity proofs and publish badged, official clarifications under tenant reviews.
* **Administrative Audit Portal (`admin.html`):** Internal dashboard to inspect submitted property manager credentials and approve or reject claim requests.

---

## 🛠️ Architecture & Tech Stack
RentWorth/
├── backend/
│   ├── database.js          # SQLite relational schema & initialization
│   ├── server.js            # Express API, Sharp processing & upload endpoints
│   ├── rentworth.db         # Local SQLite persistent store (gitignored)
│   └── uploads/             # Sanitized, compressed WebP proofs (gitignored)
├── frontend/
│   ├── html/
│   │   ├── home.html        # Discovery stream & review submission modal
│   │   └── admin.html       # Internal manager verification audit portal
│   ├── styles.css           # Global dark-mode UI design system
│   └── app.js               # Canvas redactor, autocompletes, filter engine
├── .gitignore
├── LICENSE
└── README.md


* **Frontend:** Vanilla JavaScript (ES6+), HTML5 Canvas API, CSS3 Custom Properties (Dark Theme)
* **Backend:** Node.js, Express.js REST API, CORS, Multer (Memory Storage)
* **Image Processing:** Sharp (WebP compression & EXIF scrubbing)
* **Database:** SQLite3 (Foreign key cascades across reviews, claims, and responses)

---

## 🚀 Quickstart

### Prerequisites
* [Node.js](https://nodejs.org/) (v16 or higher)
* [Git](https://git-scm.com/)

### 1. Clone & Setup Backend
```bash
git clone [https://github.com/your-username/RentWorth.git](https://github.com/your-username/RentWorth.git)
cd RentWorth/backend
npm install
node server.js