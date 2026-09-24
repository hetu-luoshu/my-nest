import { Injectable } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueryPostDto } from './dto/query-post.dto.js';

@Injectable()
export class PostService {

  constructor(private readonly prisma: PrismaService) { }

  async create(createPostDto: CreatePostDto) {
    const res = await this.prisma.post.create({
      data: {
        title: createPostDto.title,
        content: createPostDto.content,
        authorId: createPostDto.authorId,
        published: createPostDto.published ?? false,
      },
    });
    return {
      code: 0,
      message: 'Post created successfully',
      data: res,
    };
  }

  async findAll() {
    const posts = await this.prisma.post.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        published: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        'createdAt': 'desc'
      },
    });
    return {
      code: 0,
      message: 'Posts retrieved successfully',
      data: posts,
    };
  }

  async findByCondition(queryPostDto: QueryPostDto) {
    const { pageNumber = 1, pageSize = 10, startTime, endTime, ...filters } = queryPostDto;
    const skip = (+pageNumber - 1) * +pageSize;

    const where: any = {};

    if (startTime && endTime) {
      where.createdAt = {
        gte: startTime,
        lte: endTime
      };
    }

    if (filters.title) {
      where.title = {
        contains: filters.title,
        mode: 'insensitive'
      };
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        skip,
        take: +pageSize,
        select: {
          id: true,
          title: true,
          content: true,
          published: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          'createdAt': 'desc'
        },
      }),
      this.prisma.post.count({
        where,
      }),
    ]);

    return {
      code: 0,
      message: 'Posts retrieved successfully',
      data: {
        posts,
        total,
        pageNumber,
        pageSize,
      },
    };
  }

  async findOne(id: number) {
    const post = await this.prisma.post.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        title: true,
        content: true,
        published: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          }
        }
      }
    });

    if (!post) {
      return {
        code: 1,
        message: 'Post not found',
        data: null
      };
    }

    return {
      code: 0,
      message: 'Post retrieved successfully',
      data: post
    }
  }

  async update(id: number, updatePostDto: UpdatePostDto) {
    const post = await this.prisma.post.findUnique({
      where: {
        id
      }
    });

    if (!post) {
      return {
        code: 1,
        message: 'Post not found',
        data: null
      };
    }

    const updatedPost = await this.prisma.post.update({
      where: {
        id
      },
      data: {
        title: updatePostDto.title,
        content: updatePostDto.content,
        published: updatePostDto.published,
      }
    });

    return {
      code: 0,
      message: 'Post updated successfully',
      data: updatedPost
    };
  }

  async remove(id: number) {
    const post = await this.prisma.post.findUnique({
      where: {
        id
      }
    });

    if (!post) {
      return {
        code: 1,
        message: 'Post not found',
        data: null
      };
    }

    await this.prisma.post.delete({
      where: {
        id
      }
    });

    return {
      code: 0,
      message: 'Post removed successfully',
      data: null
    };
  }
}
