# AgoraTask API Requirements

This document outlines the RESTful API endpoints required to support the frontend features built for AgoraTask. Currently, the frontend uses in-memory mock data. Implementing these endpoints will make the application fully functional.

---

## 1. Authentication & User Management

Endpoints to handle user login, session validation, and profile updates.

### `POST /api/auth/login`
- **Description:** Authenticates a user (Customer, Provider, or Admin).
- **Request Body:** `{ "email": "...", "password": "..." }`
- **Response:** JWT token and user object `{ "id", "name", "email", "role", "profileImage" }`.

### `GET /api/auth/me`
- **Description:** Fetches the currently authenticated user's details using the JWT token.
- **Response:** User object.

### `PUT /api/users/profile`
- **Description:** Updates the user's display name and profile image.
- **Request (Multipart/Form-Data or JSON):** `{ "name": "...", "profileImage": "base64/url" }`
- **Response:** Updated user object.

### `PUT /api/users/password`
- **Description:** Updates the user's password.
- **Request Body:** `{ "currentPassword": "...", "newPassword": "..." }`
- **Response:** Success/Failure status.

---

## 2. Admin Dashboard - Service Types

Endpoints for Admins to manage the categories of services available on the platform.

### `GET /api/service-types`
- **Description:** Returns a list of all service types. (Publicly accessible for customers to view, but admins see all including inactive).
- **Response:** Array of `{ "id", "name", "description", "icon", "color", "active" }`.

### `POST /api/service-types`
- **Description:** Creates a new service type.
- **Request Body:** `{ "name", "description", "icon", "color", "active" }`
- **Response:** Created service type object.

### `PUT /api/service-types/:id`
- **Description:** Updates an existing service type details.
- **Request Body:** `{ "name", "description", "icon", "color" }`
- **Response:** Updated service type object.

### `PATCH /api/service-types/:id/status`
- **Description:** Toggles the active/inactive status of a service type.
- **Request Body:** `{ "active": boolean }`
- **Response:** Updated service type object.

### `DELETE /api/service-types/:id`
- **Description:** Deletes a service type.
- **Response:** Success/Failure status.

---

## 3. Admin Dashboard - Platform Management

Endpoints for Admins to monitor platform health and approve providers.

### `GET /api/admin/dashboard-stats`
- **Description:** Fetches high-level metrics for the admin overview.
- **Response:** `{ "totalUsers", "activeProviders", "totalBookings", "platformRevenue" }`

### `GET /api/admin/pending-providers`
- **Description:** Fetches a list of newly registered providers awaiting manual admin approval.
- **Response:** Array of provider application details `{ "id", "businessName", "category", "location", "status" }`.

### `POST /api/admin/providers/:id/approve`
- **Description:** Approves a pending provider.
- **Response:** Success status.

### `POST /api/admin/providers/:id/reject`
- **Description:** Rejects a pending provider.
- **Response:** Success status.

---

## 4. Provider Dashboard

Endpoints specific to service providers for managing their business.

### `GET /api/provider/dashboard-stats`
- **Description:** Fetches metrics for the specific provider.
- **Response:** `{ "monthlyEarnings", "activeBookings", "overallRating" }`

### `GET /api/provider/booking-requests`
- **Description:** Fetches pending booking requests assigned to this provider.
- **Response:** Array of requests `{ "id", "serviceId", "customerName", "scheduledTime", "status" }`.

### `POST /api/bookings/:id/accept`
- **Description:** Provider accepts a pending booking request.
- **Response:** Updated booking object.

### `POST /api/bookings/:id/decline`
- **Description:** Provider declines a pending booking request.
- **Response:** Updated booking object.

---

## 5. Messaging & Inbox

Endpoints to support direct messaging between Customers, Providers, and Admins.

### `GET /api/messages/conversations`
- **Description:** Fetches all active conversations for the logged-in user.
- **Response:** Array of conversations including the `otherUser` details, `lastMessage`, and `unreadCount`.

### `GET /api/messages/conversations/:conversationId`
- **Description:** Fetches the full message history for a specific conversation.
- **Response:** Array of message objects `{ "id", "from", "to", "text", "timestamp", "read" }`.

### `POST /api/messages`
- **Description:** Sends a new message to another user.
- **Request Body:** `{ "toUserId": "...", "text": "..." }`
- **Response:** Created message object.

### `PATCH /api/messages/conversations/:conversationId/read`
- **Description:** Marks all unread messages in a specific conversation as read by the current user.
- **Response:** Success status.
