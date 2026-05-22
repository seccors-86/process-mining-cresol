# Framework: BPMN 2.0 Manual de Referência e Guia Prático (Freund, Rücker, Hitpass)

## Foco Prático e Executável
A principal lição de Freund e Rücker (criadores do Camunda) é que o BPMN não serve apenas para documentação no Word, mas deve ser **diretamente executável** por motores de processo.

### A Regra de Separação de Preocupações (Separation of Concerns)
- **Modelagem de Negócios (Business Modeling)**: Para comunicação entre gestores. Oculta exceções técnicas, foca no fluxo de valor (Happy Path e exceções de negócios).
- **Modelagem Técnica (Executable Modeling)**: Para desenvolvedores. Inclui tratamento de erros de sistema (Error Boundary Events), transações lógicas e compensações.

## Padrões de Colaboração e Pools
- **Collaboration Diagram**: É o foco principal quando o processo toca parceiros externos (B2B). 
  - **White-box Pool**: A piscina da sua organização, onde ficam todas as suas raias (Lanes) e o Sequence Flow detalhado.
  - **Black-box Pool**: Entidades como "Fornecedor", "Cliente", "Banco Central". Nelas não desenhamos as atividades internas, apenas representamos o container. A troca de mensagens é mapeada nas bordas dessa Pool usando *Message Flows*.

## Eventos e Subprocessos
- Eventos de Borda (Boundary Events) devem ser usados para tratar exceções. Ex: um "Timer" preso na borda de uma atividade de "Aprovação do Cliente" indicando o fluxo que ocorre se o cliente não responder em 48h.
- **Event Subprocesses**: São úteis para regras globais. Por exemplo, uma regra de negócio que diz "O pedido pode ser cancelado a qualquer momento pelo cliente" é melhor modelada como um Event Subprocess disparado por mensagem de cancelamento, do que colocar um Gateway de cancelamento após cada atividade do fluxo.

## Aplicação no Process-Mining-Cresol
- Na tela de criação de nós, a opção "Piscina (Pool)" deve categorizar nós como "Participantes".
- O layout gerado automaticamente deve tratar Black-box pools com um estilo visual diferente (um bloco fechado sem Lanes internas), se aplicável.
- Para simplificar, o sistema Cresol deve assumir que os processos gerados pela LLM são da categoria "Business Modeling" (estratégicos), evitando excesso de nós técnicos.
