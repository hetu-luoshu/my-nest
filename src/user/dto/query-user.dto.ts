import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto.js';

export class QueryUserDto extends PartialType(CreateUserDto) {
  pageNumber?: number;
  pageSize?: number;
  // 时间范围查询
  startTime?: Date;
  endTime?: Date;
}