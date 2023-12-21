import { Test, TestingModule } from '@nestjs/testing'
import { ProductService } from './product.service'
import { Repository } from 'typeorm'
import { Attribute, AttributeValue, Product, Sku } from './product.entity'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'

describe('ProductService', () => {
  let service: ProductService
  let productRepository: Repository<Product>
  let skuRepository: Repository<Sku>
  let attributeRepository: Repository<Attribute>
  let attributeValueRepository: Repository<AttributeValue>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getRepositoryToken(Product),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Sku),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Attribute),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AttributeValue),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile()

    // 获取服务和仓库实例
    service = module.get<ProductService>(ProductService)
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product))
    skuRepository = module.get<Repository<Sku>>(getRepositoryToken(Sku))
    attributeRepository = module.get<Repository<Attribute>>(getRepositoryToken(Attribute))
    attributeValueRepository = module.get<Repository<AttributeValue>>(getRepositoryToken(AttributeValue))
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('createProductEntity', () => {
    it('should create a new product entity', async () => {
      const productData = {
        name: 'Test Product',
        description: 'This is a test product',
        coverUrl: 'http://example.com/cover.jpg',
      }
      const expectedProduct = new Product()
      jest.spyOn(productRepository, 'create').mockReturnValue(expectedProduct)
      jest.spyOn(productRepository, 'save').mockResolvedValue(expectedProduct)

      const result = await service.createProductEntity(productData)

      expect(productRepository.create).toHaveBeenCalledWith(productData)
      expect(productRepository.save).toHaveBeenCalledWith(expectedProduct)
      expect(result).toEqual(expectedProduct)
    })
  })

  describe('createSku', () => {
    it('should create a SKU for the product', async () => {
      const productId = 1
      const skuData = { price: 100, stock: 20 }
      const product = new Product()
      const sku = new Sku()

      jest.spyOn(productRepository, 'findOneBy').mockResolvedValue(product)
      jest.spyOn(skuRepository, 'create').mockReturnValue(sku)
      jest.spyOn(skuRepository, 'save').mockResolvedValue(sku)

      const result = await service.createSku(productId, skuData)

      expect(productRepository.findOneBy).toHaveBeenCalledWith({ id: productId })
      expect(skuRepository.create).toHaveBeenCalledWith({ product: product, ...skuData })
      expect(skuRepository.save).toHaveBeenCalledWith(sku)
      expect(result).toEqual(sku)
    })

    it('should throw NotFoundException if product is not found', async () => {
      const productId = 1
      const skuData = { price: 100, stock: 20 }

      jest.spyOn(productRepository, 'findOneBy').mockResolvedValue(null)

      await expect(service.createSku(productId, skuData)).rejects.toThrow(NotFoundException)
    })
  })

  describe('createAttribute', () => {
    it('should create an attribute for the product', async () => {
      const productId = 1
      const attributeName = 'Size'
      const product = new Product()
      const attribute = new Attribute()

      jest.spyOn(productRepository, 'findOneBy').mockResolvedValue(product)
      jest.spyOn(attributeRepository, 'create').mockReturnValue(attribute)
      jest.spyOn(attributeRepository, 'save').mockResolvedValue(attribute)

      const result = await service.createAttribute(productId, attributeName)

      expect(productRepository.findOneBy).toHaveBeenCalledWith({ id: productId })
      expect(attributeRepository.create).toHaveBeenCalledWith({ name: attributeName, product: product })
      expect(attributeRepository.save).toHaveBeenCalledWith(attribute)
      expect(result).toEqual(attribute)
    })

    it('should throw NotFoundException if product is not found', async () => {
      const productId = 1
      const attributeName = 'Size'

      jest.spyOn(productRepository, 'findOneBy').mockResolvedValue(null)

      await expect(service.createAttribute(productId, attributeName)).rejects.toThrow(NotFoundException)
    })
  })

  describe('createAttributeValue', () => {
    it('should create an attribute value', async () => {
      const attributeValue = new AttributeValue()
      const attributeValueData = { value: 'Large' }
      const attributeId = 1
      const attribute = new Attribute()

      jest.spyOn(attributeRepository, 'findOneBy').mockResolvedValue(attribute)
      jest.spyOn(attributeValueRepository, 'create').mockReturnValue(attributeValue)
      jest.spyOn(attributeValueRepository, 'save').mockResolvedValue(attributeValue)

      const result = await service.createAttributeValue(attributeId, attributeValueData.value)

      expect(attributeRepository.findOneBy).toHaveBeenCalledWith({ id: attributeId })
      expect(attributeValueRepository.create).toHaveBeenCalledWith({
        value: attributeValueData.value,
        attribute: attribute,
      })
      expect(attributeValueRepository.save).toHaveBeenCalledWith(attributeValue)
      expect(result).toEqual(attributeValue)
    })

    it('should throw NotFoundException if attribute is not found', async () => {
      const attributeId = 1
      const value = 'Large'

      jest.spyOn(attributeRepository, 'findOneBy').mockResolvedValue(undefined)

      await expect(service.createAttributeValue(attributeId, value)).rejects.toThrow(NotFoundException)
    })
  })

  describe('Product Creation Workflow', () => {
    it('should create a product, SKU, attribute, attribute value, and link them together', async () => {
      // Step 1: Create a new product
      const productData = {
        name: 'Test Product',
        description: 'This is a test product',
        coverUrl: 'http://example.com/cover.jpg',
      }
      const newProduct = new Product()
      jest.spyOn(productRepository, 'create').mockReturnValue(newProduct)
      jest.spyOn(productRepository, 'save').mockResolvedValue(newProduct)
      const createdProduct = await service.createProductEntity(productData)

      // Step 2: Create a SKU for the product
      const skuData = { price: 100, stock: 20 }
      const newSku = new Sku()
      jest.spyOn(skuRepository, 'create').mockReturnValue(newSku)
      jest.spyOn(skuRepository, 'save').mockResolvedValue(newSku)
      const createdSku = await service.createSku(createdProduct.id, skuData)

      // Step 3: Create an attribute for the product
      const attributeName = 'Size'
      const newAttribute = new Attribute()
      jest.spyOn(attributeRepository, 'create').mockReturnValue(newAttribute)
      jest.spyOn(attributeRepository, 'save').mockResolvedValue(newAttribute)
      const createdAttribute = await service.createAttribute(createdProduct.id, attributeName)

      // Step 4: Create an attribute value for the attribute
      const attributeValueData = 'Large'
      const newAttributeValue = new AttributeValue()
      jest.spyOn(attributeValueRepository, 'create').mockReturnValue(newAttributeValue)
      jest.spyOn(attributeValueRepository, 'save').mockResolvedValue(newAttributeValue)
      const createdAttributeValue = await service.createAttributeValue(createdAttribute.id, attributeValueData)

      // Step 5: Add the attribute value to the SKU
      jest.spyOn(skuRepository, 'findOne').mockResolvedValue(createdSku)
      jest.spyOn(attributeValueRepository, 'findBy').mockResolvedValue([createdAttributeValue])
      jest.spyOn(skuRepository, 'save').mockResolvedValue({
        ...createdSku,
        attributeValues: [createdAttributeValue],
      })

      const updatedSku = await service.addAttributeValuesToSku(createdSku.id, [createdAttributeValue.id])

      // Final assertions to verify the workflow
      expect(createdProduct).toEqual(newProduct)
      expect(createdSku).toEqual(newSku)
      expect(createdAttribute).toEqual(newAttribute)
      expect(createdAttributeValue).toEqual(newAttributeValue)
      expect(updatedSku.attributeValues).toContainEqual(createdAttributeValue)
    })
  })
})
