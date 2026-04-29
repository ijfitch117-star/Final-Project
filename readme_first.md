# README — Read This First

## Before you begin, make sure to change the MONGO_URI in the .env

## 1. Install Dependencies

Run this in your terminal from the **root of the project**:

```bash
npm install express dotenv mongoose bcryptjs jsonwebtoken express-async-handler
```

For nodemon (development only):

```bash
npm install -D nodemon
```

---

## 2. Run the Project

```bash
npm run dev
```

---

## 3. Frontend File Structure

```
frontend/
├── index.html        ← Login page
├── register.html     ← Register page
├── dashboard.html    ← All notes (create, read, update, delete)
└── js/
    ├── auth.js       ← Login + register logic
    └── notes.js      ← Get, create, update, delete notes
```

---

## 4. How It Works

- Token is saved to `localStorage` after login
- Every note request sends `Authorization: Bearer <token>` in the header
- `dashboard.html` redirects to login if no token is found
- The edit form is hidden and only appears when you click **Edit** on a note

---

## 5. Serving Frontend from Express (Single Deployment)

Instead of deploying the frontend and backend separately, you can make Express serve your HTML files directly.

Add this to `server.js`:

```js
const path = require('path') // built into Node — no install needed

// Serve static files from the frontend folder
// visiting '/' will load index.html automatically
app.use(express.static(path.join(__dirname, '../frontend')))
```

> Make sure `express.static` is added **before** your routes.

---

## 6. Deploying to a Server

1. Push your code to a service like **Heroku**, **Render**, **Netlify**, or **Fly.io**
2. They run `node server.js` for you
3. Your backend now serves both the API and the HTML files from one server

Update `API_URL` in `js/auth.js` and `js/notes.js`:

```js
// change this line in both files
const API_URL = 'https://yoursite.com/api'
```

---

## 7. Project Structure on the Server

```
project/
├── backend/
│   └── server.js        ← runs the whole thing
└── frontend/
    ├── index.html
    ├── register.html
    ├── dashboard.html
    └── js/
        ├── auth.js
        └── notes.js
```

---

## Note on CORS

If you are running the frontend and backend from the **same Express server**, you do **not** need CORS — they share the same origin.

CORS is only needed when your frontend and backend are on **different domains**, for example during local development with Live Server (`http://127.0.0.1:5500`) hitting the backend at (`http://localhost:5000`).

If you do need it:

```bash
npm install cors
```

```js
const cors = require('cors')
app.use(cors()) // development — allows all origins

// production — restrict to your domain only
app.use(cors({ origin: 'https://yoursite.com' }))
```