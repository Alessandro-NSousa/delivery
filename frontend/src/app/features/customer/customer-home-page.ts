import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-customer-home-page',
  imports: [RouterLink],
  template: `
    <main class="page-shell">
      <a routerLink="/" class="back-link">Voltar ao hub</a>

      <header class="hero-card">
        <p class="eyebrow">Cliente</p>
        <h1>Fluxo inicial da jornada de compra.</h1>
        <p>
          A base do cliente ja nasceu preparada para listar estabelecimentos, montar a sacola e acompanhar pedidos.
        </p>
      </header>

      <section class="grid">
        <article class="panel warm">
          <p class="label">Catalogo</p>
          <h2>Restaurantes e categorias</h2>
          <p>Entrada prevista para busca de estabelecimentos e navegacao por cardapio publico.</p>
        </article>

        <article class="panel light">
          <p class="label">Sacola</p>
          <h2>Resumo de compra</h2>
          <p>Subtotal, descontos e CTA de checkout entram sobre esta area nas proximas iteracoes.</p>
        </article>

        <article class="panel dark">
          <p class="label">Pedidos</p>
          <h2>Acompanhamento em tempo real</h2>
          <p>O layout esta pronto para polling primeiro e SSE ou WebSocket depois.</p>
        </article>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      padding: 24px;
    }

    .page-shell {
      max-width: 1120px;
      margin: 0 auto;
      display: grid;
      gap: 20px;
    }

    .back-link {
      width: fit-content;
      text-decoration: none;
      color: #7d4f2f;
      font-weight: 700;
    }

    .hero-card,
    .panel {
      border-radius: 24px;
      padding: 24px;
      background: rgba(255, 251, 245, 0.88);
      border: 1px solid rgba(23, 49, 38, 0.08);
      box-shadow: 0 20px 48px rgba(70, 56, 33, 0.1);
    }

    .hero-card {
      background: linear-gradient(135deg, rgba(255, 225, 192, 0.96), rgba(255, 248, 239, 0.9));
    }

    .eyebrow,
    .label {
      margin: 0 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.78rem;
      font-weight: 700;
      color: #7d4f2f;
    }

    h1,
    h2 {
      margin: 0 0 12px;
      font-family: 'Space Grotesk', 'Segoe UI', sans-serif;
      color: #173126;
      line-height: 1;
    }

    h1 {
      font-size: clamp(2.3rem, 5vw, 4.2rem);
      max-width: 9ch;
    }

    h2 {
      font-size: 1.8rem;
    }

    p {
      margin: 0;
      color: #3f5144;
      line-height: 1.6;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }

    .warm {
      background: linear-gradient(180deg, rgba(255, 241, 216, 0.96), rgba(255, 251, 246, 0.92));
    }

    .light {
      background: linear-gradient(180deg, rgba(252, 246, 234, 0.96), rgba(255, 253, 249, 0.92));
    }

    .dark {
      background: linear-gradient(180deg, rgba(22, 60, 45, 0.97), rgba(29, 77, 57, 0.93));
    }

    .dark h2,
    .dark p,
    .dark .label {
      color: #f7f1e6;
    }

    @media (max-width: 900px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class CustomerHomePage {
}