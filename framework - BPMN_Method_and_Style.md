# Framework: BPMN Method and Style (Bruce Silver)

## Princípios Fundamentais (Method and Style)
1. **Modelagem Hierárquica Top-Down**: Processos não devem ser um "mar" de centenas de caixinhas. O nível superior (Level 1) deve caber em uma única página (cerca de 5 a 10 atividades principais). Detalhes devem ser encapsulados em Subprocessos (Call Activities ou Expanded Subprocesses).
2. **Clareza Imediata**: Qualquer pessoa que leia o diagrama deve entender a lógica exata (caminhos de exceção, fluxos paralelos e responsáveis) sem precisar ler documentação anexada. O modelo por si só é a documentação.
3. **Instância de Processo Clara**: Foco no "que" está sendo processado. O início deve definir claramente o gatilho, e o fim deve representar estados finais distintos (ex: "Pedido Atendido" vs "Pedido Cancelado").

## Regras de Raias e Piscinas (Pools & Lanes)
- **Pool (Piscina)**: Representa um Participante Independente (uma organização, uma empresa, ou um cliente externo). 
  - *Regra de Ouro*: O processo sob controle (o nosso sistema/empresa) fica dentro de UMA Única Pool (que pode ser a Pool "Branca"/expandida). 
  - Clientes externos ou sistemas parceiros são Pools "Black-box" (fechadas).
  - **NÃO DEVE** haver Sequence Flow (linha sólida) cruzando os limites de uma Pool. A comunicação entre Pools diferentes é feita ESTRITAMENTE via **Message Flow** (linha tracejada).
- **Lane (Raia)**: Representa um Departamento, Papel ou Sistema *dentro* da nossa Pool (da nossa organização).
  - *Regra de Ouro*: Atividades em Sequence Flow mudam de Lane livremente, pois as Lanes apenas indicam *quem* executa a tarefa. A responsabilidade (handover) é passada pela linha contínua que cruza as Lanes.
  - Gateways e Eventos geralmente *não* precisam estar atrelados a um ator específico, mas visualmente costumam ficar na Lane do ator que tomou a decisão anterior.

## Melhores Práticas para Prompts do Agente
- **Nomeação de Tarefas**: O verbo deve ser de ação e o objeto claro (ex: "Avaliar Crédito", não "Avaliação").
- **Gateways**: XOR Gateways devem ter uma pergunta clara no rótulo (ex: "Crédito Aprovado?"). As saídas devem ser as respostas (ex: "Sim", "Não").
- **Estados Finais**: Nomeie os End Events com o estado alcançado (ex: "Processo Finalizado com Sucesso", "Processo Abortado por Fraude").

## Aplicação no Process-Mining-Cresol
- **Frontend**: 
  - A interface deve permitir configurar "Clientes" e "Sistemas Externos" como Pools separadas.
  - Setores internos (Análise, Comitê, Backoffice) devem ser Lanes dentro da Pool "Cresol".
- **Geração de Diagrama**: O modelo de IA deve ser instruído a NUNCA ligar Sequence Flows entre a Pool do Cliente e a Pool da Cresol. Deve usar Message Flows (linhas tracejadas).
