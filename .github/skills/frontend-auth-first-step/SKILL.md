---
name: frontend-auth-first-step
description: 'Implemente ou retome a autenticacao no frontend Angular do Delivery. Use quando precisar iniciar o primeiro item de Proximos passos em frontend-mvp.md: entrada explicita como CUSTOMER ou MERCHANT, bootstrap de sessao via /api/me, integracao com login/logout OAuth2 do backend, guardas de rota e tratamento de 401/403.'
argument-hint: 'Contexto extra: restricao de UX, endpoint de login confirmado ou escopo do primeiro slice'
user-invocable: true
---

# Frontend Auth First Step

## O que esta skill produz

- Um primeiro slice real de autenticacao no frontend, alinhado ao backend existente.
- O slice deve permitir ao usuario iniciar entrada explicita, recuperar a sessao atual por /api/me, refletir perfil CUSTOMER ou MERCHANT e deixar claros os bloqueios restantes.
- O trabalho deve parar antes de sacola, checkout ou pedidos.

## Quando usar

- Quando o objetivo for comecar a implementar o item 1 de Proximos passos em frontend-mvp.md.
- Quando o frontend Angular precisar deixar de depender de uma sessao ja estabelecida no backend.
- Quando for necessario ligar UI, roteamento e estado de sessao aos papeis CUSTOMER e MERCHANT.
- Quando houver duvida sobre login via Spring Security OAuth2, proxy de desenvolvimento e tratamento de 401/403.

## Contexto deste repositorio

- O alvo funcional esta em frontend-mvp.md, item 1 de Proximos passos.
- O frontend ja consulta sessao autenticada em frontend/src/app/features/account/current-account-api.ts usando GET /api/me.
- O modelo de conta usa os perfis CUSTOMER e MERCHANT em frontend/src/app/features/account/current-account.models.ts.
- As areas principais ficam em /cliente e /estabelecimento via frontend/src/app/app.routes.ts.
- O backend protege recursos com OAuth2 login e JWT em backend/src/main/java/com/delivery/config/SecurityConfig.java.
- O backend expoe a conta atual em backend/src/main/java/com/delivery/account/api/CurrentAccountController.java.
- O proxy de desenvolvimento do Angular hoje encaminha apenas /api em frontend/proxy.conf.json. Se o login/logout usar caminhos como /oauth2, /login ou /logout, isso precisa ser confirmado cedo.

## Abordagem padrao adotada

- Considere como melhor abordagem inicial integrar o login real do Spring Security, sem mocks de identidade no frontend.
- Em desenvolvimento, prefira manter o navegador na origem do Angular e ampliar o proxy para tambem encaminhar /oauth2, /login e /logout ao backend, preservando cookies e simplificando o fluxo local.
- Considere /oauth2/authorization/auth0 como o candidato padrao para iniciar autenticacao, porque o backend ja registra auth0 como provider e usa oauth2Login padrao. Ainda assim, valide cedo se o comportamento concreto bate com essa suposicao.
- Considere /logout como o candidato padrao para encerramento de sessao. Se o comportamento concreto divergir, ajuste para o contrato real do backend.
- Coloque a entrada explicita de autenticacao na home primeiro. Isso reduz friccao, evita criar uma rota nova cedo demais e deixa claro como entrar antes de acessar /cliente ou /estabelecimento.
- Trate CUSTOMER e MERCHANT como resultado do backend apos o login, nao como escolha que cria permissao no frontend. A escolha explicita na UI deve orientar o usuario para o fluxo correto e para a area adequada apos a autenticacao.

## Procedimento

1. Releia frontend-mvp.md e fixe o escopo: Integrar autenticacao no frontend para entrada explicita como CUSTOMER ou MERCHANT.
2. Antes do primeiro edit, forme uma hipotese falsificavel e local. A hipotese padrao deste repositorio e: o menor slice util e centralizar o estado de sessao no frontend, expor uma entrada explicita de autenticacao e conectar isso ao backend existente, sem inventar identidades ou mocks.
3. Faca a checagem discriminante mais barata antes de desenhar muita UI:
   - confirme qual URL inicia login no backend em dev;
   - confirme se o fluxo precisa passar pelo proxy do Angular;
   - confirme se o logout tera endpoint navegavel;
   - confirme que GET /api/me devolve 401 sem sessao e a conta atual com profile quando autenticado.
4. Escolha o menor slice implementavel e comece por ele. Ordem recomendada:
   - criar um estado de autenticacao compartilhado no frontend usando a API atual de /api/me;
   - adicionar uma superficie explicita de entrada, preferencialmente na home ou em pagina dedicada, com acoes claras para CUSTOMER e MERCHANT;
   - conectar a acao de entrada ao fluxo real do backend;
   - adaptar navegacao e guardas para refletir sessao ausente, perfil incorreto e sessao valida;
   - so depois ajustar detalhes visuais ou mensagens secundarias.
5. Depois do primeiro edit substantivo, execute uma validacao focada imediatamente.
6. Se a validacao falhar por um defeito local, repare no mesmo slice e rode a mesma validacao de novo.
7. Se a validacao mostrar que o controle real esta em outra camada proxima, faca um unico salto local para esse ponto e continue.

## Decisoes obrigatorias

### 1. Como iniciar o login

- Prefira integracao real por redirecionamento com o fluxo padrao do Spring Security.
- Comece assumindo /oauth2/authorization/auth0 como URL de inicio em dev e confirme isso no primeiro check tecnico.
- Em dev, trate a ampliacao de frontend/proxy.conf.json para /oauth2, /login e /logout como a opcao padrao.
- So use navegacao direta para http://localhost:8080 se o proxy se mostrar inviavel ou quebrar o fluxo de cookies e retorno.

### 2. Como representar os perfis

- Nao crie role no frontend. O profile vem do backend por /api/me.
- Os botoes ou chamadas para CUSTOMER e MERCHANT devem orientar a entrada do usuario, nao forjar permissao.
- Como default, implemente primeiro a entrada explicita e o pos-login baseado no profile real recebido.

### 3. Como tratar ausencia de contrato

- Se faltar endpoint de logout ou URL de login confirmada, nao invente API.
- Deixe um seam claro no frontend, registre o bloqueio e pare no menor ponto que ainda agrega valor real.
- Mantenha mensagens claras para 401 e 403.

## Checklist de implementacao

- Ler os pontos ja existentes em frontend/src/app/features/account/current-account-api.ts, frontend/src/app/features/account/current-account.models.ts, frontend/src/app/app.routes.ts, frontend/proxy.conf.json e backend/src/main/java/com/delivery/config/SecurityConfig.java.
- Definir onde o estado de autenticacao vivera.
- Definir onde a entrada explicita aparecera, com preferencia inicial pela home.
- Conectar a entrada ao backend real.
- Garantir que /cliente e /estabelecimento reflitam sessao e perfil.
- Atualizar mensagens de erro quando necessario.
- Validar sem abrir o escopo para checkout, pedidos ou edicao de catalogo.

## Validacao

- Validacao minima:
  - cd frontend
  - npm run build
- Validacao funcional desejavel:
  - abrir a home e verificar se existe uma entrada explicita para autenticacao;
  - autenticar com sessao valida e confirmar que /api/me alimenta o estado do frontend;
  - navegar para /cliente e /estabelecimento e conferir comportamento para CUSTOMER, MERCHANT, 401 e 403.
- Se houver testes focados no slice tocado, rode-os antes de expandir o escopo.

## Criterios de pronto

- O frontend nao depende mais apenas de uma sessao misteriosamente ativa.
- Existe um caminho explicito de entrada para o usuario.
- O estado autenticado e derivado do backend real.
- CUSTOMER e MERCHANT sao tratados de forma clara.
- O primeiro slice compila e nao introduz regressao visivel no fluxo atual.
- O trabalho permanece dentro do item 1 de Proximos passos.

## Nao fazer neste passo

- Nao iniciar sacola ou checkout.
- Nao iniciar status de pedido.
- Nao refatorar areas nao relacionadas sem necessidade.
- Nao mascarar falta de contrato de autenticacao com mocks permanentes.