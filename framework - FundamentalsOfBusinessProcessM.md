# Framework: Fundamentals of Business Process Management (Dumas et al.)

## Princípios Fundamentais
A obra define o BPM como uma disciplina de engenharia e gestão. O ciclo de vida do BPM inclui:
1. Identificação do Processo
2. Descoberta (Modelagem As-Is)
3. Análise do Processo (Gargalos, Valor Agregado)
4. Redesenho de Processo (Modelagem To-Be)
5. Implementação (Automação)
6. Monitoramento e Controle (Process Mining)

## Regras de Desenho Visual
- **Direção do Fluxo**: Fluxos de processo devem seguir preferencialmente da esquerda para a direita, ou de cima para baixo. Retornos (loops) são as únicas exceções que voltam no sentido contrário.
- **Simetria de Gateways**: Todo caminho que se divide num Gateway Paralelo (AND) ou Inclusivo (OR) deve, de preferência, ser sincronizado novamente por um Gateway do mesmo tipo para manter a integridade (Block-structured modeling).
- **Semântica de Gateways vs Eventos**:
  - Event-Based Gateways devem ser usados quando a decisão de qual caminho seguir não é tomada pelo nosso sistema, mas sim ditada por um evento externo (ex: esperar o cliente responder OU esperar um timeout de 5 dias).

## Integração com Process Mining e Automação
Como o livro foca pesadamente na passagem do modelo para o log de execução (Process Mining):
- Cada Tarefa deve gerar um evento rastreável.
- As nomenclaturas no modelo devem bater exatamente com as strings esperadas nos logs do sistema.
- A granularidade (o quão específica é a tarefa) não deve ser menor do que aquilo que o sistema é capaz de registrar num Log.

## Aplicação no Process-Mining-Cresol
- O sistema visual deve desencorajar cruzamentos complexos ("spaghetti models") e incentivar blocos simétricos.
- **Backend / Layout**: O script de Layout deve garantir que os nós fluam sempre da esquerda para a direita com espaçamento fixo, refletindo a temporalidade do processo.
- **IA de Mapeamento**: O prompt da LLM deve pedir para a IA consolidar passos que são muito granulares (ex: "abrir tela", "digitar cpf" vira apenas "Consultar CPF do Cliente").
