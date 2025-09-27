import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config';

const router = express.Router();

// Custom CSS for Islamic theming
const customCss = `
  .swagger-ui .topbar {
    background-color: #059669;
  }
  .swagger-ui .topbar .download-url-wrapper .select-label {
    color: white;
  }
  .swagger-ui .info .title {
    color: #059669;
  }
  .swagger-ui .scheme-container {
    background-color: #f0fdf4;
    border: 1px solid #059669;
    border-radius: 4px;
    padding: 10px;
  }
  .swagger-ui .info .description p {
    line-height: 1.6;
  }
  .swagger-ui .info .description h1 {
    color: #059669;
    border-bottom: 2px solid #059669;
    padding-bottom: 10px;
  }
  .swagger-ui .info .description h2 {
    color: #047857;
    margin-top: 25px;
    margin-bottom: 15px;
  }
  .swagger-ui .opblock.opblock-get .opblock-summary-path {
    color: #059669;
  }
  .swagger-ui .opblock.opblock-post .opblock-summary-path {
    color: #047857;
  }
  .swagger-ui .opblock.opblock-put .opblock-summary-path {
    color: #065f46;
  }
  .swagger-ui .opblock.opblock-delete .opblock-summary-path {
    color: #dc2626;
  }
`;

const customSiteTitle = 'Sakinah API Documentation';

const swaggerOptions = {
  customCss,
  customSiteTitle,
  customfavIcon: '/favicon.ico',
  customJs: `
    window.onload = function() {
      // Add Arabic RTL support for Arabic examples
      const style = document.createElement('style');
      style.textContent = \`
        .swagger-ui .model-example pre {
          direction: ltr;
          text-align: left;
        }
        .arabic-text {
          direction: rtl;
          text-align: right;
          font-family: 'Amiri', 'Traditional Arabic', serif;
        }
      \`;
      document.head.appendChild(style);
    }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    defaultModelsExpandDepth: 3,
    defaultModelExpandDepth: 3,
    displayOperationId: false,
    tryItOutEnabled: true,
    requestInterceptor: (request: any) => {
      // Add request logging for development
      if (process.env.NODE_ENV === 'development') {
        console.log('Swagger API Request:', {
          url: request.url,
          method: request.method,
          headers: request.headers
        });
      }
      return request;
    },
    responseInterceptor: (response: any) => {
      // Add response logging for development
      if (process.env.NODE_ENV === 'development') {
        console.log('Swagger API Response:', {
          status: response.status,
          url: response.url
        });
      }
      return response;
    }
  }
};

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec, swaggerOptions));

// Serve OpenAPI spec as JSON
router.get('/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve OpenAPI spec as YAML (optional)
router.get('/openapi.yaml', (_req, res) => {
  const yaml = require('js-yaml');
  res.setHeader('Content-Type', 'text/yaml');
  res.send(yaml.dump(swaggerSpec));
});

// API documentation landing page
router.get('/info', (_req, res) => {
  res.json({
    name: 'Sakinah API',
    version: '2.0.0',
    description: 'Muslim Spiritual Growth Platform API',
    documentation: {
      swagger: '/api/docs',
      openapi_json: '/api/docs/openapi.json',
      openapi_yaml: '/api/docs/openapi.yaml'
    },
    features: [
      'CQRS Architecture',
      'Islamic Spiritual Content',
      'Habit Tracking',
      'Journaling',
      'Analytics',
      'Progressive Web App Support'
    ],
    authentication: 'JWT Bearer Token (Supabase)',
    support: {
      email: 'support@sakinah.com',
      documentation: 'https://docs.sakinah.com',
      github: 'https://github.com/sakinah/api'
    }
  });
});

export default router;