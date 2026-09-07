import { All, Controller, Get, NotFoundException } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @All('*')
  notFound(): never {
    throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
  }
}