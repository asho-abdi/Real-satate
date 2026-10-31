/**
 * OpenAPI 3.0 specification for the simple Property Rentals API.
 */
import swaggerJsdoc from 'swagger-jsdoc';
import env from '../config/env.js';

const apiPrefix = env.API_PREFIX || '/api/v1';

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'Property Rentals API',
    version: '2.0.0',
    description:
      'Simple 2-building rental system: shops, apartments, and guest rooms.',
  },
  servers: [
    {
      url: `http://localhost:${env.PORT || 5000}${apiPrefix}`,
      description: 'Local development',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Auth' },
    { name: 'Buildings' },
    { name: 'Floors' },
    { name: 'Units' },
    { name: 'Bookings' },
    { name: 'Tenants' },
    { name: 'Businesses' },
    { name: 'Payments' },
    { name: 'Reports' },
    { name: 'Settings' },
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        security: [],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'user@example.com' },
                  password: { type: 'string', example: 'your-password' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Tokens + user' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user',
        responses: { 200: { description: 'User profile' } },
      },
    },
    '/buildings': {
      get: { tags: ['Buildings'], summary: 'List buildings', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Buildings'], summary: 'Create building', responses: { 201: { description: 'Created' } } },
    },
    '/floors': {
      get: { tags: ['Floors'], summary: 'List floors (?buildingId)', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Floors'], summary: 'Create floor', responses: { 201: { description: 'Created' } } },
    },
    '/units': {
      get: {
        tags: ['Units'],
        summary: 'List units (?buildingId&floorId&status&usage&search)',
        responses: { 200: { description: 'OK' } },
      },
      post: { tags: ['Units'], summary: 'Create unit', responses: { 201: { description: 'Created' } } },
    },
    '/bookings': {
      get: { tags: ['Bookings'], summary: 'List bookings (?search)', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Bookings'], summary: 'Create booking', responses: { 201: { description: 'Created' } } },
    },
    '/bookings/{id}/check-in': {
      post: { tags: ['Bookings'], summary: 'Check in', parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: { description: 'OK' } } },
    },
    '/bookings/{id}/check-out': {
      post: { tags: ['Bookings'], summary: 'Check out', parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: { description: 'OK' } } },
    },
    '/bookings/{id}/cancel': {
      post: { tags: ['Bookings'], summary: 'Cancel', parameters: [{ name: 'id', in: 'path', required: true }], responses: { 200: { description: 'OK' } } },
    },
    '/tenants': {
      get: { tags: ['Tenants'], summary: 'List apartment tenants', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Tenants'], summary: 'Create tenant + monthly payment', responses: { 201: { description: 'Created' } } },
    },
    '/businesses': {
      get: { tags: ['Businesses'], summary: 'List shop businesses', responses: { 200: { description: 'OK' } } },
      post: { tags: ['Businesses'], summary: 'Create business + monthly payment', responses: { 201: { description: 'Created' } } },
    },
    '/payments': {
      get: {
        tags: ['Payments'],
        summary: 'List monthly payments (?status&month&tenantId&businessId)',
        responses: { 200: { description: 'OK' } },
      },
      post: { tags: ['Payments'], summary: 'Create monthly payment', responses: { 201: { description: 'Created' } } },
    },
    '/reports/dashboard': {
      get: { tags: ['Reports'], summary: 'Dashboard stats', responses: { 200: { description: 'OK' } } },
    },
    '/reports/occupancy': {
      get: { tags: ['Reports'], summary: 'Occupancy report', responses: { 200: { description: 'OK' } } },
    },
    '/reports/revenue': {
      get: { tags: ['Reports'], summary: 'Revenue report', responses: { 200: { description: 'OK' } } },
    },
    '/reports/outstanding': {
      get: { tags: ['Reports'], summary: 'Outstanding payments', responses: { 200: { description: 'OK' } } },
    },
    '/reports/guests': {
      get: { tags: ['Reports'], summary: 'Guest bookings report', responses: { 200: { description: 'OK' } } },
    },
    '/reports/tenants': {
      get: { tags: ['Reports'], summary: 'Tenants & businesses report', responses: { 200: { description: 'OK' } } },
    },
    '/settings': {
      get: { tags: ['Settings'], summary: 'All settings', responses: { 200: { description: 'OK' } } },
    },
    '/settings/{key}': {
      put: {
        tags: ['Settings'],
        summary: 'Upsert setting by key',
        parameters: [{ name: 'key', in: 'path', required: true }],
        responses: { 200: { description: 'OK' } },
      },
    },
  },
};

export const swaggerSpec = swaggerJsdoc({
  definition,
  apis: [],
});

export default swaggerSpec;
