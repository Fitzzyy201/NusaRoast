import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RegionsService } from './regions.service';
import { findRegenciesQueryDto } from './dto/find-regencies-query.dto';

@Controller('regions')
export class RegionsController {
  constructor(private regionsService: RegionsService) {}

  @Get('provinces')
  async getProvinces() {
    return this.regionsService.getProvinces();
  }

  @Get('regencies')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getRegencies(@Query() query: findRegenciesQueryDto) {
    return this.regionsService.getRegencies(query.provinceCode);
  }
}
