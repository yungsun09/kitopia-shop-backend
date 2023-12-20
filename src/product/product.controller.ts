// product.controller.ts
import { Body, Controller, Post, HttpStatus, HttpException, Get, Param } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './product.dto';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    try {
      const product = await this.productService.createProduct(createProductDto);
      return product;
    } catch (error) {
        if (error instanceof HttpException) {
            // 这里处理 HttpException
            throw error
          } else {
            // 这里处理非 HttpException 的错误
            throw new HttpException('Internal Server Error', HttpStatus.INTERNAL_SERVER_ERROR);
          }
    }
  }

  @Get()
  async getAll() {
    return await this.productService.getProductsList();
  }

  @Get(':id')
  async getProductById(@Param('id') id: number) {
    return this.productService.getProductDetailById(id);
  }
}