import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-merchant-home-page',
  imports: [RouterLink],
  template: `
    <main class="page-shell">
      <a routerLink="/" class="back-link">Voltar ao hub</a>

      <header class="hero-card">
        <div>
          <p class="eyebrow">Estabelecimento</p>
          <h1>Base inicial da operacao do restaurante.</h1>
          <p>
            Esta area concentra o que vira primeiro: fila de pedidos, controle de cardapio e configuracoes de operacao.
          </p>
        </div>
        <div class="mini-board">
          <span>Novo pedido</span>
          <span>Em preparo</span>
          <span>Em rota</span>
        </div>
      </header>

      <section class="grid">
        <article class="panel emerald">
          <p class="label">Pedidos</p>
          <h2>Fila operacional</h2>
          <p>Espaco preparado para cards de pedido, transicao de status e confirmacoes por modal.</p>
        </article>

        <article class="panel cream">
          <p class="label">Cardapio</p>
          <h2>Produtos e disponibilidade</h2>
          <p>CRUD de produto, upload de imagem e controle de disponibilidade entram na sequencia.</p>
        </article>

        <article class="panel clay">
          <p class="label">Promocoes</p>
          <h2>Regras comerciais</h2>
          <p>Base visual para frete gratis, desconto percentual e valor minimo por pedido.</p>
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
      color: #1d5c46;
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
      display: grid;
      grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr);
      gap: 20px;
      background: linear-gradient(135deg, rgba(213, 239, 226, 0.96), rgba(249, 253, 250, 0.92));
    }

    .eyebrow,
    .label {
      margin: 0 0 10px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.78rem;
      font-weight: 700;
      color: #1d5c46;
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

    .mini-board {
      display: grid;
      gap: 10px;
      align-content: start;
    }

    .mini-board span {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.72);
      color: #173126;
      font-weight: 700;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }

    .emerald {
      background: linear-gradient(180deg, rgba(225, 245, 235, 0.96), rgba(247, 252, 249, 0.92));
    }

    .cream {
      background: linear-gradient(180deg, rgba(251, 246, 235, 0.96), rgba(255, 253, 249, 0.92));
    }

    .clay {
      background: linear-gradient(180deg, rgba(245, 229, 212, 0.96), rgba(255, 251, 246, 0.92));
    }

    @media (max-width: 900px) {
      .hero-card,
      .grid {
        grid-template-columns: 1fr;
      }
    }
  `
})
export class MerchantHomePage {
}