// productService.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, EntityManager, In } from 'typeorm'
import { Attribute, Product, AttributeValue, Sku } from './product.entity'
import { CreateProductDto, CreateSkuDto } from './product.dto'

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
    const transformedData = { ...data }

    // 针对每个SKU进行转换
    transformedData.skus = data.skus.map((sku) => ({
      ...sku, // 保留其他属性不变
      attributeValues: sku.attributeValues.map((attrValue) => ({
        attributeId: attrValue.attribute.id,
        attributeName: attrValue.attribute.name,
        attributeValueId: attrValue.id,
        attributeValue: attrValue.value,
      })),
    }))

    // 返回转换后的数据
    return transformedData
  }

  /**
   * 创建一个新的产品实体。
   *
   * @param {CreateProductDto} productData 产品的传输对象，包含所需的创建信息。
   * @returns {Promise<Product>} Promise类型的产品实体。
   */
  async createProductEntity(productData: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create({
      name: productData.name,
      description: productData.description,
      cover: productData.coverUrl,
    })
    return this.productRepository.save(product)
  }

  /**
   * 为指定的产品创建一个SKU。
   *
   * @param {number} productId 产品的唯一标识符。
   * @param {CreateSkuDto} skuData SKU的传输对象，包含价格和库存等信息。
   * @returns {Promise<Sku>} Promise类型的SKU实体。
   * @throws {NotFoundException} 如果没有找到指定的产品，抛出异常。
   */
  async createSku(productId: number, skuData: CreateSkuDto): Promise<Sku> {
    const product = await this.productRepository.findOneBy({ id: productId })
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`)
    }
    const sku = this.skuRepository.create({
      product: product,
      price: skuData.price,
      stock: skuData.stock,
    })
    return this.skuRepository.save(sku)
  }

  /**
   * 为指定的产品创建一个属性。
   *
   * @param {number} productId 产品的唯一标识符。
   * @param {string} attributeName 属性的名称。
   * @returns {Promise<Attribute>} Promise类型的属性实体。
   * @throws {NotFoundException} 如果没有找到指定的产品，抛出异常。
   */
  async createAttribute(productId: number, attributeName: string): Promise<Attribute> {
    const product = await this.productRepository.findOneBy({ id: productId })
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`)
    }
    const attribute = this.attributeRepository.create({
      name: attributeName,
      product: product,
    })
    return this.attributeRepository.save(attribute)
  }

  /**
   * 创建一个属性值。
   *
   * @param {number} attributeId 属性的唯一标识符。
   * @param {string} value 属性值的内容。
   * @returns {Promise<AttributeValue>} Promise类型的属性值实体。
   * @throws {NotFoundException} 如果没有找到指定的属性，抛出异常。
   */
  async createAttributeValue(attributeId: number, value: string): Promise<AttributeValue> {
    const attribute = await this.attributeRepository.findOneBy({ id: attributeId })
    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${attributeId} not found`)
    }
    const attributeValue = this.attributeValueRepository.create({
      value: value,
      attribute: attribute,
    })
    return this.attributeValueRepository.save(attributeValue)
  }

  /**
   * 将多个属性值添加到指定的SKU。
   *
   * @param {number} skuId SKU的唯一标识符。
   * @param {number[]} attributeValueIds 要添加到SKU的属性值ID数组。
   * @returns {Promise<Sku>} Promise类型的更新后的SKU实体。
   * @throws {NotFoundException} 如果没有找到SKU或任何属性值，抛出异常。
   */
  async addAttributeValuesToSku(skuId: number, attributeValueIds: number[]): Promise<Sku> {
    const sku = await this.skuRepository.findOne({
      where: { id: skuId },
      relations: ['attributeValues'],
    })
    if (!sku) {
      throw new NotFoundException(`未找到ID为 ${skuId} 的SKU`)
    }

    const attributeValues = await this.attributeValueRepository.findBy({
      id: In(attributeValueIds),
    })

    // 检查是否所有 attributeValueIds 都被找到了
    if (attributeValues.length !== attributeValueIds.length) {
      // 这里可以提供更多关于哪些ID未找到的细节
      throw new NotFoundException(`某些属性值未找到`)
    }

    // 将新的属性值添加到现有的属性值数组中
    sku.attributeValues = [...(sku.attributeValues || []), ...attributeValues]

    // 保存更新后的SKU实体
    return this.skuRepository.save(sku)
  }

  // async createProduct(productData: CreateProductDto): Promise<Product> {
  //   // 使用事务处理创建产品和SKU
  //   const product = await this.entityManager.transaction(async (manager) => {
  //     // 创建新产品
  //     const newProduct = manager.create(Product, {
  //       name: productData.name,
  //       description: productData.description,
  //     })
  //     await manager.save(newProduct)

  //     // 遍历SKU数据
  //     for (const skuData of productData.skus) {
  //       // 创建SKU
  //       const sku = manager.create(Sku, {
  //         product: newProduct,
  //         price: skuData.price,
  //         stock: skuData.stock,
  //       })
  //       await manager.save(sku)

  //       // 遍历属性值数据
  //       for (const attributeValueData of skuData.attributeValues) {
  //         // 确认属性是否存在
  //         let attribute = await manager.findOneBy(Attribute, {
  //           id: attributeValueData.attributeId,
  //         })
  //         if (!attribute) {
  //           if (!attributeValueData.attributeName) {
  //             throw new BadRequestException('attributeName is required')
  //           }
  //           const sameNameAttribute = await manager.findOneBy(Attribute, {
  //             name: attributeValueData.attributeName,
  //             product: newProduct,
  //           })
  //           if (sameNameAttribute) {
  //             // 如果同名属性存在，使用同名属性
  //             attribute = sameNameAttribute
  //           } else {
  //             // 如果属性不存在，创建属性
  //             attribute = manager.create(Attribute, {
  //               name: attributeValueData.attributeName,
  //             })
  //             await manager.save(attribute)
  //           }
  //         }

  //         // 创建属性值
  //         const attributeValue = manager.create(AttributeValue, {
  //           value: attributeValueData.value,
  //           attribute: attribute,
  //         })
  //         await manager.save(attributeValue)

  //         // 关联属性值到SKU
  //         sku.attributeValues = [...(sku.attributeValues || []), attributeValue]
  //       }

  //       // 保存SKU的属性值关联
  //       await manager.save(sku)
  //     }

  //     // 返回新创建的产品
  //     return newProduct
  //   })

  //   // 获取并返回完整的产品数据
  //   return this.productRepository.findOne({
  //     where: { id: product.id }, // 确保这里使用的是正确的属性来定位产品
  //     relations: ['skus', 'skus.attributeValues', 'skus.attributeValues.attribute'],
  //   })
  // }

  async getProductsList(
    page: number = 1, // 默认为第一页
    pageSize: number = 10, // 默认每页10条记录
  ): Promise<{ data: Product[]; count: number; totalPages: number }> {
    const [result, total] = await this.productRepository.findAndCount({
      take: pageSize,
      skip: (page - 1) * pageSize,
    })
    return {
      data: result,
      count: total,
      totalPages: Math.ceil(total / pageSize),
    }
  }

  async getProductDetailById(productId: number): Promise<Product> {
    const data = await this.productRepository.findOne({
      where: { id: productId }, // 商品id
      relations: ['skus', 'skus.attributeValues', 'skus.attributeValues.attribute', 'productImages'],
    })

    return this.transformAttributeValues(data)
  }
}
