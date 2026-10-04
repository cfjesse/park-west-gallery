const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Park West Artwork Inventory API',
      version: '1.0.0',
      description: 'REST API for managing artwork inventory with role-based access control.',
    },
    servers: [
      { url: 'http://localhost:3000/api', description: 'Local development server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        InventoryItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
            artist_name: { type: 'string', example: 'Elena Vasquez' },
            title: { type: 'string', example: 'Echoes of Light' },
            media: {
              type: 'string',
              enum: ['acrylic', 'oils', 'pastel', 'charcoal', 'pencil', 'mixed_media', 'watercolor', 'gouache', 'ink', 'digital'],
            },
            style: {
              type: 'string',
              enum: ['abstract', 'realism', 'impressionism', 'surrealism', 'art_deco', 'expressionism', 'cubism', 'minimalism', 'pop_art', 'baroque'],
            },
            width_in: { type: 'number', example: 24 },
            height_in: { type: 'number', example: 36 },
            status: { type: 'string', enum: ['sold', 'pending', 'ready_for_sale'] },
            price: { type: 'number', minimum: 1000, maximum: 20000, example: 5500 },
            discount_percent: { type: 'integer', minimum: 0, maximum: 30, nullable: true, example: 10 },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        InventoryInput: {
          type: 'object',
          required: ['artist_name', 'title', 'media', 'style', 'width_in', 'height_in', 'status', 'price'],
          properties: {
            artist_name: { type: 'string', example: 'Elena Vasquez' },
            title: { type: 'string', example: 'Echoes of Light' },
            media: {
              type: 'string',
              enum: ['acrylic', 'oils', 'pastel', 'charcoal', 'pencil', 'mixed_media', 'watercolor', 'gouache', 'ink', 'digital'],
            },
            style: {
              type: 'string',
              enum: ['abstract', 'realism', 'impressionism', 'surrealism', 'art_deco', 'expressionism', 'cubism', 'minimalism', 'pop_art', 'baroque'],
            },
            width_in: { type: 'number', minimum: 0.1, example: 24 },
            height_in: { type: 'number', minimum: 0.1, example: 36 },
            status: { type: 'string', enum: ['sold', 'pending', 'ready_for_sale'] },
            price: { type: 'number', minimum: 1000, maximum: 20000, example: 5500 },
            discount_percent: { type: 'integer', minimum: 0, maximum: 30, nullable: true, example: 10 },
          },
        },
        InventoryUpdateInput: {
          type: 'object',
          properties: {
            artist_name: { type: 'string', example: 'Elena Vasquez' },
            title: { type: 'string', example: 'Echoes of Light' },
            media: {
              type: 'string',
              enum: ['acrylic', 'oils', 'pastel', 'charcoal', 'pencil', 'mixed_media', 'watercolor', 'gouache', 'ink', 'digital'],
            },
            style: {
              type: 'string',
              enum: ['abstract', 'realism', 'impressionism', 'surrealism', 'art_deco', 'expressionism', 'cubism', 'minimalism', 'pop_art', 'baroque'],
            },
            width_in: { type: 'number', minimum: 0.1, example: 24 },
            height_in: { type: 'number', minimum: 0.1, example: 36 },
            status: { type: 'string', enum: ['sold', 'pending', 'ready_for_sale'] },
            price: { type: 'number', minimum: 1000, maximum: 20000, example: 5500 },
            discount_percent: { type: 'integer', minimum: 0, maximum: 30, nullable: true, example: 10 },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'accountant1' },
            password: { type: 'string', format: 'password', example: 'Accountant@123' },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Login successful.' },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                username: { type: 'string' },
                role: { type: 'string', enum: ['accountant', 'inventory_specialist', 'customer'] },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 200 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 50 },
            total_pages: { type: 'integer', example: 4 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Item not found.' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            errors: {
              type: 'array',
              items: { type: 'string' },
              example: ['price must be a number between 1000 and 20000.'],
            },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['System'],
          summary: 'Health check',
          responses: {
            200: {
              description: 'Server is running',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and receive a JWT token',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
          },
          responses: {
            200: {
              description: 'Successful login',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
            },
            400: { description: 'Missing credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['Auth'],
          summary: 'Logout — instructs client to discard the JWT token',
          responses: {
            200: {
              description: 'Logged out',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { message: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      '/inventory': {
        get: {
          tags: ['Inventory'],
          summary: 'List all inventory items (paginated)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Page number' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 200 }, description: 'Items per page (max 200)' },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['sold', 'pending', 'ready_for_sale'] }, description: 'Filter by status' },
            { name: 'media', in: 'query', schema: { type: 'string', enum: ['acrylic', 'oils', 'pastel', 'charcoal', 'pencil', 'mixed_media', 'watercolor', 'gouache', 'ink', 'digital'] }, description: 'Filter by media' },
            { name: 'style', in: 'query', schema: { type: 'string', enum: ['abstract', 'realism', 'impressionism', 'surrealism', 'art_deco', 'expressionism', 'cubism', 'minimalism', 'pop_art', 'baroque'] }, description: 'Filter by style' },
            { name: 'artist_name', in: 'query', schema: { type: 'string' }, description: 'Partial match on artist name' },
          ],
          responses: {
            200: {
              description: 'Paginated list of inventory items',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/InventoryItem' } },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            400: { description: 'Invalid query parameters', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        post: {
          tags: ['Inventory'],
          summary: 'Create a new inventory item',
          description: 'Roles allowed: `accountant`, `inventory_specialist`',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryInput' } } },
          },
          responses: {
            201: {
              description: 'Item created',
              content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, data: { $ref: '#/components/schemas/InventoryItem' } } } } },
            },
            400: { description: 'Validation errors', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            403: { description: 'Forbidden — insufficient role', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/inventory/all': {
        get: {
          tags: ['Inventory'],
          summary: 'Retrieve all inventory items (unpaginated)',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['sold', 'pending', 'ready_for_sale'] }, description: 'Filter by status' },
            { name: 'media', in: 'query', schema: { type: 'string', enum: ['acrylic', 'oils', 'pastel', 'charcoal', 'pencil', 'mixed_media', 'watercolor', 'gouache', 'ink', 'digital'] }, description: 'Filter by media' },
            { name: 'style', in: 'query', schema: { type: 'string', enum: ['abstract', 'realism', 'impressionism', 'surrealism', 'art_deco', 'expressionism', 'cubism', 'minimalism', 'pop_art', 'baroque'] }, description: 'Filter by style' },
            { name: 'artist_name', in: 'query', schema: { type: 'string' }, description: 'Partial match on artist name' },
          ],
          responses: {
            200: {
              description: 'Full list of all inventory items',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      total: { type: 'integer', example: 200 },
                      data: { type: 'array', items: { $ref: '#/components/schemas/InventoryItem' } },
                    },
                  },
                },
              },
            },
            400: { description: 'Invalid query parameters', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/inventory/{id}': {
        get: {
          tags: ['Inventory'],
          summary: 'Get a single inventory item by ID',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: {
              description: 'Inventory item',
              content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/InventoryItem' } } } } },
            },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        put: {
          tags: ['Inventory'],
          summary: 'Update an inventory item (partial update supported)',
          description: 'Roles allowed: `accountant`, `inventory_specialist`, `customer` (customer may only send `{ "status": "pending" }` on an item that is `ready_for_sale`)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InventoryUpdateInput' } } },
          },
          responses: {
            200: {
              description: 'Item updated',
              content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, data: { $ref: '#/components/schemas/InventoryItem' } } } } },
            },
            400: { description: 'Validation errors', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } } },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            403: { description: 'Forbidden — insufficient role', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
        delete: {
          tags: ['Inventory'],
          summary: 'Delete an inventory item',
          description: 'Roles allowed: `accountant` only',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: {
              description: 'Item deleted',
              content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, data: { $ref: '#/components/schemas/InventoryItem' } } } } },
            },
            401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            403: { description: 'Forbidden — insufficient role', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
    },
  },
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
