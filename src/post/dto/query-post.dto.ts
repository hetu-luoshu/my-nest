import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto.js';

export class QueryPostDto extends PartialType(CreatePostDto) {
  pageNumber?: number;
  pageSize?: number;
  // 时间范围查询
  startTime?: Date;
  endTime?: Date;
}
