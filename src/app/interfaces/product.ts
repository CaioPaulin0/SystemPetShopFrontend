export interface Product {
  idProduct: string;
  idBrand: string;
  idDistributor: string;
  nameProduct: string;
  typeProduct: string;
  descriptionProduct: string;
  dataCreatedProduct: string;
  dataDueProduct: string;
  versionProduct: number;
  lotProduct: string;
  priceBuy: number;
  priceSell: number;
  stockProduct: number;
  dataDueProductVerify: boolean;
}

export interface ProductDueResponse {
  idProduct?: string;
  idDistributor?: string;
  idBrand?: string;
  dataCreated: string;
  dataCreatedProduct: string;
  dataDueProduct: string;
  nameProduct: string;
  stockProduct: number;
  dataDueProductVerify: boolean;
}

export interface ProductDto {
  idBrand: string;
  idDistributor: string;
  nameProduct: string;
  typeProduct: string;
  descriptionProduct: string;
  dataCreatedProduct: string;
  dataDueProduct: string;
  versionProduct: number;
  lotProduct: string;
  priceBuy: number;
  priceSell: number;
  stockProduct: number;
  dataDueProductVerify: boolean;
}

export interface ProductImageAIResponse {
  nameProduct: string | null;
  typeProduct: string | null;
  descriptionProduct: string | null;
  dataCreatedProduct: string | null;
  dataDueProduct: string | null;
  lotProduct: string | null;
}

// Alias for callers that use the DTO name from the API documentation.
export type ProductoDto = ProductDto;

export interface ProductIdFindAllDto {
  idBrand: string;
}

export interface ProductEditDto {
  idProduct: string;
  idBrand: string;
  idDistributor: string;
  typeProduct: string;
  descriptionProduct: string;
  dataCreatedProduct: string;
  dataDueProduct: string;
  versionProduct: number;
  lotProduct: string;
  priceBuy: number;
  priceSell: number;
  stockProduct: number;
}
