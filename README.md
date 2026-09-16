# RentWorth 🏢

> A privacy-centric student housing platform providing verified, transparent rental reviews backed by cryptographic proof of tenancy and in-browser PII redaction.

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.x-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Sharp](https://img.shields.io/badge/Sharp-Image_Optimization-99CC00)](https://sharp.pixelplumbing.com/)

---

## 🌟 Key Features

* **Client-Side Document Redaction:** Interactive HTML5 Canvas tool enabling tenants to draw permanent blackout masks over sensitive data (SSN, account balances, signatures) directly in-browser prior to backend network transmission.
* **Automated Image Pipeline:** Server-side upload handler utilizing `Multer` and `Sharp` to scrub EXIF metadata, auto-orient, and convert incoming lease images into compressed WebP format.
* **Intelligent Autocomplete & Alias Normalization:** Sub-millisecond prefix-matching lookup across 2,500+ US higher education institutions, coupled with an alias engine mapping complex shorthand (e.g., "112" $\rightarrow$ "One12 Courtland").
* **Multi-Parameter Live Filtering:** Real-time client-side filter engine executing simultaneous queries across universities, housing complexes, star ratings, and tags.
* **Property Manager Claim & Response System:** Role-based claim pipeline allowing community managers to submit corporate credentials and publish verified, badged responses to student reviews.
* **Administrative Audit Portal:** Dedicated control dashboard for inspecting incoming lease documents and adjudicating property manager ownership claims.

---

## 🛠️ Architecture & Tech Stack

* **Frontend:** Vanilla JavaScript (ES6+), HTML5 Canvas API, Custom CSS Variables (Dark Theme)
* **Backend:** Node.js, Express.js REST API, CORS, Multer (Memory Storage)
* **Image Processing:** Sharp (WebP conversion, metadata scrubbing)
* **Database:** SQLite3 (Relational storage with foreign key cascade support)