import { All, Controller, NotFoundException } from '@nestjs/common';

@Controller()
export class FallbackController {
  @All('*')
  notFound(): never {
    throw new NotFoundException({ key: 'errors.not_found', error: 'NotFound' });
  }
}
