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

@ApiTags('笼舍管理')
@Controller('cages')
export class CagesController {
  constructor(private readonly cagesService: CagesService) {}

  @Post()
  @ApiOperation({ summary: '添加笼舍' })
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

  @Get('rooms')
  @ApiOperation({ summary: '获取房间列表' })
  getRoomList() {
    return this.cagesService.getRoomList();
  }

  @Get('available-animals')
  @ApiOperation({ summary: '获取可分配的动物列表' })
  @ApiQuery({ name: 'keyword', required: false })
  getAvailableAnimals(@Query('keyword') keyword?: string) {
    return this.cagesService.getAvailableAnimals(keyword);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取笼舍详情' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cagesService.findOne(id);
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

  @Get(':id/animals')
  @ApiOperation({ summary: '获取笼舍中的动物列表' })
  getCageAnimals(@Param('id', ParseIntPipe) id: number) {
    return this.cagesService.getCageAnimals(id);
  }

  @Post(':id/animals/:animalId')
  @ApiOperation({ summary: '将动物分配到笼舍' })
  addAnimal(
    @Param('id', ParseIntPipe) id: number,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.cagesService.addAnimalToCage(id, animalId);
  }

  @Delete(':id/animals/:animalId')
  @ApiOperation({ summary: '将动物从笼舍移出' })
  removeAnimal(
    @Param('id', ParseIntPipe) id: number,
    @Param('animalId', ParseIntPipe) animalId: number,
  ) {
    return this.cagesService.removeAnimalFromCage(id, animalId);
  }
}
