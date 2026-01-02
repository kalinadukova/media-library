# Media Library API

Backend service for managing user-owned image assets with AI-powered tagging, Cloudinary storage, and secure shareable
links.

---

## Tech Stack

- **Node.js + Express**
- **TypeScript**
- **PostgreSQL**
- **Prisma ORM**
- **Cloudinary** (image storage + Google AI tagging)
- **JWT Authentication**

---

## Prerequisites

- **Node.js** (v18+ recommended)
- **PostgreSQL** running with a database named: `media_library`
- **Cloudinary account** with:
-
    - Image uploads enabled
-
    - `google_tagging` turned on

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/media_library"
JWT_SECRET="your-secret-key"

CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
```

## Setup and run

```
npm install
npx prisma migrate dev
npm run dev
```

## Authorization

All asset endpoints are protected and require **JWT Bearer authentication.**
Include the access token in the request headers:

```
Authorization: Bearer <token>
```

Requests without a valid token will be rejected with `401 Unauthorized`.

## API Overview

### Authentication (User)

### `POST /api/v1/users/register`

**Request**

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response**

```json
{
  "id": "uuid",
  "email": "user@example.com"
}
```

| Status Code | Meaning                                                           |   
|-------------|-------------------------------------------------------------------|
| 201         | Successfully registered user                                      |   
| 400         | Missing/malformed information or password not being strong enough |   
| 409         | Email is already registered                                       |   
| 500         | Internal server error                                             |   

---

### `POST /api/v1/users/login`

**Request**

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response**

```json
{
  "token": "string"
}
```

| Status Code | Meaning                                                           |   
|-------------|-------------------------------------------------------------------|
| 200         | Successfully logged in                                            |   
| 400         | Missing/malformed information or password not being strong enough |   
| 401         | Invalid credentials (missing email or incorrect password)         |   
| 500         | Internal server error                                             | 

---

### Assets

### `GET /api/v1/assets`

**Returns all assets owned by the authenticated user.**

- Results are ordered by created_at DESC
- `url` is the Cloudinary delivery URL
- `asset_tags` are AI-generated during upload

**Query Params**

| Name  | Type   | Required | Default | Description                        |
|-------|--------|----------|---------|------------------------------------|
| page  | Number | No       | 1       | Page number for pagination result  |
| limit | Number | No       | 20      | Number of assets returned per page |

**Example**

```
GET /api/v1/assets?page=2&limit=10
```

**Response**

```json
{
  "result": [
    {
      "id": "uuid",
      "filename": "uploads/uploaded-file-key",
      "mime_type": "image/png",
      "size": 123456,
      "created_at": "2024-01-01T12:00:00.000Z",
      "asset_tags": [
        "cat",
        "outdoor",
        "animal"
      ],
      "url": "presigned-download-url"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 57,
    "totalPages": 3
  }
}

```

| Status Code | Meaning                     |
|-------------|-----------------------------|
| 200         | Successfully fetched assets |
| 401         | Unauthorized user           |
| 500         | Internal server error       |

---

### `POST /api/v1/assets`

**Uploads a single image asset for the authenticated user.**

- Expects multipart/form-data
- Only one file is allowed
- Automatically generates AI-based tags for the image
- Uploads file to Cloudinary

**Request body (multipart/form-data)**

```
file: <image>
```

**Response**

```json
{
  "filename": "uploads/uploaded-file-key",
  "mime_type": "image/png",
  "size": 123456,
  "created_at": "2024-01-01T12:00:00.000Z",
  "asset_tags": [
    "dog",
    "mountain",
    "carnivore"
  ]
}
```

| Status Code | Meaning                    |
|-------------|----------------------------|
| 201         | Successfully uploaded file |
| 400         | Missing/malformed file     |
| 401         | Unauthorized user          |
| 500         | Internal server error      |

---

### `POST /api/v1/assets/share`

**Creates an expiring, shareable link for an asset owned by the authenticated user.**

- Validates the asset belongs to the user
- `expirationInSeconds` is optional (defaults to 86400 = 24h)
- If the generated `presignedUrl` already exists, the endpoint updates `expiresAt`

**Request body**

```json
{
  "asset_id": "string",
  "expiration_in_seconds": 86400
}
```

**Response**

```json
{
  "url": "string",
  "expires_at": "2024-01-02T12:00:00.000Z"
}
```

| Status Code | Meaning                                 |
|-------------|-----------------------------------------|
| 200         | Share link created/updated successfully |
| 400         | Missing assetId or invalid expiration   |
| 401         | Unauthorized user                       |
| 404         | Asset not found                         |
| 500         | Internal server error                   |

---

### `DELETE /api/v1/assets/:id`

**Deletes an asset owned by the authenticated user.**

- Verifies asset ownership
- Deletes the image from Cloudinary
- Removes the asset record from the database

**Path Parameters**

```
id: string
```

**Response**

```
No response body
```

| Status Code | Meaning               |
|-------------|-----------------------|
| 204         | Asset deleted         |
| 401         | Unauthorized user     |
| 404         | Asset not found       |
| 500         | Internal server error |

---