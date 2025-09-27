import swaggerJSDoc from 'swagger-jsdoc';

// Define common schemas
const schemas = {
  // Error Response Schema
  ErrorResponse: {
    type: 'object',
    properties: {
      error: {
        type: 'string',
        description: 'Error code'
      },
      message: {
        type: 'string',
        description: 'Human-readable error message'
      },
      details: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' }
          }
        },
        description: 'Detailed validation errors (for validation failures)'
      }
    },
    required: ['error', 'message']
  },

  // Success Response Schema
  SuccessResponse: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: true
      },
      message: {
        type: 'string',
        description: 'Success message'
      }
    },
    required: ['success']
  },

  // Pagination Schema
  Pagination: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        minimum: 1,
        description: 'Current page number'
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description: 'Number of items per page'
      },
      total: {
        type: 'integer',
        minimum: 0,
        description: 'Total number of items'
      },
      totalPages: {
        type: 'integer',
        minimum: 0,
        description: 'Total number of pages'
      }
    },
    required: ['page', 'limit', 'total', 'totalPages']
  },

  // Habit Schedule Schema
  HabitSchedule: {
    type: 'object',
    properties: {
      freq: {
        type: 'string',
        enum: ['daily', 'weekly', 'custom'],
        description: 'Frequency of the habit'
      },
      days: {
        type: 'array',
        items: {
          type: 'integer',
          minimum: 0,
          maximum: 6
        },
        description: 'Days of week (0=Sunday, 1=Monday, etc.) for weekly/custom frequency'
      }
    },
    required: ['freq']
  },

  // Habit DTO Schema
  HabitDTO: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique identifier for the habit'
      },
      userId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the user who owns this habit'
      },
      planId: {
        type: 'string',
        format: 'uuid',
        description: 'ID of the plan this habit belongs to'
      },
      title: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'Title of the habit'
      },
      schedule: {
        $ref: '#/components/schemas/HabitSchedule'
      },
      streakCount: {
        type: 'integer',
        minimum: 0,
        description: 'Current streak count'
      },
      lastCompletedOn: {
        type: 'string',
        format: 'date-time',
        nullable: true,
        description: 'ISO string of when the habit was last completed'
      },
      createdAt: {
        type: 'string',
        format: 'date-time',
        description: 'ISO string of when the habit was created'
      },
      isCompletedToday: {
        type: 'boolean',
        description: 'Whether the habit was completed today'
      }
    },
    required: ['id', 'userId', 'planId', 'title', 'schedule', 'streakCount', 'createdAt']
  },

  // Habit Statistics Schema
  HabitStatistics: {
    type: 'object',
    properties: {
      totalHabits: {
        type: 'integer',
        minimum: 0,
        description: 'Total number of habits'
      },
      completedToday: {
        type: 'integer',
        minimum: 0,
        description: 'Number of habits completed today'
      },
      averageStreak: {
        type: 'number',
        minimum: 0,
        description: 'Average streak across all habits'
      },
      longestStreak: {
        type: 'integer',
        minimum: 0,
        description: 'Longest streak among all habits'
      },
      completionRate: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        description: 'Overall completion rate (0-1)'
      },
      weeklyProgress: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              format: 'date',
              description: 'Date in YYYY-MM-DD format'
            },
            completed: {
              type: 'integer',
              minimum: 0,
              description: 'Number of habits completed on this date'
            },
            total: {
              type: 'integer',
              minimum: 0,
              description: 'Total number of habits scheduled for this date'
            }
          },
          required: ['date', 'completed', 'total']
        },
        description: 'Daily progress for the last 7 days'
      }
    },
    required: ['totalHabits', 'completedToday', 'averageStreak', 'longestStreak', 'completionRate', 'weeklyProgress']
  }
};

// Security schemes
const securitySchemes = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT token obtained from Supabase authentication'
  }
};

// Common responses
const responses = {
  UnauthorizedError: {
    description: 'Authentication required',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          error: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      }
    }
  },
  ForbiddenError: {
    description: 'Insufficient permissions',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          error: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      }
    }
  },
  ValidationError: {
    description: 'Request validation failed',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          error: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [
            {
              field: 'title',
              message: 'String must contain at least 1 character(s)',
              code: 'too_small'
            }
          ]
        }
      }
    }
  },
  NotFoundError: {
    description: 'Resource not found',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          error: 'NOT_FOUND',
          message: 'Resource not found'
        }
      }
    }
  },
  InternalServerError: {
    description: 'Internal server error',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse'
        },
        example: {
          error: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred'
        }
      }
    }
  }
};

// Swagger configuration
const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Sakinah API',
      version: '2.0.0',
      description: `
# Sakinah - Muslim Spiritual Growth Platform API

Welcome to the Sakinah API documentation. This API provides endpoints for managing spiritual habits, journaling, check-ins, and spiritual growth plans in accordance with Islamic principles.

## Overview

Sakinah (Arabic: سكينة, meaning tranquility/peace) is designed to help Muslims on their spiritual journey through:

- **Tazkiyah Plans**: Structured spiritual development plans focusing on purification (Takhliyah) and beautification (Tahliyah)
- **Habit Tracking**: Monitor daily spiritual practices with streak counters and progress analytics
- **Spiritual Journaling**: Reflect on your spiritual journey with guided prompts
- **Daily Check-ins**: Regular self-assessment (Muhasabah) for spiritual accountability
- **Islamic Content**: Access to relevant Quranic verses, Hadith, and spiritual guidance

## Architecture

This API follows Clean Architecture principles with CQRS (Command Query Responsibility Segregation) pattern:

- **Commands**: For write operations (creating, updating, deleting)
- **Queries**: For read operations (fetching data)
- **Domain Events**: For capturing important business events
- **Caching**: Intelligent query caching for optimal performance

## Authentication

All protected endpoints require a valid JWT token obtained from Supabase authentication. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer your-jwt-token-here
\`\`\`

## Rate Limiting

API requests are rate-limited to ensure fair usage:
- 100 requests per minute for authenticated users
- 10 requests per minute for unauthenticated users

## Versioning

This API uses URL versioning. Current version is v2:
- Base URL: \`/api/v2\`
- Previous version (v1) is still available but deprecated

## Error Handling

All errors follow a consistent format with appropriate HTTP status codes and detailed error messages in both English and Arabic where applicable.
      `,
      contact: {
        name: 'Sakinah API Support',
        url: 'https://github.com/sakinah/api',
        email: 'support@sakinah.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server'
      },
      {
        url: 'https://api.sakinah.com/api',
        description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Habits',
        description: 'Spiritual habit tracking and management'
      },
      {
        name: 'Plans',
        description: 'Tazkiyah spiritual development plans'
      },
      {
        name: 'Journal',
        description: 'Spiritual journaling and reflection'
      },
      {
        name: 'Check-ins',
        description: 'Daily spiritual self-assessment (Muhasabah)'
      },
      {
        name: 'Content',
        description: 'Islamic content (Quran, Hadith, Duas)'
      },
      {
        name: 'Analytics',
        description: 'Spiritual progress analytics and insights'
      }
    ],
    components: {
      schemas,
      securitySchemes,
      responses,
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: 'Page number for pagination',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Number of items per page',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10
          }
        },
        SortByParam: {
          name: 'sortBy',
          in: 'query',
          description: 'Field to sort by',
          required: false,
          schema: {
            type: 'string',
            default: 'createdAt'
          }
        },
        SortOrderParam: {
          name: 'sortOrder',
          in: 'query',
          description: 'Sort order',
          required: false,
          schema: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc'
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './src/routes/v2/*.ts', // Path to the API docs
    './src/routes/v1/*.ts'  // Legacy routes
  ]
};

export const swaggerSpec = swaggerJSDoc(options);