import { IsString, IsOptional, IsEnum, IsNumber, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCageDto {
  @ApiProperty({ description: '笼舍编号', example: 'CAGE-A-101' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ description: '所在房间', example: 'A栋101室' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string;

  @ApiPropertyOptional({ description: '笼舍类型', example: '小鼠笼' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiProperty({ description: '最大容量', example: 5 })
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({
    description: '状态',
    enum: ['idle', 'in_use', 'full', 'maintenance'],
  })
  @IsOptional()
  @IsEnum(['idle', 'in_use', 'full', 'maintenance'])
  status?: string;

  @ApiPropertyOptional({ description: '描述备注' })
  @IsOptional()
  @IsString()
  description?: string;
}
