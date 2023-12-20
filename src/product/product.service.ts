// productService.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { Attribute, Product, AttributeValue, Sku } from './product.entity';
import { CreateProductDto } from './product.dto';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Sku)
    private skuRepository: Repository<Sku>,
    @InjectRepository(AttributeValue)
    private attributeValueRepository: Repository<AttributeValue>,
    @InjectRepository(Attribute)
    private attributeRepository: Repository<Attribute>,
    private entityManager: EntityManager,
  ) {}

  private transformAttributeValues(data) {
    // 创建一个新的对象来存储转换后的数据
    const transformedData = { ...data };
  
    // 针对每个SKU进行转换
    transformedData.skus = data.skus.map(sku => ({
      ...sku, // 保留其他属性不变
      attributeValues: sku.attributeValues.map(attrValue => ({
        attributeId: attrValue.attribute.id,
        attributeName: attrValue.attribute.name,
        attributeValueId: attrValue.id,
        attributeValue: attrValue.value,
      }))
    }));
  
    // 返回转换后的数据
    return transformedData;
  }

  async createProduct(productData: CreateProductDto): Promise<Product> {
    // 使用事务处理创建产品和SKU
    const product = await this.entityManager.transaction(async (manager) => {
      // 创建新产品
      const newProduct = manager.create(Product, {
        name: productData.name,
        description: productData.description,
      });
      await manager.save(newProduct);

      // 遍历SKU数据
      for (const skuData of productData.skus) {
        // 创建SKU
        const sku = manager.create(Sku, {
          product: newProduct,
          price: skuData.price,
          stock: skuData.stock,
        });
        await manager.save(sku);

        // 遍历属性值数据
        for (const attributeValueData of skuData.attributeValues) {
          // 确认属性是否存在
          let attribute = await manager.findOneBy(Attribute, {
            id: attributeValueData.attributeId,
          });
          if (!attribute) {
            if (!attributeValueData.attributeName) {
              throw new BadRequestException('attributeName is required');
            }
            const sameNameAttribute = await manager.findOneBy(Attribute, {
              name: attributeValueData.attributeName,
              product: newProduct,
            });
            if (sameNameAttribute) {
              // 如果同名属性存在，使用同名属性
              attribute = sameNameAttribute;
            } else {
              // 如果属性不存在，创建属性
              attribute = manager.create(Attribute, {
                name: attributeValueData.attributeName,
              });
              await manager.save(attribute);
            }
          }

          // 创建属性值
          const attributeValue = manager.create(AttributeValue, {
            value: attributeValueData.value,
            attribute: attribute,
          });
          await manager.save(attributeValue);

          // 关联属性值到SKU
          sku.attributeValues = [
            ...(sku.attributeValues || []),
            attributeValue,
          ];
        }

        // 保存SKU的属性值关联
        await manager.save(sku);
      }

      // 返回新创建的产品
      return newProduct;
    });

    // 获取并返回完整的产品数据
    return this.productRepository.findOne({
      where: { id: product.id }, // 确保这里使用的是正确的属性来定位产品
      relations: [
        'skus',
        'skus.attributeValues',
        'skus.attributeValues.attribute',
      ],
    });
  }

  async getProductsList(
    page: number = 1, // 默认为第一页
    pageSize: number = 10, // 默认每页10条记录
  ): Promise<{ data: Product[]; count: number; totalPages: number }> {
    const [result, total] = await this.productRepository.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
    });
    return {
      data: result,
      count: total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getProductDetailById(productId: number): Promise<Product> {
    const data = await this.productRepository.findOne({
      where: { id: productId }, // 商品id
      relations: [
        'skus',
        'skus.attributeValues',
        'skus.attributeValues.attribute',
        'productImages'
      ],
    });

    return this.transformAttributeValues(data)
  }
}
