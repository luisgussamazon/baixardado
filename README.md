# FANS

Mural interno de comunicação com perfis de administrador e AA.

## Como executar

Requisito: Python 3.10 ou superior.

```powershell
python server.py
```

Abra <http://localhost:8000> no navegador. O servidor usa apenas recursos do
próprio Python, portanto não é necessário instalar dependências.

O estado dos avisos é salvo no `localStorage` do navegador.

## Rotas

- `/` — página inicial
- `/login` — entrada no sistema
- `/admin` — publicação de comunicados
- `/avisos` — visualização dos comunicados
- `/health` — verificação do servidor
