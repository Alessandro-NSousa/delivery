# Frontend MVP

## Mudancas aplicadas

- A home deixou de ser uma pagina explicativa e virou uma central operacional com dados reais da API publica.
- A area do cliente foi simplificada para focar em selecao de loja, atualizacao de lista e visualizacao de cardapio.
- A area do lojista passou a refletir as regras atuais do backend: leitura da sessao em /api/me, listagem das lojas do proprio lojista em /api/me/establishments e tratamento claro de 401/403.
- O frontend ganhou tipos e cliente HTTP para a conta autenticada do usuario.
- Mensagens de erro passaram a diferenciar sessao ausente e falta de permissao.

## Como testar o MVP

1. Suba o backend na porta 8080.
2. No frontend, execute npm start dentro de frontend.
3. Abra a raiz da aplicacao e valide se a home carrega estabelecimentos reais.
4. Entre em /cliente e confirme troca de loja, carregamento de produtos e mensagens de vazio/erro.
5. Entre em /estabelecimento com uma sessao MERCHANT para validar cadastro de loja e publicacao de produtos.

## Limitacoes atuais

- O frontend ainda nao possui fluxo proprio de login/logout.
- A area do lojista depende de uma sessao autenticada ja estabelecida pelo backend.
- Ainda nao existe sacola, checkout ou gestao de pedidos.

## Proximos passos

1. Integrar autenticacao no frontend para entrada explicita como CUSTOMER ou MERCHANT.
2. Implementar sacola e checkout minimo no fluxo do cliente.
3. Adicionar status de pedido para cliente e lojista.
4. Evoluir a area do lojista com edicao de loja, edicao de produto e disponibilidade em tempo real.