# Skills opcionais

O que está aqui **não vem ativo** no ContexOS. São skills que atendem um caso de uso
estreito, exigem configuração externa, ou dependem de coisa que o produto não entrega —
e que, ativas por padrão, só ocupariam espaço.

O fluxo normal do ContexOS não precisa de nada daqui. Nada mesmo.

## Como ativar uma

```bash
cp -r templates/opcional/<nome> .claude/skills/<nome>
```

Ler o cabeçalho da skill antes. Ele diz o que mais precisa existir pra ela funcionar.

---

## O que tem aqui

### `aprovar-post` — publicação automática no Instagram e Facebook

Publica o post direto pela Graph API da Meta, em vez de entregar os arquivos pra você
postar. **Foi tirada do conjunto padrão em 20/08/2026:** quase ninguém usa, e quem cria
material costuma publicar na própria ferramenta de agendamento.

**Ela não funciona como está.** Depende de dois scripts que o ContexOS **não** inclui:

- `scripts/postar-instagram.js`
- `scripts/postar-facebook.js`

Além disso exige App na Meta for Developers, Página do Facebook, conta Instagram Business
conectada, os PNGs no ar em URL pública, e as variáveis `META_PAGE_ACCESS_TOKEN`,
`META_PAGE_ID` e `META_IG_USER_ID` no `.env`.

Quem quiser usar precisa escrever os dois scripts contra a Graph API. Para publicação em
volume sem esse trabalho, existem serviços prontos: o `templates/ferramentas/catalogo.md`
lista alguns.
