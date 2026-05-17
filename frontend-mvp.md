# Frontend MVP

## Mudancas aplicadas

- A home deixou de ser uma pagina explicativa e virou uma central operacional com dados reais da API publica.
- A autenticacao do frontend passou a ter entrada explicita como CUSTOMER ou MERCHANT, bootstrap de sessao em /api/me e integracao com login/logout do backend.
- A area do cliente foi simplificada para focar em selecao de loja, atualizacao de lista e visualizacao de cardapio.
- O fluxo do cliente agora inclui sacola persistida na sessao da aba e checkout minimo com criacao real de pedido em /api/orders.
- A area do lojista passou a refletir as regras atuais do backend: leitura da sessao em /api/me, listagem das lojas do proprio lojista em /api/me/establishments e tratamento claro de 401/403.
- O frontend ganhou tipos e cliente HTTP para a conta autenticada do usuario.
- Mensagens de erro passaram a diferenciar sessao ausente, falta de permissao e falhas de checkout.

## Como testar o MVP

1. Suba o backend na porta 8080.
2. No frontend, execute npm start dentro de frontend.
3. Abra a raiz da aplicacao e valide se a home carrega estabelecimentos reais e mostra entrada explicita como cliente ou lojista.
4. Entre em /cliente, confirme troca de loja, carregamento de produtos e adicao de itens na sacola.
5. Faça login como CUSTOMER, finalize um pedido minimo e confirme a limpeza da sacola com mensagem de sucesso.
6. Entre em /estabelecimento com uma sessao MERCHANT para validar cadastro de loja e publicacao de produtos.

## Limitacoes atuais

- O checkout ainda nao cobre endereco de entrega, frete, descontos ou pagamento real.
- O frontend ainda nao possui historico de pedidos nem acompanhamento de status.
- A area do lojista ainda nao acompanha os pedidos recebidos.

## Proximos passos

1. Adicionar status de pedido para cliente e lojista.
2. Evoluir o checkout com endereco, frete, descontos e pagamento real.
3. Evoluir a area do lojista com edicao de loja, edicao de produto e disponibilidade em tempo real.