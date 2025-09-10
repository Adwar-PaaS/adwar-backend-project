import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class ParseJsonPipe implements PipeTransform {
  constructor(private readonly options?: { nullable?: boolean }) {}

  transform(value: any, metadata: ArgumentMetadata) {
    if (value === undefined || value === null) {
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
          `Invalid JSON for property "${metadata.data}"`,
        );
      }
    }

    if (metadata.data === 'addresses') {
      if (Array.isArray(value)) {
        if (!value.every((v) => typeof v === 'object' && v !== null)) {
          throw new BadRequestException(
            'Each item in "addresses" must be an object',
          );
        }
        return value;
      }
      throw new BadRequestException('"addresses" must be an array');
    }

    return value;
  }
}
