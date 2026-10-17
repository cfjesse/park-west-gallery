# Park West Gallery — Artwork Inventory & Gallery System

A full-stack, enterprise-grade artwork inventory and gallery management application built for **Park West Gallery**. The platform provides role-based access control (RBAC) tailored for Inventory Specialists, Accountants, and Gallery Customers, backed by a high-performance Express REST API and an Angular 22 frontend.

---

## Table of Contents

- [Park West Gallery — Artwork Inventory \& Gallery System](#park-west-gallery--artwork-inventory--gallery-system)
  - [Table of Contents](#table-of-contents)
  - [Overview \& Key Features](#overview--key-features)
  - [Architecture \& Tech Stack](#architecture--tech-stack)
  - [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
  - [Demo Credentials](#demo-credentials)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [1. Backend Setup (`node-api`)](#1-backend-setup-node-api)
    - [2. Frontend Setup (`ui`)](#2-frontend-setup-ui)
  - [API Documentation \& Endpoints](#api-documentation--endpoints)
    - [Core Routes](#core-routes)
      - [Authentication](#authentication)
      - [Inventory Management](#inventory-management)
      - [Health Check](#health-check)
  - [Environment Configuration](#environment-configuration)
    - [Backend (`node-api/.env`)](#backend-node-apienv)
  - [Testing](#testing)
    - [Integration \& API Test Suite](#integration--api-test-suite)
    - [Frontend Unit Tests](#frontend-unit-tests)
  - [Deployment](#deployment)

---

## Overview & Key Features

- **Fine Art Catalog Management**: Complete cataloging workflow for art pieces, tracking artist name, title, medium, art movement/style, dimensions (inches), price, discount percentage, and acquisition status.
- **Role-Tailored Dashboards**:
  - **Inventory Specialist**: Full CRUD access to create new artwork entries, update catalog specifications, modify pricing, and delete archived records.
  - **Accountant**: Financial oversight with permissions to adjust valuations, configure promotional discounts (up to 30%), and update inventory statuses.
  - **Customer / Collector**: Interactive gallery catalog to browse, filter by medium/style/artist, view detailed specs, and submit purchase requests.
- **Dual-Engine Persistence**: Designed with [Turso (LibSQL)](https://turso.tech/) integration alongside an automated in-memory SQLite query fallback, guaranteeing zero-configuration local development and rapid serverless execution.
- **Interactive OpenAPI/Swagger**: Built-in Swagger UI documentation with JWT authentication testing capabilities.
- **Serverless Ready**: Pre-configured for Netlify Functions with inline esbuild bundling and rewrite proxies.

---

## Architecture & Tech Stack

graph TD
    Client[Web Browser / Client]
    
    subgraph Frontend [Angular 22 SPA (/ui)]
        AuthGuard[Role & Auth Guards]
        Interceptor[JWT Auth Interceptor]
        UIComp[Standalone Components & NG-ZORRO]
    end

    subgraph Netlify [Netlify Cloud Platform]
        Redirects["API Rewrite Proxy (/api/*)"]
        FunctionHandler["Netlify Function (/netlify/functions/api)"]
    end

    subgraph Backend [Express 5 API (/node-api)]
        AuthMiddleware[JWT & RBAC Middleware]
        SwaggerDocs["OpenAPI / Swagger (/api/docs)"]
        Routes[Auth & Inventory Routes]
        DBLayer[Turso LibSQL Client / In-Memory Fallback]
    end

    Client -->|Loads UI| Frontend
    Frontend -->|HTTP Requests| Redirects
    Redirects --> FunctionHandler
    FunctionHandler --> Backend
    Client -->|Local Dev Direct| Backend
    Backend --> AuthMiddleware
    AuthMiddleware --> Routes
    Routes --> DBLayer
```

### Frontend (`/ui`)
- **Framework**: [Angular 22](https://angular.dev/) (Standalone Components, Signals, Reactive Forms, `inject()` API)
- **UI Library**: [NG-ZORRO (Ant Design for Angular)](https://ng.ant.design/)
- **Styling**: SCSS & Less custom styling
- **Testing**: [Vitest](https://vitest.dev/) with jsdom

### Backend (`/node-api`)
- **Runtime**: Node.js with [Express 5](https://expressjs.com/)
- **Security**: [Helmet](https://helmetjs.github.io/), CORS origin validation, [bcryptjs](https://github.com/dcodeIO/bcrypt.js) password hashing, [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)
- **Database**: [@libsql/client](https://github.com/tursodatabase/libsql-client-ts) (Turso Database) + In-memory relational store
- **API Spec**: [Swagger JSDoc](https://github.com/Surnet/swagger-jsdoc) & [Swagger UI Express](https://github.com/scottie1984/swagger-ui-express)
- **Serverless**: [serverless-http](https://github.com/dougmoscrop/serverless-http)

---

## Project Structure

```text
park-west/
├── netlify.toml               # Netlify build, redirect, and function configurations
├── node-api/                  # Backend REST API service
│   ├── netlify/               # Serverless Netlify function entrypoints
│   │   └── functions/api.js   # Serverless-http wrapper around Express
│   ├── src/
│   │   ├── middleware/        # JWT verification and RBAC authorization guards
│   │   ├── routes/
│   │   │   ├── auth.js        # Authentication endpoints (login, logout)
│   │   │   └── inventory.js   # Artwork inventory CRUD & purchase workflows
│   │   ├── database.js        # LibSQL connection & in-memory SQL mock engine
│   │   ├── server.js          # Express application initialization & middleware
│   │   └── swagger.js         # OpenAPI 3.0 specifications
│   ├── test-api.js            # Comprehensive end-to-end API integration tests
│   └── package.json
└── ui/                        # Angular frontend application
    ├── src/
    │   ├── app/
    │   │   ├── guards/        # Route role protection guards
    │   │   ├── interceptors/  # Bearer token HTTP interceptor
    │   │   ├── interfaces/    # TypeScript data models and contracts
    │   │   ├── pages/         # Feature modules (welcome, login, inventory, accounting, customer)
    │   │   ├── services/      # Angular HTTP client API services & auth state
    │   │   └── shared/        # Reusable master-details components & pipes
    │   └── environments/      # Environment configuration (dev / prod endpoints)
    └── package.json
```

---

## Role-Based Access Control (RBAC)

The application enforces fine-grained permissions both in the Angular routing layer and the Express API middleware:

| Feature / Action | Customer (`customer`) | Accountant (`accountant`) | Inventory Specialist (`inventory_specialist`) |
| :--- | :---: | :---: | :---: |
| **Browse / View Gallery** |  Yes |  Yes |  Yes |
| **Filter by Medium / Style / Artist** |  Yes |  Yes |  Yes |
| **Submit Purchase Request (`pending`)** |  Yes |  No |  No |
| **Modify Pricing & Discounts** |  No |  Yes |  Yes |
| **Update Item Status (`ready_for_sale`, etc.)** |  No |  Yes |  Yes |
| **Create New Artworks** |  No |  No |  Yes |
| **Edit Art Specs (Dimensions, Media, Title)** |  No |  No |  Yes |
| **Delete Artwork Records** |  No |  No |  Yes |

---

## Demo Credentials

The database initializes with seeded accounts for testing and demonstration:

| Username | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `admin` | `password123` | `inventory_specialist` | Full administrative inventory access |
| `specialist1` | `Specialist@123` | `inventory_specialist` | Artwork catalog curator |
| `accountant1` | `Accountant@123` | `accountant` | Pricing, discount, and financial review |
| `customer1` | `Customer@123` | `customer` | Art collector purchasing experience |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18.0.0 or higher
- [npm](https://www.npmjs.com/) v9.0.0 or higher

---

### 1. Backend Setup (`node-api`)

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd node-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (optional — defaults will work out-of-the-box):
   ```bash
   # Copy or create .env in node-api/
   PORT=3000
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=8h
   NODE_ENV=development
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   The API will be available at `http://localhost:3000`.  
   Interactive Swagger API Documentation: `http://localhost:3000/api/docs`.

---

### 2. Frontend Setup (`ui`)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd ui
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Point to your local API instance:
   In `ui/src/environments/environment.ts`, configure:
   ```typescript
   export const environment = {
     production: false,
     apiBaseUrl: 'http://localhost:3000',
   };
   ```

4. Start the Angular dev server:
   ```bash
   npm start
   ```

5. Open your browser and navigate to `http://localhost:4200`.

---

## API Documentation & Endpoints

Interactive Swagger UI documentation is available at `http://localhost:3000/api/docs` (or `/api/docs` on your deployed domain).

### Core Routes

#### Authentication
- `POST /api/auth/login`: Authenticate with `username` and `password`. Returns JWT token and user profile.
- `POST /api/auth/logout`: Invalidate client session.

#### Inventory Management
- `GET /api/inventory`: Retrieve artworks with pagination and filtering query parameters:
  - `page` *(number)*, `limit` *(number)*
  - `media` *(enum: `acrylic`, `oils`, `pastel`, `charcoal`, `pencil`, `mixed_media`, `watercolor`, `gouache`, `ink`, `digital`)*
  - `style` *(enum: `abstract`, `realism`, `impressionism`, `surrealism`, `art_deco`, `expressionism`, `cubism`, `minimalism`, `pop_art`, `baroque`)*
  - `status` *(enum: `ready_for_sale`, `pending`, `sold`)*
  - `artist_name` *(string search)*
- `GET /api/inventory/:id`: Retrieve single artwork by UUID.
- `POST /api/inventory`: Create new artwork (*Requires `inventory_specialist`*).
- `PUT /api/inventory/:id`: Update artwork (*Permissions validated by role*).
- `DELETE /api/inventory/:id`: Remove artwork (*Requires `inventory_specialist`*).

#### Health Check
- `GET /api/health`: Health status and current server timestamp.

---

## Environment Configuration

### Backend (`node-api/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Local server listener port | `3000` |
| `JWT_SECRET` | Secret key for signing authorization tokens | Internal default |
| `JWT_EXPIRES_IN` | Token duration | `8h` |
| `NODE_ENV` | Environment mode (`development` / `production`) | `development` |
| `TURSO_DATABASE_URL` | *(Optional)* Turso database connection URL (`libsql:...`) | In-memory fallback |
| `TURSO_AUTH_TOKEN` | *(Optional)* Turso database auth token | In-memory fallback |
| `ALLOWED_ORIGIN` | Custom allowed CORS origin | Netlify & localhost defaults |

---

## Testing

### Integration & API Test Suite
The API includes an automated integration test script testing authentication, role-based route blocking, pagination, validation, and CRUD operations:
```bash
cd node-api
node test-api.js
```

### Frontend Unit Tests
To execute unit tests for the Angular application using Vitest:
```bash
cd ui
npm test
```

---

## Deployment

The repository is configured for deployment on **Netlify**:

- **Frontend**: Built via `ng build` in `ui/`, outputs to `dist/intenvtory-system/browser`.
- **Backend**: Managed via `netlify.toml` deploying `node-api/netlify/functions/api.js` as a serverless Netlify function with esbuild bundling.
- **Routing**: Netlify redirects rewrite `/api/*` to the serverless function, allowing unified origin requests.

Live deployments:
- **Web Application**: [https://park-west-gallery.netlify.app](https://park-west-gallery.netlify.app)
- **API Service**: [https://park-west-api.netlify.app](https://park-west-api.netlify.app)
