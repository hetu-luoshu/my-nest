import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {

  constructor() {
    // Prisma 7 必须通过 adapter 连接数据库
    // 第一步：创建 pg 连接池（Pool 负责管理数据库连接）
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10, // 最大连接数
    });

    // 第二步：把 pool 包装成 Prisma 认识的 adapter
    const adapter = new PrismaPg(pool);

    // 第三步：把 adapter 传给父类 PrismaClient
    // Prisma 7 的 PrismaClient 必须接收 adapter 参数，否则无法连接数据库
    super({ adapter });
  }

  /**
   * 在模块初始化时连接数据库
   */
  async onModuleInit() {
    await this.$connect();
    console.log('✅ PostgreSQL 18 数据库连接成功（Prisma 7）')
  }

  /**
   * 程序退出时断开数据库连接
   */
  async onModuleDestroy() {
    await this.$disconnect();
    console.log('数据库连接已断开')
  }
}
