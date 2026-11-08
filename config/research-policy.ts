// Politica experimental OFFLINE. Nao e importada pelo Chat.
import type { Policy } from "../lib/research/classifier";
export const RESEARCH_POLICY:Policy = {
  "version": 1,
  "intents": {
    "web_search": {
      "phrases": [
        "pesquise",
        "busque na web",
        "pesquisa na internet",
        "busca na web"
      ],
      "tokens": [
        "pesquise",
        "buscar",
        "fonte"
      ]
    },
    "knowledge": {
      "phrases": [
        "me ensine",
        "ensinar minha ia",
        "base de conhecimento",
        "cadastre conhecimento"
      ],
      "tokens": [
        "ensinar",
        "conhecimento",
        "biblioteca",
        "aprenda"
      ]
    },
    "programming": {
      "phrases": [
        "criar um sistema",
        "desenvolver aplicativo",
        "corrigir codigo",
        "modo programador"
      ],
      "tokens": [
        "codigo",
        "programa",
        "python",
        "typescript",
        "javascript",
        "programador"
      ]
    },
    "deployment": {
      "phrases": [
        "railway",
        "erro de deploy",
        "servico online",
        "publicar no railway"
      ],
      "tokens": [
        "railway",
        "deploy",
        "producao",
        "healthcheck"
      ]
    },
    "git": {
      "phrases": [
        "github",
        "pull request",
        "criar branch",
        "git push"
      ],
      "tokens": [
        "github",
        "branch",
        "commit",
        "git",
        "repositorio"
      ]
    },
    "costs": {
      "phrases": [
        "sem api paga",
        "sem custo",
        "nao quero pagar",
        "gratuito"
      ],
      "tokens": [
        "gratis",
        "custo",
        "pagar",
        "credito",
        "preco"
      ]
    },
    "capabilities": {
      "phrases": [
        "o que voce sabe",
        "mostre tudo o que voce sabe",
        "o que consegue fazer",
        "me surpreenda",
        "me mostra tudo que sabe",
        "me mostra tudo o que sabe",
        "mostre tudo que sabe",
        "mostra tudo que sabe"
      ],
      "tokens": [
        "capacidades",
        "habilidades",
        "autonomia",
        "consegue"
      ]
    },
    "greeting": {
      "phrases": [
        "bom dia",
        "boa tarde",
        "boa noite",
        "ola",
        "fala comigo",
        "oi"
      ],
      "tokens": [
        "ola",
        "oi",
        "conversar",
        "tudo bem"
      ]
    }
  }
};
