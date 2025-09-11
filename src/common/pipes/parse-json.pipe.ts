import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

interface ParseJsonOptions {
  nullable?: boolean;
  expectArray?: boolean;
  expectObject?: boolean;
}

@Injectable()
export class ParseJsonPipe implements PipeTransform {
  constructor(private readonly options?: ParseJsonOptions) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (value === undefined || value === null || value === '') {
      if (this.options?.nullable) {
        return undefined;
      }
      return value;
    }

    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        throw new BadRequestException(
          `Invalid JSON format for property "${metadata.data}".`,
        );
      }
    }

    if (this.options?.expectArray && !Array.isArray(value)) {
      throw new BadRequestException(
        `Property "${metadata.data}" must be an array.`,
      );
    }

    if (
      this.options?.expectObject &&
      (Array.isArray(value) || typeof value !== 'object')
    ) {
      throw new BadRequestException(
        `Property "${metadata.data}" must be an object.`,
      );
    }

    return value;
  }
}

// Usage examples

// Expect array (like addresses)
// @Post()
// create(
//   @Body('addresses', new ParseJsonPipe({ expectArray: true }))
//   addresses: any[],
// ) {
//   console.log(addresses);
// }

// Expect object (like settings)
// @Post()
// create(
//   @Body('settings', new ParseJsonPipe({ expectObject: true }))
//   settings: Record<string, any>,
// ) {
//   console.log(settings);
// }

// Accept nullable JSON
// @Post()
// create(
//   @Body('metadata', new ParseJsonPipe({ nullable: true }))
//   metadata?: Record<string, any>,
// ) {
//   console.log(metadata);
// }
