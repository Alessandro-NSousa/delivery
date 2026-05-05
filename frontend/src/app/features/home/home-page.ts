import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <main class="shell">
      <header class="hero">
        <div>
          <p class="eyebrow">Delivery OS</p>
          <h1>Operacao de delivery pronta para cliente e estabelecimento.</h1>
          <p class="summary">
            Backend Spring Boot e frontend Angular iniciados com base modular, autenticacao preparada e
            primeiro fluxo de cadastro de estabelecimento em andamento.
          </p>
        </div>
        <div class="status-card">
          <span class="chip">MVP multiestabelecimento</span>
          <ul>
            <li>Cadastro e listagem de estabelecimentos</li>
            <li>Seguranca OAuth2/OIDC preparada</li>
            <li>Arquitetura separada por contextos</li>
          </ul>
        </div>
      </header>

      <section class="grid two-up">
        <article class="panel accent-customer">
          <p class="section-label">Area cliente</p>
          <h2>Explorar catalogo, sacola e pedidos.</h2>
          <p>Base inicial para jornada de compra com menu, checkout e acompanhamento do pedido.</p>
          <a routerLink="/cliente" class="cta">Abrir visao do cliente</a>
        </article>

        <article class="panel accent-merchant">
          <p class="section-label">Area estabelecimento</p>
          <h2>Gerenciar pedidos, cardapio e operacao.</h2>
          <p>Base inicial para fila operacional, cardapio, configuracoes e promocoes.</p>
          <a routerLink="/estabelecimento" class="cta">Abrir visao do estabelecimento</a>
        </article>
      </section>

      <section class="grid timeline">
        <article class="panel">
          <p class="section-label">Back-end pronto</p>
          <h3>Primeiro slice entregue</h3>
          <p>API de estabelecimentos, migracao Flyway, seguranca e Problem Details configurados.</p>
        </article>

        <article class="panel">
          <p class="section-label">Proxima etapa</p>
          <h3>Catalogo e checkout</h3>
          <p>Os proximos modulos entram sobre essa base: produtos, categorias, sacola e composicao de pedido.</p>
        </article>

        <article class="panel">
          <p class="section-label">Observabilidade</p>
          <h3>Pronto para crescer</h3>
          <p>Build validado, health checks ativos e frontend estruturado em rotas lazy desde o inicio.</p>
        </article>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      padding: 32px;
    }

    .shell {
      max-width: 1180px;
      margin: 0 auto;
      display: grid;
      gap: 24px;
    }

    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(280px, 0.8fr);
      gap: 24px;
      align-items: stretch;
    }

    .eyebrow,
    .section-label {
      margin: 0 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      font-size: 0.78rem;
      color: #7d4f2f;
      font-weight: 700;
    }

    h1,
    h2,
    h3 {
      margin: 0;
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
      line-height: 0.95;
      color: #173126;
    }

    h1 {
      font-size: clamp(3rem, 7vw, 5.4rem);
      max-width: 10ch;
    }

    h2 {
      font-size: clamp(1.9rem, 3vw, 2.6rem);
      max-width: 12ch;
    }

    h3 {
      font-size: 1.5rem;
      margin-bottom: 12px;
    }

    .summary,
    .panel p,
    .status-card li {
      color: #3f5144;
      line-height: 1.6;
      font-size: 1rem;
    }

    .summary {
      max-width: 56ch;
      margin-top: 16px;
      font-size: 1.08rem;
    }

    .grid {
      display: grid;
      gap: 20px;
    }

    .two-up {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .timeline {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .panel,
    .status-card {
      border-radius: 28px;
      padding: 28px;
      background: rgba(255, 252, 247, 0.78);
      border: 1px solid rgba(23, 49, 38, 0.08);
      box-shadow: 0 24px 60px rgba(65, 53, 34, 0.12);
      backdrop-filter: blur(16px);
    }

    .accent-customer {
      background: linear-gradient(180deg, rgba(255, 242, 223, 0.95), rgba(255, 250, 244, 0.9));
    }

    .accent-merchant {
      background: linear-gradient(180deg, rgba(223, 243, 234, 0.95), rgba(245, 252, 248, 0.92));
    }

    .status-card {
      background: linear-gradient(180deg, rgba(22, 60, 45, 0.98), rgba(28, 72, 54, 0.94));
      color: #f7f1e6;
      display: grid;
      align-content: start;
      gap: 18px;
    }

    .status-card ul {
      margin: 0;
      padding-left: 18px;
      display: grid;
      gap: 12px;
    }

    .status-card li,
    .status-card .chip {
      color: inherit;
    }

    .chip {
      width: fit-content;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .cta {
      width: fit-content;
      margin-top: 24px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 18px;
      border-radius: 999px;
      text-decoration: none;
      background: #173126;
      color: #f7f1e6;
      font-weight: 700;
    }

    @media (max-width: 900px) {
      :host {
        padding: 20px;
      }

      .hero,
      .two-up,
      .timeline {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class HomePage {
}