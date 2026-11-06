# Site Clima Com

Site estático (HTML + CSS + JS, sem build). Para publicar, suba `index.html`, `css/`, `js/` e `assets/`
para qualquer hospedagem (Hostinger, Netlify, Vercel, GitHub Pages…). A pasta `.claude/` é só para pré-visualização local.

## Fotos
Coloque as fotos em `assets/fotos/` com os nomes listados em `assets/fotos/LEIA-ME.txt`
(hero.jpg, cosme.jpg, instalacao.jpg…). Elas aparecem sozinhas; enquanto faltar alguma, o site mostra um fundo neutro.

## Configuração — `js/main.js`, objeto `CONFIG`
| Campo | Valor |
|---|---|
| `whatsappNumber` | `5516988287628` (já configurado; as mensagens chegam prontas) |
| `adsConversion` | ID/rótulo de conversão do Google Ads (`AW-XXXXXXXXX/xxxxxxxx`) |

Cole a tag global do Google Ads no `<head>` do `index.html` (há um comentário marcando o lugar).
O telefone aparece direto no HTML: para trocar, busque por `98828-7628` e `5516988287628`.

## Rastreamento (dataLayer / gtag)
- `whatsapp_click` com `lead_source`: `header`, `hero`, `dock`, `fab`, `footer`, `final`, `builder`, `calculadora`,
  `svc-instalacao`, `svc-manutencao`, `svc-higienizacao`, `svc-eletrica`.
- `phone_click` com `lead_source`: `topbar`, `hero-ligar`, `dock-ligar`, `faq-ligar`, `final-ligar`, `footer-ligar`.
Ambos disparam a conversão do Google Ads se `adsConversion` estiver preenchido.

## Pré-visualizar localmente
```
powershell -ExecutionPolicy Bypass -File .claude/serve.ps1
```
e abra http://localhost:5173
