# Raio-x

Jogo em que os participantes enviam palavras, o administrador sorteia e elas aparecem num telão.

## Páginas

| Rota       | Para quem     | O que faz |
|------------|---------------|-----------|
| `/`        | Participantes | Envia palavras com seu nome, acompanha o status delas, pontos e posição no ranking |
| `/manager` | Administrador | Sorteia/aprova/pula/descarta, vê a fila, histórico e ranking |
| `/display` | Telão         | Mostra a palavra atual com uma cor de fundo aleatória, em tela cheia (duplo clique). Use `/display?ranking` para exibir o top 5 |

Atalhos no painel: **S** sortear · **A** mostrar na tela · **P** pular · **D** descartar · **U** marcar como usada.

## Regras

- Palavras iguais (ignorando maiúsculas, acentos e espaços) viram uma só entrada; todos que enviaram ganham 1 ponto quando ela é usada.
- Não dá para reenviar uma palavra que já foi usada.
- Ao aprovar uma nova palavra, a que estava na tela é marcada como usada.
- Palavras usadas ou descartadas podem voltar para a fila pelo histórico (desfazer).

## Rodando

```bash
# backend
cd backend && npm install && npm run build && npm start

# frontend (crie .env a partir de .env.example)
cd frontend && npm install && npm run dev
```

Variáveis do backend:

- `PORT` — porta do WebSocket (padrão `8080`)
- `DATA_FILE` — arquivo onde o estado é salvo para sobreviver a reinícios (padrão `data.json`; vazio desativa)
