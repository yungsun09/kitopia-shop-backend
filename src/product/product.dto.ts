import { IsString, IsNotEmpty, IsNumber, IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAttributeValueDto {
  @IsInt()
  @Min(1)
  attributeId: number;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  attributeName: any;
}

export class CreateSkuDto {
  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttributeValueDto)
  attributeValues: CreateAttributeValueDto[];
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSkuDto)
  skus: CreateSkuDto[];
}