import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CagesService } from './cages.service';
import { CreateCageDto } from './dto/create-cage.dto';
import { UpdateCageDto } from './dto/update-cage.dto';
import { AssignAnimalDto } from './dto/assign-animal.dto';

@ApiTags('笼舍管理')
@Controller('cages')
export class CagesController {
  constructor(private readonly cagesService: CagesService) {}

  @Post()
  @ApiOperation({ summary: '新增笼舍' })
  create(@Body() dto: CreateCageDto) {
    return this.cagesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '查询笼舍列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'keyword', required: false })
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.cagesService.findAll({ page, pageSize, status, keyword });
  }

  @Get(':id')
  @ApiOperation({ summary: '获取笼舍详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cagesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新笼舍' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCageDto,
  ) {
    return this.cagesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除笼舍' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cagesService.remove(id);
  }

  @Post(':id/animals')
  @ApiOperation({ summary: '分配动物到笼舍' })
  assignAnimal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignAnimalDto,
  ) {
    return this.cagesService.assignAnimal(id, dto.animalId);
  }

  @Delete(':id/animals/:animalId')
  @ApiOperation({ summary: '从笼舍中移出动物' })
  removeAnimal(
    @Param('id', ParseIntPipe) id: number,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.cagesService.removeAnimal(id, animalId);
  }
}
