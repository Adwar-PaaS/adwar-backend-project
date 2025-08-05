import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import validationSchema from './config/env.validation';
import { DatabaseModule } from './db/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema }),
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
