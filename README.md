# System Pet Shop — Frontend

Aplicação web para organizar distribuidores, marcas e produtos de um pet shop, acompanhar vencimentos e consultar métricas e histórico de preços. Desenvolvida com Angular e integrada a uma API HTTP.

O fluxo principal de cadastro segue a hierarquia **Distribuidor → Marca → Produto**. A interface está dividida nas abas **Cadastro**, **Vencimento** e **Métricas**.

## Funcionalidades

### Cadastro

- **Distribuidores:** cadastro, listagem, busca por nome e exclusão com confirmação. Armazena nome, localização, tipo, CNPJ, vendedores e telefones.
- **Marcas:** cadastro vinculado ao distribuidor, listagem, busca por nome, edição de nome e tipo e exclusão com confirmação.
- **Produtos:** cadastro vinculado à marca e ao distribuidor, busca por nome, edição e exclusão com confirmação. Inclui descrição, datas de criação e validade, lote, preços de compra e venda e quantidade em estoque.
- **Cadastro por imagem:** envio de uma ou mais imagens para a API identificar informações e preencher o formulário do produto.
- **Cálculo do preço de venda:** aplicação de uma porcentagem sobre o preço de compra, com possibilidade de ajuste manual do preço final.
- **Novas versões de produtos:** alteração de valores, lote, datas e estoque pelo fluxo de nova versão, utilizado pelo histórico de preços.
- **Navegação:** listas paginadas, formulários recolhíveis e alternância entre visualização em grade e lista. A preferência de visualização e a porcentagem de venda são salvas no navegador.

### Vencimento

- Consulta paginada dos produtos com informações de validade, lote e estoque.
- Busca por nome e filtros para todos os produtos, produtos vencidos ou não vencidos.
- Verificação automática da situação de validade por meio da API ao carregar a lista.
- Destaque para produtos vencidos e próximos do vencimento, conforme a resposta da API.
- Produtos vencidos aparecem primeiro dentro de cada página.

### Métricas

- Navegação por distribuidor, marca e produto, com busca por nome e paginação.
- Totais de compra e venda e diferença entre esses valores, apresentada como lucro total na interface.
- Gráficos de rosca com detalhamento por distribuidor ou marca.
- Comparação de compra e venda por marca em colunas.
- Histórico de preços de compra e venda dos produtos em gráficos de linhas ou colunas, ordenado por versão.
- Valores monetários formatados em reais (BRL).

Os totais dependem dos dados fornecidos pela API. O histórico de um produto utiliza as versões presentes na página carregada. Este frontend não implementa registro de vendas ou movimentações de caixa.

## Tecnologias

| Tecnologia | Uso |
| --- | --- |
| Angular 21.1 | Componentes e estrutura da aplicação |
| TypeScript 5.9 | Código da aplicação |
| RxJS 7.8 | Requisições e fluxos assíncronos |
| Angular Forms e HttpClient | Formulários e integração HTTP |
| ApexCharts e ng-apexcharts | Gráficos de métricas |
| Vitest e jsdom | Testes unitários |
| CSS | Estilos da interface |

## Pré-requisitos

- **Node.js 22.18 ou superior na linha 22.x**, ou **Node.js 24 ou superior**.
- **npm**; o projeto declara `npm@11.2.0` como gerenciador.
- Uma API compatível com os serviços deste frontend, em execução e acessível pelo navegador.

Este repositório contém apenas o frontend. O backend e o banco de dados devem ser configurados separadamente. Sem a API, a interface pode iniciar, mas as consultas e operações de cadastro não funcionarão.

## Instalação e execução

### 1. Instalar as dependências

Com o repositório disponível localmente, abra um terminal na pasta do projeto e execute:

```bash
npm ci
```

O comando instala as dependências de acordo com o `package-lock.json`.

### 2. Configurar a API

Crie um arquivo chamado `.env` na raiz do projeto, ao lado do `package.json`, com o conteúdo:

```dotenv
API_URL=http://localhost:8080
```

Substitua o endereço pela URL base do seu backend. Não acrescente `/product`, `/brand`, `/distributor` ou `/expired`: os serviços adicionam esses caminhos automaticamente.

A configuração segue esta prioridade:

1. Variável `API_URL` definida no ambiente do processo.
2. Valor de `API_URL` no arquivo `.env`.
3. Endereço padrão `http://localhost:8080`.

A URL deve usar HTTP ou HTTPS e não conter query string nem fragmento. Barras finais são removidas automaticamente.

O script `scripts/generate-env.mjs` gera `src/environments/environment.ts` antes dos comandos de desenvolvimento, build e testes. Tanto `.env` quanto o arquivo gerado são ignorados pelo Git. Reinicie o comando após alterar a configuração; para uma versão já compilada, gere um novo build.

Use apenas configurações públicas nesse arquivo: a URL da API é incluída no código enviado ao navegador.

### 3. Iniciar o backend

Inicie a API no endereço definido em `API_URL`. Caso frontend e backend usem origens diferentes, o backend deve permitir as requisições da origem do frontend via CORS; no desenvolvimento padrão, essa origem é `http://localhost:4200`.

### 4. Iniciar o frontend

```bash
npm start
```

Acesse [http://localhost:4200](http://localhost:4200). O servidor de desenvolvimento recarrega a aplicação quando os arquivos do projeto são alterados.

Para utilizar outra porta:

```bash
npm start -- --port 4300
```

Nesse caso, ajuste também a origem permitida pelo backend, se necessário.

## Como utilizar

### Cadastrar distribuidores e marcas

1. Abra a aba **Cadastro** e expanda o formulário de distribuidor.
2. Preencha nome, localização, tipo e CNPJ. Informe vendedores e telefones quando disponíveis; múltiplos valores podem ser separados por vírgulas ou quebras de linha.
3. Clique em **Adicionar distribuidor**.
4. Abra as marcas do distribuidor cadastrado.
5. Expanda o formulário de marca, preencha nome e tipo e salve.
6. Abra os produtos da marca para continuar o cadastro.

### Cadastrar produtos

1. Na listagem de produtos da marca, expanda o formulário de cadastro.
2. Preencha nome, tipo, descrição, data de criação, validade, lote, preço de compra e estoque.
3. Informe a **Porcentagem de venda (%)** para calcular o preço de venda automaticamente. O preço final também pode ser editado manualmente.
4. Confira os dados e salve o produto. O vínculo com a marca e o distribuidor selecionados é preenchido pela aplicação.

O cálculo utilizado é:

```text
preço de venda = preço de compra × (1 + porcentagem / 100)
```

Por exemplo, um preço de compra de R$ 100,00 com porcentagem de 30% resulta em R$ 130,00. A porcentagem representa um acréscimo sobre o custo.

Para preencher os dados por imagem:

1. No formulário do produto, adicione uma ou mais imagens na área **Cadastro por imagem**.
2. Clique em **Enviar imagens e preencher**.
3. Revise os campos identificados: nome, tipo, descrição, datas e lote.
4. Complete preços, estoque e informações ausentes antes de salvar.

A análise das imagens depende do endpoint `POST /product/scan` do backend. O preenchimento do formulário não salva o produto automaticamente.

### Editar produtos e registrar novos valores

- Use **Editar** para alterar tipo e descrição e depois **Salvar alterações**.
- Use **Editar valores e lote** para modificar datas, lote, preços ou estoque e depois **Salvar valores**. Esse fluxo envia uma nova versão para a API, permitindo acompanhar os preços na aba **Métricas**.
- Para excluir um distribuidor, marca ou produto, utilize a ação de exclusão e confirme na própria interface.

Nas listas de cadastro, as buscas por nome consultam a API; apagar o texto da busca restaura a listagem anterior. Use os controles de paginação para consultar outros registros. Os filtros por tipo possuem implementação nos componentes, mas seus seletores estão comentados nos templates e não estão disponíveis na interface atual.

### Consultar vencimentos

1. Abra a aba **Vencimento**.
2. Selecione **Todos os produtos**, **Produtos vencidos** ou **Produtos não vencidos**.
3. Para localizar um produto, digite o nome e clique em **Buscar** ou pressione Enter.
4. Consulte as datas, o estoque e a mensagem de validade apresentada em cada registro.
5. Utilize a paginação ou **Limpar filtros** para continuar a consulta.

A busca por nome retorna ao modo **Todos os produtos**. Os seletores de distribuidora e marca estão comentados no template atual e não ficam disponíveis nessa tela.

### Consultar métricas e histórico

1. Abra a aba **Métricas** para visualizar os distribuidores e seus totais.
2. Clique nas parcelas de compra ou venda do gráfico de rosca para detalhar os valores por distribuidor.
3. Selecione um distribuidor para consultar suas marcas. Nessa etapa, escolha entre gráfico de rosca e colunas por marca.
4. Selecione uma marca e depois um produto para visualizar o histórico de preços.
5. Alterne o tipo de gráfico entre linhas e colunas para comparar os preços das versões carregadas.

## Comandos disponíveis

| Comando | Finalidade |
| --- | --- |
| `npm start` | Gera a configuração e inicia o servidor de desenvolvimento |
| `npm run build` | Gera a configuração e compila para produção |
| `npm run watch` | Gera a configuração e recompila em modo de desenvolvimento a cada alteração |
| `npm test` | Gera a configuração e executa os testes unitários |
| `npm test -- --watch=false` | Executa os testes uma única vez |
| `npm run env:generate` | Gera apenas o arquivo de configuração da API |
| `npm run ng -- <comando>` | Executa o Angular CLI local |

Ao usar o Angular CLI diretamente, execute `npm run env:generate` antes de comandos que compilam a aplicação. Não há configuração de testes end-to-end neste repositório.

## Build de produção

```bash
npm run build
```

Os artefatos são gerados em `dist/systemPetShopFront/`; os arquivos destinados à hospedagem estática ficam em `dist/systemPetShopFront/browser/`.

Defina a URL da API de produção antes de compilar e publique o conteúdo da pasta `browser` em um servidor de arquivos estáticos. O endereço da API precisa ser acessível pelos navegadores dos usuários. Em uma página servida por HTTPS, utilize também uma API HTTPS.

## Estrutura do projeto

```text
public/assets/                  Imagens e ícones da interface
scripts/generate-env.mjs         Geração da configuração da API
src/
  app/
    components/
      main-component/           Navegação entre distribuidores, marcas e produtos
      distributor-component/    Cadastro e consulta de distribuidores
      brand-component/          Cadastro e consulta de marcas
      product-component/        Produtos, imagens e novas versões
      vencimento-component/     Consulta e verificação de validade
      metrics-component/        Totais e gráficos de preços
      view-mode-preference.ts   Preferências de grade/lista
    interfaces/                 Tipos de dados e contratos da API
    service/                    Serviços HTTP e comunicação entre componentes
    app.ts                      Controle das abas principais
    app.html                    Estrutura principal da interface
  environments/environment.ts   Arquivo gerado automaticamente
  styles.css                    Estilos globais
angular.json                    Configuração de build, servidor e testes
package.json                    Dependências e scripts
```

Os arquivos `*.spec.ts` ficam próximos aos componentes e serviços testados. A navegação principal é controlada por componentes e abas; `app.routes.ts` não define rotas atualmente.

## Integração com o backend

Os contratos utilizados pelo frontend estão em `src/app/interfaces/`, e os métodos HTTP e parâmetros estão em `src/app/service/`.

| Recurso | Caminhos utilizados |
| --- | --- |
| Distribuidores | `/distributor/all`, `/save`, `/delete`, `/search`, `/metrics`, `/metrics/search`, `/metricDistributor`, `/metricDistributorTotal` |
| Marcas | `/brand/all`, `/save`, `/edit`, `/delete`, `/search`, `/metrics`, `/metrics/search`, `/metricBrand`, `/metricsTotal` |
| Produtos | `/product/all`, `/save`, `/edit`, `/delete`, `/search`, `/newVersion`, `/scan`, `/metricProduct`, `/metrics/search` |
| Vencimentos | `/expired/findAll`, `/filter`, `/search`, `/productExpiredVerify` |

Em cada linha, os caminhos abreviados usam o mesmo prefixo do primeiro caminho. Por exemplo, `/save` na linha de produtos corresponde a `/product/save`. Os serviços também possuem métodos para `/product/allDueProduct`, `/product/productDueVerify` e `/distributor/teste`.

As consultas paginadas enviam `page` a partir de zero e esperam arrays de registros. O envio de imagens utiliza `multipart/form-data`, com os arquivos no campo `imgs`.

## Solução de problemas

| Situação | O que verificar |
| --- | --- |
| A aplicação abre, mas não carrega os dados | Confirme se o backend está em execução, se `API_URL` está correta e se a API permite a origem do frontend via CORS. |
| A URL da API continua antiga | Verifique se há uma variável `API_URL` no processo sobrescrevendo o `.env`, reinicie o comando e gere novamente o build quando necessário. |
| Erro de importação de `environment.ts` | Execute `npm run env:generate` ou inicie pelo comando `npm start`. |
| Erro ao gerar a configuração | Confira a versão do Node.js e se `API_URL` é uma URL HTTP(S) válida, sem query string ou fragmento. |
| A porta 4200 está ocupada | Utilize `npm start -- --port 4300`. |
| As imagens não preenchem o formulário | Verifique a resposta de `/product/scan` e a disponibilidade do processamento de imagens no backend. |
| Um gráfico não apresenta todo o histórico | O gráfico do produto usa as versões retornadas na página atual; consulte a paginação e os dados da API. |
