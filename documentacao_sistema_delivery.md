# Documento de Levantamento de Requisitos

## Sistema de Delivery para Restaurantes e Lanchonetes

## 1. Visão Geral do Projeto

### 1.1 Objetivo

Desenvolver um sistema de delivery para restaurantes e lanchonetes que
permita aos clientes visualizar cardápios, realizar pedidos, acompanhar
status em tempo real, efetuar pagamentos e avaliar estabelecimentos.

O sistema também deve permitir que os estabelecimentos gerenciem
cardápio, pedidos, descontos e atualizações operacionais.

------------------------------------------------------------------------

## 2. Objetivo do Negócio

-   Digitalizar o processo de pedidos.
-   Melhorar a comunicação entre cliente e estabelecimento.
-   Reduzir erros em pedidos.
-   Automatizar acompanhamento de status.
-   Aumentar conversão por meio de promoções.
-   Melhorar experiência do cliente.

------------------------------------------------------------------------

## 3. Perfis de Usuários

### Cliente

-   Visualizar cardápio
-   Adicionar itens na sacola
-   Finalizar pedido
-   Efetuar pagamento
-   Acompanhar status
-   Avaliar estabelecimento

### Estabelecimento

-   Cadastro do estabelecimento
-   Cadastro do cardápio
-   Gerenciamento de pedidos
-   Aplicação de descontos
-   Atualização de status

------------------------------------------------------------------------

## 4. Requisitos Funcionais

### RF01 --- Cadastro de Estabelecimento

O sistema deve permitir o cadastro de estabelecimentos.

**Dados cadastrais:** - Nome fantasia - Razão social - CNPJ - Telefone -
E-mail - Categoria - Horário de funcionamento

**Endereço:** - CEP - Rua - Número - Bairro - Cidade - Estado -
Complemento

**Regras:** - Campos obrigatórios devem ser validados. - CNPJ não pode
ser duplicado.

------------------------------------------------------------------------

### RF02 --- Cadastro e Listagem do Cardápio

O sistema deve permitir que o estabelecimento cadastre produtos.

**Campos:** - Nome do item - Descrição - Categoria - Preço - Foto -
Disponibilidade

**Categorias:** - Entradas - Pratos principais - Sobremesas - Bebidas -
Combos

**Regras:** - Todo item deve pertencer a uma categoria. - Foto do
produto é obrigatória.

------------------------------------------------------------------------

### RF03 --- Sacola de Compras

Funcionalidades: - Adicionar item - Remover item - Alterar quantidade -
Calcular subtotal

**Fórmula:**\
Subtotal = Σ (preço × quantidade)

------------------------------------------------------------------------

### RF04 --- Aplicação de Descontos

Tipos: - Frete grátis - Desconto percentual - Desconto fixo - Promoção
por valor mínimo

------------------------------------------------------------------------

### RF05 --- Gestão de Pagamentos

Formas aceitas: - PIX - Cartão de crédito - Pagamento na entrega

**Regra:**\
Se for pagamento na entrega, o cliente deve informar se precisa de
troco.

------------------------------------------------------------------------

### RF06 --- Acompanhamento de Pedido

Status: - Aguardando confirmação da loja - Aguardando confirmação de
pagamento - Pagamento confirmado - Pedido sendo preparado - Pedido em
rota de entrega - Entrega confirmada

------------------------------------------------------------------------

### RF07 --- Notificações

Eventos: - Pedido recebido - Pagamento pendente - Pagamento confirmado -
Pedido em preparo - Saiu para entrega - Pedido entregue

------------------------------------------------------------------------

### RF08 --- Feedback

Após a entrega confirmada, o cliente poderá avaliar: - Nota (1 a 5) -
Comentário

------------------------------------------------------------------------

### RF09 --- Modais de Confirmação

Todas as operações devem exibir: - Modal de sucesso - Modal de erro

------------------------------------------------------------------------

## 5. Regras de Negócio

-   Um estabelecimento só pode operar com cadastro completo.
-   Um pedido só pode ser preparado após confirmação do pagamento
    (exceto pagamento na entrega).
-   Descontos não podem gerar valor negativo.
-   Feedback só pode ser enviado após entrega confirmada.
-   Pedidos não podem ser alterados após confirmação.

------------------------------------------------------------------------

## 6. Requisitos Não Funcionais

-   Performance: resposta em até 2 segundos.
-   Disponibilidade mínima de 99%.
-   Segurança com HTTPS e autenticação.
-   Compatibilidade com desktop, tablet e mobile.
-   Escalabilidade para múltiplos estabelecimentos.

------------------------------------------------------------------------

## 7. Fluxo Principal do Pedido

### Cliente

1.  Acessa cardápio
2.  Seleciona itens
3.  Adiciona à sacola
4.  Escolhe pagamento
5.  Finaliza pedido
6.  Acompanha status
7.  Recebe pedido
8.  Avalia

### Estabelecimento

1.  Recebe pedido
2.  Confirma pedido
3.  Confirma pagamento
4.  Prepara pedido
5.  Atualiza status
6.  Finaliza entrega

------------------------------------------------------------------------

## 8. Modelo Inicial de Entidades

### Estabelecimento

-   id
-   nome
-   cnpj
-   telefone
-   email
-   endereço

### Produto

-   id
-   nome
-   descrição
-   preço
-   imagem
-   categoria

### Pedido

-   id
-   cliente_id
-   status
-   valor_total
-   forma_pagamento

### Pagamento

-   id
-   pedido_id
-   tipo
-   status

### Feedback

-   id
-   pedido_id
-   nota
-   comentário

### Promoção

-   id
-   tipo
-   valor
-   validade
