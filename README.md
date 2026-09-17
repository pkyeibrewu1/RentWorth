# RentWorth 🏢

> **See what they don't show you.** > A full-stack, privacy-centric student housing review platform featuring in-browser PII redaction and .edu-gated lease verification.

[![Live Site](https://img.shields.io/badge/Live_Site-rentworth.app-2ea44f?style=for-the-badge&logo=googlechrome&logoColor=white)](https://rentworth.app)
[![API Status](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://rentworth.onrender.com/health)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-SQLite3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)

---

## 🌐 Live Product
* **Production URL:** [https://rentworth.app](https://rentworth.app)
* **Backend Health Check:** [https://rentworth.onrender.com/health](https://rentworth.onrender.com/health)
* **Management Verification Portal:** [https://rentworth.app/html/admin.html](https://rentworth.app/html/admin.html)

---

## 💡 Why RentWorth?
Apartment listings typically display staged model units, curated marketing photos, and astroturfed testimonials. Crucial day-to-day realities—including recurring mold, persistent elevator outages, unexpected utility fees, and unresponsive management—are difficult for college students to detect before executing a legally binding lease.

**RentWorth** bridges this information asymmetry by providing a platform for authentic tenant experiences while addressing the primary barrier to transparent reviews: **tenant privacy and verification validity**.

---

## 🛠️ Architecture & Tech Stack

* **Frontend:** HTML5, CSS3, Modern Vanilla JavaScript, HTML5 Canvas API
* **Backend:** Node.js, Express.js, Multer
* **Image Sanitization:** Sharp (Metadata stripping, WebP compression)
* **Data Storage:** SQLite3
* **Infrastructure:** Render Web Services, Custom Domain via Spaceship

---

## 🔑 Key Engineering Implementations

1. **Client-Side Document Redactor (HTML5 Canvas):** Sensitive documents are rendered directly inside an HTML5 `<canvas>`. Users blackout legal names, SSNs, and unit numbers in the browser so PII never touches the server unredacted.
2. **Backend EXIF Cleansing & WebP Pipeline:** Images are processed in-memory using the Sharp library to strip GPS/camera metadata and convert to optimized WebP.
3. **University Email OTP Verification:** Reviews require confirming a 6-digit one-time passcode sent to a verified `.edu` address.
4. **Canonical Aliasing & Filtering:** Search maps common colloquial nicknames (e.g., "112" to "One12 Courtland") and dynamically filters reviews.
5. **Gated Manager Response System:** Property managers must be approved before they can post official management responses to reviews.

---

## 👤 Author
**Pamela Kyei Brewu** * Website: [rentworth.app](https://rentworth.app)  
* GitHub: [@pkyeibrewu1](https://github.com/pkyeibrewu1)