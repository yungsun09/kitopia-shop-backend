import { BaseEntity } from 'src/base.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { ProductImageType } from './product.enmu';

@Entity()
export class Product extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column('text')
  description: string;

  @Column()
  showPrice: number;

  @Column()
  cover: string;

  // 与SKU表建立一对多关系
  @OneToMany(() => Sku, sku => sku.product)
  skus: Sku[];

  // 与ProductImage表建立一对多关系
  @OneToMany(() => ProductImage, productImage => productImage.product)
  productImages: ProductImage[];
}

@Entity()
export class ProductImage{
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  order: string;

  @Column({ length: 100 })
  url: string;

  @Column({
    type: 'enum',
    enum: ProductImageType,
    default: ProductImageType.LIST
  })
  type: ProductImageType;

  // 与Product表建立一对多关系
  @ManyToOne(() => Product, product => product.id)
  product: Product;
}

@Entity()
export class Attribute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;  // 如 'Color', 'Size'

  @ManyToOne(() => Product, product => product.id)
  product: Product;
}

@Entity()
export class AttributeValue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  value: string;  // 如 'Red', 'Large'

  @ManyToOne(() => Attribute, attribute => attribute.id)
  attribute: Attribute;
}

@Entity()
export class Sku {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Product, product => product.skus)
  product: Product;

  @Column()
  price: number;

  @Column()
  stock: number;

  // SKU与属性值是多对多关系
  @ManyToMany(() => AttributeValue)
  @JoinTable()
  attributeValues: AttributeValue[];
}