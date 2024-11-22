import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from './dto/pagination.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductsService');
  onModuleInit() {
    this.$connect();

    this.logger.log('Prisma connected');
  }
  create(createProductDto: CreateProductDto) {
    return this.product.create({ data: createProductDto });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page, limit } = paginationDto;

    const totalPages = await this.product.count({ where: { available: true } });
    const lastPage = Math.ceil(totalPages / limit);

    return {
      data: await this.product.findMany({
        take: limit,
        skip: (page - 1) * limit,
        where: { available: true },
      }),
      meta: {
        total: totalPages,
        page: page,
        lastPage: lastPage,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.product.findUnique({
      where: { id, available: true },
    });

    if (!product) {
      throw new RpcException({
        message: `Product with id #${id} not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return product;
  }

  // async update(id: number, updateProductDto: UpdateProductDto) {
  //   await this.findOne(id);

  //   return this.product.update({
  //     where: { id },
  //     data: updateProductDto,
  //   });
  // }

  async update(id: number, updateProductDto: UpdateProductDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: __, ...data } = updateProductDto;

    if (Object.keys(updateProductDto).length === 0) {
      throw new BadRequestException('No data to update');
    }
    try {
      return await this.product.update({
        where: { id },
        data: data,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new RpcException({
          message: `Product with id #${id} not found, update failed`,
          status: HttpStatus.BAD_REQUEST,
        });
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.product.update({
        where: { id },
        data: { available: false },
      });
    } catch (error) {
      throw new RpcException({
        message: `Product with id #${id} not found, delete failed, ${error.message}`,
        status: HttpStatus.BAD_REQUEST,
      });
    }
  }

  async validateProducts(ids: number[]) {
    ids = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: { id: { in: ids } },
    });

    if (ids.length !== products.length) {
      throw new RpcException({
        message: `some products not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    }

    return products;
  }
}
