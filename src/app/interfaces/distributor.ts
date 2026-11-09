export interface Distributor {
  id: string;
  idDistributor?: string;
  nameDistributor: string;
  localizationDistributor: string;
  salespeopleDistributor: string[];
  typeDistributor: string;
  telephones: string[];
  CNPJ: string;
  cnpj?: string;
}

export interface DistributorSaveDto {
  nameDistributor: string;
  localizationDistributor: string;
  salespeopleDistributor: string[];
  typeDistributor: string;
  telephones: string[];
  CNPJ: string;
}
