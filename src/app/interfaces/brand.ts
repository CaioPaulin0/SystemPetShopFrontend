export interface Brand {
  idBrand: string;
  idDistributor: string;
  nameBrand: string;
  typeBrand: string;
}

export interface BrandDto {
  idDistributor: string;
  nameBrand: string;
  typeBrand: string;
}

export interface BrandFindAllByDistributorDto {
  idDistributor: string;
}

// Alias kept for callers that use the DTO name from the API documentation.
export type BrandFindAllDistributorDTO = BrandFindAllByDistributorDto;

export interface BrandEditDto {
  idBrand: string;
  idDistributor: string;
  nameBrand: string;
  typeBrand: string;
}
