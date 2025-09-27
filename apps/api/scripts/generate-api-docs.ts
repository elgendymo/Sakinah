#!/usr/bin/env tsx

/**
 * API Documentation Generator for Sakinah
 *
 * This script generates comprehensive API documentation including:
 * - OpenAPI 3.0 specification
 * - Markdown documentation
 * - Postman collection
 * - TypeScript client SDK types
 */

import fs from 'fs';
import path from 'path';
import { swaggerSpec } from '../src/infrastructure/swagger/config';

const OUTPUT_DIR = path.join(__dirname, '../docs');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Generate OpenAPI JSON specification
 */
function generateOpenApiSpec() {
  const outputPath = path.join(OUTPUT_DIR, 'openapi.json');
  fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
  console.log(`✅ OpenAPI specification generated: ${outputPath}`);
}

/**
 * Generate OpenAPI YAML specification
 */
function generateOpenApiYaml() {
  try {
    const yaml = require('js-yaml');
    const outputPath = path.join(OUTPUT_DIR, 'openapi.yaml');
    fs.writeFileSync(outputPath, yaml.dump(swaggerSpec));
    console.log(`✅ OpenAPI YAML specification generated: ${outputPath}`);
  } catch (error) {
    console.error('❌ Failed to generate YAML specification:', error);
  }
}

/**
 * Generate Markdown documentation
 */
function generateMarkdownDocs() {
  const markdown = `# Sakinah API Documentation

${swaggerSpec.info.description}

## Base URLs

${swaggerSpec.servers?.map(server => `- **${server.description}**: \`${server.url}\``).join('\n')}

## Authentication

All protected endpoints require a JWT Bearer token:

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Endpoints

${generateEndpointDocumentation()}

## Schemas

${generateSchemaDocumentation()}

## Error Handling

All API errors follow a consistent format:

\`\`\`json
{
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "details": [] // Additional details for validation errors
}
\`\`\`

### Common Error Codes

- \`UNAUTHORIZED\`: Missing or invalid authentication token
- \`FORBIDDEN\`: Insufficient permissions
- \`VALIDATION_ERROR\`: Request validation failed
- \`NOT_FOUND\`: Requested resource not found
- \`RATE_LIMIT_EXCEEDED\`: Too many requests
- \`INTERNAL_SERVER_ERROR\`: Unexpected server error

## Rate Limiting

- **Standard endpoints**: 100 requests per 15 minutes
- **AI endpoints**: 20 requests per 15 minutes

## CQRS Architecture

This API follows CQRS (Command Query Responsibility Segregation) pattern:

- **Commands**: Write operations (POST, PUT, DELETE)
- **Queries**: Read operations (GET)
- **Caching**: Intelligent caching on query operations

## Islamic Context

Sakinah (سكينة) means tranquility and peace in Arabic. This API is designed to support Muslim spiritual growth through:

- **Tazkiyah**: Spiritual purification and development
- **Takhliyah**: Purification from spiritual diseases
- **Tahliyah**: Beautification with spiritual virtues
- **Muhasabah**: Self-accountability and reflection

---

*Generated on: ${new Date().toISOString()}*
`;

  const outputPath = path.join(OUTPUT_DIR, 'README.md');
  fs.writeFileSync(outputPath, markdown);
  console.log(`✅ Markdown documentation generated: ${outputPath}`);
}

function generateEndpointDocumentation(): string {
  if (!swaggerSpec.paths) return '';

  const endpoints: string[] = [];

  for (const [path, methods] of Object.entries(swaggerSpec.paths)) {
    for (const [method, spec] of Object.entries(methods as any)) {
      if (typeof spec !== 'object' || !spec.summary) continue;

      const tags = spec.tags ? spec.tags.join(', ') : '';
      const security = spec.security ? '🔒' : '🔓';

      endpoints.push(`### ${security} ${method.toUpperCase()} \`${path}\`

**${spec.summary}**

${spec.description ? `${spec.description}\n` : ''}

**Tags**: ${tags}

${spec.parameters ? generateParametersDoc(spec.parameters) : ''}

${spec.requestBody ? generateRequestBodyDoc(spec.requestBody) : ''}

${spec.responses ? generateResponsesDoc(spec.responses) : ''}

---
`);
    }
  }

  return endpoints.join('\n');
}

function generateParametersDoc(parameters: any[]): string {
  if (!parameters.length) return '';

  const paramDocs = parameters.map(param => {
    const required = param.required ? '**Required**' : 'Optional';
    const type = param.schema?.type || 'string';
    return `- \`${param.name}\` (${param.in}) - ${required} - ${type} - ${param.description || ''}`;
  }).join('\n');

  return `**Parameters:**
${paramDocs}

`;
}

function generateRequestBodyDoc(requestBody: any): string {
  if (!requestBody.content) return '';

  return `**Request Body:**
\`\`\`json
${JSON.stringify(getExampleFromSchema(requestBody.content['application/json']?.schema), null, 2)}
\`\`\`

`;
}

function generateResponsesDoc(responses: any): string {
  const responseDocs = Object.entries(responses).map(([code, response]: [string, any]) => {
    return `- **${code}**: ${response.description}`;
  }).join('\n');

  return `**Responses:**
${responseDocs}

`;
}

function generateSchemaDocumentation(): string {
  if (!swaggerSpec.components?.schemas) return '';

  const schemas: string[] = [];

  for (const [name, schema] of Object.entries(swaggerSpec.components.schemas)) {
    schemas.push(`### ${name}

\`\`\`json
${JSON.stringify(getExampleFromSchema(schema), null, 2)}
\`\`\`

---
`);
  }

  return schemas.join('\n');
}

function getExampleFromSchema(schema: any): any {
  if (!schema) return {};

  if (schema.example) return schema.example;

  if (schema.type === 'object' && schema.properties) {
    const example: any = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      example[key] = getExampleFromSchema(prop);
    }
    return example;
  }

  if (schema.type === 'array' && schema.items) {
    return [getExampleFromSchema(schema.items)];
  }

  // Default examples by type
  switch (schema.type) {
    case 'string':
      if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'date') return new Date().toISOString().split('T')[0];
      return schema.enum ? schema.enum[0] : 'string';
    case 'integer':
    case 'number':
      return schema.minimum || 0;
    case 'boolean':
      return true;
    default:
      return null;
  }
}

/**
 * Generate Postman collection
 */
function generatePostmanCollection() {
  const collection = {
    info: {
      name: 'Sakinah API',
      description: swaggerSpec.info.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      version: swaggerSpec.info.version
    },
    auth: {
      type: 'bearer',
      bearer: [
        {
          key: 'token',
          value: '{{jwt_token}}',
          type: 'string'
        }
      ]
    },
    variable: [
      {
        key: 'baseUrl',
        value: 'http://localhost:3001/api',
        type: 'string'
      },
      {
        key: 'jwt_token',
        value: '',
        type: 'string'
      }
    ],
    item: generatePostmanItems()
  };

  const outputPath = path.join(OUTPUT_DIR, 'sakinah-api.postman_collection.json');
  fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));
  console.log(`✅ Postman collection generated: ${outputPath}`);
}

function generatePostmanItems(): any[] {
  if (!swaggerSpec.paths) return [];

  const folders = new Map<string, any[]>();

  for (const [path, methods] of Object.entries(swaggerSpec.paths)) {
    for (const [method, spec] of Object.entries(methods as any)) {
      if (typeof spec !== 'object' || !spec.summary) continue;

      const tag = spec.tags?.[0] || 'General';

      if (!folders.has(tag)) {
        folders.set(tag, []);
      }

      const item = {
        name: spec.summary,
        request: {
          method: method.toUpperCase(),
          header: [
            {
              key: 'Content-Type',
              value: 'application/json',
              type: 'text'
            }
          ],
          url: {
            raw: `{{baseUrl}}${path}`,
            host: ['{{baseUrl}}'],
            path: path.split('/').filter(p => p)
          },
          description: spec.description
        }
      };

      if (spec.requestBody?.content?.['application/json']?.schema) {
        (item.request as any).body = {
          mode: 'raw',
          raw: JSON.stringify(getExampleFromSchema(spec.requestBody.content['application/json'].schema), null, 2)
        };
      }

      folders.get(tag)!.push(item);
    }
  }

  return Array.from(folders.entries()).map(([name, items]) => ({
    name,
    item: items
  }));
}

/**
 * Generate TypeScript client types
 */
function generateTypeScriptTypes() {
  const types = `/* eslint-disable */
/**
 * Auto-generated TypeScript types for Sakinah API
 * Generated on: ${new Date().toISOString()}
 */

${generateTypesFromSchemas()}

// API Client Interface
export interface SakinahApiClient {
  // Habits
  createHabit(data: CreateHabitRequest): Promise<ApiResponse<{ habitId: string }>>;
  getHabit(id: string): Promise<ApiResponse<HabitDTO>>;
  getUserHabits(params?: GetHabitsParams): Promise<ApiResponse<PaginatedResponse<HabitDTO>>>;
  getTodaysHabits(): Promise<ApiResponse<HabitDTO[]>>;
  getHabitStatistics(): Promise<ApiResponse<HabitStatistics>>;
  completeHabit(data: CompleteHabitRequest): Promise<ApiResponse<void>>;
  deleteHabit(id: string): Promise<ApiResponse<void>>;

  // Add other endpoints as needed...
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// Request/Response types
export interface CreateHabitRequest {
  planId: string;
  title: string;
  schedule: HabitSchedule;
}

export interface CompleteHabitRequest {
  habitId: string;
  date?: string;
}

export interface GetHabitsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  planId?: string;
  completedToday?: boolean;
}
`;

  const outputPath = path.join(OUTPUT_DIR, 'types.ts');
  fs.writeFileSync(outputPath, types);
  console.log(`✅ TypeScript types generated: ${outputPath}`);
}

function generateTypesFromSchemas(): string {
  if (!swaggerSpec.components?.schemas) return '';

  const types: string[] = [];

  for (const [name, schema] of Object.entries(swaggerSpec.components.schemas)) {
    types.push(generateTypeFromSchema(name, schema));
  }

  return types.join('\n\n');
}

function generateTypeFromSchema(name: string, schema: any): string {
  if (schema.type === 'object' && schema.properties) {
    const properties = Object.entries(schema.properties).map(([key, prop]: [string, any]) => {
      const optional = !schema.required?.includes(key) ? '?' : '';
      const type = getTypeScriptType(prop);
      const description = prop.description ? `  /** ${prop.description} */\n` : '';
      return `${description}  ${key}${optional}: ${type};`;
    }).join('\n');

    return `export interface ${name} {
${properties}
}`;
  }

  return `export type ${name} = ${getTypeScriptType(schema)};`;
}

function getTypeScriptType(schema: any): string {
  if (schema.$ref) {
    return schema.$ref.split('/').pop();
  }

  switch (schema.type) {
    case 'string':
      if (schema.enum) {
        return schema.enum.map((v: string) => `'${v}'`).join(' | ');
      }
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return `${getTypeScriptType(schema.items)}[]`;
    case 'object':
      if (schema.properties) {
        const properties = Object.entries(schema.properties).map(([key, prop]: [string, any]) => {
          const optional = !schema.required?.includes(key) ? '?' : '';
          return `${key}${optional}: ${getTypeScriptType(prop)}`;
        }).join('; ');
        return `{ ${properties} }`;
      }
      return 'Record<string, any>';
    default:
      return 'any';
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Generating Sakinah API documentation...\n');

  try {
    generateOpenApiSpec();
    generateOpenApiYaml();
    generateMarkdownDocs();
    generatePostmanCollection();
    generateTypeScriptTypes();

    console.log('\n✅ All documentation generated successfully!');
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
    console.log('\n📋 Generated files:');
    console.log('  - openapi.json (OpenAPI 3.0 specification)');
    console.log('  - openapi.yaml (OpenAPI 3.0 specification in YAML)');
    console.log('  - README.md (Comprehensive markdown documentation)');
    console.log('  - sakinah-api.postman_collection.json (Postman collection)');
    console.log('  - types.ts (TypeScript client types)');

    console.log('\n🌐 Access documentation at:');
    console.log('  - Swagger UI: http://localhost:3001/api/docs');
    console.log('  - API Info: http://localhost:3001/api/docs/info');

  } catch (error) {
    console.error('❌ Error generating documentation:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}