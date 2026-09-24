import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueryUserDto } from './dto/query-user.dto.js';

@Injectable()
export class UserService {

  constructor(private readonly prisma: PrismaService) {

  }

  async create(createUserDto: CreateUserDto) {
    const res = await this.prisma.user.create({
      data: createUserDto
    });
    return {
      code: 0,
      message: 'User created successfully',
      data: res,
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: {
        'createdAt': 'desc'
      },
    });
    return {
      code: 0,
      message: 'Users retrieved successfully',
      data: users,
    };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        posts: {
          select: {
            id: true,
            title: true,
            content: true,
            published: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      },
    });

    if (!user) {
      return {
        code: 1,
        message: 'User not found',
        data: null
      };
    }

    return {
      code: 0,
      message: 'User retrieved successfully',
      data: user,
    };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {

    const user = await this.prisma.user.findUnique({
      where: {
        id
      }
    });

    if (!user) {
      return {
        code: 1,
        message: 'User not found',
        data: null
      };
    }

    const res = await this.prisma.user.update({
      where: {
        id
      },
      data: updateUserDto
    });
    return {
      code: 0,
      message: 'User updated successfully',
      data: res,
    };
  }

  async remove(id: number) {

    const user = await this.prisma.user.findUnique({
      where: {
        id
      }
    });

    if (!user) {
      return {
        code: 1,
        message: 'User not found',
        data: null
      };
    }

    await this.prisma.user.delete({
      where: {
        id
      }
    });

    return {
      code: 0,
      message: 'User deleted successfully',
      data: null
    };
  }

  /**
   * 条件查询
   */
  async findByCondition(condition: QueryUserDto) {
    const { pageNumber = 1, pageSize = 10, startTime, endTime, ...filters } = condition;
    const skip = (+pageNumber - 1) * +pageSize;
    const take = +pageSize;

    const { password: _, name, ...restFilters } = filters;
    const where: Record<string, any> = { ...restFilters };

    if (startTime && endTime) {
      where.createdAt = {
        gte: startTime,
        lte: endTime
      };
    }

    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
        orderBy: {
          'createdAt': 'desc'
        },
      }),
      this.prisma.user.count({
        where,
      }),
    ]);

    return {
      code: 0,
      message: 'Users retrieved successfully',
      data: {
        users,
        total,
        pageNumber,
        pageSize,
      },
    };
  }
}
