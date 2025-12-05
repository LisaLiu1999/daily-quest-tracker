# QuestLog: A Secure Full-Stack Task Tracker

QuestLog is a full-stack, gamified daily task tracker designed with a security-first approach. This project implements enterprise-grade security practices, including local authentication with `bcrypt`, Google SSO with `Passport.js`, a robust JWT + Refresh Token session management system, and Role-Based Access Control (RBAC).

This repository contains the completed solution for the "Phase 4: Advanced Authentication and Authorization" project.

## Features

* **Local Authentication**: Secure user registration and login using `bcrypt` for password hashing.
* **Google SSO**: Seamless "Sign in with Google" functionality using `Passport.js`.
* **Secure Session Management**: A hybrid token system using short-lived Access Tokens and long-lived, `HttpOnly` cookie-based Refresh Tokens to mitigate XSS attacks.
* **Role-Based Access Control (RBAC)**: Clear distinction between `User` and `Admin` roles, with protected routes secured by middleware.
* **Security Hardening**: Implements `express-rate-limit` to prevent brute-force attacks on auth routes and `helmet` for security headers (including CSP).
* **Frontend**: A responsive vanilla JavaScript (ES Modules) frontend that automatically handles token refreshes.
* **Backend**: A secure REST API built with Node.js, Express, and Mongoose.

---

## ｸSetting Up the Repository

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