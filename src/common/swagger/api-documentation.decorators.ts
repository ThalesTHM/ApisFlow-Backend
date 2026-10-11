import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiAuthenticated(): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Insufficient role or tenant context',
    }),
  );
}

export function ApiUuidResource(resource: string): MethodDecorator {
  return applyDecorators(
    ApiParam({ name: 'id', format: 'uuid', description: `${resource} ID` }),
    ApiBadRequestResponse({ description: 'The ID or request body is invalid' }),
    ApiNotFoundResponse({ description: `${resource} was not found` }),
  );
}
