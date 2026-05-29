# Frontend MVP

## Mudancas aplicadas

- A home deixou de ser uma pagina explicativa e virou uma central operacional com dados reais da API publica.
- A autenticacao do frontend passou a ter entrada explicita como CUSTOMER ou MERCHANT, bootstrap de sessao em /api/me e integracao com login/logout do backend.
- A area do cliente foi simplificada para focar em selecao de loja, atualizacao de lista e visualizacao de cardapio.
- O fluxo do cliente agora inclui sacola persistida na sessao da aba, agenda de enderecos salvos por conta CUSTOMER e checkout com criacao real de pedido em /api/orders.
- O checkout do cliente passou a carregar o endereco padrao automaticamente, permitir troca de endereco so para o pedido atual e cadastrar, editar, remover ou redefinir o endereco padrao sem sair da tela.
- A area do lojista passou a refletir as regras atuais do backend: leitura da sessao em /api/me, listagem das lojas do proprio lojista em /api/me/establishments, inbox de pedidos recebidos por loja e atualizacao manual do status operacional.
- O frontend ganhou tipos e cliente HTTP para a conta autenticada do usuario.
- Mensagens de erro passaram a diferenciar sessao ausente, falta de permissao e falhas de checkout.

## Como testar o MVP

1. Suba o backend na porta 8080.
2. No frontend, execute npm start dentro de frontend.
3. Abra a raiz da aplicacao e valide se a home carrega estabelecimentos reais e mostra entrada explicita como cliente ou lojista.
4. Entre em /cliente, confirme troca de loja, carregamento de produtos e adicao de itens na sacola.
5. Faça login como CUSTOMER, confirme o carregamento da agenda de enderecos, cadastre o primeiro endereco, edite ou remova um endereco salvo, altere o endereco padrao quando houver mais de um e finalize um pedido com o endereco selecionado.
6. Entre em /estabelecimento com uma sessao MERCHANT para validar cadastro de loja, publicacao de produtos, carregamento dos pedidos recebidos e avancos de status.

## Limitacoes atuais

1- O checkout ainda nao cobre frete, descontos ou pagamento real.
2- O frontend ainda nao possui historico de pedidos do cliente nem uma tela dedicada de acompanhamento para o consumidor.
3- A area do lojista ainda nao cobre edicao de loja, edicao de produto ou disponibilidade em tempo real.
4- A agenda de enderecos do cliente ainda nao possui confirmacao visual antes de remover um endereco salvo.

## Proximos passos

1. Adicionar historico de pedidos e acompanhamento de status para o cliente.
2. Evoluir o checkout com frete, descontos e pagamento real.
3. Evoluir a area do lojista com edicao de loja, edicao de produto e disponibilidade em tempo real.