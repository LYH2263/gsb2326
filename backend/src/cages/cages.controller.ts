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
import { AssignAnimalsDto } from './dto/assign-animals.dto';

@ApiTags('笼舍管理')
@Controller('cages')
export class CagesController {
  constructor(private readonly cagesService: CagesService) {}

  @Post()
  @ApiOperation({ summary: '新增笼舍' })
  create(@Body() createCageDto: CreateCageDto) {
    return this.cagesService.create(createCageDto);
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

  @Get('types')
  @ApiOperation({ summary: '获取笼舍类型选项' })
  getTypes() {
    return this.cagesService.getTypeOptions();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取笼舍详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cagesService.findOne(id);
  }

  @Get(':id/animals')
  @ApiOperation({ summary: '获取笼舍内的动物列表' })
  getAnimals(@Param('id', ParseIntPipe) id: number) {
    return this.cagesService.getAnimals(id);
  }

  @Get(':id/available-animals')
  @ApiOperation({ summary: '获取可分配到该笼舍的动物列表' })
  @ApiQuery({ name: 'keyword', required: false })
  getAvailableAnimals(
    @Param('id', ParseIntPipe) id: number,
    @Query('keyword') keyword?: string,
  ) {
    return this.cagesService.getAvailableAnimals(id, keyword);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新笼舍信息' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCageDto: UpdateCageDto,
  ) {
    return this.cagesService.update(id, updateCageDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除笼舍' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cagesService.remove(id);
  }

  @Post(':id/animals')
  @ApiOperation({ summary: '分配动物到笼舍' })
  assignAnimals(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignAnimalsDto,
  ) {
    return this.cagesService.assignAnimals(id, dto);
  }

  @Delete(':id/animals/:animalId')
  @ApiOperation({ summary: '将动物移出笼舍' })
  removeAnimal(
    @Param('id', ParseIntPipe) id: number,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.cagesService.removeAnimal(id, animalId);
  }
}
