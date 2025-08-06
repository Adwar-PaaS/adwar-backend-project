import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { cloudinary } from '../../config/cloudinary.config';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  async uploadImage(file: Express.Multer.File): Promise<string> {
    try {
      const result = await new Promise<any>((resolve, reject) =>
        cloudinary.uploader
          .upload_stream(
            { resource_type: 'image', folder: 'tenants' },
            (err, res) => {
              if (err) return reject(err);
              if (!res || !res.secure_url)
                return reject(new Error('No result from Cloudinary'));
              resolve(res);
            },
          )
          .end(file.buffer),
      );
      return result.secure_url;
    } catch (err) {
      this.logger.error('Cloudinary upload failed', err.stack);
      throw new InternalServerErrorException(
        'Failed to upload logo to Cloudinary',
      );
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const publicId = this.extractPublicId(fileUrl);
      if (!publicId) return;
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      this.logger.warn('Cloudinary delete failed', err.stack);
    }
  }

  private extractPublicId(fileUrl: string): string | null {
    try {
      const url = new URL(fileUrl);
      const fname = url.pathname
        .split('/')
        .pop()
        ?.split('.')
        .slice(0, -1)
        .join('.');
      return fname ? `tenants/${fname}` : null;
    } catch {
      return null;
    }
  }
}
