import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';
import { configureCloudinary } from '../../config/cloudinary.config';

@Module({
  imports: [ConfigModule],
  providers: [
    UploadService,
    {
      provide: 'CLOUDINARY_CONFIG',
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => {
        configureCloudinary(cs);
        return true;
      },
    },
  ],
  exports: [UploadService],
})
export class CloudinaryModule {}
