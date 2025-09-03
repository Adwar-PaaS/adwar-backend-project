// import { Body, Controller, Get, HttpStatus, Param, Patch, Post } from '@nestjs/common';
// import { NotificationService } from './notification.service';
// import { CreateNotificationDto } from './dto/create-notification.dto';
// import { APIResponse } from '../../common/utils/api-response.util';

// @Controller('notifications')
// export class NotificationController {
//   constructor(private readonly service: NotificationService) {}

//   @Post()
//   async create(@Body() dto: CreateNotificationDto) {
//     const notification = await this.service.create(dto);
//     return APIResponse.success(
//       { notification },
//       'Notification queued',
//       HttpStatus.CREATED,
//     );
//   }

//   @Patch(':id/read')
//   async markRead(@Param('id') id: string) {
//     const notification = await this.service.markRead(id);
//     return APIResponse.success({ notification }, 'Notification marked as read');
//   }

//   @Get('me/:userId')
//   async listMine(@Param('userId') userId: string) {
//     const notifications = await this.service.listForUser(userId);
//     return APIResponse.success({ notifications }, 'Notifications fetched');
//   }
// }
