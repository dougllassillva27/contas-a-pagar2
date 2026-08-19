# Design: Layout Fluido — Dashboard + Modais (Fase 1)

Data: 18/08/2026 · Status: Aprovado · Abordagem: CSS fluido intrínseco (Opção A)

## 1. Resumo do Entendimento

- **O que**: tornar o layout fluido — auto-ajuste a qualquer largura de viewport e nível de zoom, sem alvejar resoluções específicas.
- **Por quê**: tela HD (1366x768) da usuária Taya corta cards; F12 lateral aberto em Full HD também corta o card de cartão de crédito. Zoom reduzido resolve, confirmando larguras fixas.
- **Para quem**: Douglas (Full HD 1920x1080) e Taya (HD).
- **Escopo Fase 1**: dashboard principal + modais. Foco desktop.
- **Não-objetivos**: mobile/tablet; redesign estético; telas secundárias (login, relatórios, terceiros) nesta fase.

## 2. Causa Raiz

| Local | Problema |
|---|---|
| `style.css:474` `.main-grid` | `grid-template-columns: 480px 1fr 1fr 1fr` — coluna do painel de cartão fixa em 480px; sem media queries; em 1366px as 3 colunas restantes ficam esmagadas |
| `.card .valor` | `font-size: 1.8rem` + `white-space: nowrap` — estoura/corta em colunas estreitas |
| `.modal-box` | `width: 100%` + `max-width: 800px` — encosta nas bordas sem respiro |
| `.modal-grid` | `1fr 1fr` fixo com gap 40px |
| `.scroll-wrapper` | `max-height: 520px` fixo — problemático em telas de 768px de altura |

Breakpoints existentes cobrem apenas `.terceiros-grid` (1600/1200/768); `.main-grid` nunca faz reflow.

## 3. Suposições

1. Browser da Taya: Chrome moderno, zoom 100%.
2. Solução: unidades relativas (fr, %, minmax, clamp, min) + nenhum breakpoint novo com resolução-alvo.
3. Largura mínima de suporte razoável: ~1024px; abaixo disso o layout apenas degrada sem quebrar feio.
4. Verificação: redimensionar janela + zoom 50–200% + F12 lateral.

## 4. Mudanças

### 4.1 Grid principal e cards

```css
.main-grid {
  grid-template-columns: minmax(320px, 1.3fr) repeat(3, minmax(0, 1fr));
  gap: clamp(12px, 1.2vw, 20px);
}
.main-grid > * { min-width: 0; }

.card .valor {
  font-size: clamp(1.1rem, 0.9vw + 0.7rem, 1.8rem);
}
```

### 4.2 Modais

```css
.modal-box {
  width: min(92vw, 800px);
  padding: clamp(16px, 2.5vw, 30px);
}
.modal-box.modal-lg {
  width: min(96vw, 1200px);
  height: min(90vh, 100%);
}
.modal-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: clamp(16px, 2vw, 40px);
}
.scroll-wrapper {
  max-height: min(520px, 60vh);
}
```

### 4.3 Estratégia anti-regressão

Todo `clamp()`/`min()` usa **teto igual ao valor atual** — em 1920px o visual permanece idêntico ao de hoje.

## 5. Decision Log

| # | Decisão | Alternativas | Motivo |
|---|---|---|---|
| 1 | `minmax(320px, 1.3fr)` no painel de cartão | 480px fixo / auto-fit total | Mantém destaque do painel sem travar largura |
| 2 | `clamp()` em fontes de valor | media query de fonte | Escala contínua, zero breakpoints |
| 3 | `min(92vw, 800px)` no modal | media query <850px | Uma linha cobre todos os casos |
| 4 | `auto-fit` no modal-grid | quebrar coluna via breakpoint | Auto-decide, zero manutenção |
| 5 | `vh` no scroll-wrapper | manter 520px fixo | Telas de 768px de altura precisam de proporção |
| 6 | Abordagem A (CSS fluido intrínseco) | B: container queries / C: escada de breakpoints | Atende "sem resolução específica", risco baixo, YAGNI |

## 6. Verificação

1. `npm test` — regressão geral.
2. Teste visual manual: Full HD normal (idêntico), janela pela metade, F12 lateral, zoom 50/100/150/200%.
3. Validação na tela da Taya + sync para branch `taya` (estratégia de merge definida com o usuário no momento do sync — ver `docs/SYNC-TAYA.md`).

## 7. Fora de Escopo

- `relatorio.css`, `terceiro.css`, tela de login.
- Estética (cores, fontes, animações).
- Mobile/tablet.
