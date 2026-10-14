# Argos Web

Interface web do **Argos**, um organizador de contas e assinaturas recorrentes. Feita em **Angular 22** com TypeScript e SCSS, consome a [argos-api](https://github.com/LucassEdu/argos-api).

> Projeto de portfólio desenvolvido por **Lucas Eduardo Onofre**.

![Painel do Argos](https://raw.githubusercontent.com/LucassEdu/argos-web/main/docs/contas.png)

## Telas

| | |
| --- | --- |
| ![Gráficos](https://raw.githubusercontent.com/LucassEdu/argos-web/main/docs/graficos.png) | ![Próximos vencimentos](https://raw.githubusercontent.com/LucassEdu/argos-web/main/docs/vencimentos.png) |
| **Gráficos:** gasto por categoria e pagamentos dos últimos meses | **Próximos vencimentos:** linha do tempo e botão "Já paguei" |
| ![Nova conta](https://raw.githubusercontent.com/LucassEdu/argos-web/main/docs/nova-conta.png) | ![Perfil](https://raw.githubusercontent.com/LucassEdu/argos-web/main/docs/perfil.png) |
| **Nova conta:** catálogo de serviços com marcas ou serviço próprio | **Perfil:** foto, dados e troca de senha |
| ![Suporte](https://raw.githubusercontent.com/LucassEdu/argos-web/main/docs/suporte.png) | ![Tema claro](https://raw.githubusercontent.com/LucassEdu/argos-web/main/docs/contas-claro.png) |
| **Suporte:** perguntas frequentes e contato | **Tema claro** (o app também tem tema noturno) |

Também há telas de [login](https://raw.githubusercontent.com/LucassEdu/argos-web/main/docs/login.png) e [cadastro](https://raw.githubusercontent.com/LucassEdu/argos-web/main/docs/cadastro.png).

## Destaques

- **Resumo rolante no topo** com o próximo vencimento, contas atrasadas, quanto já foi pago no mês, maior conta e categoria que mais pesa.
- **Tema claro e noturno** com troca em um clique.
- **Notificações** de vencimento no sino do cabeçalho.
- **Histórico de pagamentos** por conta e marcação rápida de "Já paguei".
- **Responsivo**, pensado para uso no celular.

## Tecnologias

Angular 22 (componentes standalone, signals e novo controle de fluxo `@if`/`@for`), TypeScript, SCSS com variáveis de tema e Chart.js para os gráficos.

## Como rodar

**Pré-requisitos:** Node.js e a [argos-api](https://github.com/LucassEdu/argos-api) rodando em `http://localhost:8080`.

```bash
npm install
npx ng serve
```

Abra `http://localhost:4200`.

## Autor

**Lucas Eduardo Onofre**, estudante de Análise e Desenvolvimento de Sistemas, Manaus - AM.
GitHub: [@LucassEdu](https://github.com/LucassEdu)
