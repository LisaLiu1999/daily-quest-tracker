# QuestLog: A Secure Full-Stack Task Tracker

QuestLog is a full-stack, gamified daily task tracker designed with a security-first approach. This project implements enterprise-grade security practices, including local authentication with `bcrypt`, Google SSO with `Passport.js`, a robust JWT + Refresh Token session management system, and Role-Based Access Control (RBAC).

This repository contains the completed solution for the "Phase 4: Advanced Authentication and Authorization" project.

## 🚀 Features

* **Local Authentication**: Secure user registration and login using `bcrypt` for password hashing.
* **Google SSO**: Seamless "Sign in with Google" functionality using `Passport.js`.
* **Secure Session Management**: A hybrid token system using short-lived Access Tokens and long-lived, `HttpOnly` cookie-based Refresh Tokens to mitigate XSS attacks.
* **Role-Based Access Control (RBAC)**: Clear distinction between `User` and `Admin` roles, with protected routes secured by middleware.
* **Security Hardening**: Implements `express-rate-limit` to prevent brute-force attacks on auth routes and `helmet` for security headers (including CSP).
* **Frontend**: A responsive vanilla JavaScript (ES Modules) frontend that automatically handles token refreshes.
* **Backend**: A secure REST API built with Node.js, Express, and Mongoose.

---

## 🛠️ Setting Up the Repository

Follow these instructions to get the project running locally for development and testing.

### 1. Prerequisites

* [Node.js](https://nodejs.org/) (v18 or later recommended)
* [npm](https://www.npmjs.com/) (comes with Node.js)
* [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) Account (or a local MongoDB instance)
* [Google Cloud Console](https://console.cloud.google.com/) Account (for OAuth credentials)

### 2. Clone the Repository

```bash
git clone [YOUR_GITHUB_REPOSITORY_URL]
cd daily-quest-tracker
```

### 3. Install Dependencies

Run the following command in the project's root directory:

```bash
npm install
```
This will install `express`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `passport`, `passport-google-oauth20`, `cookie-parser`, `express-rate-limit`, `express-validator`, and `helmet`.

### 4. Configure Environment Variables (.env)

This is the most critical step. Create a file named `.env` in the root of the project and add the following variables:

```
# .env file

# MongoDB Connection String
MONGO_URI=mongodb+srv://...

# JWT Secrets (Use two different long, random strings)
JWT_SECRET=your_super_random_jwt_secret
REFRESH_TOKEN_SECRET=your_different_super_random_refresh_secret

# Google SSO Credentials
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**How to Configure Google SSO (Part A):**
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2.  Navigate to "APIs & Services" > "Credentials".
3.  Click "Create Credentials" > "OAuth 2.0 Client ID".
4.  Select "Web application" as the application type.
5.  Add `httpsin://localhost:3000` to "Authorized JavaScript origins".
6.  Add `httpsin://localhost:3000/auth/google/callback` to "Authorized redirect URIs".
7.  Click "Create" and copy your **Client ID** and **Client Secret** into the `.env` file.

### 5. Generate SSL Certificates (HTTPS)

This project is configured to run over HTTPS, which is required for secure `HttpOnly` cookies and Google SSO.

1.  Create an `ssl` directory in the root:
    ```bash
    mkdir ssl
    ```
2.  Generate a self-signed key and certificate:
    ```bash
    openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 365 \
      -keyout ssl/server.key -out ssl/server.cert \
      -subj "/C=US/ST=California/L=San Francisco/O=Example Inc/CN=localhost"
    ```

### 6. Seed the Database

To create test users, including an Admin account, run the seeder script:

```bash
node seeder.js
```
This will populate the database with test quests, badges, and users.

* **Admin Account:**
    * **Email**: `questmaster@example.com`
    * **Password**: `password123`

### 7. Run the Application

```bash
node server.js
```
The server is now running securely on `https://localhost:3000`.

---

## 🔒 Authentication Mechanisms (Part C)

This project implements a robust, hybrid token-based system that addresses the requirements of **Part C** by balancing security and usability.

1.  **Login (Local & SSO)**:
    Upon successful authentication, the server (`routes/api.js`) generates **two** tokens:
    * **Access Token**: A short-lived (15-minute) JWT containing the user's ID, role, and username. This is sent back to the frontend as JSON.
    * **Refresh Token**: A long-lived (30-day) JWT containing only the user's ID. This is sent back in a **`HttpOnly`, `secure`, `sameSite: 'strict'` cookie**.

2.  **Frontend Storage**:
    * The frontend (`login.js`, `auth-handler.js`) stores the `accessToken` in `localStorage`.
    * The `refreshToken` is stored automatically by the browser. It **cannot be accessed by JavaScript**, which mitigates XSS-based token theft.

3.  **API Requests**:
    * The frontend's `public/api.js` (`fetchData` function) acts as an interceptor. It reads the `accessToken` from `localStorage` and attaches it to all API requests in the `Authorization: Bearer <token>` header.

4.  **Token Validation & Auto-Refresh (Session Continuity)**:
    * The backend's `middleware/auth.js` guard validates the `Authorization` header.
    * **If the Access Token is expired** (after 15 minutes), the server correctly responds with a `401 Unauthorized` error.
    * The `public/api.js` interceptor **automatically catches** this `401` error. It then silently calls the `POST /refresh_token` endpoint.
    * This refresh request naturally includes the `HttpOnly` refresh cookie. The server validates this cookie, and if valid, issues a **new `accessToken`**.
    * The frontend receives the new `accessToken`, stores it, and **automatically retries** the original, failed API request.

This entire refresh process is seamless to the user, fulfilling the "session continuity" requirement from **Part C** while providing strong protection against token theft as required by **Part D**.

---

## 👑 Role-Based Access Control (RBAC) (Part B)

The application implements a simple but effective RBAC system with two roles: `User` and `Admin`.

* **Storage**: A `role` field (`String`) is defined in the `models/User.js` schema, defaulting to 'User'.
* **Implementation**:
    1.  **Token Payload**: Upon login, the `generateTokens` function encodes the user's `role` directly into the `accessToken` payload.
    2.  **Auth Guard (`middleware/auth.js`)**: This first guard validates the token and attaches the full user object (fetched from the DB to ensure fresh data) to the `req.user` object.
    3.  **Admin Guard (`middleware/admin.js`)**: This second guard is stacked after `auth`. It simply checks if `req.user.role === 'Admin'`.

* **Protected Route Examples**:
    * `GET /profile`: Protected by `[auth]`. Any authenticated user (User or Admin) can access their own profile.
    * `GET /admin/test`: Protected by `[auth, admin]`. A request must pass *both* the `auth` guard and the `admin` guard, ensuring only logged-in Admins can access it.

---

## 💡 Lessons Learned (Challenges & Solutions)

* **Challenge 1: Content Security Policy (CSP) vs. Inline Scripts**
    * **Problem**: After implementing Google SSO, the `auth-handler.html` redirect page failed with a `Refused to execute inline script...` error in the console.
    * **Cause**: The `helmet` middleware correctly enforces a `script-src 'self'` policy, which blocks all inline `<script>` tags. My `auth-handler.html` used an inline script to grab the token from the URL.
    * **Solution**: I refactored the redirect page by moving the inline script into its own external file, `public/auth-handler.js`. The HTML was updated to use `<script src="auth-handler.js"></script>`, which fully complies with the CSP and resolves the error.

* **Challenge 2: Local vs. SSO Email Conflict (Phase 2 vs. Phase 4)**
    * **Problem**: A requirement from a previous phase (Phase 2) involved using AES (`crypto.js`) to encrypt the `email` field in the database. This created a critical conflict with the Phase 4 authentication requirements:
        1.  **Local Login**: `POST /login` could not query the database, as it only had the plaintext email, not the encrypted version.
        2.  **Google SSO**: `passport.js` returned a plaintext email from Google, which could not be compared against the encrypted emails in the database to check for existing accounts.
    * **Solution**: I made the decision to **refactor and remove AES encryption** from the `email` field. I determined that for this application, the Phase 4 requirements for robust authentication (`bcrypt`, JWT, SSO) were the primary security focus. Storing email as plaintext is standard practice, as the security risk is managed by `bcrypt`'s strong password hashing. This refactor immediately solved both login conflicts.

* **Challenge 3: Token Storage Strategy (LocalStorage vs. HttpOnly Cookie)**
    * **Problem**: The assignment (Part C/D) requires balancing session continuity with security. Storing a long-lived JWT in `localStorage` is vulnerable to XSS.
    * **Solution**: I implemented the **Refresh Token (Hybrid) System**.
        * The high-risk, long-lived `refreshToken` is stored in an `HttpOnly` cookie, making it inaccessible to XSS.
        * The low-risk, short-lived `accessToken` is stored in `localStorage`, which is acceptable because it expires every 15 minutes.
        * This system provided the best trade-off, fulfilling the requirements for both security (Part D) and user experience (Part C).