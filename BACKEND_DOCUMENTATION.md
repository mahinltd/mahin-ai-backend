# 🚀 Mahin AI Backend - Complete Documentation

**Organization:** Mahin Ltd  
**Director & CEO:** Tanvir Rahman  
**Official Email:** info.mahin.ltd@gmail.com  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Database Models](#database-models)
5. [API Endpoints](#api-endpoints)
6. [Authentication System](#authentication-system)
7. [AI Chat System](#ai-chat-system)
8. [Pricing & Payment System](#pricing--payment-system)
9. [Admin Control Panel](#admin-control-panel)
10. [Security & Middleware](#security--middleware)
11. [Environment Variables](#environment-variables)
12. [Error Handling](#error-handling)
13. [Frontend Integration Guide](#frontend-integration-guide)

---

## 📖 Project Overview

**Mahin AI** is an Enterprise SaaS platform that provides:
- 🤖 AI-powered chat responses using multiple rotating API tokens
- 💳 Payment processing (BKash, Nagad, Rocket, PayPal)
- 👤 User authentication (Email/Password & Google OAuth)
- 💰 Subscription plans (Free, Pro, Max)
- 👑 Admin dashboard for user & payment management
- 🔐 Advanced security with JWT tokens, rate limiting, and device tracking
- 📧 Email notifications via Resend API
- 🎨 Cloud image storage via Cloudinary

---

## 🛠️ Technology Stack

### Backend Framework
- **Node.js** with Express.js (v4.21.2)
- **JavaScript (CommonJS)**

### Database
- **MongoDB Atlas** - Cloud-hosted NoSQL database
- **Mongoose** (v8.9.3) - ODM for MongoDB

### Authentication & Security
- **JWT** (jsonwebtoken v9.0.2) - Token-based authentication
- **bcryptjs** (v2.4.3) - Password hashing
- **CORS** (v2.8.5) - Cross-Origin Resource Sharing
- **express-rate-limit** (v7.5.0) - Request rate limiting

### External APIs
- **Puter.js** (@heyputer/puter.js v2.5.3) - AI chat engine with token rotation
- **Groq, Gemini, HuggingFace** - AI model support
- **PayPal API** - Payment processing
- **Resend** (v4.1.1) - Transactional email service
- **Cloudinary** (v2.5.1) - Image upload & storage

### Utilities
- **axios** (v1.7.9) - HTTP client
- **geoip-lite** (v1.4.10) - IP geolocation
- **useragent** (v2.3.0) - User-agent parsing
- **dotenv** (v16.4.5) - Environment configuration

### Development Tools
- **nodemon** (v3.1.9) - Auto-restart on file changes

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Frontend Application                        │
├─────────────────────────────────────────────────────────┤
│  HTTP/CORS Requests to API Base: /api/v1/              │
├─────────────────────────────────────────────────────────┤
│                    Express Server                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Routes Layer                                    │  │
│  │  - /api/v1/auth    (Authentication)            │  │
│  │  - /api/v1/ai      (Chat Generation)           │  │
│  │  - /api/v1/payment (Subscription & Payments)   │  │
│  │  - /api/v1/admin   (Admin Control)             │  │
│  └──────────────────────────────────────────────────┘  │
│         ↓                                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Middleware Layer (Security & Validation)       │  │
│  │  - Tracker (IP, Device, Browser, Location)     │  │
│  │  - Auth Middleware (JWT Verification)           │  │
│  │  - Rate Limiter (Anti-spam)                    │  │
│  │  - Admin Middleware (Role-based Access)         │  │
│  └──────────────────────────────────────────────────┘  │
│         ↓                                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Controller Layer (Business Logic)               │  │
│  │  - authController    (Sign-up, Login, Google)  │  │
│  │  - aiController      (Chat Response)            │  │
│  │  - paymentController (Payment Processing)       │  │
│  │  - adminController   (Admin Operations)         │  │
│  └──────────────────────────────────────────────────┘  │
│         ↓                                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Database Layer (MongoDB via Mongoose)          │  │
│  │  - User Model (Accounts & Profiles)             │  │
│  │  - Payment Model (Transaction Records)          │  │
│  │  - Config Model (System Settings)               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│          External Services & APIs                        │
├─────────────────────────────────────────────────────────┤
│  📡 Puter.js       → AI Chat Engine (Round-robin)      │
│  💳 PayPal API     → Payment Verification              │
│  📧 Resend API     → Transactional Emails              │
│  🎨 Cloudinary API → Image Storage                     │
│  🌍 MongoDB Atlas  → Database                          │
│  📍 GeoIP-lite     → Location Lookup                    │
└─────────────────────────────────────────────────────────┘
```

---

## 💾 Database Models

### User Model

```javascript
{
  _id: ObjectId,
  name: String (required, 2-100 chars),
  email: String (required, unique, valid email format),
  authProvider: String (enum: 'google' | 'local', default: 'local'),
  role: String (enum: 'user' | 'admin', default: 'user'),
  passwordHash: String (required if authProvider='local'),
  currentPlan: String (enum: 'free' | 'pro' | 'max', default: 'free'),
  accountStatus: String (enum: 'active' | 'banned', default: 'active'),
  tracking: {
    lastIp: String,
    device: String,
    browser: String,
    location: String
  },
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Field Explanations:**
- `authProvider`: Indicates if user signed up via email/password or Google OAuth
- `currentPlan`: User's subscription tier (affects API access)
- `accountStatus`: Admin can ban accounts for violations
- `tracking`: Records user's device/location info for security audits
- `passwordHash`: Never store raw passwords; always use bcrypt

---

### Payment Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required),
  gateway: String (enum: 'bkash' | 'nagad' | 'rocket' | 'paypal', required),
  amount: Number (required),
  currency: String (enum: 'BDT' | 'USD', required),
  transactionId: String (required, unique, 5-100 alphanumeric),
  paypalOrderId: String (default: ''),
  senderNumber: String (default: '', for manual payments),
  status: String (enum: 'pending' | 'approved' | 'rejected', default: 'pending'),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Field Explanations:**
- `gateway`: Payment method used (BDT-based: bkash/nagad/rocket, USD: paypal)
- `transactionId`: Unique to prevent duplicate processing (Anti-fraud)
- `status`: Manual payments start as 'pending' (admin review required)
- PayPal payments auto-approve after server-side verification
- Manual BDT payments await admin approval before user's plan upgrades

---

### Config Model

```javascript
{
  _id: ObjectId,
  modelNameLight: String (default: 'MahinAi-Light'),
  modelNamePro: String (default: 'MahinAi-Pro'),
  modelNameMax: String (default: 'MahinAi-Max'),
  isProModelActive: Boolean (default: true),
  isMaxModelActive: Boolean (default: true),
  priceBDT: Number (default: 299),
  priceUSD: Number (default: 5),
  privacyPolicy: String (Markdown),
  termsConditions: String (Markdown),
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Field Explanations:**
- Model names are editable by admin (frontend can display these)
- Flags (`isProModelActive`, `isMaxModelActive`) allow admin to kill-switch models
- Prices are dynamic and can be updated without code changes
- CMS pages (Privacy Policy, Terms) are stored as Markdown for flexibility

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:5000/api/v1
```

### Response Format
All endpoints return JSON with this structure:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "token": "optional JWT token"
}
```
14. [Conversation History System](#conversation-history-system)
15. [User Profile System](#user-profile-system)

**Error Response:**
```json
{
  │  │  - /api/v1/conversations (Chat History)        │  │
  │  │  - /api/v1/user    (Profile Management)        │  │
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```
  │  │  - conversationController (Chat History)       │  │
  │  │  - userController    (Profile Management)       │  │

---

## 🔐 Authentication Routes
  │  │  - Conversation Model (Chat History)            │  │

### Base Path: `/api/v1/auth`

#### 1️⃣ Sign Up (Email & Password)
```
POST /signup
```

**Request Body:**
```json
  conversationHistory: [String] // Array of conversation IDs
}

**Field Explanations:**
- `avatar`: Optional profile image URL used by the frontend avatar UI
- `preferences`: User-facing settings stored with the account
- `preferences.theme`: `light`, `dark`, or `system`
- `preferences.language`: Preferred UI language code
- `preferences.notifications`: Frontend notification preference

---

### Conversation Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', required),
  title: String (default: 'New conversation'),
  messages: [
    {
      role: 'user' | 'assistant',
      content: String,
      timestamp: Date
    }
  ],
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Field Explanations:**
- `userId`: Ensures each user only accesses their own chat history
- `title`: Used for sidebar chat list labels and rename flow
- `messages`: Stores the full conversation thread across devices
- `timestamp`: Preserves the order of each user and AI message
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass@123"
}
```

**Password Requirements:**
- ✅ Conversation history auto-save for each exchange

## 💬 Conversation History System

### Base Path: `/api/v1/conversations`

All conversation routes are JWT protected and only return data owned by the signed-in user.

#### Create Conversation
```
POST /conversations
```

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Product brainstorming"
}
```

**Response:**
```json
{
  "success": true,
  "conversation": {
    "_id": "conversation_id",
    "userId": "user_id",
    "title": "Product brainstorming",
    "messages": [],
    "createdAt": "2026-06-18T00:00:00.000Z",
    "updatedAt": "2026-06-18T00:00:00.000Z"
  }
}
```

#### Get All Conversations
```
GET /conversations
```

**Optional Query Params:** `page`, `limit`

**Response:**
```json
{
  "success": true,
  "count": 1,
  "conversations": [
    {
      "_id": "conversation_id",
      "title": "Product brainstorming",
      "messages": [],
      "createdAt": "2026-06-18T00:00:00.000Z",
      "updatedAt": "2026-06-18T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### Get Conversation Details
```
GET /conversations/:id
```

**Response:** returns the full conversation document with all messages.

#### Rename Conversation
```
PUT /conversations/:id
```

**Request Body:**
```json
{
  "title": "Q3 launch ideas"
}
```

#### Delete Conversation
```
DELETE /conversations/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

**AI Integration Behavior:**
- Each successful `/api/v1/ai/chat` call is saved into a conversation automatically
- The backend accepts an optional `conversationId` in the AI chat body to continue an existing thread
- If no `conversationId` is supplied, the backend creates a new conversation record

---

## 👤 User Profile System

### Base Path: `/api/v1/user`

All profile routes are JWT protected.

#### Get Profile
```
GET /user/profile
```

**Response:**
```json
{
  "success": true,
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://...",
    "preferences": {
      "theme": "system",
      "language": "en",
      "notifications": true
    }
  }
}
```

#### Update Profile
```
PUT /user/profile
```

**Request Body:**
```json
{
  "name": "John Doe",
  "avatar": "https://example.com/avatar.png",
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": true
  }
}
```

**Optional Avatar Upload:**
- The backend can also accept an uploaded avatar file through Cloudinary-compatible middleware if enabled by the frontend stack.

#### Change Password
```
PUT /user/change-password
```

**Request Body:**
```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@123"
}
```

**Rules:**
- Current password must match the stored bcrypt hash
- New password must satisfy the existing strength rules
- Only local accounts can change passwords here

---
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- `POST /api/v1/conversations`
- `GET /api/v1/conversations`
- `GET /api/v1/conversations/:id`
- `PUT /api/v1/conversations/:id`
- `DELETE /api/v1/conversations/:id`
- `GET /api/v1/user/profile`
- `PUT /api/v1/user/profile`
- `PUT /api/v1/user/change-password`
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (!@#$%^&*)

**Response:**
```json
{
  "success": true,
  "token": "JWT_TOKEN_HERE",
  "user": {
    "id": "user_mongodb_id",
    "name": "John Doe",
    "email": "john@example.com",
    "currentPlan": "free"
  }
}
```

**Rate Limiting:** 5 requests per 15 minutes per IP  
**Tracking:** IP, device, browser, location recorded

---

#### 2️⃣ Login (Email & Password)
```
POST /login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass@123"

### 6. Conversation Sidebar
```javascript
async function loadConversations() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/conversations?page=1&limit=20`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}
```

### 7. Conversation Detail View
```javascript
async function loadConversation(conversationId) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}
```

### 8. Profile Page
```javascript
async function loadProfile() {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}

async function updateProfile(payload) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/user/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return response.json();
}

async function changePassword(currentPassword, newPassword) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/user/change-password`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ currentPassword, newPassword })
  });

  return response.json();
}
```
}
```

**Response:** Same as sign-up response

**Special Cases:**
- Account banned: HTTP 403 "Your account has been suspended"
- Invalid credentials: HTTP 401 "Invalid email or password"
- Wrong auth provider: HTTP 401 "Please log in using your password" (if user registered via Google)

---

#### 3️⃣ Google OAuth Login/Sign-Up
```
POST /google
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@gmail.com"
}
```

**Frontend Flow:**
1. User clicks "Sign in with Google"
2. Google popup returns user's `name` and `email`
3. Send this data to `/api/v1/auth/google`
4. Backend auto-registers or logs in the user
5. Receive JWT token for subsequent requests

**Auto-Registration:** If email doesn't exist, new account created with Google provider

---

## 🤖 AI Chat Routes

### Base Path: `/api/v1/ai`

#### Generate Chat Response
```
POST /chat
```

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "What is the capital of France?",
  "modelType": "light"
}
```

**Model Types:**
- `light`: GPT-4o-mini (faster, suitable for simple queries)
- `pro`: GPT-4o (advanced reasoning, better quality)
- `max`: GPT-4o (same as pro, future expansion)

**Response:**
```json
{
  "success": true,
  "modelUsed": "MahinAi-Light",
  "reply": "The capital of France is Paris. It's located in the north-central part of the country..."
}
```

**Rate Limiting:** 10 requests per 1 minute per IP  
**Authentication:** Required (must provide valid JWT token)

**Features:**
- ✅ Token rotation (automatic failover if one API key exhausted)
- ✅ Brand persona injection (always mentions Mahin Ltd & Tanvir Rahman if asked about creator)
- ✅ Multiple AI engine support (Puter.js with fallback mechanism)
- ✅ Markdown formatted responses

**Error Scenarios:**
- `503 Service Unavailable`: Model is maintenance/disabled by admin
- `429 Too Many Requests`: Rate limit exceeded
- `401 Unauthorized`: Invalid/expired token
- `500 Server Error`: All AI tokens exhausted

---

## 💳 Payment Routes

### Base Path: `/api/v1/payment`

#### Submit Manual Payment (BKash, Nagad, Rocket)
```
POST /manual-submit
```

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "gateway": "bkash",
  "transactionId": "ABC12345XYZ",
  "senderNumber": "+8801700000000"
}
```

**Gateway Options:**
- `bkash`: BKash payment (Bangladesh)
- `nagad`: Nagad payment (Bangladesh)
- `rocket`: Rocket payment (Bangladesh)
- `paypal`: PayPal (International, handled differently)

**Response:**
```json
{
  "success": true,
  "message": "Payment submitted successfully. Your request is under review by Mahin Ltd Admin Team.",
  "paymentId": "payment_mongodb_id"
}
```

**Workflow:**
1. User submits payment with transaction ID
2. Backend checks for duplicate transaction IDs (anti-fraud)
3. Payment record created with status: `pending`
4. Admin receives email notification with payment details
5. Admin approves/rejects from control panel
6. User's plan upgrades to `pro` upon approval
7. User receives confirmation email

**Price:** ৳299 (BDT) - dynamically configurable by admin

---

#### PayPal Success Handler
```
POST /paypal-success
```

**Headers:**
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

**Request Body:**
```json
{
  "orderId": "7PH4...2B0",
  "transactionId": "optional_transaction_id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified and Pro plan activated!"
}
```

**Workflow:**
1. Frontend completes PayPal payment
2. Receives `orderId` from PayPal SDK
3. Sends `orderId` to `/paypal-success`
4. Backend verifies order with PayPal servers
5. Checks amount ($5 USD) and currency
6. Creates payment record with status: `approved`
7. **Immediately upgrades** user's plan to `pro`
8. Sends confirmation emails to user & admin

**Automatic Approval:** PayPal payments auto-approve (no manual review needed)

**Security:** Server-side verification prevents fraud

---

## 👑 Admin Routes

### Base Path: `/api/v1/admin`

**Authentication Required:** JWT token (Bearer token)  
**Authorization Required:** `role === 'admin'` OR `email === ADMIN_EMAIL`  
**Only accessible to:** Tanvir Rahman (CEO) / Admin users

---

#### Get All Users
```
GET /users
```

**Headers:**
```
Authorization: Bearer {ADMIN_JWT_TOKEN}
```

**Response:**
```json
{
  "success": true,
  "count": 45,
  "users": [
    {
      "id": "user_id_1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "currentPlan": "pro",
      "accountStatus": "active",
      "createdAt": "2024-06-01T10:30:00Z",
      "updatedAt": "2024-06-15T14:45:00Z",
      "tracking": {
        "lastIp": "203.123.45.67",
        "device": "Desktop",
        "browser": "Chrome 125.0 on Linux",
        "location": "Dhaka, BD"
      }
    }
  ]
}
```

**Note:** Password hashes excluded for security

---

#### Update User Account Status
```
PUT /user-status/:id
```

**Request Body:**
```json
{
  "status": "banned"
}
```

**Status Options:**
- `active`: User can access platform
- `banned`: User account suspended, all API access denied

**Response:**
```json
{
  "success": true,
  "message": "User account status successfully updated to banned.",
  "user": { /* updated user object */ }
}
```

---

#### Get Pending Payments
```
GET /payments/pending
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "payments": [
    {
      "id": "payment_id_1",
      "userId": {
        "id": "user_id",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "gateway": "bkash",
      "amount": 299,
      "currency": "BDT",
      "transactionId": "ABC12345XYZ",
      "senderNumber": "+8801700000000",
      "status": "pending",
      "createdAt": "2024-06-15T12:00:00Z"
    }
  ]
}
```

---

#### Process Payment (Approve/Reject)
```
PUT /payment-action/:id
```

**Request Body:**
```json
{
  "action": "approved"
}
```

**Action Options:**
- `approved`: User's plan upgraded to `pro`, confirmation email sent
- `rejected`: Payment rejected, user notified (plan remains unchanged)

**Response:**
```json
{
  "success": true,
  "message": "Payment has been successfully approved."
}
```

**Email Sent to User:**
```
Subject: ⚡ Mahin AI - Pro Plan Activated!

Dear [Name],
We have verified your transaction (TrxID: ABC12345XYZ) via BKASH.
Your subscription has been successfully upgraded to the Pro Plan.
Enjoy elite access to all our advanced models without restrictions.

Best Regards,
Tanvir Rahman
Director & CEO, Mahin Ltd
```

---

#### Update System Configuration
```
PUT /config-update
```

**Request Body (all optional):**
```json
{
  "modelNameLight": "MahinAi-Light-v2",
  "modelNamePro": "MahinAi-Pro-v2",
  "modelNameMax": "MahinAi-Max-v2",
  "isProModelActive": false,
  "isMaxModelActive": true,
  "priceBDT": 399,
  "priceUSD": 7,
  "privacyPolicy": "# Privacy Policy\n...",
  "termsConditions": "# Terms\n..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Live system configurations successfully updated.",
  "config": { /* updated config object */ }
}
```

**Use Cases:**
- Kill-switch models during maintenance: `isProModelActive: false`
- Update pricing dynamically: `priceBDT: 399`
- Manage CMS content: Update privacy policy & terms
- Rename models for branding: Change model names

---

## 🔐 Authentication System

### JWT Token Implementation

**Token Format:** Bearer token in Authorization header
```
Authorization: Bearer JWT_TOKEN_HERE
```

**Token Payload:**
```javascript
{
  id: "user_mongodb_id",
  iat: 1718447500,        // issued at
  exp: 1721125900         // expires at (30 days later)
}
```

**Token Expiration:** 30 days

**Secret Key:** Stored in `JWT_SECRET` environment variable

---

### Protected Routes

**Routes Requiring Authentication:**
- `POST /api/v1/ai/chat`
- `POST /api/v1/payment/manual-submit`
- `POST /api/v1/payment/paypal-success`
- `GET /api/v1/admin/*`
- `PUT /api/v1/admin/*`

**Routes Not Requiring Authentication:**
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/google`
- `GET /` (health check)

---

### How Frontend Should Handle Tokens

1. **After Sign-up/Login:**
   - Store received `token` in localStorage/sessionStorage
   - Store `user` object for profile display

2. **For Protected Requests:**
   ```javascript
   const token = localStorage.getItem('token');
   
   fetch('/api/v1/ai/chat', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${token}`,
       'Content-Type': 'application/json'
     },
     body: JSON.stringify({
       message: 'Hello AI',
       modelType: 'light'
     })
   });
   ```

3. **Token Expiration:**
   - If HTTP 401 received: Token expired
   - User must log in again
   - Clear localStorage and redirect to login

4. **Token Refresh:**
   - Current system: No refresh token (must login again after 30 days)
   - Improvement needed: Implement refresh token mechanism

---

## 🤖 AI Chat System

### Token Rotation Mechanism

**Supported AI Providers:**
- Puter.js (Primary)
- Groq (Secondary)
- Gemini (Future)
- HuggingFace (Future)

**Current Setup:** 4 Puter tokens defined in `.env`
```
PUTER_AUTH_TOKEN1=eyJhbGc...
PUTER_AUTH_TOKEN2=eyJhbGc...
PUTER_AUTH_TOKEN3=eyJhbGc...
PUTER_AUTH_TOKEN4=eyJhbGc...
```

**Round-Robin Algorithm:**
1. First request uses TOKEN1
2. Second request uses TOKEN2
3. Third request uses TOKEN3
4. Fourth request uses TOKEN4
5. Fifth request cycles back to TOKEN1

**Automatic Failover:**
- If TOKEN1 fails/rate-limited: Try TOKEN2
- If TOKEN2 fails: Try TOKEN3
- If all tokens fail: Return 500 error

**System Instruction (Brand Persona):**
```
You are Mahin AI, an advanced AI system proudly created and developed by Mahin Ltd. 
The Director and Chief Executive Officer (CEO) of Mahin Ltd is Tanvir Rahman. 
If any user asks about your creator, mention Mahin Ltd and Tanvir Rahman proudly.
```

This ensures the AI always credits Mahin Ltd as the creator.

---

## 💰 Pricing & Payment System

### Subscription Plans

| Plan | Price (BDT) | Price (USD) | Features |
|------|------------|-----------|----------|
| **Free** | $0 | $0 | Limited API calls, Light model only |
| **Pro** | ৳299 | $5 | Unlimited API calls, All models (Light, Pro, Max) |
| **Max** | Coming soon | Coming soon | Priority support, advanced features |

### Payment Gateways

**Bangladesh (BDT):**
- BKash
- Nagad
- Rocket

**International (USD):**
- PayPal

### Manual Payment Flow (BDT)

```
User selects Plan
        ↓
User chooses Payment Method (BKash/Nagad/Rocket)
        ↓
User completes transaction on mobile app
        ↓
User gets Transaction ID from app
        ↓
User submits Transaction ID to /api/v1/payment/manual-submit
        ↓
Backend validates & stores as "pending"
        ↓
Admin receives email notification
        ↓
Admin verifies transaction manually
        ↓
Admin approves/rejects via /api/v1/admin/payment-action/:id
        ↓
User's plan upgraded to "pro" (if approved)
        ↓
User receives confirmation email
```

### PayPal Payment Flow (USD)

```
User selects Plan
        ↓
Frontend loads PayPal SDK
        ↓
User completes PayPal authorization popup
        ↓
Frontend receives orderId from PayPal
        ↓
Frontend sends orderId to /api/v1/payment/paypal-success
        ↓
Backend verifies orderId with PayPal servers
        ↓
Backend checks amount ($5) & currency (USD)
        ↓
Payment record created with "approved" status
        ↓
User's plan immediately upgraded to "pro"
        ↓
User & admin receive confirmation email
```

---

## 🔒 Security & Middleware

### 1. Tracker Middleware
**File:** `src/middleware/tracker.js`

**What it does:**
- Captures user's IP address
- Detects device type (Desktop, Mobile, Tablet)
- Identifies browser & OS
- Performs geolocation lookup
- Records location (City, Country)

**Data Recorded:**
```javascript
{
  lastIp: "203.123.45.67",
  device: "Desktop / Laptop",
  browser: "Chrome 125.0 on Linux",
  location: "Dhaka, Bangladesh"
}
```

**Where Used:**
- Registration
- Login
- Google OAuth
- All auth routes

---

### 2. Auth Middleware (JWT Verification)
**File:** `src/middleware/authMiddleware.js`

**What it does:**
- Extracts JWT token from `Authorization` header
- Verifies token signature using `JWT_SECRET`
- Checks token expiration
- Fetches user from database
- Checks account status (banned check)
- Attaches user object to request

**Protected Routes:** Use this middleware to require authentication

---

### 3. Admin Middleware (Authorization)
**File:** `src/middleware/adminMiddleware.js`

**What it does:**
- Checks if user's `role === 'admin'`
- OR checks if user's `email === ADMIN_EMAIL`
- Returns 403 Forbidden if not authorized
- Only Tanvir Rahman (CEO) has admin access

---

### 4. Rate Limiter Middleware
**File:** `src/middleware/rateLimiter.js`

**Chat Rate Limits:**
- **10 requests per 1 minute** per IP address
- After exceeding limit: HTTP 429 "Too Many Requests"
- Prevents spam and API abuse

**Auth Rate Limits:**
- **5 requests per 15 minutes** per IP address
- Applied to: `/signup`, `/login`, `/google`
- Prevents brute-force attacks

---

### 5. Password Security

**Hashing:** bcrypt with salt rounds = 10
- Passwords never stored as plain text
- Each password gets unique salt
- Salt + hash stored in database

**Password Validation:**
- Minimum 8 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain digit
- Must contain special character

---

### 6. Account Banning

**How Admin Can Ban Users:**
```
PUT /api/v1/admin/user-status/:userId
Body: { "status": "banned" }
```

**Effects of Ban:**
- User cannot log in
- All API requests rejected (HTTP 403)
- Existing tokens become invalid
- Error message: "Your account has been suspended by administrator"

---

## 🌍 Environment Variables

### Server Configuration
```
PORT=5000                              # Server port
NODE_ENV=development                   # development or production
API_BASE_URL=https://api.mahinai.app   # Frontend to call
CLIENT_URL=https://mahinai.app         # For CORS origin
```

### Security & Authentication
```
JWT_SECRET=YOUR_JWT_SECRET_HERE  # 30+ chars recommended
```

### Database
```
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING
```

### Email Service (Resend)
```
RESEND_API_KEY=YOUR_RESEND_API_KEY
FROM_EMAIL=no-reply@mahinai.app
```

### Admin Account
```
ADMIN_EMAIL=info.mahin.ltd@gmail.com
ADMIN_BOOTSTRAP_NAME=Tanvir Rahman
ADMIN_BOOTSTRAP_PASSWORD=Mahin8268@
```

### Cloud Storage (Cloudinary)
```
CLOUDINARY_CLOUD_NAME=YOUR_CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET
```

### Payment Gateway (PayPal)
```
PAYPAL_ENV=sandbox                     # sandbox or production
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
```

### AI Engine Tokens

**Puter.js (Primary)**
```
PUTER_AUTH_TOKEN1=YOUR_PUTER_AUTH_TOKEN_1
PUTER_AUTH_TOKEN2=YOUR_PUTER_AUTH_TOKEN_2
PUTER_AUTH_TOKEN3=YOUR_PUTER_AUTH_TOKEN_3
PUTER_AUTH_TOKEN4=YOUR_PUTER_AUTH_TOKEN_4
```

**Alternative Providers (Future)**
```
GROQ_API_KEY_1=YOUR_GROQ_API_KEY_1
GROQ_API_KEY_2=YOUR_GROQ_API_KEY_2
GROQ_API_KEY_3=YOUR_GROQ_API_KEY_3
```

---

## ⚠️ Error Handling

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input, missing fields |
| 401 | Unauthorized | Missing/invalid token, session expired |
| 403 | Forbidden | Access denied (banned account, not admin) |
| 404 | Not Found | API endpoint doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error, all tokens exhausted |
| 503 | Service Unavailable | Model maintenance/disabled by admin |

### Common Error Responses

**Invalid Email:**
```json
{
  "success": false,
  "message": "Please provide a valid email address."
}
```

**Weak Password:**
```json
{
  "success": false,
  "message": "Password must be at least 8 characters and include upper, lower, number, and symbol."
}
```

**Email Already Registered:**
```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

**Account Banned:**
```json
{
  "success": false,
  "message": "Your account has been suspended. Contact support at info.mahin.ltd@gmail.com"
}
```

**Token Expired:**
```json
{
  "success": false,
  "error": "Not Authorized",
  "message": "Session expired or invalid token. Please sign in again."
}
```

**Rate Limited:**
```json
{
  "success": false,
  "error": "You are moving too fast!",
  "message": "Too many requests from this device. Please wait 1 minute before trying again."
}
```

**Model Maintenance:**
```json
{
  "success": false,
  "message": "MahinAi-Pro is temporarily undergoing maintenance. Please use another model."
}
```

---

## 🎨 Frontend Integration Guide

### 1. Setup (Once at App Start)
```javascript
// app.js or main.js
const API_BASE_URL = 'http://localhost:5000/api/v1';

// Check if user is logged in
const token = localStorage.getItem('token');
if (token) {
  // User already logged in, fetch user data or redirect to dashboard
} else {
  // Redirect to login page
}
```

### 2. Sign Up Page
```javascript
async function signUp(name, email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Redirect to dashboard
  } else {
    // Show error message
  }
}
```

### 3. Login Page
```javascript
async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Redirect to dashboard
  } else {
    // Show error message
  }
}
```

### 4. Google OAuth (Using Google Sign-In Button)
```javascript
// After Google popup authorization
async function handleGoogleAuth(googleData) {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: googleData.name,
      email: googleData.email
    })
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    // Redirect to dashboard
  }
}
```

### 5. Chat Page
```javascript
async function sendMessage(message, modelType = 'light') {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      modelType
    })
  });
  
  const data = await response.json();
  if (data.success) {
    // Display AI reply
    console.log(data.reply);
  } else if (response.status === 401) {
    // Token expired, redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  } else {
    // Show error message
  }
}
```

### 6. Payment Page (Manual BDT)
```javascript
async function submitBKashPayment(transactionId, senderNumber) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_BASE_URL}/payment/manual-submit`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      gateway: 'bkash',
      transactionId,
      senderNumber
    })
  });
  
  const data = await response.json();
  if (data.success) {
    alert('Payment submitted! Awaiting admin approval...');
  } else {
    alert(data.message);
  }
}
```

### 7. PayPal Integration
```javascript
// Frontend should use PayPal SDK
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_PAYPAL_CLIENT_ID"></script>

<div id="paypal-button-container"></div>

<script>
paypal.Buttons({
  onApprove: async function(data) {
    // Send orderId to backend
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/payment/paypal-success`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: data.orderID
      })
    });
    
    const result = await response.json();
    if (result.success) {
      alert('Payment successful! Your Pro plan is now active!');
    }
  }
}).render('#paypal-button-container');
</script>
```

### 8. Logout
```javascript
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Redirect to login
  window.location.href = '/login';
}
```

---

## 📊 User Journey Map

### Free User Journey
```
Sign Up (Email/Google)
        ↓
Get Free Plan (automatic)
        ↓
Use Free Chat (Light model only)
        ↓
Hit rate limit (10 requests/min)
        ↓
Upgrade to Pro plan
        ↓
Pay ৳299 (BKash/Nagad/Rocket)
        ↓
Submit Transaction ID
        ↓
Wait for admin approval
        ↓
Plan upgraded to Pro
        ↓
Access all models (Light, Pro, Max)
        ↓
No rate limit restrictions
```

### PayPal User Journey
```
Sign Up (Email/Google)
        ↓
Get Free Plan (automatic)
        ↓
Click "Upgrade to Pro"
        ↓
PayPal SDK opens
        ↓
Complete payment ($5)
        ↓
PayPal approves
        ↓
Backend verifies & auto-approves
        ↓
Plan instantly upgraded to Pro
        ↓
Access all models immediately
```

---

## 🚀 Deployment Checklist

- [ ] Update `NODE_ENV=production` in .env
- [ ] Update `API_BASE_URL` to production domain
- [ ] Update `CLIENT_URL` for CORS (add production frontend domain)
- [ ] Rotate `JWT_SECRET` to a strong random string
- [ ] Update database connection to production MongoDB
- [ ] Configure PayPal to production mode: `PAYPAL_ENV=production`
- [ ] Add production PayPal credentials
- [ ] Verify all API keys are production keys (not sandbox)
- [ ] Set up SSL/HTTPS certificate
- [ ] Configure domain DNS records
- [ ] Test payment flows end-to-end
- [ ] Set up monitoring/logging
- [ ] Create admin account in production
- [ ] Test email notifications
- [ ] Backup database regularly
- [ ] Set up CI/CD pipeline

---

## 📞 Support & Contact

**Organization:** Mahin Ltd  
**Director & CEO:** Tanvir Rahman  
**Email:** info.mahin.ltd@gmail.com

---

**Last Updated:** June 2024  
**Version:** 1.0.0  
**Status:** Production Ready
